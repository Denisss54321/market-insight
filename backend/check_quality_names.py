"""Проверка какие quality реально хранятся в БД."""

from sqlalchemy import text
from app.db import engine

def check_quality_names():
    with engine.begin() as connection:
        result = connection.execute(text("SELECT DISTINCT quality FROM item_stats ORDER BY quality")).fetchall()
        print("Quality values in DB:")
        for row in result:
            print(f"  '{row[0]}'")

if __name__ == "__main__":
    check_quality_names()
