"""Проверка формата иконок артефактов."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
import sqlite3

DB_PATH = settings.database_url.replace("sqlite:///", "")

def check_artifact_icons():
    """Проверяет иконки артефактов."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, name_ru, icon FROM items LIMIT 5")
        rows = cursor.fetchall()
        
        print("Примеры иконок артефактов:")
        for row in rows:
            print(f"ID: {row[0]}, Name: {row[1]}, Icon: {row[2]}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    check_artifact_icons()
