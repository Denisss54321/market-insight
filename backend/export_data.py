"""Скрипт для экспорта данных из PostgreSQL в JSON"""
import json
from datetime import datetime
from sqlalchemy import select
from app.db import session_scope
from app.models import Item, ItemStats, Sale, LotSnapshot, MarketEvent, Deal, WatchItem, User, Session as SessionModel

def export_data():
    """Экспортирует все данные из базы в JSON"""
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "items": [],
        "item_stats": [],
        "sales": [],
        "lot_snapshots": [],
        "market_events": [],
        "deals": [],
        "watch_items": [],
        "users": [],
        "sessions": []
    }
    
    with session_scope() as session:
        # Экспорт Items
        items = session.execute(select(Item)).scalars().all()
        for item in items:
            data["items"].append({
                "id": item.id,
                "name_ru": item.name_ru,
                "name_en": item.name_en,
                "category": item.category,
                "quality": item.quality,
                "quality_ru": item.quality_ru,
                "icon": item.icon,
                "priority": item.priority,
                "last_scanned_at": item.last_scanned_at.isoformat() if item.last_scanned_at else None
            })
        
        # Экспорт ItemStats
        stats = session.execute(select(ItemStats)).scalars().all()
        for stat in stats:
            data["item_stats"].append({
                "item_id": stat.item_id,
                "region": stat.region,
                "quality": stat.quality,
                "upgrade_level": stat.upgrade_level,
                "market_price": stat.market_price,
                "median": stat.median,
                "mean": stat.mean,
                "mode": stat.mode,
                "min_price": stat.min_price,
                "max_price": stat.max_price,
                "stddev": stat.stddev,
                "volatility": stat.volatility,
                "liquidity": stat.liquidity,
                "supply": stat.supply,
                "demand": stat.demand,
                "spread": stat.spread,
                "confidence": stat.confidence,
                "sample_size": stat.sample_size,
                "lowest_lot": stat.lowest_lot,
                "active_lots": stat.active_lots,
                "change_24h": stat.change_24h,
                "change_7d": stat.change_7d,
                "sales_24h": stat.sales_24h,
                "computed_at": stat.computed_at.isoformat() if stat.computed_at else None
            })
        
        # Экспорт Sales (ограничим последние 1000 для экономии места)
        sales = session.execute(select(Sale).order_by(Sale.sold_at.desc()).limit(1000)).scalars().all()
        for sale in sales:
            data["sales"].append({
                "item_id": sale.item_id,
                "region": sale.region,
                "price": sale.price,
                "amount": sale.amount,
                "unit_price": sale.unit_price,
                "sold_at": sale.sold_at.isoformat(),
                "quality": sale.quality,
                "upgrade_level": sale.upgrade_level
            })
        
        # Экспорт LotSnapshots (ограничим последние 500)
        lots = session.execute(select(LotSnapshot).order_by(LotSnapshot.seen_at.desc()).limit(500)).scalars().all()
        for lot in lots:
            data["lot_snapshots"].append({
                "item_id": lot.item_id,
                "region": lot.region,
                "lot_key": lot.lot_key,
                "price": lot.price,
                "amount": lot.amount,
                "unit_price": lot.unit_price,
                "quality": lot.quality,
                "upgrade_level": lot.upgrade_level,
                "ends_at": lot.ends_at.isoformat() if lot.ends_at else None,
                "seen_at": lot.seen_at.isoformat(),
                "first_seen_at": lot.first_seen_at.isoformat() if lot.first_seen_at else None,
                "gone_at": lot.gone_at.isoformat() if lot.gone_at else None,
                "missing_streak": lot.missing_streak
            })
        
        # Экспорт MarketEvents
        events = session.execute(select(MarketEvent)).scalars().all()
        for event in events:
            data["market_events"].append({
                "item_id": event.item_id,
                "region": event.region,
                "type": event.type,
                "magnitude": event.magnitude,
                "message": event.message,
                "happened_at": event.happened_at.isoformat()
            })
        
        # Экспорт Deals
        deals = session.execute(select(Deal)).scalars().all()
        for deal in deals:
            data["deals"].append({
                "id": deal.id,
                "user_key": deal.user_key,
                "item_id": deal.item_id,
                "state": deal.state,
                "amount": deal.amount,
                "buy_price": deal.buy_price,
                "bought_at": deal.bought_at.isoformat(),
                "market_price_at_buy": deal.market_price_at_buy,
                "list_price": deal.list_price,
                "listed_at": deal.listed_at.isoformat() if deal.listed_at else None,
                "sell_price": deal.sell_price,
                "sold_at": deal.sold_at.isoformat() if deal.sold_at else None,
                "fee_percent": deal.fee_percent,
                "note": deal.note
            })
        
        # Экспорт WatchItems
        watch_items = session.execute(select(WatchItem)).scalars().all()
        for wi in watch_items:
            data["watch_items"].append({
                "id": wi.id,
                "user_id": wi.user_id,
                "user_key": wi.user_key,
                "item_id": wi.item_id,
                "quality": wi.quality,
                "upgrade_level": wi.upgrade_level,
                "folder": wi.folder,
                "color": wi.color,
                "created_at": wi.created_at.isoformat()
            })
        
        # Экспорт Users
        users = session.execute(select(User)).scalars().all()
        for user in users:
            data["users"].append({
                "id": user.id,
                "steam_id": user.steam_id,
                "username": user.username,
                "avatar": user.avatar,
                "auth_provider": user.auth_provider,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None
            })
        
        # Экспорт Sessions
        sessions = session.execute(select(SessionModel)).scalars().all()
        for sess in sessions:
            data["sessions"].append({
                "id": sess.id,
                "user_id": sess.user_id,
                "token": sess.token,
                "created_at": sess.created_at.isoformat() if sess.created_at else None,
                "expires_at": sess.expires_at.isoformat() if sess.expires_at else None
            })
    
    # Сохраняем в JSON
    with open('data_export.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Экспорт завершен:")
    print(f"  Items: {len(data['items'])}")
    print(f"  ItemStats: {len(data['item_stats'])}")
    print(f"  Sales: {len(data['sales'])}")
    print(f"  LotSnapshots: {len(data['lot_snapshots'])}")
    print(f"  MarketEvents: {len(data['market_events'])}")
    print(f"  Deals: {len(data['deals'])}")
    print(f"  WatchItems: {len(data['watch_items'])}")
    print(f"  Users: {len(data['users'])}")
    print(f"  Sessions: {len(data['sessions'])}")
    print(f"Данные сохранены в data_export.json")

if __name__ == '__main__':
    export_data()
