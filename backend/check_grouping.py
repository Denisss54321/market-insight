"""Проверка группировки по (quality, upgrade_level) в БД."""

from sqlalchemy import text
from app.db import engine

def check_grouping():
    """Проверяет что item_stats имеет записи с разными quality и upgrade_level."""
    with engine.begin() as connection:
        # Проверяем сколько записей в item_stats
        result = connection.execute(text("SELECT COUNT(*) FROM item_stats"))
        total = result.scalar()
        print(f"Всего записей в item_stats: {total}")
        
        # Проверяем группировку по quality и upgrade_level
        result = connection.execute(text("""
            SELECT quality, upgrade_level, COUNT(*) as count
            FROM item_stats
            GROUP BY quality, upgrade_level
            ORDER BY quality, upgrade_level
            LIMIT 20
        """))
        print("\nГруппировка по (quality, upgrade_level):")
        for row in result:
            print(f"  quality={row.quality}, upgrade_level={row.upgrade_level}, count={row.count}")
        
        # Проверяем что есть разные качества
        result = connection.execute(text("""
            SELECT DISTINCT quality FROM item_stats ORDER BY quality
        """))
        qualities = [row.quality for row in result]
        print(f"\nУникальные качества: {qualities}")
        
        # Проверяем что есть разные уровни заточки
        result = connection.execute(text("""
            SELECT DISTINCT upgrade_level FROM item_stats ORDER BY upgrade_level
        """))
        levels = [row.upgrade_level for row in result]
        print(f"Уникальные уровни заточки: {levels}")

if __name__ == "__main__":
    check_grouping()
