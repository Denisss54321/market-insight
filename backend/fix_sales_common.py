"""Исправление quality='common' в таблице sales."""

from sqlalchemy import text
from app.db import engine

def fix_sales_common():
    with engine.begin() as connection:
        result = connection.execute(text("""
            UPDATE sales 
            SET quality = 'Обычный' 
            WHERE quality = 'common'
        """))
        print(f"Updated {result.rowcount} rows in sales table")

if __name__ == "__main__":
    fix_sales_common()
