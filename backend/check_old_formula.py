from app.db import session_scope
from app.models import Item, ItemStats, Sale
from sqlalchemy import select
from datetime import datetime, timedelta

with session_scope() as session:
    item = session.execute(
        select(Item).where(Item.name_ru == "Волчьи слезы")
    ).scalar_one_or_none()
    
    if item:
        sales = session.execute(
            select(Sale).where(
                Sale.item_id == item.id,
                Sale.quality == "Исключительный",
                Sale.upgrade_level == 15
            ).order_by(Sale.sold_at)
        ).scalars().all()
        
        stats = session.execute(
            select(ItemStats).where(
                ItemStats.item_id == item.id,
                ItemStats.quality == "Исключительный",
                ItemStats.upgrade_level == 15
            )
        ).scalar_one_or_none()
        
        print("=== Analysis ===")
        print(f"Stats computed_at: {stats.computed_at}")
        print(f"Stats liquidity: {stats.liquidity}")
        print(f"\nSales:")
        for sale in sales:
            print(f"  {sale.sold_at} - {sale.unit_price} - {sale.amount}")
        
        if len(sales) >= 2:
            # Расчёт по СТАРОЙ формуле (как было до фикса)
            liq_span_hours = max(1.0, (sales[-1].sold_at - sales[0].sold_at).total_seconds() / 3600)
            old_liquidity = sum(s.amount for s in sales) / (liq_span_hours / 24)
            print(f"\n=== OLD formula (before fix) ===")
            print(f"liq_span_hours: {liq_span_hours:.2f}")
            print(f"old_liquidity: {old_liquidity:.4f}")
            
            # Расчёт по НОВОЙ формуле (после фикса)
            window_hours = 72
            new_liquidity = sum(s.amount for s in sales) / (window_hours / 24)
            print(f"\n=== NEW formula (after fix) ===")
            print(f"window_hours: {window_hours}")
            print(f"new_liquidity: {new_liquidity:.4f}")
            
            # Проверка: если бы расчёт был в момент computed_at
            computed_at = stats.computed_at
            window_start_then = computed_at - timedelta(hours=72)
            windowed_then = [s for s in sales if s.sold_at >= window_start_then]
            if windowed_then:
                new_liquidity_then = sum(s.amount for s in windowed_then) / (72 / 24)
                print(f"\n=== NEW formula at computed_at time ===")
                print(f"computed_at: {computed_at}")
                print(f"window_start_then: {window_start_then}")
                print(f"sales in window: {len(windowed_then)}")
                print(f"new_liquidity_then: {new_liquidity_then:.4f}")
