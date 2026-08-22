"""Проверка quality='common' в таблицах sales и lot_snapshots."""

from sqlalchemy import text
from app.db import engine

def check_sales_lots():
    with engine.begin() as connection:
        # Проверяем sales
        sales_result = connection.execute(text("""
            SELECT COUNT(*) FROM sales WHERE quality = 'common'
        """)).fetchone()
        sales_count = sales_result[0] if sales_result else 0
        
        print(f"sales: {sales_count} rows with quality='common'")
        
        if sales_count > 0:
            samples = connection.execute(text("""
                SELECT * FROM sales WHERE quality = 'common' LIMIT 5
            """)).fetchall()
            print(f"  Sample rows:")
            for row in samples:
                print(f"    {row}")
        
        # Проверяем lot_snapshots
        lots_result = connection.execute(text("""
            SELECT COUNT(*) FROM lot_snapshots WHERE quality = 'common'
        """)).fetchone()
        lots_count = lots_result[0] if lots_result else 0
        
        print(f"lot_snapshots: {lots_count} rows with quality='common'")
        
        if lots_count > 0:
            samples = connection.execute(text("""
                SELECT * FROM lot_snapshots WHERE quality = 'common' LIMIT 5
            """)).fetchall()
            print(f"  Sample rows:")
            for row in samples:
                print(f"    {row}")

if __name__ == "__main__":
    check_sales_lots()
