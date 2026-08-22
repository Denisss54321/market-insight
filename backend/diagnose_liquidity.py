from app.db import session_scope
from app.models import Item, ItemStats, Sale
from sqlalchemy import select
from datetime import datetime, timedelta

with session_scope() as session:
    # 1. Находим item_id для "Волчьи слезы"
    item = session.execute(
        select(Item).where(Item.name_ru == "Волчьи слезы")
    ).scalar_one_or_none()
    
    if not item:
        print("Артефакт 'Волчьи слезы' не найден в базе")
    else:
        print(f"=== Item ID: {item.id} ===")
        
        # 2. Сырое значение liquidity из БД
        stats = session.execute(
            select(ItemStats).where(
                ItemStats.item_id == item.id,
                ItemStats.quality == "Исключительный",
                ItemStats.upgrade_level == 15
            )
        ).scalar_one_or_none()
        
        if stats:
            print(f"\n=== ItemStats ===")
            print(f"item_id={stats.item_id}, quality={stats.quality}, upgrade_level={stats.upgrade_level}")
            print(f"sample={stats.sample_size}, liquidity={stats.liquidity}, median={stats.median}")
            print(f"computed_at={stats.computed_at}")
        else:
            print(f"\n=== ItemStats ===")
            print("Запись не найдена для quality='Исключительный', upgrade_level=15")
        
        # 3. Точные значения sold_at для продаж
        sales = session.execute(
            select(Sale).where(
                Sale.item_id == item.id,
                Sale.quality == "Исключительный",
                Sale.upgrade_level == 15
            ).order_by(Sale.sold_at)
        ).scalars().all()
        
        print(f"\n=== Sales ({len(sales)} records) ===")
        for sale in sales:
            print(f"sold_at={sale.sold_at}, unit_price={sale.unit_price}, amount={sale.amount}")
        
        # 4. Текущее время и окно
        now = datetime.utcnow()
        window_start = now - timedelta(hours=72)
        print(f"\n=== Time window ===")
        print(f"now (UTC): {now}")
        print(f"window_start (UTC): {window_start}")
        print(f"window_hours: 72")
        
        # 5. Какие продажи попадают в окно
        windowed_sales = [s for s in sales if s.sold_at >= window_start]
        print(f"\n=== Sales in window ({len(windowed_sales)} records) ===")
        for sale in windowed_sales:
            print(f"sold_at={sale.sold_at}, unit_price={sale.unit_price}, amount={sale.amount}")
        
        # 6. Ручной расчёт ликвидности
        if windowed_sales:
            total_amount = sum(s.amount for s in windowed_sales)
            manual_liquidity = total_amount / (72 / 24)
            print(f"\n=== Manual calculation ===")
            print(f"total_amount={total_amount}")
            print(f"manual_liquidity={manual_liquidity:.4f}")
