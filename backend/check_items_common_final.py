"""Проверка и исправление quality='common' в таблице items."""

from sqlalchemy import text
from app.db import engine

def fix_items_common():
    with engine.begin() as connection:
        # Проверяем наличие
        result = connection.execute(text("""
            SELECT COUNT(*) FROM items WHERE quality = 'common' OR quality_ru = 'common'
        """)).fetchone()
        count = result[0] if result else 0
        
        if count > 0:
            print(f"Found {count} rows with quality='common' in items table")
            
            # Исправляем
            result = connection.execute(text("""
                UPDATE items 
                SET quality = 'Обычный' 
                WHERE quality = 'common'
            """))
            print(f"Updated {result.rowcount} rows in quality column")
            
            result = connection.execute(text("""
                UPDATE items 
                SET quality_ru = 'Обычный' 
                WHERE quality_ru = 'common'
            """))
            print(f"Updated {result.rowcount} rows in quality_ru column")
        else:
            print("No 'common' quality found in items table")

if __name__ == "__main__":
    fix_items_common()
