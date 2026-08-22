from app.db import session_scope
from app.models import ItemStats
from sqlalchemy import select

with session_scope() as session:
    # Высокий sample
    high_sample = session.execute(
        select(ItemStats).where(ItemStats.sample_size > 0).order_by(ItemStats.sample_size.desc()).limit(5)
    ).scalars().all()
    
    print('=== High sample ===')
    for row in high_sample:
        print(f'item_id={row.item_id}, quality={row.quality}, upgrade_level={row.upgrade_level}, sample={row.sample_size}, liquidity={row.liquidity}, confidence={row.confidence}, volatility={row.volatility}, median={row.median}')
    
    # Низкий sample
    low_sample = session.execute(
        select(ItemStats).where(ItemStats.sample_size > 0).where(ItemStats.sample_size <= 5).order_by(ItemStats.sample_size.desc()).limit(5)
    ).scalars().all()
    
    print('\n=== Low sample ===')
    for row in low_sample:
        print(f'item_id={row.item_id}, quality={row.quality}, upgrade_level={row.upgrade_level}, sample={row.sample_size}, liquidity={row.liquidity}, confidence={row.confidence}, volatility={row.volatility}, median={row.median}')
