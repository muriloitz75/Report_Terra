
import pandas as pd
import json
import os

JSON_DB = "extracted_data.json"

def load_data():
    if os.path.exists(JSON_DB):
        with open(JSON_DB, "r", encoding="utf-8") as f:
            data = json.load(f)
            df = pd.DataFrame(data)
            return df
    return pd.DataFrame()

def test_filter():
    df = load_data()
    print(f"Total Rows: {len(df)}")
    
    if df.empty:
        print("DF is empty")
        return

    # Check unique statuses
    unique_statuses = df['status'].unique().tolist()
    print(f"Unique Statuses in DB: {unique_statuses}")
    
    # Check for whitespace/hidden chars
    print("Inspecting status values for whitespace:")
    for s in unique_statuses:
        print(f"'{s}' (len={len(s)})")

    # Test Filter
    status_filter = "ANDAMENTO,PENDENCIA"
    statuses = [s.strip() for s in status_filter.split(',')]
    print(f"\nFiltering by: {statuses}")
    
    filtered_df = df[df['status'].isin(statuses)]
    print(f"Filtered Rows: {len(filtered_df)}")
    
    if len(filtered_df) == 0:
        print("FILTER FAILED!")
        
        # Diagnostics: Check if any status matches exactly
        print("\nChecking exact matches:")
        for s in statuses:
            count = len(df[df['status'] == s])
            print(f"Status '{s}': {count} matches")

if __name__ == "__main__":
    test_filter()
