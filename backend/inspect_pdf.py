import pdfplumber
import json

def inspect_pdf(pdf_path):
    results = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            text = page.extract_text()
            results.append({
                "page": i + 1,
                "tables_count": len(tables),
                "first_table_sample": tables[0][:3] if tables else None,
                "text_sample": text[:500] if text else ""
            })
    
    with open("pdf_inspection.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    inspect_pdf("pdf model/21.pdf")
