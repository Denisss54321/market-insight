"""Проверка количества предметов с ликвидностью 3-8 продаж в день"""
from sqlalchemy import select, func
from app.db import session_scope
from app.models import ItemStats

def check_liquidity_range():
    """Проверяет количество предметов с ликвидностью 3-8 продаж в день"""
    with session_scope() as session:
        # Предметы с ликвидностью от 3 до 8 продаж в день
        result = session.execute(
            select(
                func.count()
            ).where(
                ItemStats.liquidity >= 3,
                ItemStats.liquidity <= 8,
                ItemStats.market_price.isnot(None)
            )
        ).scalar()
        print(f"Предметов с ликвидностью 3-8 продаж/день: {result}")
        
        # Общее количество предметов с market_price
        total = session.execute(
            select(
                func.count()
            ).where(
                ItemStats.market_price.isnot(None)
            )
        ).scalar()
        print(f"Всего предметов с market_price: {total}")
        
        # Распределение по ликвидности
        distribution = session.execute(
            select(
                ItemStats.liquidity,
                func.count()
            ).where(
                ItemStats.market_price.isnot(None)
            ).group_by(ItemStats.liquidity).order_by(ItemStats.liquidity)
        ).all()
        print("\nРаспределение по ликвидности:")
        for liquidity, count in distribution:
            print(f"  {liquidity} продаж/день: {count} предметов")

if __name__ == '__main__':
    check_liquidity_range()
