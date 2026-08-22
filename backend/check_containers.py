"""Проверка данных в таблице containers."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
import sqlite3

DB_PATH = settings.database_url.replace("sqlite:///", "")

def check_containers():
    """Проверяет данные в таблице containers."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM containers")
        rows = cursor.fetchall()
        
        print(f"Всего контейнеров в БД: {len(rows)}")
        print("\nДанные контейнеров:")
        for row in rows:
            print(f"ID: {row[0]}, item_id: {row[1]}, name_ru: {row[2]}, slots: {row[3]}, protection: {row[4]}, effectiveness: {row[5]}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    check_containers()
