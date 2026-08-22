"""Скрипт для выполнения миграции добавления user_id в watch_items"""
import psycopg2
from app.config import settings

def run_migration():
    conn = psycopg2.connect(settings.database_url)
    cursor = conn.cursor()

    # Читаем SQL файл
    with open('migrations/add_user_id_to_watch_items.sql', 'r', encoding='utf-8') as f:
        sql = f.read()

    # Выполняем миграцию
    cursor.execute(sql)
    conn.commit()

    print('Миграция выполнена успешно!')
    cursor.close()
    conn.close()

if __name__ == '__main__':
    run_migration()
