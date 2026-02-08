
import pdfplumber
import re

def inspect_statuses(pdf_path):
    # Current keywords
    STATUS_KEYWORDS = ["ANDAMENTO", "ENCERRAMENTO", "DEFERIDO", "INDEFERIDO", "SUSPENSO", "CANCELADO"]
    status_pattern = r"\s+(" + "|".join(STATUS_KEYWORDS) + r")\s+"
    
    # ID Regex (Updated)
    start_pattern = re.compile(r"^(\d+ - \d{4})\s+(.+?)(\d{2}/\d{2}/\d{4} \/ \d{2}/\d{2}/\d{4})")

    print(f"Scanning {pdf_path} for unknown statuses...")
    
    unknown_count = 0
    known_count = 0
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text: continue
            
            lines = text.split('\n')
            for line in lines:
                if "Nº Proc. / Ano" in line or "PREFEITURA DE IMPERATRIZ" in line or not line.strip():
                    continue
                
                match = start_pattern.search(line)
                if match:
                    remainder = line[match.end():].strip()
                    
                    status_match = re.search(status_pattern, remainder)
                    
                    if status_match:
                        known_count += 1
                        # print(f"Valid: {status_match.group(1)}") 
                    else:
                        unknown_count += 1
                        print(f"[Page {page_num+1}] UNKNOWN STATUS in line:")
                        print(f"  Remainder: '{remainder}'")
                        print("-" * 40)

    print(f"\nSummary:")
    print(f"Known: {known_count}")
    print(f"Unknown (DESCONHECIDO): {unknown_count}")

if __name__ == "__main__":
    inspect_statuses("pdf model/21.pdf")
