"""Точка входа бэкенда Market Insight."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.routes import router, auth_router
from app.collector import Collector, build_source, seed_items
from app.config import settings
from app.db import init_db
from app.state import app_state

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s"
)
logger = logging.getLogger("market_insight")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_items()
    collector = Collector(build_source())
    app_state.collector = collector
    task = asyncio.create_task(collector.run())
    logger.info("Коллектор запущен, источник: %s, регион: %s", settings.source, settings.region)
    try:
        yield
    finally:
        collector.stop()
        task.cancel()
        await collector.source.close()


app = FastAPI(title="Market Insight API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600
)

app.include_router(router)
app.include_router(auth_router)


# Временный endpoint для загрузки данных (удалить после миграции)
@app.post("/admin/import-data")
async def import_data_endpoint(data: dict):
    """Временный endpoint для импорта данных из локальной базы"""
    try:
        from app.db import session_scope
        from app.models import Item, ItemStats, Sale, LotSnapshot, MarketEvent, Deal, WatchItem, User, Session as SessionModel
        from datetime import datetime
        
        with session_scope() as session:
            # Импорт Items
            for item_data in data.get('items', []):
                existing = session.execute(select(Item).where(Item.id == item_data['id'])).scalar_one_or_none()
                if not existing:
                    item = Item(
                        id=item_data['id'],
                        name_ru=item_data['name_ru'],
                        name_en=item_data['name_en'],
                        category=item_data['category'],
                        quality=item_data['quality'],
                        quality_ru=item_data['quality_ru'],
                        icon=item_data['icon'],
                        priority=item_data['priority'],
                        last_scanned_at=datetime.fromisoformat(item_data['last_scanned_at']) if item_data['last_scanned_at'] else None
                    )
                    session.add(item)
            
            # Импорт ItemStats
            for stat_data in data.get('item_stats', []):
                existing = session.execute(
                    select(ItemStats).where(
                        ItemStats.item_id == stat_data['item_id'],
                        ItemStats.region == stat_data['region'],
                        ItemStats.quality == stat_data['quality'],
                        ItemStats.upgrade_level == stat_data['upgrade_level']
                    )
                ).scalar_one_or_none()
                if not existing:
                    stat = ItemStats(
                        item_id=stat_data['item_id'],
                        region=stat_data['region'],
                        quality=stat_data['quality'],
                        upgrade_level=stat_data['upgrade_level'],
                        market_price=stat_data['market_price'],
                        median=stat_data['median'],
                        mean=stat_data['mean'],
                        mode=stat_data['mode'],
                        min_price=stat_data['min_price'],
                        max_price=stat_data['max_price'],
                        stddev=stat_data['stddev'],
                        volatility=stat_data['volatility'],
                        liquidity=stat_data['liquidity'],
                        supply=stat_data['supply'],
                        demand=stat_data['demand'],
                        spread=stat_data['spread'],
                        confidence=stat_data['confidence'],
                        sample_size=stat_data['sample_size'],
                        lowest_lot=stat_data['lowest_lot'],
                        active_lots=stat_data['active_lots'],
                        change_24h=stat_data['change_24h'],
                        change_7d=stat_data['change_7d'],
                        sales_24h=stat_data['sales_24h'],
                        computed_at=datetime.fromisoformat(stat_data['computed_at']) if stat_data['computed_at'] else None
                    )
                    session.add(stat)
            
            # Импорт Sales
            for sale_data in data.get('sales', []):
                sale = Sale(
                    item_id=sale_data['item_id'],
                    region=sale_data['region'],
                    price=sale_data['price'],
                    amount=sale_data['amount'],
                    unit_price=sale_data['unit_price'],
                    sold_at=datetime.fromisoformat(sale_data['sold_at']),
                    quality=sale_data['quality'],
                    upgrade_level=sale_data['upgrade_level']
                )
                session.add(sale)
            
            # Импорт LotSnapshots
            for lot_data in data.get('lot_snapshots', []):
                lot = LotSnapshot(
                    item_id=lot_data['item_id'],
                    region=lot_data['region'],
                    lot_key=lot_data['lot_key'],
                    price=lot_data['price'],
                    amount=lot_data['amount'],
                    unit_price=lot_data['unit_price'],
                    quality=lot_data['quality'],
                    upgrade_level=lot_data['upgrade_level'],
                    ends_at=datetime.fromisoformat(lot_data['ends_at']) if lot_data['ends_at'] else None,
                    seen_at=datetime.fromisoformat(lot_data['seen_at']),
                    first_seen_at=datetime.fromisoformat(lot_data['first_seen_at']) if lot_data['first_seen_at'] else None,
                    gone_at=datetime.fromisoformat(lot_data['gone_at']) if lot_data['gone_at'] else None,
                    missing_streak=lot_data['missing_streak']
                )
                session.add(lot)
            
            # Импорт MarketEvents
            for event_data in data.get('market_events', []):
                event = MarketEvent(
                    item_id=event_data['item_id'],
                    region=event_data['region'],
                    type=event_data['type'],
                    magnitude=event_data['magnitude'],
                    message=event_data['message'],
                    happened_at=datetime.fromisoformat(event_data['happened_at'])
                )
                session.add(event)
            
            # Импорт Deals
            for deal_data in data.get('deals', []):
                existing = session.execute(select(Deal).where(Deal.id == deal_data['id'])).scalar_one_or_none()
                if not existing:
                    deal = Deal(
                        id=deal_data['id'],
                        user_key=deal_data['user_key'],
                        item_id=deal_data['item_id'],
                        state=deal_data['state'],
                        amount=deal_data['amount'],
                        buy_price=deal_data['buy_price'],
                        bought_at=datetime.fromisoformat(deal_data['bought_at']),
                        market_price_at_buy=deal_data['market_price_at_buy'],
                        list_price=deal_data['list_price'],
                        listed_at=datetime.fromisoformat(deal_data['listed_at']) if deal_data['listed_at'] else None,
                        sell_price=deal_data['sell_price'],
                        sold_at=datetime.fromisoformat(deal_data['sold_at']) if deal_data['sold_at'] else None,
                        fee_percent=deal_data['fee_percent'],
                        note=deal_data['note']
                    )
                    session.add(deal)
            
            # Импорт WatchItems
            for wi_data in data.get('watch_items', []):
                existing = session.execute(select(WatchItem).where(WatchItem.id == wi_data['id'])).scalar_one_or_none()
                if not existing:
                    wi = WatchItem(
                        id=wi_data['id'],
                        user_id=wi_data['user_id'],
                        user_key=wi_data['user_key'],
                        item_id=wi_data['item_id'],
                        quality=wi_data['quality'],
                        upgrade_level=wi_data['upgrade_level'],
                        folder=wi_data['folder'],
                        color=wi_data['color'],
                        created_at=datetime.fromisoformat(wi_data['created_at'])
                    )
                    session.add(wi)
            
            # Импорт Users
            for user_data in data.get('users', []):
                existing = session.execute(select(User).where(User.id == user_data['id'])).scalar_one_or_none()
                if not existing:
                    user = User(
                        id=user_data['id'],
                        steam_id=user_data['steam_id'],
                        username=user_data['username'],
                        avatar=user_data['avatar'],
                        auth_provider=user_data['auth_provider'],
                        created_at=datetime.fromisoformat(user_data['created_at']) if user_data['created_at'] else None,
                        last_login=datetime.fromisoformat(user_data['last_login']) if user_data['last_login'] else None
                    )
                    session.add(user)
            
            # Импорт Sessions
            for sess_data in data.get('sessions', []):
                existing = session.execute(select(SessionModel).where(SessionModel.id == sess_data['id'])).scalar_one_or_none()
                if not existing:
                    sess = SessionModel(
                        id=sess_data['id'],
                        user_id=sess_data['user_id'],
                        token=sess_data['token'],
                        created_at=datetime.fromisoformat(sess_data['created_at']) if sess_data['created_at'] else None,
                        expires_at=datetime.fromisoformat(sess_data['expires_at']) if sess_data['expires_at'] else None
                    )
                    session.add(sess)
            
            session.commit()
        
        return {"status": "success", "message": "Data imported successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/")
def root() -> dict:
    return {"message": "Market Insight API", "status": "ok", "source": settings.source}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "source": settings.source}
