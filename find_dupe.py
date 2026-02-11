
import pdfplumber
import re

pdf_path = "pdf model/21.pdf"

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        if not text: continue
        lines = text.split('\n')
        for line in lines:
            if "CANCELAMENTO DE NOTA F" in line:
                print(f"FOUND on Page {i+1}: '{line}'")
