import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "report_terra.db")

def main():
    email = sys.argv[1] if len(sys.argv) > 1 else "test@example.com"
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, email, role, is_active FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    print("User:", row)
    conn.close()

if __name__ == "__main__":
    main()
