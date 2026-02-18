import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "report_terra.db")

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users)")
    cols = [c[1] for c in cur.fetchall()]
    print("User columns:", cols)
    cur.execute("SELECT id, email, role, is_active, COALESCE(approval_status, '') FROM users ORDER BY id")
    for row in cur.fetchall():
        print(row)
    conn.close()

if __name__ == "__main__":
    main()

