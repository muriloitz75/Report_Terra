import sys, json, glob
sys.path.insert(0, 'backend')
from process_pdf import parse_pdf

files = glob.glob('pdf model/*.pdf')
data = parse_pdf(files[0])

results = [{"id": p["id"], "contribuinte": p["contribuinte"]} for p in data[:15]]
with open("debug_test_result.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
print(f"Total: {len(data)} processos extraidos")
