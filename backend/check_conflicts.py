"""Проверка конфликтов при замене common на Обычный."""

from sqlalchemy import text
from app.db import engine

def check_conflicts():
    with engine.begin() as connection:
        # Находим item_id, у которых есть и common и Обычный с одинаковым upgrade_level
        result = connection.execute(text("""
            SELECT s1.item_id, s1.quality, s1.upgrade_level, s2.quality, s2.upgrade_level
            FROM item_stats s1
            JOIN item_stats s2 ON s1.item_id = s2.item_id 
                AND s1.upgrade_level = s2.upgrade_level
                AND s1.region = s2.region
            WHERE s1.quality = 'common' AND s2.quality = 'Обычный'
        """)).fetchall()
        print("Conflicts (item_id has both common and Обычный with same upgrade_level):")
        for row in result:
            print(f"  item_id={row[0]}, common upgrade={row[2]}, Обычный upgrade={row[3]}")

if __name__ == "__main__":
    check_conflicts()
