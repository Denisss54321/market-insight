"""Проверка 'common' во всех таблицах."""

from sqlalchemy import text
from app.db import engine

def check_all_common():
    with engine.begin() as connection:
        tables = ['items', 'item_stats', 'lot_snapshots']
        for table in tables:
            result = connection.execute(text(f"""
                SELECT COUNT(*) FROM {table} WHERE quality = 'common'
            """)).fetchone()
            count = result[0] if result else 0
            print(f"{table}: {count} rows with quality='common'")
            
            if count > 0:
                samples = connection.execute(text(f"""
                    SELECT * FROM {table} WHERE quality = 'common' LIMIT 5
                """)).fetchall()
                print(f"  Sample rows:")
                for row in samples:
                    print(f"    {row}")

if __name__ == "__main__":
    check_all_common()
