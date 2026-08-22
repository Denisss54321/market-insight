"""Скрипт для очистки данных из БД перед началом нового сбора."""

from sqlalchemy import text
from app.db import engine

def clear_data():
    """Очищает таблицы sales, lot_snapshots, item_stats, market_events."""
    with engine.begin() as connection:
        # Прерываем все активные транзакции
        try:
            connection.execute(text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()"))
        except:
            pass
        
        # Удаляем в правильном порядке: сначала дочерние таблицы
        connection.execute(text("DELETE FROM market_events"))
        connection.execute(text("DELETE FROM item_stats"))
        connection.execute(text("DELETE FROM lot_snapshots"))
        connection.execute(text("DELETE FROM sales"))
        
        # Проверяем результат
        sales_count = connection.execute(text("SELECT COUNT(*) FROM sales")).scalar()
        lots_count = connection.execute(text("SELECT COUNT(*) FROM lot_snapshots")).scalar()
        stats_count = connection.execute(text("SELECT COUNT(*) FROM item_stats")).scalar()
        
        print(f"Данные очищены: sales={sales_count}, lot_snapshots={lots_count}, item_stats={stats_count}, market_events=0")

if __name__ == "__main__":
    clear_data()
