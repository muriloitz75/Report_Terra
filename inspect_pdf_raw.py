
import pdfplumber
import re

pdf_path = "pdf model/21.pdf"
STATUS_KEYWORDS = [
    "ANDAMENTO", "ENCERRAMENTO", "DEFERIDO", "INDEFERIDO", 
    "SUSPENSO", "CANCELADO", "RETORNO", "EM DILIGENCIA", "PENDENCIA"
]
status_pattern = r"\s+(" + "|".join(STATUS_KEYWORDS) + r")\s+"

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        if not text: continue
        lines = text.split('\n')
        print(f"--- Page {i+1} Sample ---")
        count = 0
        for line in lines:
            if "Nº Proc" in line: continue
            match = re.search(status_pattern, line)
            if match:
                print(f"RAW: '{line}'")
                count += 1
            if count >= 5: break
        if count >= 5: break
