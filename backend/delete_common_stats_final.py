"""Удаление всех записей с quality='common' из item_stats."""

from sqlalchemy import text
from app.db import engine

def delete_all_common():
    with engine.begin() as connection:
        result = connection.execute(text("""
            DELETE FROM item_stats 
            WHERE quality = 'common'
        """))
        print(f"Deleted {result.rowcount} rows from item_stats")

if __name__ == "__main__":
    delete_all_common()
