"""Замена 'common' на 'Обычный' в lot_snapshots."""

from sqlalchemy import text
from app.db import engine

def fix_lot_snapshots_common():
    with engine.begin() as connection:
        result = connection.execute(text("""
            UPDATE lot_snapshots 
            SET quality = 'Обычный' 
            WHERE quality = 'common'
        """))
        print(f"Updated {result.rowcount} rows in lot_snapshots")

if __name__ == "__main__":
    fix_lot_snapshots_common()
