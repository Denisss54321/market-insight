"""Миграция: добавление полей quality и upgrade_level в watch_items."""

from sqlalchemy import text
from app.db import engine

def migrate():
    with engine.begin() as connection:
        # Проверяем существуют ли колонки
        result = connection.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'watch_items' AND column_name IN ('quality', 'upgrade_level')
        """)).fetchall()
        
        existing_cols = [row[0] for row in result]
        
        if 'quality' not in existing_cols:
            connection.execute(text("ALTER TABLE watch_items ADD COLUMN quality VARCHAR(32) NOT NULL DEFAULT ''"))
            print("Added column 'quality'")
        
        if 'upgrade_level' not in existing_cols:
            connection.execute(text("ALTER TABLE watch_items ADD COLUMN upgrade_level INTEGER NOT NULL DEFAULT 0"))
            print("Added column 'upgrade_level'")
        
        # Удаляем старое уникальное ограничение
        try:
            connection.execute(text("ALTER TABLE watch_items DROP CONSTRAINT uq_watch"))
            print("Dropped old constraint 'uq_watch'")
        except Exception as e:
            print(f"Could not drop constraint (may not exist): {e}")
        
        # Добавляем новое уникальное ограничение с quality и upgrade_level
        try:
            connection.execute(text("""
                ALTER TABLE watch_items 
                ADD CONSTRAINT uq_watch UNIQUE (user_key, item_id, quality, upgrade_level)
            """))
            print("Added new constraint 'uq_watch' with quality and upgrade_level")
        except Exception as e:
            print(f"Could not add constraint: {e}")

if __name__ == "__main__":
    migrate()
