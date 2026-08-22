"""Проверка распределения по качествам в item_stats."""

from sqlalchemy import text
from app.db import engine

def check_quality_distribution():
    with engine.begin() as connection:
        # Распределение по качествам
        distribution = connection.execute(text("""
            SELECT quality, COUNT(*) as count 
            FROM item_stats 
            GROUP BY quality 
            ORDER BY count DESC
        """)).fetchall()
        
        print("Quality distribution in item_stats:")
        for quality, count in distribution:
            print(f"  '{quality}': {count}")
        
        # Количество с upgrade_level=0
        upgrade_zero = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats WHERE upgrade_level = 0
        """)).fetchone()
        print(f"\nWith upgrade_level=0: {upgrade_zero[0]}")

if __name__ == "__main__":
    check_quality_distribution()
