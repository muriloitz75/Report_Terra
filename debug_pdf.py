import pdfplumber
import os

folder = "pdf model"
files = [f for f in os.listdir(folder) if f.endswith(".pdf")]
path = os.path.join(folder, files[0])

with pdfplumber.open(path) as pdf:
    page = pdf.pages[0]
    words = page.extract_words(x_tolerance=3, y_tolerance=3)

# Row 000277 is at top~324 based on header file order (row 22, each row ~12.7px high from 113.9)
# Let's just dump all rows between top=300 and top=350 to find it
with open("debug_row277.txt", "w", encoding="utf-8") as f:
    rows = {}
    for w in words:
        row_key = round(w["top"])
        rows.setdefault(row_key, []).append(w)
    
    for rk in sorted(rows.keys()):
        row_words = sorted(rows[rk], key=lambda w: w["x0"])
        texts = [w["text"] for w in row_words]
        # Only show rows containing 000277 or CERTIDAO
        if any("000277" in t or "CERTIDAO" in t.upper() or "CERTIDÃO" in t for t in texts):
            f.write(f"\n=== ROW top={rk} ===\n")
            for w in row_words:
                f.write(f"  x0={w['x0']:7.2f}: '{w['text']}'\n")

print("Done - check debug_row277.txt")
