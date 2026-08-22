"""Проверка состояния БД."""

from sqlalchemy import text
from app.db import engine

def check_db():
    """Проверяет количество записей в таблицах."""
    with engine.begin() as connection:
        sales_count = connection.execute(text("SELECT COUNT(*) FROM sales")).scalar()
        lots_count = connection.execute(text("SELECT COUNT(*) FROM lot_snapshots")).scalar()
        stats_count = connection.execute(text("SELECT COUNT(*) FROM item_stats")).scalar()
        events_count = connection.execute(text("SELECT COUNT(*) FROM market_events")).scalar()
        
        print(f"sales: {sales_count}")
        print(f"lot_snapshots: {lots_count}")
        print(f"item_stats: {stats_count}")
        print(f"market_events: {events_count}")
        
        # Проверяем пример данных
        if sales_count > 0:
            sample = connection.execute(text("SELECT item_id, unit_price, amount, quality, upgrade_level FROM sales LIMIT 3")).fetchall()
            print("\nПример продаж:")
            for row in sample:
                print(f"  {row}")
        
        if lots_count > 0:
            sample = connection.execute(text("SELECT item_id, unit_price, amount, quality, upgrade_level FROM lot_snapshots LIMIT 3")).fetchall()
            print("\nПример лотов:")
            for row in sample:
                print(f"  {row}")

if __name__ == "__main__":
    check_db()
