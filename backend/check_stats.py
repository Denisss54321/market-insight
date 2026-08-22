"""Проверка статистики item_stats."""

from sqlalchemy import text
from app.db import engine

def check_stats():
    with engine.begin() as connection:
        # 1. Сколько вариантов готовы по данным
        ready = connection.execute(text("SELECT count(*) FROM item_stats WHERE sample_size >= 8 AND confidence >= 0.5")).scalar()
        print(f"Ready variants (sample >= 8 AND confidence >= 0.5): {ready}")
        
        # 2. Сколько активных лотов
        active_lots = connection.execute(text("SELECT count(*) FROM lot_snapshots WHERE gone_at IS NULL")).scalar()
        print(f"Active lots: {active_lots}")
        
        # 3. Разброс sample по всем item_stats
        breakdown = connection.execute(text("""
            SELECT
              count(*) FILTER (WHERE sample_size = 0) AS zero,
              count(*) FILTER (WHERE sample_size BETWEEN 1 AND 3) AS low,
              count(*) FILTER (WHERE sample_size BETWEEN 4 AND 7) AS mid,
              count(*) FILTER (WHERE sample_size >= 8) AS ready
            FROM item_stats
        """)).fetchone()
        print(f"Sample breakdown: zero={breakdown[0]}, low={breakdown[1]}, mid={breakdown[2]}, ready={breakdown[3]}")

if __name__ == "__main__":
    check_stats()
