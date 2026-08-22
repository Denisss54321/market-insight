"""Миграция: добавление колонки icon в таблицу containers."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "market_insight.db"

def migrate():
    """Добавляет колонку icon в таблицу containers."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Проверяем, существует ли колонка
        cursor.execute("PRAGMA table_info(containers)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'icon' not in columns:
            print("Добавление колонки icon в таблицу containers...")
            cursor.execute("ALTER TABLE containers ADD COLUMN icon TEXT DEFAULT ''")
            conn.commit()
            print("Колонка icon успешно добавлена")
        else:
            print("Колонка icon уже существует")
        
    except Exception as e:
        print(f"Ошибка при миграции: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
