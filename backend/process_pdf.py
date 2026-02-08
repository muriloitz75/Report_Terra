import pdfplumber
import re
from datetime import datetime, timedelta

def parse_pdf(pdf_path):
    processes = []
    
    # Status keywords to anchor the split
    STATUS_KEYWORDS = ["ANDAMENTO", "ENCERRAMENTO", "DEFERIDO", "INDEFERIDO", "SUSPENSO", "CANCELADO"]
    status_pattern = r"\s+(" + "|".join(STATUS_KEYWORDS) + r")\s+"
    
    # Regex to capture the start of the line: ID + Contribuinte + Dates
    # Handling potential missing space before dates: (.+?)(\d{2}...)
    # Updated to allow variable length IDs (found 8 digits in logs)
    start_pattern = re.compile(r"^(\d+ - \d{4})\s+(.+?)(\d{2}/\d{2}/\d{4} \/ \d{2}/\d{2}/\d{4})")

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
                
            lines = text.split('\n')
            for line in lines:
                # Skip headers (heuristic: starts with "Nº Proc")
                if "Nº Proc. / Ano" in line or "PREFEITURA DE IMPERATRIZ" in line or not line.strip():
                    continue
                
                match = start_pattern.search(line)
                if match:
                    proc_id = match.group(1)
                    contribuinte = match.group(2).strip()
                    dates_str = match.group(3)
                    
                    # Parse dates
                    try:
                        entry_date_str = dates_str.split(' / ')[0]
                        entry_date = datetime.strptime(entry_date_str, "%d/%m/%Y")
                    except:
                        entry_date = None
                    
                    # Remainder of the line after the dates
                    remainder = line[match.end():].strip()
                    
                    # Split by Status
                    status_match = re.search(status_pattern, remainder)
                    status = "DESCONHECIDO"
                    sector_cad = ""
                    rest_after_status = remainder
                    
                    if status_match:
                        status = status_match.group(1)
                        sector_cad = remainder[:status_match.start()].strip()
                        rest_after_status = remainder[status_match.end():].strip()
                    
                    # Split Setor Atual (Assuming "DIRETORIA DE ARRECADAÇ" or finding the next block)
                    # Heuristic: Setor Atual is usually the first block after Status.
                    # We will try to find "DIRETORIA DE ARRECADAÇ" explicitly or take the first few words?
                    # Let's look for known sectors or just take everything before the Request Type.
                    # Given the difficulty, let's look for "DIRETORIA DE ARRECADAÇ" as a delimiter
                    
                    sector_current = "N/A"
                    request_type_full = rest_after_status
                    
                    if "DIRETORIA DE ARRECADAÇ" in rest_after_status:
                        parts = rest_after_status.split("DIRETORIA DE ARRECADAÇ")
                        sector_current = "DIRETORIA DE ARRECADAÇ"
                        request_type_full = parts[1].strip() if len(parts) > 1 else ""
                    
                    # Clean up Request Type (remove trailing days digits if separate)
                    # Example: "BAIXA DE DÉBITOS SIMPLE 8" -> "BAIXA DE DÉBITOS SIMPLE", "8"
                    days_delay_pdf = 0
                    days_match = re.search(r"\s+(\d+)$", request_type_full)
                    if days_match:
                        try:
                            days_delay_pdf = int(days_match.group(1))
                            request_type_full = request_type_full[:days_match.start()].strip()
                        except:
                            pass
                            
                    # Calculate 'is_delayed' based on USER RULE: 30 days after entry
                    is_delayed = False
                    days_since_entry = 0
                    current_date = datetime.now()
                    
                    if entry_date:
                        delta = current_date - entry_date
                        days_since_entry = delta.days
                        # Rule: Atrasado if > 30 days AND Status != ENCERRAMENTO (and maybe DEFERIDO/INDEFERIDO?)
                        # Assuming 'Em Andamento' are the ones that can be delayed.
                        # User said: "Atrasados são considerados com este estatus 30 dias após o cadastro de abertura"
                        # And: "Atrasados (Este último em relação aos em andamento)"
                        # So implies only 'ANDAMENTO' counts? Or any open process?
                        # I'll check if status is NOT final (Final = ENCERRAMENTO, DEFERIDO, INDEFERIDO, CANCELADO)
                        # Actually user said "Atrasados (Este último em relação aos em andamento)".
                        # This implies we check delay ONLY for "ANDAMENTO".
                        
                        if status == "ANDAMENTO" and days_since_entry > 30:
                            is_delayed = True
                            
                    processes.append({
                        "id": proc_id,
                        "contribuinte": contribuinte,
                        "data_abertura": entry_date_str if entry_date else "",
                        "ano": proc_id.split(' - ')[1] if ' - ' in proc_id else "",
                        "status": status,
                        "setor_atual": sector_current,
                        "tipo_solicitacao": request_type_full,
                        "dias_atraso_pdf": days_delay_pdf,
                        "dias_atraso_calc": days_since_entry - 30 if is_delayed else 0, # Positive delay
                        "is_atrasado": is_delayed
                    })
                else:
                    with open("skipped_lines.log", "a", encoding="utf-8") as f:
                        f.write(f"SKIPPED (No regex match): {line}\n")
                    
    
    # Debug: Print skipped lines to a file
    # with open("skipped_lines.log", "w", encoding="utf-8") as f:
    #     pass
        
    return processes

if __name__ == "__main__":
    import json
    data = parse_pdf("pdf model/21.pdf")
    with open("extracted_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Total extracted: {len(data)}")
