"""Пересоздание таблицы containers с полем container_type."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
import sqlite3

DB_PATH = settings.database_url.replace("sqlite:///", "")

def recreate_table():
    """Удаляет и создает заново таблицу containers с полем container_type."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Удаляем старую таблицу
        print("Удаление старой таблицы containers...")
        cursor.execute("DROP TABLE IF EXISTS containers")
        
        # Создаем новую таблицу с полем container_type
        print("Создание новой таблицы containers...")
        cursor.execute("""
            CREATE TABLE containers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT UNIQUE NOT NULL,
                name_ru TEXT NOT NULL,
                container_type TEXT DEFAULT 'backpacks',
                slots INTEGER NOT NULL,
                inner_protection REAL DEFAULT 0.0,
                effectiveness REAL DEFAULT 0.0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        print("Таблица containers успешно пересоздана")
        
    except Exception as e:
        print(f"Ошибка при пересоздании таблицы: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    recreate_table()
