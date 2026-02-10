from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
import io
import pandas as pd
from typing import List, Optional
from pydantic import BaseModel
from .process_pdf import parse_pdf
import tempfile
import logging

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

@app.get("/api/health")
async def health_check():
    """Health check endpoint - API está funcionando"""
    return {
        "status": "online",
        "message": "Report Terra API está funcionando! 🚀",
        "docs": "/docs"
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

@app.get("/export-excel")
def export_excel(
    search: Optional[str] = None,
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    month_filter: Optional[str] = None,
    only_delayed: bool = False
):
    """Export filtered processes to a formatted Excel file."""
    import xlsxwriter
    from datetime import datetime

    if not DB:
        raise HTTPException(status_code=400, detail="Nenhum dado disponível para exportar.")

    df = pd.DataFrame(DB)

    # Pre-process dates
    if 'data_abertura' in df.columns:
        df['dt'] = pd.to_datetime(df['data_abertura'], format='%d/%m/%Y', errors='coerce')
        df['month_year'] = df['dt'].dt.strftime('%Y-%m')

    # Apply filters (same logic as /processes)
    if month_filter:
        df = df[df['month_year'] == month_filter]

    if status_filter:
        statuses = [s.strip() for s in status_filter.split(',')]
        df = df[df['status'].isin(statuses)]

    if only_delayed:
        df = df[df['is_atrasado'] == True]

    if type_filter:
        df = df[df['tipo_solicitacao'] == type_filter]

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
    if month_filter:
        filters_desc.append(f"Período: {month_filter}")
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
    # API routes are prioritized (defined above)
    
    # Check if file exists in frontend/out
    file_path = os.path.join(static_dir, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # If not found, return index.html (SPA)
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {"message": "Frontend not built or not found (run 'npm run build' in frontend/)"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
