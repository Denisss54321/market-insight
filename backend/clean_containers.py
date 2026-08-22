"""Удаление контейнеров без названий."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
import sqlite3

DB_PATH = settings.database_url.replace("sqlite:///", "")

def clean_containers():
    """Удаляет контейнеры без названий."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Удаляем контейнеры с пустыми названиями
        cursor.execute("DELETE FROM containers WHERE name_ru = '' OR name_ru IS NULL")
        deleted = cursor.rowcount
        conn.commit()
        
        print(f"Удалено контейнеров без названий: {deleted}")
        
        # Показываем оставшиеся
        cursor.execute("SELECT * FROM containers")
        rows = cursor.fetchall()
        print(f"\nОсталось контейнеров: {len(rows)}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    clean_containers()
