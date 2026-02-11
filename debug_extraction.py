
from backend.process_pdf import parse_pdf
import json

try:
    data = parse_pdf("pdf model/21.pdf")
    types = [item['tipo_solicitacao'] for item in data]
    unique_types = sorted(list(set(types)))
    
    print(f"Total records: {len(data)}")
    print("\nUnique Types Found:")
    for t in unique_types:
        print(f"'{t}'")
        
    # Also print some raw examples to see context if needed
    print("\nFirst 10 records:")
    for item in data[:10]:
        print(f"ID: {item['id']} | Type: '{item['tipo_solicitacao']}'")

except Exception as e:
    print(f"Error: {e}")
