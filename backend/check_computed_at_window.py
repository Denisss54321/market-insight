from app.db import session_scope
from app.models import Item, ItemStats, Sale
from sqlalchemy import select
from datetime import datetime, timedelta

with session_scope() as session:
    item = session.execute(
        select(Item).where(Item.name_ru == "Волчьи слезы")
    ).scalar_one_or_none()
    
    if item:
        stats = session.execute(
            select(ItemStats).where(
                ItemStats.item_id == item.id,
                ItemStats.quality == "Исключительный",
                ItemStats.upgrade_level == 15
            )
        ).scalar_one_or_none()
        
        # Все продажи для этого варианта
        all_sales = session.execute(
            select(Sale).where(
                Sale.item_id == item.id,
                Sale.quality == "Исключительный",
                Sale.upgrade_level == 15
            ).order_by(Sale.sold_at)
        ).scalars().all()
        
        print(f"=== Stats ===")
        print(f"computed_at: {stats.computed_at}")
        print(f"liquidity in DB: {stats.liquidity}")
        
        # Окно в момент computed_at
        computed_at = stats.computed_at
        window_start = computed_at - timedelta(hours=72)
        
        print(f"\n=== Window at computed_at ===")
        print(f"window_start: {window_start}")
        
        # Какие продажи были в окне в момент computed_at
        windowed = [s for s in all_sales if s.sold_at >= window_start]
        print(f"Sales in window: {len(windowed)}")
        for sale in windowed:
            print(f"  {sale.sold_at} - {sale.unit_price} - {sale.amount}")
        
        # Расчёт ликвидности по НОВОЙ формуле
        if windowed:
            total_amount = sum(s.amount for s in windowed)
            new_liquidity = total_amount / (72 / 24)
            print(f"\n=== NEW formula ===")
            print(f"total_amount: {total_amount}")
            print(f"new_liquidity: {new_liquidity:.4f}")
        
        # Расчёт по СТАРОЙ формуле
        if len(windowed) >= 2:
            liq_span_hours = max(1.0, (windowed[-1].sold_at - windowed[0].sold_at).total_seconds() / 3600)
            old_liquidity = total_amount / (liq_span_hours / 24)
            print(f"\n=== OLD formula ===")
            print(f"liq_span_hours: {liq_span_hours:.2f}")
            print(f"old_liquidity: {old_liquidity:.4f}")
        
        # Может быть, использовался другой window_hours?
        if windowed:
            total_amount = sum(s.amount for s in windowed)
            # Обратный расчёт: какой window_hours даёт 0.29?
            # total_amount / (window_hours / 24) = 0.29
            # window_hours / 24 = total_amount / 0.29
            # window_hours = (total_amount / 0.29) * 24
            implied_window_hours = (total_amount / stats.liquidity) * 24
            print(f"\n=== Reverse calculation ===")
            print(f"implied_window_hours for liquidity={stats.liquidity}: {implied_window_hours:.2f}")
