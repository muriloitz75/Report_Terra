import pdfplumber
import re
import os
from datetime import datetime, timedelta
import logging
import unicodedata
from tipo_resolver import resolve_tipo

# Disable verbose pdfminer logs
logging.getLogger('pdfminer').setLevel(logging.WARNING)

def normalize_text(text):
    """Normalize text: remove accents, standardize dashes, uppercase."""
    if not text: return ""
    nfkd_form = unicodedata.normalize('NFKD', text)
    text_no_accents = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    text_normalized = text_no_accents.replace('\u2013', '-').replace('\u2014', '-').upper()
    return text_normalized.strip()

# Business Rules Configuration
try:
    DELAY_THRESHOLD_DAYS = int(os.getenv("DELAY_THRESHOLD_DAYS", "30"))
except ValueError:
    DELAY_THRESHOLD_DAYS = 30

def parse_pdf(pdf_path, progress_callback=None):
    """
    Parse a Sistema Terra PDF report using bounding-box column detection.

    PDF Column X boundaries (confirmed from header row via extract_words):
      ID         : x < 85
      Contribuinte: 85 <= x < 213
      Datas      : 213 <= x < 390
      Status     : 390 <= x < 487   (Situação column - "Setor de Cadastro" overlaps but Status is at ~389)
      Setor Atual: 487 <= x < 581
      Tipo       : 581 <= x < 676
      Titulo     : 676 <= x < 772
      Dias       : x >= 772
    """
    processes = []

    STATUS_KEYWORDS = [
        "ANDAMENTO", "ENCERRAMENTO", "DEFERIDO", "INDEFERIDO",
        "SUSPENSO", "CANCELADO", "RETORNO", "EM DILIGENCIA", "PENDENCIA", "AGUARDANDO PAGAMENTO"
    ]

    # Column X boundaries derived from PDF header row bounding-box analysis
    # Actual word positions observed:
    #   Status words (ANDAMENTO etc): x ~ 389.0
    #   NUCLEO (start of Setor Atual): x ~ 485.4
    #   First word of Tipo:            x ~ 581.7 (varies by content)
    COL_ID_END      = 85
    COL_CONTRIB_END = 213
    COL_DATAS_END   = 388   # Status starts at x=389, so cut before it
    COL_STATUS_END  = 484   # NUCLEO starts at x=485.4, cut before it
    COL_SETOR_END   = 580   # Tipo starts at x=581.7 or higher
    COL_TIPO_END    = 676
    COL_TITULO_END  = 772


    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for page_idx, page in enumerate(pdf.pages):
            if progress_callback:
                try:
                    progress_callback(page_idx + 1, total_pages)
                except Exception:
                    pass

            words = page.extract_words(x_tolerance=3, y_tolerance=5)
            if not words:
                continue

            # Group words into logical rows using a tolerance of 6px.
            # Some PDFs render words of the same row at slightly different
            # vertical positions (e.g. top=139 vs top=140 for ID vs CPF),
            # so a simple round() would split them into separate rows.
            ROW_TOLERANCE = 6
            row_groups = []   # list of (representative_top, [words])
            for w in sorted(words, key=lambda w: w["top"]):
                placed = False
                for grp in row_groups:
                    if abs(w["top"] - grp[0]) <= ROW_TOLERANCE:
                        grp[1].append(w)
                        placed = True
                        break
                if not placed:
                    row_groups.append((w["top"], [w]))

            for _, row_words_unsorted in sorted(row_groups, key=lambda g: g[0]):
                row_words = sorted(row_words_unsorted, key=lambda w: w["x0"])

                # Assign each word to its column based on x0 position
                col_id       = []
                col_contrib  = []
                col_datas    = []
                col_status   = []
                col_setor_at = []
                col_tipo     = []
                col_titulo   = []
                col_dias     = []

                for w in row_words:
                    x = w["x0"]
                    t = w["text"]
                    if x < COL_ID_END:
                        col_id.append(t)
                    elif x < COL_CONTRIB_END:
                        col_contrib.append(t)
                    elif x < COL_DATAS_END:
                        col_datas.append(t)
                    elif x < COL_STATUS_END:
                        col_status.append(t)
                    elif x < COL_SETOR_END:
                        col_setor_at.append(t)
                    elif x < COL_TIPO_END:
                        col_tipo.append(t)
                    elif x < COL_TITULO_END:
                        col_titulo.append(t)
                    else:
                        col_dias.append(t)

                id_text = " ".join(col_id).strip()

                # Only process rows that are data rows (ID starts with digit)
                if not id_text or not id_text[0].isdigit():
                    continue

                # --- Clean contribuinte tokens contaminated with date ---
                # pdfplumber sometimes merges last name word with date, e.g. "PAS13/02/2026"
                # We strip any trailing date pattern from each contribuinte token.
                DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")
                cleaned_contrib = []
                for token in col_contrib:
                    m = DATE_RE.search(token)
                    if m:
                        # keep only the part before the date
                        clean = token[:m.start()].strip()
                        if clean:
                            cleaned_contrib.append(clean)
                    else:
                        cleaned_contrib.append(token)

                # Reconstruct fields
                contribuinte = " ".join(cleaned_contrib).strip()

                datas_text   = " ".join(col_datas).strip()
                status_raw   = " ".join(col_status).strip()
                setor_atual  = " ".join(col_setor_at).strip()
                tipo_raw     = " ".join(col_tipo).strip()
                dias_text    = " ".join(col_dias).strip()

                # Normalize status keyword
                status = "DESCONHECIDO"
                for kw in STATUS_KEYWORDS:
                    if kw in status_raw.upper():
                        status = kw
                        break

                # Parse opening date (first date in the dates column)
                entry_date_str = ""
                entry_date = None
                date_match = re.search(r"(\d{2}/\d{2}/\d{4})", datas_text)
                if date_match:
                    entry_date_str = date_match.group(1)
                    try:
                        entry_date = datetime.strptime(entry_date_str, "%d/%m/%Y")
                    except Exception:
                        pass

                # Parse year from ID (e.g. "001157 - 2026")
                ano = ""
                proc_id = id_text
                id_match = re.match(r"(\d+)\s*-\s*(\d{4})", proc_id)
                if id_match:
                    ano = id_match.group(2)
                    proc_id = f"{id_match.group(1)} - {id_match.group(2)}"

                # Parse days delay from dias column
                days_delay_pdf = 0
                if dias_text:
                    try:
                        days_delay_pdf = int(dias_text.strip())
                    except Exception:
                        pass

                # Resolve tipo_solicitacao against canonical reference list
                tipo_solicitacao = resolve_tipo(tipo_raw.strip()) if tipo_raw else ""

                # Calculate delay
                is_delayed = False
                days_since_entry = 0
                if entry_date:
                    delta = datetime.now() - entry_date
                    days_since_entry = delta.days
                    if status == "ANDAMENTO" and days_since_entry > DELAY_THRESHOLD_DAYS:
                        is_delayed = True

                processes.append({
                    "id": proc_id,
                    "contribuinte": contribuinte,
                    "data_abertura": entry_date_str,
                    "ano": ano,
                    "status": status,
                    "setor_atual": setor_atual,
                    "tipo_solicitacao": tipo_solicitacao,
                    "dias_atraso_pdf": days_delay_pdf,
                    "dias_atraso_calc": days_since_entry - DELAY_THRESHOLD_DAYS if is_delayed else 0,
                    "is_atrasado": is_delayed
                })
            
            # Free memory used by this page data to prevent OOM on large PDFs
            page.flush_cache()

    # tipo_solicitacao is already resolved and preserved in canonical form by resolve_tipo

    return processes


if __name__ == "__main__":
    import json
    folder = "pdf model"
    files = [f for f in os.listdir(folder) if f.endswith(".pdf")]
    data = parse_pdf(os.path.join(folder, files[0]))
    with open("extracted_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Total extracted: {len(data)}")
