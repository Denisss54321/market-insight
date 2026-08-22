"""Проверка состояния item_stats."""

from sqlalchemy import text
from app.db import engine

def check_stats():
    with engine.begin() as connection:
        # Общее количество записей
        total = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats
        """)).fetchone()
        print(f"Total item_stats: {total[0]}")
        
        # Количество с sample_size > 0
        with_metrics = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats WHERE sample_size > 0
        """)).fetchone()
        print(f"With sample_size > 0: {with_metrics[0]}")
        
        # Количество базовых вариантов (quality="" и upgrade_level=0)
        base_variants = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats WHERE quality = '' AND upgrade_level = 0
        """)).fetchone()
        print(f"Base variants (quality='' and upgrade_level=0): {base_variants[0]}")
        
        # Количество базовых вариантов с sample_size > 0
        base_with_metrics = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats WHERE quality = '' AND upgrade_level = 0 AND sample_size > 0
        """)).fetchone()
        print(f"Base variants with sample_size > 0: {base_with_metrics[0]}")
        
        # Примеры записей
        samples = connection.execute(text("""
            SELECT item_id, quality, upgrade_level, sample_size, market_price 
            FROM item_stats 
            WHERE sample_size > 0 
            LIMIT 10
        """)).fetchall()
        print(f"\nSample records with sample_size > 0:")
        for row in samples:
            print(f"  {row[0]} | {row[1]} | {row[2]} | sample: {row[3]} | price: {row[4]}")

if __name__ == "__main__":
    check_stats()
