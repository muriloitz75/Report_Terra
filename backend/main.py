from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
import pandas as pd
from typing import List, Optional
from pydantic import BaseModel
from process_pdf import parse_pdf
import tempfile
import logging

# Configure logging
# Use INFO in production, DEBUG in development
log_level = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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

# In-memory storage for simplicity (could be SQLite in future)
# We will store the dataframe globally for this session
DB = []

@app.get("/")
async def root():
    """Health check endpoint - API está funcionando"""
    return {
        "status": "online",
        "message": "Report Terra API está funcionando! 🚀",
        "docs": "/docs",
        "endpoints": {
            "upload": "POST /upload - Upload de PDF",
            "processes": "GET /processes - Listar processos",
            "export": "GET /export - Exportar para Excel"
        }
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        data = parse_pdf(tmp_path)
        global DB
        DB = data # Replace current DB with new load
        return {"message": "File processed successfully", "count": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.remove(tmp_path)

@app.get("/stats")
def get_stats(month_filter: Optional[str] = None):
    if not DB:
        return {
            "total": 0, "encerrados": 0, "andamento": 0, "atrasados": 0,
            "by_month": [], "by_type": []
        }
    
    df = pd.DataFrame(DB)
    
    # KPIs
    total = len(df)
    encerrados = len(df[df['status'] == 'ENCERRAMENTO']) # Adjust based on exact status string
    # Note: PDF has "ENCERRAMENTO", "DEFERIDO", "INDEFERIDO". Need to standardise?
    # User asked for "Total Encerrados". Assuming strictly "ENCERRAMENTO" or all finished?
    # I will count "ENCERRAMENTO" + "DEFERIDO" + "INDEFERIDO" as 'Finalized' in logic?
    # Or just "ENCERRAMENTO" word? User's words: "Total Encerrados".
    # I'll stick to 'ENCERRAMENTO' status keyword for now, or maybe grouped.
    # Let's check status values in DB.
    
    # Better approach:
    # Encerrados = Status contains "ENCERRAMENTO" (case insensitive?)
    # Em Andamento = Status == "ANDAMENTO"
    
    encerrados_count = len(df[df['status'].str.contains('ENCERRAMENTO', na=False)])
    andamento_count = len(df[df['status'] == 'ANDAMENTO'])
    atrasados_count = len(df[df['is_atrasado'] == True])
    
    # Line Chart: Evolution by Entry Date (Month/Year)
    if 'data_abertura' in df.columns and not df['data_abertura'].eq("").all():
        df['dt'] = pd.to_datetime(df['data_abertura'], format='%d/%m/%Y', errors='coerce')
        df['month_year'] = df['dt'].dt.strftime('%Y-%m') # Sortable
        
        evolution = df.groupby('month_year').agg(
            total=('id', 'count'),
            encerrados=('status', lambda x: x.str.contains('ENCERRAMENTO').sum()),
            andamento=('status', lambda x: (x == 'ANDAMENTO').sum()),
            atrasados=('is_atrasado', 'sum')
        ).reset_index().sort_values('month_year')
        
        evolution_data = evolution.to_dict('records')
    else:
        evolution_data = []

    # Bar Chart: Top Request Types
    by_type = df['tipo_solicitacao'].value_counts().head(10).reset_index()
    by_type.columns = ['type', 'count']
    by_type_data = by_type.to_dict('records')

    # Unique statuses for filter
    all_statuses = df['status'].unique().tolist() if 'status' in df.columns else []

    # Apply Filters for KPIs and Charts (if month_filter is present)
    # We calculate 'all_months' BEFORE filtering to keep the dropdown populated
    available_months = []
    if 'month_year' in df.columns:
        available_months = sorted(df['month_year'].dropna().unique().tolist())

    if month_filter:
        if 'month_year' in df.columns:
            df = df[df['month_year'] == month_filter]
        else:
             # If month_year wasn't created yet (empty dates), result matches nothing
             df = df[0:0]

    # Re-calculate KPIs on filtered data
    total = len(df)
    
    # Encerrados now includes: ENCERRAMENTO, DEFERIDO, INDEFERIDO
    encerrados_mask = df['status'].str.contains('ENCERRAMENTO|DEFERIDO|INDEFERIDO', na=False, case=False)
    encerrados_count = len(df[encerrados_mask]) if not df.empty else 0
    
    andamento_count = len(df[df['status'] == 'ANDAMENTO']) if not df.empty else 0
    atrasados_count = len(df[df['is_atrasado'] == True]) if not df.empty else 0

    # Re-calculate Charts on filtered data
    evolution_data = [] 
    if not df.empty and 'month_year' in df.columns:
         evolution = df.groupby('month_year').agg(
            total=('id', 'count'),
            encerrados=('status', lambda x: x.str.contains('ENCERRAMENTO|DEFERIDO|INDEFERIDO', na=False, case=False).sum()),
            andamento=('status', lambda x: (x == 'ANDAMENTO').sum()),
            atrasados=('is_atrasado', 'sum')
        ).reset_index().sort_values('month_year')
         evolution_data = evolution.to_dict('records')

    # Re-calc Types
    by_type_data = []
    if not df.empty:
        by_type = df['tipo_solicitacao'].value_counts().head(10).reset_index()
        by_type.columns = ['type', 'count']
        by_type_data = by_type.to_dict('records')

    return {
        "total": total,
        "encerrados": encerrados_count,
        "andamento": andamento_count,
        "atrasados": atrasados_count,
        "by_month": evolution_data,
        "by_type": by_type_data,
        "all_statuses": all_statuses,
        "available_months": available_months
    }

@app.get("/processes")
def get_processes(
    page: int = 1, 
    limit: int = 10, 
    search: Optional[str] = None, 
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    month_filter: Optional[str] = None,
    only_delayed: bool = False
):
    if not DB:
        return {"data": [], "total": 0, "page": page, "pages": 0}
        
    df = pd.DataFrame(DB)
    
    # Pre-process dates for filtering
    if 'data_abertura' in df.columns:
        df['dt'] = pd.to_datetime(df['data_abertura'], format='%d/%m/%Y', errors='coerce')
        df['month_year'] = df['dt'].dt.strftime('%Y-%m')

    # Filter
    if month_filter:
        df = df[df['month_year'] == month_filter]

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
        df = df[df['tipo_solicitacao'] == type_filter]


        
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
