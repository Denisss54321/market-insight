"""Проверка quality в таблице items."""

from sqlalchemy import text
from app.db import engine

def check_items_quality():
    with engine.begin() as connection:
        result = connection.execute(text("""
            SELECT DISTINCT quality FROM items ORDER BY quality
        """)).fetchall()
        print("Quality values in items table:")
        for row in result:
            print(f"  '{row[0]}'")
        
        # Проверяем конкретно 'common'
        result2 = connection.execute(text("""
            SELECT id, name_ru, quality FROM items WHERE quality = 'common' LIMIT 10
        """)).fetchall()
        print("\nItems with quality='common':")
        for row in result2:
            print(f"  id={row[0]}, name={row[1]}, quality={row[2]}")

if __name__ == "__main__":
    check_items_quality()
