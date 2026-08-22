"""Проверка откуда берется 'common' в quality."""

from sqlalchemy import text
from app.db import engine

def check_common_quality():
    with engine.begin() as connection:
        # Проверяем item_stats с quality='common'
        result = connection.execute(text("""
            SELECT item_id, quality, upgrade_level, sample_size 
            FROM item_stats 
            WHERE quality = 'common'
            LIMIT 10
        """)).fetchall()
        print("ItemStats with quality='common':")
        for row in result:
            print(f"  item_id={row[0]}, quality={row[1]}, upgrade_level={row[2]}, sample_size={row[3]}")
        
        # Проверяем lot_snapshots с quality='common'
        result2 = connection.execute(text("""
            SELECT item_id, quality, upgrade_level 
            FROM lot_snapshots 
            WHERE quality = 'common'
            LIMIT 10
        """)).fetchall()
        print("\nLotSnapshots with quality='common':")
        for row in result2:
            print(f"  item_id={row[0]}, quality={row[1]}, upgrade_level={row[2]}")

if __name__ == "__main__":
    check_common_quality()
