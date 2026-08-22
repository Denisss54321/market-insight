"""Проверка данных для предмета zyv9."""

from sqlalchemy import text
from app.db import engine

def check_zyv9():
    with engine.begin() as connection:
        # Проверяем предмет в таблице items
        item = connection.execute(text("""
            SELECT id, name_ru, name_en, category, quality, icon 
            FROM items WHERE id = 'zyv9'
        """)).fetchone()
        
        if item:
            print(f"Item zyv9:")
            print(f"  ID: {item[0]}")
            print(f"  Name RU: {item[1]}")
            print(f"  Name EN: {item[2]}")
            print(f"  Category: {item[3]}")
            print(f"  Quality: {item[4]}")
            print(f"  Icon: {item[5]}")
        else:
            print("Item zyv9 not found in items table")
        
        # Проверяем статистику в таблице item_stats
        stats = connection.execute(text("""
            SELECT item_id, region, quality, upgrade_level, market_price, liquidity, change_24h
            FROM item_stats WHERE item_id = 'zyv9'
        """)).fetchall()
        
        print(f"\nItemStats for zyv9 ({len(stats)} rows):")
        for stat in stats:
            print(f"  Region: {stat[1]}, Quality: {stat[2]}, Upgrade: {stat[3]}")
            print(f"  Market Price: {stat[4]}, Liquidity: {stat[5]}, Change 24h: {stat[6]}")

if __name__ == "__main__":
    check_zyv9()
