"""Проверка записей с quality=''."""

from sqlalchemy import text
from app.db import engine

def check_empty_quality():
    with engine.begin() as connection:
        # Количество с quality=''
        empty_quality = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats WHERE quality = ''
        """)).fetchone()
        print(f"item_stats with quality='': {empty_quality[0]}")
        
        # Количество с quality='' и upgrade_level=0
        base_variants = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats WHERE quality = '' AND upgrade_level = 0
        """)).fetchone()
        print(f"item_stats with quality='' and upgrade_level=0: {base_variants[0]}")
        
        # Примеры записей с quality=''
        samples = connection.execute(text("""
            SELECT item_id, quality, upgrade_level, sample_size, market_price 
            FROM item_stats 
            WHERE quality = ''
            LIMIT 10
        """)).fetchall()
        print(f"\nSample records with quality='':")
        for row in samples:
            print(f"  {row[0]} | {row[1]} | {row[2]} | sample: {row[3]} | price: {row[4]}")

if __name__ == "__main__":
    check_empty_quality()
