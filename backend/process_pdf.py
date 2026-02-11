import pdfplumber
import re
from datetime import datetime, timedelta
import logging
import unicodedata

# Disable verbose pdfminer logs
logging.getLogger('pdfminer').setLevel(logging.WARNING)

def normalize_text(text):
    """Normalize text: remove accents, standardize dashes, uppercase."""
    if not text: return ""
    # Normalize unicode characters (e.g. decompose accents)
    nfkd_form = unicodedata.normalize('NFKD', text)
    # Filter out non-spacing mark characters (accents)
    text_no_accents = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    # Replace various dashes with standard hyphen
    text_normalized = text_no_accents.replace('–', '-').replace('—', '-').upper()
    return text_normalized.strip()

def parse_pdf(pdf_path):
    processes = []
    
    # Status keywords to anchor the split
    STATUS_KEYWORDS = [
        "ANDAMENTO", "ENCERRAMENTO", "DEFERIDO", "INDEFERIDO", 
        "SUSPENSO", "CANCELADO", "RETORNO", "EM DILIGENCIA", "PENDENCIA"
    ]
    status_pattern = r"\s+(" + "|".join(STATUS_KEYWORDS) + r")\s+"
    
    # Regex to capture the start of the line: ID + Contribuinte + Dates
    # Handling potential missing space before dates: (.+?)(\d{2}...)
    # Updated to allow variable length IDs and optional leading whitespace
    start_pattern = re.compile(r"^\s*(\d+ - \d{4})\s+(.+?)(\d{2}/\d{2}/\d{4} \/ \d{2}/\d{2}/\d{4})")

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
                    
                    # Regex flexível para capturar setores conhecidos
                    # Procura pelo setor em qualquer lugar da string após o status
                    # Grupos: 1=Lixo/Prefixo, 2=Setor, 3=Tipo de Solicitação
                    sector_pattern = re.compile(r"(.*?)(DIRETORIA DE ARRECADA.*?|PROTOCOLO E ATENDIMEN.*?|GABINETE.*?)\s+(.*)")
                    
                    sector_match = sector_pattern.search(rest_after_status)
                    
                    if sector_match:
                        # group(1) é o que vem antes (ex: "PARCIAL "), ignoramos ou juntamos ao setor se fizer sentido.
                        # Por enquanto, vamos ignorar o prefixo sujo e pegar o setor limpo.
                        sector_current = sector_match.group(2).strip()
                        request_type_full = sector_match.group(3).strip()
                    else:
                        # Fallback: Tenta separar por "DIRETORIA" genérico se não casou com o acima
                        if "DIRETORIA" in rest_after_status:
                             parts = rest_after_status.split("DIRETORIA", 1) # Split apenas na primeira ocorrência
                             if len(parts) > 1:
                                 # Tenta inferir se é um setor válido
                                 # Assume que DIRETORIA é o início do setor
                                 # Mas o split removeu o termo.
                                 # Vamos tentar pegar tudo a partir de DIRETORIA
                                 idx = rest_after_status.find("DIRETORIA")
                                 sector_current = rest_after_status[idx:] # Pega tudo... arriscado se o tipo estiver depois
                                 # Melhor abordagem: Se tiver DIRETORIA, assume que o setor vai até o fim SE não tiver mais espaços grandes?
                                 # Ou tenta quebrar no próximo espaço duplo?
                                 # Por enquanto, se falhar no regex principal, vamos assumir N/A para evitar sujar o tipo.
                                 pass
                    
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
                    
                    # Normalize Request Type (remove extra spaces and inconsistent whitespace)
                    if request_type_full:
                        request_type_full = " ".join(request_type_full.split())
                            
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
    
    # --- Post-Processing: Deduplicate Request Types ---
    # Heuristic: Map longer types to shorter types if they start with the shorter type.
    # This handles cases where "Column 1" (Type) is merged with "Column 2" (Title/Detail).
    # Example: "CANCELAMENTO DE NOTAS" vs "CANCELAMENTO DE NOTAS CANCELAMENTO DE NOTA F"
    
    # 1. Collect all unique types
    # First, normalize all types in the processes list itself
    for p in processes:
        p['tipo_solicitacao'] = normalize_text(p['tipo_solicitacao'])

    unique_types = sorted(list(set(p['tipo_solicitacao'] for p in processes)), key=len)
    
    # 2. Build mapping (Long -> Shortest Valid Prefix)
    # Actually we want the Longest Valid Prefix to be safe? 
    # e.g. "Type A Subtype B" -> "Type A" (if "Type A" exists)
    type_mapping = {}
    
    for t_long in unique_types:
        best_base = t_long
        for t_short in unique_types:
            # Must be strictly shorter
            if len(t_short) < len(t_long):
                # Must be a prefix
                if t_long.startswith(t_short):
                    # Must respect word boundary (next char is space)
                    # t_long is longer, so t_long[len(t_short)] exists.
                    char_after = t_long[len(t_short)]
                    if char_after == ' ':
                        # Found a valid prefix.
                        # We want the Longest such prefix (most specific).
                        # Since unique_types is sorted by length, we are iterating from short to long.
                        # So this t_short is longer than previous ones? No, outer loop is t_long.
                        # Inner loop: sorted by length. So we will see shorter ones first.
                        # We want to keep updating best_base if we find a longer match.
                        best_base = t_short
        
        type_mapping[t_long] = best_base

    # 3. Apply mapping
    for p in processes:
        p['tipo_solicitacao'] = type_mapping.get(p['tipo_solicitacao'], p['tipo_solicitacao'])
        
        # Hardcoded corrections for cut-off types (based on user feedback)
        t = p['tipo_solicitacao']
        if t in ['CREDITO TRIBUTARIO - RES', 'CREDITO TRIBUTARIO - RE']:
            p['tipo_solicitacao'] = 'CREDITO TRIBUTARIO - RESTITUICAO'
        elif t in ['IMUNIDADE TRIBUTARIA - R', 'IMUNIDADE TRIBUTARIA - RE']:
             p['tipo_solicitacao'] = 'IMUNIDADE TRIBUTARIA - RECONHECIMENTO' # Assumption based on pattern, can be adjusted
        elif t == 'CANCELAMENTO DE NOTA F':
             p['tipo_solicitacao'] = 'CANCELAMENTO DE NOTAS'

    return processes

if __name__ == "__main__":
    import json
    data = parse_pdf("pdf model/21.pdf")
    with open("extracted_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Total extracted: {len(data)}")
