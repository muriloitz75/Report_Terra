from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
import shutil
import os
import io
import pandas as pd
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from process_pdf import parse_pdf
import tempfile
import logging
import traceback
import json
import time
from datetime import datetime, timedelta

# Load .env from backend/ directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))



# Configure logging
# Use INFO in production, DEBUG in development
log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
if log_level_str not in valid_levels:
    print(f"Warning: Invalid LOG_LEVEL '{log_level_str}'. Defaulting to INFO.")
    log_level_str = "INFO"
log_level = log_level_str
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("backend_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Report Terra API",
    description="API para processamento e análise de PDFs de processos governamentais",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db, engine
from models import Base, User
import auth

# Create tables (new tables auto-created, existing tables need manual migration)
Base.metadata.create_all(bind=engine)

# Migrate: add last_login column to users if missing
try:
    from sqlalchemy import text as sa_text
    with engine.connect() as conn:
        conn.execute(sa_text("ALTER TABLE users ADD COLUMN last_login DATETIME"))
        conn.commit()
except Exception:
    pass  # Column already exists

# Migrate: add approval_status column to users if missing
try:
    from sqlalchemy import text as sa_text
    with engine.connect() as conn:
        conn.execute(sa_text("ALTER TABLE users ADD COLUMN approval_status VARCHAR DEFAULT 'approved'"))
        conn.execute(sa_text("UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = ''"))
        conn.commit()
except Exception:
    pass

# Migrate: change processes PK to autoincrement integer and make (user_id, id) unique
try:
    from sqlalchemy import text as sa_text
    with engine.connect() as conn:
        cols = conn.execute(sa_text("PRAGMA table_info(processes)")).fetchall()
        col_names = [c[1] for c in cols]
        if cols and "pk" not in col_names:
            conn.execute(sa_text("ALTER TABLE processes RENAME TO processes_old"))
            conn.execute(sa_text("""
                CREATE TABLE processes (
                    pk INTEGER PRIMARY KEY AUTOINCREMENT,
                    id VARCHAR,
                    user_id INTEGER,
                    contribuinte VARCHAR,
                    data_abertura VARCHAR,
                    ano VARCHAR,
                    status VARCHAR,
                    setor_atual VARCHAR,
                    tipo_solicitacao VARCHAR,
                    dias_atraso_pdf INTEGER,
                    dias_atraso_calc INTEGER,
                    is_atrasado BOOLEAN,
                    created_at DATETIME,
                    updated_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    UNIQUE(user_id, id)
                )
            """))
            conn.execute(sa_text("""
                INSERT INTO processes (
                    id, user_id, contribuinte, data_abertura, ano, status, setor_atual, tipo_solicitacao,
                    dias_atraso_pdf, dias_atraso_calc, is_atrasado, created_at, updated_at
                )
                SELECT
                    id, user_id, contribuinte, data_abertura, ano, status, setor_atual, tipo_solicitacao,
                    dias_atraso_pdf, dias_atraso_calc, is_atrasado, created_at, updated_at
                FROM processes_old
            """))
            conn.execute(sa_text("DROP TABLE processes_old"))
            conn.execute(sa_text("CREATE INDEX IF NOT EXISTS ix_processes_id ON processes (id)"))
            conn.execute(sa_text("CREATE INDEX IF NOT EXISTS ix_processes_status ON processes (status)"))
            conn.execute(sa_text("CREATE INDEX IF NOT EXISTS ix_processes_tipo_solicitacao ON processes (tipo_solicitacao)"))
            conn.commit()
except Exception:
    pass

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Validate JWT token and return current user.
    """
    try:
        payload = auth.decode_access_token(token)
        if payload is None:
            logger.warning("Token validation failed: decode_access_token returned None")
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Token validation failed: Missing email (sub) in payload")
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            logger.warning(f"Token validation failed: User {email} not found in DB")
            raise HTTPException(status_code=401, detail="User not found")
        
        # Verifica se o usuário está ativo
        if not user.is_active:
            logger.warning(f"Token validation failed: User {email} is not active")
            raise HTTPException(status_code=401, detail="User account is deactivated")
            
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}")
        raise

def get_admin_user(current_user: User = Depends(get_current_user)):
    """Require admin role."""
    if getattr(current_user, 'role', 'user') != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return current_user

# Auth Routes
@app.post("/token")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    from models import UserActivity
    logger.debug(f"Login attempt for: '{form_data.username}'")

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:200]

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        # Registrar tentativa falhada
        db.add(UserActivity(user_id=user.id if user else None, action="login_failed", ip_address=ip_address, user_agent=user_agent, detail=form_data.username))
        db.commit()
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    approval_status = getattr(user, "approval_status", "approved") or "approved"
    if approval_status == "pending":
        raise HTTPException(status_code=403, detail="Cadastro pendente de aprovação")
    if approval_status == "rejected":
        raise HTTPException(status_code=403, detail="Cadastro reprovado")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuário desativado")

    # Registrar login bem-sucedido
    user.last_login = datetime.utcnow()
    db.add(UserActivity(user_id=user.id, action="login", ip_address=ip_address, user_agent=user_agent))
    db.commit()

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={
            "sub": user.email,
            "id": user.id,
            "full_name": user.full_name,
            "role": getattr(user, 'role', 'user'),
            "can_generate_report": getattr(user, 'can_generate_report', False),
        },
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from pydantic import EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

@app.post("/auth/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        is_active=False,
        approval_status="pending",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email, "message": "Cadastro solicitado. Aguarde aprovação do administrador."}

# In-memory DB fallback for legacy code (will be removed later)
# DB: Dict[str, List[Dict[str, Any]]] = {}


# Legacy startup/shutdown removed
# Data persistence is now handled by SQL/SQLite

# Global Upload State - Per User?
# For simplicity, we keep it global but we could make it per-user too.
# If multiple users upload simultaneously, this might be race-y for status updates.
# refactoring to Dict[user_id, status]
UPLOAD_STATE: Dict[str, Dict[str, Any]] = {}

def get_user_upload_state(user_id: str):
    return UPLOAD_STATE.setdefault(user_id, {
        "status": "idle",
        "message": "",
        "processed_count": 0,
        "error": None
    })

def process_pdf_background(tmp_path: str, user_id: int):
    """Background task to process PDF without blocking."""
    global UPLOAD_STATE
    
    logger.info(f"Starting background processing for {tmp_path} (User: {user_id})")
    
    # We need to manually create a session here since we are in a background thread
    from database import SessionLocal
    db = SessionLocal()
    
    user_state = get_user_upload_state(str(user_id))
    user_state["status"] = "processing"
    user_state["message"] = "Processando arquivo PDF..."
    user_state["error"] = None
    
    try:
        def extraction_progress(current, total):
            # Scale extraction progress from 0% to 20% (leaving 80% for saving)
            # Frontend uses: 10 + Math.round(pct * 0.85)
            # If we send (20%), Frontend sees 10 + 17 = 27%
            pct = int((current / total) * 20)
            user_state["message"] = f"Extraindo dados... Página {current}/{total} ({pct}%)"

        user_state["message"] = "Extraindo dados do PDF... (0%)"
        data = parse_pdf(tmp_path, progress_callback=extraction_progress)

        total = len(data)
        if total == 0:
            user_state["status"] = "completed"
            user_state["processed_count"] = 0
            user_state["message"] = "Nenhum registro encontrado no PDF."
            return

        from models import Process
        from datetime import datetime

        BATCH_SIZE = 50
        for i, item in enumerate(data):
            existing = db.query(Process).filter(Process.user_id == user_id, Process.id == item['id']).first()

            if existing:
                 existing.contribuinte = item['contribuinte']
                 existing.data_abertura = item['data_abertura']
                 existing.ano = item['ano']
                 existing.status = item['status']
                 existing.setor_atual = item['setor_atual']
                 existing.tipo_solicitacao = item['tipo_solicitacao']
                 existing.dias_atraso_pdf = item['dias_atraso_pdf']
                 existing.dias_atraso_calc = item['dias_atraso_calc']
                 existing.is_atrasado = item['is_atrasado']
                 existing.updated_at = datetime.utcnow()
            else:
                new_process = Process(
                    id=item['id'],
                    user_id=user_id,
                    contribuinte=item['contribuinte'],
                    data_abertura=item['data_abertura'],
                    ano=item['ano'],
                    status=item['status'],
                    setor_atual=item['setor_atual'],
                    tipo_solicitacao=item['tipo_solicitacao'],
                    dias_atraso_pdf=item['dias_atraso_pdf'],
                    dias_atraso_calc=item['dias_atraso_calc'],
                    is_atrasado=item['is_atrasado']
                )
                db.add(new_process)

            # Commit in batches and update progress
            if (i + 1) % BATCH_SIZE == 0 or (i + 1) == total:
                db.commit()
                db.commit()
                # Scale saving progress from 20% to 100%
                pct = int(20 + ((i + 1) / total) * 80)
                user_state["message"] = f"Salvando registros... {i + 1}/{total} ({pct}%)"
                user_state["processed_count"] = i + 1

        user_state["status"] = "completed"
        user_state["processed_count"] = total
        user_state["message"] = f"Sucesso! {total} registros extraídos."
        logger.info(f"Background processing completed for {user_id}. Extracted {total} records.")
        
    except Exception as e:
        logger.error(f"Error in background processing: {e}")
        logger.error(traceback.format_exc())
        user_state["status"] = "error"
        user_state["error"] = str(e)
        user_state["message"] = "Erro ao processar arquivo."
        
    finally:
        db.close()
        # Clean up temp file
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as e:
                logger.warning(f"Failed to remove temp file {tmp_path}: {e}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint - API está funcionando"""
    return {
        "status": "online",
        "message": "Report Terra API está funcionando! 🚀",
        "docs": "/docs"
    }

@app.get("/upload/status")
def get_upload_status(user: User = Depends(get_current_user)):
    """Get the current status of the PDF processing for the authenticated user."""
    state = get_user_upload_state(str(user.id))
    logger.info(f"Checking status for user {user.id}: {state['status']} ({state['processed_count']} processed)")
    return state

@app.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    logger.info(f"Received upload request from user {user.id}. Filename: {file.filename}")
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    user_state = get_user_upload_state(str(user.id))

    # Block concurrent uploads per user
    if user_state["status"] == "processing":
         raise HTTPException(status_code=409, detail="Já existe um arquivo sendo processado. Aguarde.")

    # Reset state immediately so polling sees "processing" instead of old "completed"
    user_state["status"] = "processing"
    user_state["message"] = "Enviando arquivo..."
    user_state["processed_count"] = 0
    user_state["error"] = None

    # Save to temp file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")
    
    # Start background task
    background_tasks.add_task(process_pdf_background, tmp_path, user.id)
    
    return {"message": "Upload recebido. Processamento iniciado em segundo plano.", "status": "processing"}

@app.delete("/clear")
def clear_records(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Clear all process records for the authenticated user."""
    from models import Process
    
    try:
        deleted_count = db.query(Process).filter(Process.user_id == user.id).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear records: {e}")
    
    # Also reset status
    if str(user.id) in UPLOAD_STATE:
        del UPLOAD_STATE[str(user.id)]
        
    return {"message": f"{deleted_count} registros removidos com sucesso.", "cleared": deleted_count}

@app.get("/stats")
def get_stats(
    search: Optional[str] = None, 
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    only_delayed: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        from models import Process
        # Optimized: Fetch directly from DB instead of loading all valid users
        # For complexity analysis, we can use Pandas for aggregation or SQLAlchemy
        # Given we have existing Pandas logic, let's load user data into DF
        
        query = db.query(Process).filter(Process.user_id == user.id)
        
        # Read from SQL to Pandas
        df = pd.read_sql(query.statement, db.bind)
        
        if df.empty:
            return {
                "total": 0, "encerrados": 0, "andamento": 0, "atrasados": 0,
                "by_month": [], "by_type": [], 
                "by_type_delayed": [],
                "by_type_closed_top": [],
                "by_type_closed_bottom": [],
                "all_statuses": [], "all_types": [], "available_months": []
            }
        
        # Normalize Request Type to avoid duplicates (e.g. "Tipo A" vs "Tipo A ")
        if 'tipo_solicitacao' in df.columns:
            df['tipo_solicitacao'] = df['tipo_solicitacao'].astype(str).str.strip().str.replace(r'\s+', ' ', regex=True)

        # Pre-process dates if needed
        if 'data_abertura' in df.columns and not df['data_abertura'].eq("").all():
            df['dt'] = pd.to_datetime(df['data_abertura'], format='%d/%m/%Y', errors='coerce')
            df['month_year'] = df['dt'].dt.strftime('%Y-%m')

        # 1. Calculate Options (from Unfiltered Data)
        all_statuses = sorted(df['status'].dropna().unique().tolist()) if 'status' in df.columns else []
        all_types = sorted(df['tipo_solicitacao'].dropna().unique().tolist()) if 'tipo_solicitacao' in df.columns else []
        available_months = sorted(df['month_year'].dropna().unique().tolist()) if 'month_year' in df.columns else []

        # 2. Apply Filters
        # Search
        if search:
            search_lower = search.lower()
            df = df[
                df['id'].astype(str).str.contains(search_lower, case=False) |
                df['contribuinte'].astype(str).str.contains(search_lower, case=False) |
                df['tipo_solicitacao'].astype(str).str.contains(search_lower, case=False)
            ]

        # Type Filter
        if type_filter:
            types = type_filter.split(',')
            if 'tipo_solicitacao' in df.columns:
                df = df[df['tipo_solicitacao'].isin(types)]
                
        # Status Filter
        if status_filter:
            statuses = status_filter.split(',')
            if 'status' in df.columns:
                df = df[df['status'].isin(statuses)]

        # Date Range Filter
        if start_date:
            if 'dt' in df.columns:
                df = df[df['dt'] >= pd.to_datetime(start_date)]
        if end_date:
            if 'dt' in df.columns:
                df = df[df['dt'] <= pd.to_datetime(end_date)]

        # Only Delayed
        if only_delayed:
            if 'is_atrasado' in df.columns:
                df = df[df['is_atrasado'] == True]

        # 3. Calculate KPIs (from Filtered Data)
        total = len(df)
        
        encerrados_mask = df['status'].str.contains('ENCERRAMENTO|DEFERIDO|INDEFERIDO', na=False, case=False) if 'status' in df.columns else pd.Series([False] * len(df))
        encerrados_count = len(df[encerrados_mask]) if not df.empty else 0
        
        andamento_count = len(df[df['status'] == 'ANDAMENTO']) if not df.empty and 'status' in df.columns else 0
        atrasados_count = len(df[df['is_atrasado'] == True]) if not df.empty and 'is_atrasado' in df.columns else 0
        
        # 4. Calculate Charts (from Filtered Data)
        
        # Evolution by Month
        evolution_data = []
        if not df.empty and 'month_year' in df.columns:
             evolution = df.groupby('month_year').agg(
                total=('id', 'count'),
                encerrados=('status', lambda x: x.str.contains('ENCERRAMENTO|DEFERIDO|INDEFERIDO', na=False, case=False).sum()),
                andamento=('status', lambda x: (x == 'ANDAMENTO').sum()),
                atrasados=('is_atrasado', 'sum')
            ).reset_index().sort_values('month_year')
             evolution_data = evolution.to_dict('records')

        # Top Types
        by_type_data = []
        if not df.empty and 'tipo_solicitacao' in df.columns:
            by_type = df['tipo_solicitacao'].value_counts().head(10).reset_index()
            by_type.columns = ['type', 'count']
            by_type_data = by_type.to_dict('records')

        # Closed by Type (Top and Bottom)
        by_type_closed_top = []
        by_type_closed_bottom = []
        if not df.empty and 'tipo_solicitacao' in df.columns and 'status' in df.columns:
            closed_df = df[df['status'].str.contains('ENCERRAMENTO|DEFERIDO|INDEFERIDO', na=False, case=False)]
            if not closed_df.empty:
                closed_counts = closed_df.groupby('tipo_solicitacao')['id'].count().reset_index().sort_values('id', ascending=False)
                top_closed = closed_counts.head(10).rename(columns={'tipo_solicitacao': 'type', 'id': 'count'})
                bottom_closed = closed_counts.sort_values('id', ascending=True).head(10).rename(columns={'tipo_solicitacao': 'type', 'id': 'count'})
                by_type_closed_top = top_closed.to_dict('records')
                by_type_closed_bottom = bottom_closed.to_dict('records')

        # Top Delayed Types
        by_type_delayed_data = []
        if not df.empty and 'tipo_solicitacao' in df.columns and 'is_atrasado' in df.columns:
            delayed_df = df[df['is_atrasado'] == True]
            if not delayed_df.empty:
                by_type_delayed = delayed_df['tipo_solicitacao'].value_counts().head(10).reset_index()
                by_type_delayed.columns = ['type', 'count']
                by_type_delayed_data = by_type_delayed.to_dict('records')

        return {
            "total": total,
            "encerrados": encerrados_count,
            "andamento": andamento_count,
            "atrasados": atrasados_count,
            "by_month": evolution_data,
            "by_type": by_type_data,
            "by_type_delayed": by_type_delayed_data,
            "by_type_closed_top": by_type_closed_top,
            "by_type_closed_bottom": by_type_closed_bottom,
            "all_statuses": all_statuses,
            "all_types": all_types,
            "available_months": available_months
        }
    except Exception as e:
        logger.error(f"Error in get_stats: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Stats calculation error: {str(e)}")



@app.get("/processes")
def get_processes(
    page: int = 1, 
    limit: int = 10, 
    search: Optional[str] = None, 
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    only_delayed: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from models import Process
    
    # Query Database
    query = db.query(Process).filter(Process.user_id == user.id)
    df = pd.read_sql(query.statement, db.bind)

    if df.empty:
        return {"data": [], "total": 0, "page": page, "pages": 0}
        
    # Normalize Request Type to avoid duplicates (e.g. "Tipo A" vs "Tipo A ")
    if 'tipo_solicitacao' in df.columns:
        df['tipo_solicitacao'] = df['tipo_solicitacao'].astype(str).str.strip().str.replace(r'\s+', ' ', regex=True)

    # Pre-process dates for filtering
    if 'data_abertura' in df.columns:
        df['dt'] = pd.to_datetime(df['data_abertura'], format='%d/%m/%Y', errors='coerce')
        df['month_year'] = df['dt'].dt.strftime('%Y-%m')

    # Filter
    # Filter by Date Range
    if start_date and 'dt' in df.columns:
        df = df[df['dt'] >= pd.to_datetime(start_date)]
    if end_date and 'dt' in df.columns:
        df = df[df['dt'] <= pd.to_datetime(end_date)]

    if status_filter:
        logger.info(f"DEBUG: RAW status_filter='{status_filter}'")
        # Support multiple statuses (comma-separated)
        statuses = [s.strip() for s in status_filter.split(',')]
        logger.info(f"DEBUG: Filtering by statuses={statuses}")
        logger.info(f"DEBUG: Available statuses in DF: {df['status'].unique().tolist()}")
        df = df[df['status'].isin(statuses)]

    if only_delayed:
        df = df[df['is_atrasado'] == True]
        
    if type_filter:
        types = [t.strip() for t in type_filter.split(',')]
        df = df[df['tipo_solicitacao'].isin(types)]


        
    if search:
        search = search.lower()
        # Search across multiple columns
        mask = (
            df['id'].str.lower().str.contains(search) | 
            df['contribuinte'].str.lower().str.contains(search) |
            df['tipo_solicitacao'].str.lower().str.contains(search)
        )
        df = df[mask]
    
    # Conditional sorting:
    # - If filtering only delayed: sort by delay days (descending - most delayed first)
    # - Otherwise: sort by opening date (descending - most recent first)
    if only_delayed:
        df = df.sort_values('dias_atraso_calc', ascending=False)
    else:
        # Sort by opening date (most recent first)
        df = df.sort_values('dt', ascending=False)
    
    # Pagination
    total_records = len(df)
    total_pages = (total_records + limit - 1) // limit
    
    start = (page - 1) * limit
    end = start + limit
    
    paginated = df.iloc[start:end].to_dict('records')
    
    return {
        "data": paginated,
        "total": total_records,
        "page": page,
        "pages": total_pages
    }

@app.get("/export-excel")
def export_excel(
    search: Optional[str] = None,
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    only_delayed: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export filtered processes to a formatted Excel file."""
    import xlsxwriter
    from datetime import datetime
    from models import Process

    # Query Database
    query = db.query(Process).filter(Process.user_id == user.id)
    df = pd.read_sql(query.statement, db.bind)

    if df.empty:
        raise HTTPException(status_code=400, detail="Nenhum dado disponível para exportar.")

    # Normalize Request Type to avoid duplicates (e.g. "Tipo A" vs "Tipo A ")
    if 'tipo_solicitacao' in df.columns:
        df['tipo_solicitacao'] = df['tipo_solicitacao'].astype(str).str.strip().str.replace(r'\s+', ' ', regex=True)

    # Pre-process dates
    if 'data_abertura' in df.columns:
        df['dt'] = pd.to_datetime(df['data_abertura'], format='%d/%m/%Y', errors='coerce')
        df['month_year'] = df['dt'].dt.strftime('%Y-%m')

    # Apply filters (same logic as /processes)
    if start_date and 'dt' in df.columns:
        df = df[df['dt'] >= pd.to_datetime(start_date)]
    if end_date and 'dt' in df.columns:
        df = df[df['dt'] <= pd.to_datetime(end_date)]

    if status_filter:
        statuses = [s.strip() for s in status_filter.split(',')]
        df = df[df['status'].isin(statuses)]

    if only_delayed:
        df = df[df['is_atrasado'] == True]

    if type_filter:
        types = [t.strip() for t in type_filter.split(',')]
        df = df[df['tipo_solicitacao'].isin(types)]

    if search:
        search_lower = search.lower()
        mask = (
            df['id'].str.lower().str.contains(search_lower) |
            df['contribuinte'].str.lower().str.contains(search_lower) |
            df['tipo_solicitacao'].str.lower().str.contains(search_lower)
        )
        df = df[mask]

    # Sort by date (most recent first)
    if only_delayed and 'dias_atraso_calc' in df.columns:
        df = df.sort_values('dias_atraso_calc', ascending=False)
    elif 'dt' in df.columns:
        df = df.sort_values('dt', ascending=False)

    # Build Excel in memory
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    worksheet = workbook.add_worksheet('Processos')

    # --- Formats ---
    header_fmt = workbook.add_format({
        'bold': True,
        'font_color': '#FFFFFF',
        'bg_color': '#1E3A5F',
        'border': 1,
        'border_color': '#B0BEC5',
        'align': 'center',
        'valign': 'vcenter',
        'font_size': 11,
        'text_wrap': True,
    })
    cell_fmt = workbook.add_format({
        'border': 1,
        'border_color': '#D0D5DD',
        'font_size': 10,
        'valign': 'vcenter',
    })
    cell_center_fmt = workbook.add_format({
        'border': 1,
        'border_color': '#D0D5DD',
        'font_size': 10,
        'align': 'center',
        'valign': 'vcenter',
    })
    cell_right_fmt = workbook.add_format({
        'border': 1,
        'border_color': '#D0D5DD',
        'font_size': 10,
        'align': 'right',
        'valign': 'vcenter',
    })
    delay_fmt = workbook.add_format({
        'border': 1,
        'border_color': '#D0D5DD',
        'font_size': 10,
        'align': 'right',
        'valign': 'vcenter',
        'bold': True,
        'font_color': '#DC2626',
    })
    # Status formats
    status_green = workbook.add_format({
        'border': 1, 'border_color': '#D0D5DD', 'font_size': 10,
        'align': 'center', 'valign': 'vcenter',
        'bg_color': '#DCFCE7', 'font_color': '#166534',
    })
    status_red = workbook.add_format({
        'border': 1, 'border_color': '#D0D5DD', 'font_size': 10,
        'align': 'center', 'valign': 'vcenter',
        'bg_color': '#FEE2E2', 'font_color': '#991B1B',
    })
    status_blue = workbook.add_format({
        'border': 1, 'border_color': '#D0D5DD', 'font_size': 10,
        'align': 'center', 'valign': 'vcenter',
        'bg_color': '#DBEAFE', 'font_color': '#1E40AF',
    })
    status_orange = workbook.add_format({
        'border': 1, 'border_color': '#D0D5DD', 'font_size': 10,
        'align': 'center', 'valign': 'vcenter',
        'bg_color': '#FFEDD5', 'font_color': '#9A3412',
    })
    status_gray = workbook.add_format({
        'border': 1, 'border_color': '#D0D5DD', 'font_size': 10,
        'align': 'center', 'valign': 'vcenter',
        'bg_color': '#F3F4F6', 'font_color': '#374151',
    })

    # Title row
    title_fmt = workbook.add_format({
        'bold': True, 'font_size': 14, 'font_color': '#1E3A5F',
    })
    subtitle_fmt = workbook.add_format({
        'font_size': 10, 'font_color': '#64748B', 'italic': True,
    })
    worksheet.merge_range('A1:F1', 'Report Terra - Processos', title_fmt)
    export_time = datetime.now().strftime('%d/%m/%Y %H:%M')
    filters_desc = []
    if start_date or end_date:
        filters_desc.append(f"Período: {start_date or 'Início'} a {end_date or 'Fim'}")
    if status_filter:
        filters_desc.append(f"Situação: {status_filter}")
    if type_filter:
        filters_desc.append(f"Tipo: {type_filter}")
    if search:
        filters_desc.append(f"Busca: {search}")
    if only_delayed:
        filters_desc.append("Apenas Atrasados")
    subtitle = f"Exportado em {export_time}"
    if filters_desc:
        subtitle += f" | Filtros: {', '.join(filters_desc)}"
    subtitle += f" | Total: {len(df)} registros"
    worksheet.merge_range('A2:F2', subtitle, subtitle_fmt)

    # Headers (row 3, index 2)
    headers = ['Nº Proc. / Ano', 'Contribuinte', 'Data Abertura', 'Situação', 'Tipo de Solicitação', 'Dias Atraso']
    col_widths = [18, 35, 15, 20, 40, 14]
    for col, (header, width) in enumerate(zip(headers, col_widths)):
        worksheet.write(3, col, header, header_fmt)
        worksheet.set_column(col, col, width)

    # Data rows
    def get_status_fmt(status_val):
        if any(s in str(status_val) for s in ['ENCERRAMENTO', 'DEFERIDO']):
            return status_green
        if any(s in str(status_val) for s in ['INDEFERIDO', 'CANCELADO']):
            return status_red
        if str(status_val) in ['ANDAMENTO', 'EM DILIGENCIA']:
            return status_blue
        if str(status_val) in ['RETORNO', 'PENDENCIA', 'SUSPENSO']:
            return status_orange
        return status_gray

    for row_idx, (_, row) in enumerate(df.iterrows(), start=4):
        worksheet.write(row_idx, 0, str(row.get('id', '')), cell_center_fmt)
        worksheet.write(row_idx, 1, str(row.get('contribuinte', '')), cell_fmt)
        worksheet.write(row_idx, 2, str(row.get('data_abertura', '')), cell_center_fmt)
        worksheet.write(row_idx, 3, str(row.get('status', '')), get_status_fmt(row.get('status', '')))
        worksheet.write(row_idx, 4, str(row.get('tipo_solicitacao', '')), cell_fmt)

        is_delayed = row.get('is_atrasado', False)
        delay_days = row.get('dias_atraso_calc', 0)
        if is_delayed and delay_days:
            worksheet.write(row_idx, 5, f"{delay_days} dias", delay_fmt)
        else:
            worksheet.write(row_idx, 5, '-', cell_center_fmt)

    # Freeze header row
    worksheet.freeze_panes(4, 0)
    worksheet.set_row(3, 22)

    workbook.close()
    output.seek(0)

    filename = f"Report_Terra_Processos_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

# --- ADMIN ENDPOINTS ---

class UserUpdate(BaseModel):
    role: Optional[str] = None
    can_generate_report: Optional[bool] = None
    is_active: Optional[bool] = None
    approval_status: Optional[str] = None

@app.get("/admin/users")
def admin_list_users(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": getattr(u, 'role', 'user'),
            "can_generate_report": bool(getattr(u, 'can_generate_report', False)),
            "is_active": u.is_active,
            "approval_status": getattr(u, "approval_status", "approved") or "approved",
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@app.patch("/admin/users/{user_id}")
def admin_update_user(user_id: int, update: UserUpdate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if update.role is not None:
        user.role = update.role
    if update.can_generate_report is not None:
        user.can_generate_report = update.can_generate_report
    if update.is_active is not None:
        user.is_active = update.is_active
    if update.approval_status is not None:
        if update.approval_status not in ["pending", "approved", "rejected"]:
            raise HTTPException(status_code=400, detail="approval_status inválido")
        user.approval_status = update.approval_status
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": getattr(user, 'role', 'user'),
        "can_generate_report": bool(getattr(user, 'can_generate_report', False)),
        "is_active": user.is_active,
        "approval_status": getattr(user, "approval_status", "approved") or "approved",
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

@app.delete("/admin/users/{user_id}")
def admin_deactivate_user(user_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Não é possível desativar seu próprio usuário")
    user.is_active = False
    db.commit()
    return {"message": f"Usuário {user.email} desativado"}

@app.delete("/admin/users/{user_id}/permanent")
def admin_delete_user(user_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Exclui permanentemente um usuário e todos os seus dados associados."""
    from models import UserActivity, Process
    from models import Report
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir seu próprio usuário")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Não é possível excluir outro administrador. Remova o papel de admin primeiro.")
    email = user.email
    db.query(UserActivity).filter(UserActivity.user_id == user_id).delete()
    db.query(Report).filter(Report.user_id == user_id).delete()
    db.query(Process).filter(Process.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": f"Usuário {email} excluído permanentemente"}

# --- ADMIN AUDIT ENDPOINTS ---

@app.get("/admin/audit/summary")
def admin_audit_summary(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """KPIs globais de atividade."""
    from models import UserActivity
    from sqlalchemy import func

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = db.query(User).count()

    # Usuários ativos (que fizeram login) por período
    def active_users_since(since):
        return db.query(func.count(func.distinct(UserActivity.user_id))).filter(
            UserActivity.action == "login",
            UserActivity.timestamp >= since
        ).scalar() or 0

    # Contagem de logins
    def login_count_since(since):
        return db.query(func.count(UserActivity.id)).filter(
            UserActivity.action == "login",
            UserActivity.timestamp >= since
        ).scalar() or 0

    failed_today = db.query(func.count(UserActivity.id)).filter(
        UserActivity.action == "login_failed",
        UserActivity.timestamp >= today_start
    ).scalar() or 0

    return {
        "total_users": total_users,
        "active_users_today": active_users_since(today_start),
        "active_users_week": active_users_since(week_ago),
        "active_users_month": active_users_since(month_ago),
        "total_logins_today": login_count_since(today_start),
        "total_logins_week": login_count_since(week_ago),
        "failed_logins_today": failed_today,
    }

@app.get("/admin/audit/users")
def admin_audit_users(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Atividade por usuário."""
    from models import UserActivity, Process
    from sqlalchemy import func

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    users = db.query(User).all()
    result = []

    for u in users:
        login_7d = db.query(func.count(UserActivity.id)).filter(
            UserActivity.user_id == u.id,
            UserActivity.action == "login",
            UserActivity.timestamp >= week_ago
        ).scalar() or 0

        login_30d = db.query(func.count(UserActivity.id)).filter(
            UserActivity.user_id == u.id,
            UserActivity.action == "login",
            UserActivity.timestamp >= month_ago
        ).scalar() or 0

        process_count = db.query(func.count(Process.id)).filter(
            Process.user_id == u.id
        ).scalar() or 0

        result.append({
            "user_id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": getattr(u, 'role', 'user'),
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if getattr(u, 'last_login', None) else None,
            "login_count_7d": login_7d,
            "login_count_30d": login_30d,
            "total_processes": process_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return result

@app.get("/admin/audit/activity")
def admin_audit_activity(days: int = 30, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Série temporal de logins diários para gráfico."""
    from models import UserActivity
    from sqlalchemy import func

    since = datetime.utcnow() - timedelta(days=days)

    rows = db.query(
        func.date(UserActivity.timestamp).label("date"),
        func.count(UserActivity.id).label("logins"),
        func.count(func.distinct(UserActivity.user_id)).label("unique_users"),
    ).filter(
        UserActivity.action == "login",
        UserActivity.timestamp >= since
    ).group_by(
        func.date(UserActivity.timestamp)
    ).order_by("date").all()

    return {
        "daily_logins": [
            {"date": str(r.date), "logins": r.logins, "unique_users": r.unique_users}
            for r in rows
        ]
    }

@app.get("/admin/audit/user/{user_id}/history")
def admin_audit_user_history(user_id: int, limit: int = 50, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Histórico de atividade de um usuário específico."""
    from models import UserActivity

    activities = db.query(UserActivity).filter(
        UserActivity.user_id == user_id
    ).order_by(UserActivity.timestamp.desc()).limit(limit).all()

    return [
        {
            "action": a.action,
            "ip_address": a.ip_address,
            "user_agent": a.user_agent,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in activities
    ]

# Mount static files (Frontend)
# Only mount if directory exists (in production or after local build)
# Mount static files (Frontend)
# Calculate absolute path to frontend/out (sibling of backend)
backend_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(backend_dir)
static_dir = os.path.join(project_root, "frontend", "out")

if os.path.isdir(os.path.join(static_dir, "_next")):
    app.mount("/_next", StaticFiles(directory=os.path.join(static_dir, "_next")), name="next-static")

@app.get("/")
async def serve_spa_root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not built (run 'npm run build')"}

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve the React app for any other route"""
    # Don't serve HTML for API/admin paths — return 404 JSON instead
    clean = full_path.strip('/')
    if clean.startswith('admin') or clean.startswith('api/') or clean == 'api':
        raise HTTPException(status_code=404, detail=f"Route /{full_path} not found")

    # Check if file exists in frontend/out
    file_path = os.path.join(static_dir, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # If not found, return index.html (SPA)
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {"message": "Frontend not built or not found (run 'npm run build' in frontend/)"}

from ai_agent import generate_analysis_stream

@app.post("/api/generate-report")
async def generate_report(
    search: Optional[str] = None, 
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    only_delayed: bool = False,
    user_prompt: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates an AI report based on the filtered data.
    Streams the response in Markdown format.
    """
    # Check permission: admin always can; others need can_generate_report=True
    user_role = getattr(user, 'role', 'user')
    user_can = getattr(user, 'can_generate_report', False)
    if user_role != "admin" and not user_can:
        raise HTTPException(status_code=403, detail="Permissão negada. Contate o administrador para liberar acesso aos relatórios de IA.")

    from models import Process
    query = db.query(Process).filter(Process.user_id == user.id)
    df = pd.read_sql(query.statement, db.bind)

    if df.empty:
        # Stream a message saying no data
        async def no_data_gen():
            yield "Não há dados disponíveis para análise."
        return StreamingResponse(no_data_gen(), media_type="text/markdown")

    # --- Filtering Logic (Same as other endpoints) ---
    
    # Normalize Request Type
    if 'tipo_solicitacao' in df.columns:
        df['tipo_solicitacao'] = df['tipo_solicitacao'].astype(str).str.strip().str.replace(r'\s+', ' ', regex=True)

    # Pre-process dates
    if 'data_abertura' in df.columns:
        df['dt'] = pd.to_datetime(df['data_abertura'], format='%d/%m/%Y', errors='coerce')
    
    # Apply Filters
    if start_date and 'dt' in df.columns:
        df = df[df['dt'] >= pd.to_datetime(start_date)]
    if end_date and 'dt' in df.columns:
        df = df[df['dt'] <= pd.to_datetime(end_date)]

    if status_filter:
        statuses = [s.strip() for s in status_filter.split(',')]
        if 'status' in df.columns:
            df = df[df['status'].isin(statuses)]

    if only_delayed and 'is_atrasado' in df.columns:
        df = df[df['is_atrasado'] == True]

    if type_filter:
        types = [t.strip() for t in type_filter.split(',')]
        if 'tipo_solicitacao' in df.columns:
            df = df[df['tipo_solicitacao'].isin(types)]

    if search:
        search_lower = search.lower()
        mask = (
            df['id'].astype(str).str.lower().str.contains(search_lower) |
            df['contribuinte'].astype(str).str.lower().str.contains(search_lower)
        )
        if 'tipo_solicitacao' in df.columns:
             mask |= df['tipo_solicitacao'].astype(str).str.lower().str.contains(search_lower)
        df = df[mask]
    
    # --- End Filtering ---

    return StreamingResponse(
        generate_analysis_stream(df, user_prompt or ""),
        media_type="text/markdown"
    )

@app.post("/api/shutdown")
def shutdown_server():
    """Shuts down the backend server. The start.sh supervisor will restart it automatically."""
    import signal
    import threading

    def kill():
        time.sleep(1)
        logger.info("Shutting down server requested by user.")
        # Use SIGTERM for graceful shutdown - the supervisor in start.sh will restart us
        os.kill(os.getpid(), signal.SIGTERM)

    threading.Thread(target=kill).start()
    return {"message": "Reiniciando servidor..."}


# --- FEEDBACK SYSTEM ---

class FeedbackModel(BaseModel):
    user_id: str
    report_content: str
    rating: str  # "positive" or "negative"
    comment: Optional[str] = None
    timestamp: float = 0.0

FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), "data", "feedback_log.json")

@app.post("/api/feedback")
def submit_feedback(feedback: FeedbackModel):
    """
    Saves user feedback to refine future AI generations.
    """
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)
        
        # Load existing
        feedbacks = []
        if os.path.exists(FEEDBACK_FILE):
            try:
                with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
                    feedbacks = json.load(f)
            except json.JSONDecodeError:
                feedbacks = [] # Reset if corrupted

        # Add new
        entry = feedback.dict()
        entry["timestamp"] = time.time()
        feedbacks.append(entry)
        
        # Save
        with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(feedbacks, f, indent=2, ensure_ascii=False)
            
        logger.info(f"Feedback received from {feedback.user_id}: {feedback.rating}")
        return {"message": "Feedback received!", "status": "success"}
        
    except Exception as e:
        logger.error(f"Error saving feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
