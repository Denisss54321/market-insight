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
        
        print(f"=== Timeline analysis ===")
        print(f"Stats computed_at: {stats.computed_at}")
        print(f"Stats liquidity: {stats.liquidity}")
        print(f"\nAll sales:")
        for i, sale in enumerate(all_sales):
            hours_before_compute = (stats.computed_at - sale.sold_at).total_seconds() / 3600
            print(f"  {i+1}. {sale.sold_at} (price={sale.unit_price}, amount={sale.amount}) - {hours_before_compute:.1f}h before compute")
        
        # Проверка: сколько продаж было в окне 72 часа в момент computed_at
        window_start = stats.computed_at - timedelta(hours=72)
        windowed = [s for s in all_sales if s.sold_at >= window_start]
        print(f"\nSales in 72h window at computed_at: {len(windowed)}")
        
        # Проверка: может быть, использовался window_hours = 168 (7 дней)?
        window_start_7d = stats.computed_at - timedelta(days=7)
        windowed_7d = [s for s in all_sales if s.sold_at >= window_start_7d]
        print(f"Sales in 7d window at computed_at: {len(windowed_7d)}")
        
        if windowed_7d:
            total_amount_7d = sum(s.amount for s in windowed_7d)
            liquidity_7d = total_amount_7d / (168 / 24)
            print(f"Liquidity with 7d window: {liquidity_7d:.4f}")
        
        # Проверка: может быть, использовался window_hours = 24?
        window_start_24h = stats.computed_at - timedelta(hours=24)
        windowed_24h = [s for s in all_sales if s.sold_at >= window_start_24h]
        print(f"Sales in 24h window at computed_at: {len(windowed_24h)}")
        
        if windowed_24h:
            total_amount_24h = sum(s.amount for s in windowed_24h)
            liquidity_24h = total_amount_24h / (24 / 24)
            print(f"Liquidity with 24h window: {liquidity_24h:.4f}")
