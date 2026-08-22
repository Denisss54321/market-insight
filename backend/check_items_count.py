"""Проверка количества items в БД."""

from sqlalchemy import text
from app.db import engine

def check_items():
    with engine.begin() as connection:
        count = connection.execute(text("SELECT count(*) FROM items")).scalar()
        print(f"Items count: {count}")

if __name__ == "__main__":
    check_items()
