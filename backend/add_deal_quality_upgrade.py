"""Миграция: добавление полей quality и upgrade_level в таблицу deals."""

from sqlalchemy import text
from app.db import engine

def migrate():
    with engine.begin() as connection:
        # Проверяем, существуют ли уже колонки
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'deals' 
            AND column_name IN ('quality', 'upgrade_level')
        """)).fetchall()
        
        existing_columns = {row[0] for row in result}
        
        if 'quality' not in existing_columns:
            connection.execute(text("""
                ALTER TABLE deals ADD COLUMN quality VARCHAR(32) DEFAULT ''
            """))
            print("Added column 'quality' to deals table")
        
        if 'upgrade_level' not in existing_columns:
            connection.execute(text("""
                ALTER TABLE deals ADD COLUMN upgrade_level INTEGER DEFAULT 0
            """))
            print("Added column 'upgrade_level' to deals table")
        
        print("Migration completed successfully")

if __name__ == "__main__":
    migrate()
