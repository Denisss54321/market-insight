#!/usr/bin/env python3
"""Скрипт для применения миграции добавления missing_streak"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.config import settings

def apply_migration():
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        try:
            # Проверяем, существует ли колонка (PostgreSQL)
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'lot_snapshots' AND column_name = 'missing_streak'
            """))
            
            if result.fetchone():
                print("Колонка missing_streak уже существует")
                return
            
            # Добавляем колонку
            conn.execute(text("ALTER TABLE lot_snapshots ADD COLUMN missing_streak INTEGER DEFAULT 0"))
            conn.commit()
            print("Миграция применена успешно: добавлена колонка missing_streak")
        except Exception as e:
            print(f"Ошибка при применении миграции: {e}")
            raise

if __name__ == "__main__":
    apply_migration()
