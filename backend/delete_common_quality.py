"""Удаление записей с quality='common' из БД."""

from sqlalchemy import text
from app.db import engine

def delete_common_quality():
    with engine.begin() as connection:
        # Удаляем из item_stats
        result1 = connection.execute(text("""
            DELETE FROM item_stats 
            WHERE quality = 'common'
        """))
        print(f"Deleted {result1.rowcount} rows from item_stats")
        
        # Удаляем из lot_snapshots
        result2 = connection.execute(text("""
            DELETE FROM lot_snapshots 
            WHERE quality = 'common'
        """))
        print(f"Deleted {result2.rowcount} rows from lot_snapshots")

if __name__ == "__main__":
    delete_common_quality()
