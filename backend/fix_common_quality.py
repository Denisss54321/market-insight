"""Замена 'common' на 'Обычный' в БД."""

from sqlalchemy import text
from app.db import engine

def fix_common_quality():
    with engine.begin() as connection:
        # Заменяем в item_stats
        result1 = connection.execute(text("""
            UPDATE item_stats 
            SET quality = 'Обычный' 
            WHERE quality = 'common'
        """))
        print(f"Updated {result1.rowcount} rows in item_stats")
        
        # Заменяем в lot_snapshots
        result2 = connection.execute(text("""
            UPDATE lot_snapshots 
            SET quality = 'Обычный' 
            WHERE quality = 'common'
        """))
        print(f"Updated {result2.rowcount} rows in lot_snapshots")

if __name__ == "__main__":
    fix_common_quality()
