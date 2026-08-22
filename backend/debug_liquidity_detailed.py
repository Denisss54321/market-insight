from app.db import session_scope
from app.models import Item, ItemStats, Sale
from sqlalchemy import select
from datetime import datetime, timedelta
from app.analytics import mad_filter

with session_scope() as session:
    item = session.execute(
        select(Item).where(Item.name_ru == "Волчьи слезы")
    ).scalar_one_or_none()
    
    if item:
        # Получаем все продажи для этого варианта
        all_sales = session.execute(
            select(Sale).where(
                Sale.item_id == item.id,
                Sale.quality == "Исключительный",
                Sale.upgrade_level == 15
            ).order_by(Sale.sold_at)
        ).scalars().all()
        
        # Симулируем логику compute_metrics
        window_hours = 72
        mad_multiplier = 3.0
        now = datetime.utcnow()
        window_start = now - timedelta(hours=window_hours)
        
        windowed_in_window = [sale for sale in all_sales if sale.sold_at >= window_start]
        
        print(f"=== Debug liquidity calculation ===")
        print(f"windowed_in_window count: {len(windowed_in_window)}")
        
        if windowed_in_window:
            prices = [s.unit_price for s in windowed_in_window]
            print(f"prices: {prices}")
            
            filtered_in_window = mad_filter(prices, mad_multiplier)
            print(f"filtered_in_window: {filtered_in_window}")
            
            filtered_set = set(filtered_in_window)
            print(f"filtered_set: {filtered_set}")
            
            liq_sales = [s for s in windowed_in_window if s.unit_price in filtered_set]
            print(f"liq_sales count: {len(liq_sales)}")
            for sale in liq_sales:
                print(f"  - sold_at={sale.sold_at}, unit_price={sale.unit_price}, amount={sale.amount}")
            
            total_amount = sum(s.amount for s in liq_sales)
            calculated_liquidity = total_amount / (window_hours / 24)
            
            print(f"\ntotal_amount: {total_amount}")
            print(f"calculated_liquidity: {calculated_liquidity:.4f}")
            print(f"rounded_liquidity: {round(calculated_liquidity, 2)}")
