import pdfplumber
import json
import os, glob

folder = "pdf model"
files = glob.glob(os.path.join(folder, "*.pdf"))
pdf_path = files[0]

result = []
with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[0]
    words = page.extract_words(x_tolerance=3, y_tolerance=3)

    rows = {}
    for w in words:
        key = round(w["top"])
        rows.setdefault(key, []).append(w)

    count = 0
    for row_key in sorted(rows.keys()):
        ws = sorted(rows[row_key], key=lambda w: w["x0"])
        first = ws[0]["text"]
        if first and first[0].isdigit() and count < 6:
            row_data = {"top": row_key, "words": []}
            for w in ws:
                row_data["words"].append({
                    "x0": round(w["x0"], 2),
                    "x1": round(w["x1"], 2),
                    "text": w["text"]
                })
            result.append(row_data)
            count += 1

with open("debug_coords_result.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("Salvo em debug_coords_result.json")
