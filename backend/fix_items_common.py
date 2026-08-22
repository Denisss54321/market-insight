"""Замена 'common' на 'Обычный' в таблице items."""

from sqlalchemy import text
from app.db import engine

def fix_items_common():
    with engine.begin() as connection:
        # Заменяем в items
        result = connection.execute(text("""
            UPDATE items 
            SET quality = 'Обычный' 
            WHERE quality = 'common'
        """))
        print(f"Updated {result.rowcount} rows in items")

if __name__ == "__main__":
    fix_items_common()
