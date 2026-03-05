import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "data", "report_terra.db")

def normalize_dash(text):
    if not text:
        return text
    return text.replace('\u2013', '-').replace('\u2014', '-')

def run_migration():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Merge CANCELAMENTO
        cursor.execute(
            "UPDATE processes SET tipo_solicitacao = ? WHERE tipo_solicitacao = ?",
            ("CANCELAMENTO DE NFS-E (EXTEMPORÂNEO)", "CANCELAMENTO DE NOTAS FISCAIS DE SERVIÇOS")
        )
        print(f"Updated {cursor.rowcount} rows merging CANCELAMENTO DE NOTAS FISCAIS DE SERVIÇOS -> CANCELAMENTO DE NFS-E (EXTEMPORÂNEO)")

        # 2. Normalize dashes
        cursor.execute("SELECT pk, tipo_solicitacao FROM processes WHERE tipo_solicitacao LIKE '%–%' OR tipo_solicitacao LIKE '%—%'")
        rows = cursor.fetchall()
        
        updates = 0
        for pk, tipo in rows:
            new_tipo = normalize_dash(tipo)
            if new_tipo != tipo:
                cursor.execute("UPDATE processes SET tipo_solicitacao = ? WHERE pk = ?", (new_tipo, pk))
                updates += 1
                
        print(f"Normalized dashes in {updates} rows")

        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
