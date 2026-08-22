"""Проверка временных меток данных в SQLite"""
from sqlalchemy import select, func
from app.db import session_scope
from app.models import Sale, LotSnapshot, ItemStats

def check_timestamps():
    """Проверяет временные метки данных"""
    with session_scope() as session:
        # Проверяем Sales
        sales_result = session.execute(
            select(
                func.min(Sale.sold_at),
                func.max(Sale.sold_at),
                func.count(Sale.id)
            )
        ).first()
        print(f"Sales: MIN={sales_result[0]}, MAX={sales_result[1]}, COUNT={sales_result[2]}")
        
        # Проверяем LotSnapshots
        lots_result = session.execute(
            select(
                func.min(LotSnapshot.seen_at),
                func.max(LotSnapshot.seen_at),
                func.count(LotSnapshot.id)
            )
        ).first()
        print(f"LotSnapshots: MIN={lots_result[0]}, MAX={lots_result[1]}, COUNT={lots_result[2]}")
        
        # Проверяем ItemStats
        stats_result = session.execute(
            select(
                func.min(ItemStats.computed_at),
                func.max(ItemStats.computed_at),
                func.count()
            )
        ).first()
        print(f"ItemStats: MIN={stats_result[0]}, MAX={stats_result[1]}, COUNT={stats_result[2]}")

if __name__ == '__main__':
    check_timestamps()
