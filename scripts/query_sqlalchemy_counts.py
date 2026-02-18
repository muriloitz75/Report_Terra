import sys
from sqlalchemy import text

sys.path.append("backend")

import database

def main():
    with database.engine.connect() as conn:
        total = conn.execute(text("select count(*) from processes")).fetchone()[0]
        user5 = conn.execute(text("select count(*) from processes where user_id = 5")).fetchone()[0]
        print("Engine URL:", database.engine.url)
        print("Total processes:", total)
        print("Processes user_id=5:", user5)

if __name__ == "__main__":
    main()
