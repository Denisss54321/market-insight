"""Проверка количества просканированных items."""

from sqlalchemy import text
from app.db import engine

def check_scanned():
    with engine.begin() as connection:
        count = connection.execute(text("SELECT count(*) FROM items WHERE last_scanned_at IS NOT NULL")).scalar()
        print(f"Scanned items count: {count}")

if __name__ == "__main__":
    check_scanned()
