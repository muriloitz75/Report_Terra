import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "report_terra.db")

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM processes")
    print("Total processes:", cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM processes WHERE user_id = ?", (5,))
    count = cur.fetchone()[0]
    print("Process count for user_id=5:", count)
    cur.execute("SELECT COUNT(*) FROM users")
    print("Users count:", cur.fetchone()[0])
    print("\nClosed counts by tipo_solicitacao (user_id=5, top 5):")
    cur.execute("""
        SELECT tipo_solicitacao, COUNT(*) as cnt
        FROM processes
        WHERE user_id = ? AND (status LIKE '%ENCERRAMENTO%' OR status LIKE '%DEFERIDO%' OR status LIKE '%INDEFERIDO%')
        GROUP BY tipo_solicitacao
        ORDER BY cnt DESC
        LIMIT 5
    """, (5,))
    for row in cur.fetchall():
        print(f"- {row[0]}: {row[1]}")
    print("\nProcesses by user_id (top 10):")
    cur.execute("""
        SELECT user_id, COUNT(*) as cnt
        FROM processes
        GROUP BY user_id
        ORDER BY cnt DESC
        LIMIT 10
    """)
    for row in cur.fetchall():
        print(f"- user_id={row[0]}: {row[1]}")
    conn.close()


if __name__ == "__main__":
    main()
