"""Проверка данных в SQLite базе"""
from sqlalchemy import select, func
from app.db import session_scope
from app.models import Item, ItemStats, Sale, LotSnapshot

def check_data():
    """Проверяет наличие данных в SQLite"""
    with session_scope() as session:
        # Проверяем Items
        items_count = session.execute(select(func.count(Item.id))).scalar()
        print(f"Items: {items_count}")
        
        # Проверяем ItemStats (используем item_id вместо id)
        stats_count = session.execute(select(func.count(ItemStats.item_id))).scalar()
        print(f"ItemStats: {stats_count}")
        
        # Проверяем Sales
        sales_count = session.execute(select(func.count(Sale.id))).scalar()
        print(f"Sales: {sales_count}")
        
        # Проверяем LotSnapshots
        lots_count = session.execute(select(func.count(LotSnapshot.id))).scalar()
        print(f"LotSnapshots: {lots_count}")
        
        # Показываем пример ItemStats если есть
        if stats_count > 0:
            sample_stats = session.execute(select(ItemStats).limit(5)).scalars().all()
            print("\nПример ItemStats:")
            for stat in sample_stats:
                print(f"  Item: {stat.item_id}, Market Price: {stat.market_price}, Liquidity: {stat.liquidity}")

if __name__ == '__main__':
    check_data()
