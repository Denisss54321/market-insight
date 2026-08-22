"""Скрипт для инициализации SQLite базы данных"""
from app.db import init_db

if __name__ == '__main__':
    print("Инициализация SQLite базы данных...")
    init_db()
    print("База данных успешно инициализирована!")
