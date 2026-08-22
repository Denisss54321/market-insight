"""Пересоздание таблицы containers с колонкой icon."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "market_insight.db"

def recreate_table():
    """Удаляет и создает заново таблицу containers."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Удаляем старую таблицу
        print("Удаление старой таблицы containers...")
        cursor.execute("DROP TABLE IF EXISTS containers")
        
        # Создаем новую таблицу с колонкой icon
        print("Создание новой таблицы containers...")
        cursor.execute("""
            CREATE TABLE containers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id TEXT UNIQUE NOT NULL,
                name_ru TEXT NOT NULL,
                icon TEXT DEFAULT '',
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
