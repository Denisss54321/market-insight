"""HTTP-эндпоинты и WebSocket живой ленты."""

from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics import mad_filter
from app.auth import (
    create_session,
    delete_session,
    exchange_exbo_code,
    get_exbo_user_info,
    get_or_create_exbo_user,
    get_or_create_steam_user,
    get_steam_user_info,
    validate_session,
)
from app.config import settings
from app.db import get_session
from app.hub import hub
from app.models import (
    Armor,
    ArtifactStat,
    Base,
    Container,
    Deal,
    Item,
    ItemStats,
    LotSnapshot,
    MarketEvent,
    Sale,
    Session,
    User,
    WatchItem,
)
from app.xp_system import award_xp_for_deal, get_user_xp_info
from app.schemas import (
    CatalogResponse,
    DealCreate,
    DealOut,
    DealUpdate,
    ItemDetail,
    ItemRow,
    MarketSummary,
    PortfolioSummary,
    WatchCreate,
)

router = APIRouter(prefix="/api")

# Отдельный роутер для OAuth без префикса (для точных redirect URI)
auth_router = APIRouter()


def _stats_map(session: Session, item_ids: list[str]) -> dict[str, list[ItemStats]]:
    """Возвращает ВСЕ варианты (quality, upgrade_level) статистики на item_id,
    а не только первый попавшийся."""
    if not item_ids:
        return {}
    rows = session.execute(
        select(ItemStats).where(ItemStats.item_id.in_(item_ids))
    ).scalars()
    result: dict[str, list[ItemStats]] = defaultdict(list)
    for row in rows:
        result[row.item_id].append(row)
    return result


def _row(item: Item, stats: ItemStats, quality: str = "", upgrade_level: int = 0) -> ItemRow:
    """stats теперь обязателен и конкретен — один вариант, не Optional-агрегат.
    quality и upgrade_level из параметров запроса для корректного отображения выбранного варианта."""
    return ItemRow(
        id=item.id,
        name=item.name_ru,
        nameEn=item.name_en,
        category=item.category,
        icon=item.icon,
        quality=quality or stats.quality,
        upgradeLevel=upgrade_level or stats.upgrade_level,
        marketPrice=stats.market_price,
        median=stats.median,
        mean=stats.mean,
        mode=stats.mode,
        lowestLot=stats.lowest_lot,
        activeLots=stats.active_lots,
        liquidity=stats.liquidity,
        volatility=stats.volatility,
        spread=stats.spread,
        confidence=stats.confidence,
        change24h=stats.change_24h,
        change7d=stats.change_7d,
        sales24h=stats.sales_24h,
        sampleSize=stats.sample_size,
        updatedAt=stats.computed_at.isoformat(),
    )

def _row_empty(item: Item, quality: str, upgrade_level: int) -> ItemRow:
    return ItemRow(
        id=item.id,
        name=item.name_ru,
        nameEn=item.name_en,
        category=item.category,
        icon=item.icon,
        quality=quality,
        upgradeLevel=upgrade_level,
        marketPrice=0.0,
        median=0.0,
        mean=0.0,
        mode=0.0,
        lowestLot=0.0,
        activeLots=0,
        liquidity=0.0,
        volatility=0.0,
        spread=0.0,
        confidence=0.0,
        change24h=0.0,
        change7d=0.0,
        sales24h=0,
        sampleSize=0,
        updatedAt=datetime.utcnow().isoformat(),
    )


@router.get("/status")
def status() -> dict:
    from app.state import app_state

    collector = app_state.collector
    payload = collector.status if collector else {"source": settings.source, "cycles": 0}
    payload["clients"] = hub.clients
    payload["commissionPercent"] = settings.commission_percent
    return payload


@router.get("/catalog", response_model=CatalogResponse)
def catalog(
    session: Session = Depends(get_session),
    search: str = "",
    category: str = "",
    quality: str = "",
    upgrade_level: int = Query(None),
    sort: str = "liquidity",
    order: str = "desc",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> CatalogResponse:
    query = select(Item)
    if category:
        query = query.where(Item.category == category)
    items = list(session.execute(query).scalars())

    if search:
        # Улучшенный поиск с приоритетом точного совпадения
        needle = search.casefold()
        # Сначала ищем точное совпадение или совпадение начала строки
        exact_matches = []
        partial_matches = []
        
        for item in items:
            name_ru = item.name_ru.casefold()
            name_en = item.name_en.casefold()
            
            # Точное совпадение или совпадение начала строки
            if needle == name_ru or needle == name_en or name_ru.startswith(needle) or name_en.startswith(needle):
                exact_matches.append(item)
            # Частичное совпадение (содержит подстроку)
            elif needle in name_ru or needle in name_en:
                partial_matches.append(item)
        
        # Сортируем: сначала точные совпадения, потом частичные
        items = exact_matches + partial_matches

    stats_map = _stats_map(session, [item.id for item in items])

    # Группируем по базовому item_id, показываем все варианты в одной карточке
    rows = []
    for item in items:
        item_stats = stats_map.get(item.id, [])
        if not item_stats:
            continue
            
        # Сортируем варианты по ликвидности (сначала самые популярные)
        sorted_stats = sorted(item_stats, key=lambda s: s.liquidity or 0, reverse=True)
        
        # Создаем одну карточку с агрегированными данными по всем вариантам
        # Берем данные из первого варианта для базовых полей
        base_stats = sorted_stats[0]
        row = _row(item, base_stats, base_stats.quality, base_stats.upgrade_level)
        
        # Вычисляем диапазон цен по всем вариантам
        prices = [s.market_price for s in sorted_stats if s.market_price is not None]
        if prices:
            row.minPrice = min(prices)
            row.maxPrice = max(prices)
        else:
            row.minPrice = None
            row.maxPrice = None
        
        # Вычисляем агрегированную ликвидность
        liquidities = [s.liquidity for s in sorted_stats if s.liquidity is not None]
        row.totalLiquidity = sum(liquidities) if liquidities else None
        
        # Добавляем информацию о всех доступных вариантах (сортированные по ликвидности)
        row.variants = [
            {
                "quality": stats.quality or "",
                "upgradeLevel": stats.upgrade_level,
                "marketPrice": stats.market_price,
                "liquidity": stats.liquidity,
                "activeLots": stats.active_lots,
                "change24h": stats.change_24h,
            }
            for stats in sorted_stats
        ]
        
        rows.append(row)

    if quality:
        rows = [row for row in rows if any(v["quality"] == quality for v in row.variants)]
    if upgrade_level is not None:
        rows = [row for row in rows if any(v["upgradeLevel"] == upgrade_level for v in row.variants)]

    keys = {
        "name": lambda row: row.name.lower(),
        "price": lambda row: row.minPrice if row.minPrice is not None else (row.marketPrice if row.marketPrice is not None else 0),
        "liquidity": lambda row: row.liquidity if row.liquidity is not None else 0,
        "change24h": lambda row: row.change24h if row.change24h is not None else 0,
        "volatility": lambda row: row.volatility,
        "confidence": lambda row: row.confidence,
        "sales24h": lambda row: row.sales24h,
        "activeLots": lambda row: row.activeLots,
    }
    rows.sort(key=keys.get(sort, keys["liquidity"]), reverse=order == "desc")
    return CatalogResponse(total=len(rows), items=rows[offset : offset + limit])


@router.get("/categories")
def categories(session: Session = Depends(get_session)) -> list[dict]:
    # Задаем явный порядок категорий
    category_order = ["biochemical", "electrophysical", "gravity", "thermal", "other_arts"]
    rows = session.execute(
        select(Item.category, func.count(Item.id)).group_by(Item.category)
    ).all()
    category_dict = {name: count for name, count in rows}
    
    # Возвращаем категории в заданном порядке, только если они существуют
    return [
        {"id": cat_id, "count": category_dict.get(cat_id, 0)}
        for cat_id in category_order
        if cat_id in category_dict
    ]


@router.get("/items/{item_id}", response_model=ItemDetail)
def item_detail(
    item_id: str, 
    quality: str = "",
    upgrade_level: int = 0,
    session: Session = Depends(get_session)
) -> ItemDetail:
    item = session.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Артефакт не найден")
    
    # Получаем статистику для конкретного варианта или агрегированную
    all_stats = list(session.execute(
        select(ItemStats).where(ItemStats.item_id == item_id, ItemStats.region == settings.region)
    ).scalars())

    # Получаем все варианты статистики для этого предмета (нужно для кнопок выбора)
    variants = [
        {
            "quality": v.quality or "",
            "upgradeLevel": v.upgrade_level,
            "marketPrice": v.market_price,
            "liquidity": v.liquidity,
            "activeLots": v.active_lots,
            "change24h": v.change_24h,
        }
        for v in all_stats
    ]

    if quality or upgrade_level > 0:
        # Пытаемся получить запрошенный вариант
        stats = session.get(
            ItemStats,
            {"item_id": item_id, "region": settings.region, "quality": quality, "upgrade_level": upgrade_level},
        )
        # Если запрошенный вариант не найден, возвращаем пустые данные но сохраняем варианты
        if stats is None:
            return ItemDetail(
                item=_row_empty(item, quality, upgrade_level),
                lots=[],
                variants=variants,
            )
    else:
        base = next((s for s in all_stats if s.quality == "" and s.upgrade_level == 0), None)

        if base is not None and base.sample_size >= settings.min_sample_size:
            stats = base
        else:
            candidates = [s for s in all_stats if s.sample_size >= settings.min_sample_size]
            stats = max(candidates, key=lambda x: x.liquidity) if candidates else base
    
    # Фильтруем лоты по качеству и заточке если указаны
    lot_query = select(LotSnapshot).where(LotSnapshot.item_id == item_id, LotSnapshot.gone_at.is_(None))
    if quality:
        lot_query = lot_query.where(LotSnapshot.quality == quality)
    # Явно фильтруем по upgrade_level, даже если он равен 0
    lot_query = lot_query.where(LotSnapshot.upgrade_level == upgrade_level)
    lots = list(session.execute(lot_query.order_by(LotSnapshot.unit_price).limit(60)).scalars())
    
    market_price = stats.market_price if stats and stats.market_price is not None else 0.0
    commission = settings.commission_percent / 100
    
    return ItemDetail(
        item=_row(item, stats, quality, upgrade_level),
        lots=[
            {
                "unitPrice": lot.unit_price,
                "price": lot.price,
                "amount": lot.amount,
                "quality": lot.quality,
                "upgradeLevel": lot.upgrade_level,
                "endsAt": lot.ends_at.isoformat() if lot.ends_at else None,
                "profit": round((market_price * (1 - commission) - lot.unit_price) * lot.amount, 2) if market_price > 0 else 0.0,
            }
            for lot in lots
        ],
        variants=variants,
    )


@router.get("/items/{item_id}/sales")
def item_sales(
    item_id: str,
    quality: str = "",
    upgrade_level: int = 0,
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
) -> dict:
    query = select(Sale).where(Sale.item_id == item_id)
    if quality:
        query = query.where(Sale.quality == quality)
    # Явно фильтруем по upgrade_level, даже если он равен 0
    query = query.where(Sale.upgrade_level == upgrade_level)
    sales = list(session.execute(query.order_by(Sale.sold_at.desc()).limit(limit)).scalars())
    
    return {
        "sales": [
            {
                "price": sale.price,
                "unitPrice": sale.unit_price,
                "amount": sale.amount,
                "quality": sale.quality,
                "upgradeLevel": sale.upgrade_level,
                "soldAt": sale.sold_at.isoformat(),
            }
            for sale in sales
        ]
    }


@router.get("/items/{item_id}/history")
def item_history(
    item_id: str,
    days: int = Query(7, ge=1, le=365),
    quality: str = "",
    upgrade_level: int = 0,
    mode: str = Query("price", regex="^(price|sales)$"),
    session: Session = Depends(get_session),
) -> dict:
    since = datetime.utcnow() - timedelta(days=days)
    query = select(Sale).where(Sale.item_id == item_id, Sale.sold_at >= since)
    if quality:
        query = query.where(Sale.quality == quality)
    # Явно фильтруем по upgrade_level, даже если он равен 0
    query = query.where(Sale.upgrade_level == upgrade_level)
    sales = list(session.execute(query.order_by(Sale.sold_at)).scalars())
    
    points = []
    
    if mode == "price":
        # Режим истории цены - агрегация по временным бакетам
        bucket_hours = 1 if days <= 3 else (4 if days <= 14 else 24)
        buckets: dict[int, list[Sale]] = {}
        for sale in sales:
            key = int(sale.sold_at.timestamp() // (bucket_hours * 3600))
            buckets.setdefault(key, []).append(sale)

        for key in sorted(buckets):
            group = buckets[key]
            prices = mad_filter([sale.unit_price for sale in group])
            points.append(
                {
                    "time": int(key * bucket_hours * 3600),
                    "value": round(statistics.median(prices), 2),
                    "low": round(min(prices), 2),
                    "high": round(max(prices), 2),
                    "volume": sum(sale.amount for sale in group),
                }
            )
    else:
        # Режим истории продаж - реальные продажи
        seen_times = set()
        for sale in sales:
            time = int(sale.sold_at.timestamp())
            # Добавляем небольшое смещение для дубликатов времени
            while time in seen_times:
                time += 1
            seen_times.add(time)
            points.append(
                {
                    "time": time,
                    "value": round(sale.unit_price, 2),
                    "low": round(sale.unit_price, 2),
                    "high": round(sale.unit_price, 2),
                    "volume": sale.amount,
                }
            )

    prices = [sale.unit_price for sale in sales]
    filtered = mad_filter(prices) if prices else []
    histogram: list[dict] = []
    if filtered:
        low, high = min(filtered), max(filtered)
        steps = 18
        width = (high - low) / steps or 1
        counts = [0] * steps
        for value in filtered:
            counts[min(steps - 1, int((value - low) / width))] += 1
        histogram = [
            {"price": round(low + (index + 0.5) * width, 2), "count": count}
            for index, count in enumerate(counts)
        ]

    hourly: dict[int, list[float]] = {}
    for sale in sales:
        hourly.setdefault(sale.sold_at.hour, []).append(sale.unit_price)
    seasonality = [
        {
            "hour": hour,
            "sales": len(hourly.get(hour, [])),
            "median": round(statistics.median(hourly[hour]), 2) if hourly.get(hour) else 0.0,
        }
        for hour in range(24)
    ]

    return {
        "points": points,
        "histogram": histogram,
        "seasonality": seasonality,
        "totalSales": len(sales),
        "firstSaleAt": sales[0].sold_at.isoformat() if sales else None,
    }


@router.get("/artifacts/{item_id}/stats")
def artifact_stats(item_id: str, session: Session = Depends(get_session)) -> list[dict]:
    """Получает характеристики артефакта для калькулятора сборок."""
    stats = list(session.execute(
        select(ArtifactStat).where(ArtifactStat.item_id == item_id)
    ).scalars())
    
    return [
        {
            "stat_key": stat.stat_key,
            "stat_name_ru": stat.stat_name_ru,
            "property_type": stat.property_type,
            "unit": stat.unit,
            "is_harmful": stat.is_harmful,
            "is_negative": stat.is_negative,
            "min_value": stat.min_value,
            "max_value": stat.max_value,
            "value_at_85": stat.value_at_85,
            "value_at_100": stat.value_at_100,
        }
        for stat in stats
    ]


@router.get("/market/summary", response_model=MarketSummary)
def market_summary(session: Session = Depends(get_session)) -> MarketSummary:
    stats = list(session.execute(select(ItemStats)).scalars())
    items = {item.id: item for item in session.execute(select(Item)).scalars()}
    # Фильтруем только базовые варианты (upgrade_level = 0) для лидеров
    tracked = [row for row in stats if row.sample_size > 0 and row.upgrade_level == 0]

    def top(key, reverse: bool = True, limit: int = 5) -> list[dict]:
        ordered = sorted(tracked, key=key, reverse=reverse)[:limit]
        return [
            {
                "id": row.item_id,
                "name": items[row.item_id].name_ru if row.item_id in items else row.item_id,
                "icon": items[row.item_id].icon if row.item_id in items else "",
                "marketPrice": row.market_price,
                "change24h": row.change_24h,
                "liquidity": row.liquidity,
                "volatility": row.volatility,
                "quality": row.quality if row.quality else "",
                "upgradeLevel": 0,
            }
            for row in ordered
        ]

    since = datetime.utcnow() - timedelta(hours=24)
    sales_24h = session.execute(
        select(func.count(Sale.id)).where(Sale.sold_at >= since)
    ).scalar_one()
    volume_24h = session.execute(
        select(func.coalesce(func.sum(Sale.price), 0.0)).where(Sale.sold_at >= since)
    ).scalar_one()
    active_lots = session.execute(
        select(func.count(LotSnapshot.id)).where(LotSnapshot.gone_at.is_(None))
    ).scalar_one()
    events = list(
        session.execute(select(MarketEvent).order_by(MarketEvent.happened_at.desc()).limit(20)).scalars()
    )

    return MarketSummary(
        totalItems=len(items),
        trackedItems=len(tracked),
        sales24h=sales_24h,
        volume24h=round(float(volume_24h), 2),
        activeLots=active_lots,
        avgLiquidity=round(statistics.fmean([row.liquidity for row in tracked]), 2) if tracked else 0.0,
        gainers=top(lambda row: row.change_24h),
        losers=top(lambda row: row.change_24h, reverse=False),
        mostLiquid=top(lambda row: row.liquidity),
        mostVolatile=top(lambda row: row.volatility),
        heatmap=_heatmap(tracked, items),
        events=[
            {
                "id": event.id,
                "itemId": event.item_id,
                "name": items[event.item_id].name_ru if event.item_id in items else event.item_id,
                "type": event.type,
                "magnitude": event.magnitude,
                "message": event.message,
                "happenedAt": event.happened_at.isoformat(),
                "quality": "",
            }
            for event in events
        ],
    )


def _heatmap(stats: list[ItemStats], items: dict[str, Item]) -> list[dict]:
    groups: dict[str, list[ItemStats]] = {}
    for row in stats:
        item = items.get(row.item_id)
        if item is None:
            continue
        groups.setdefault(item.category, []).append(row)
    result = []
    for category, rows in sorted(groups.items()):
        result.append(
            {
                "category": category,
                "items": len(rows),
                "change24h": round(statistics.fmean([row.change_24h for row in rows if row.change_24h is not None]), 2),
                "liquidity": round(statistics.fmean([row.liquidity for row in rows if row.liquidity is not None]), 2),
                "volume": round(sum((row.market_price or 0.0) * (row.liquidity or 0.0) for row in rows), 2),
            }
        )
    return result


@router.get("/feed")
def feed(limit: int = Query(60, ge=1, le=200)) -> dict:
    return {"items": hub.recent(limit)}


@router.websocket("/ws/lots")
async def ws_lots(websocket: WebSocket) -> None:
    await websocket.accept()
    await hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(websocket)
    except Exception:
        await hub.disconnect(websocket)


# --- Вотчлист -------------------------------------------------------------


@router.get("/watchlist")
def watchlist(token: str | None = Query(None), user: str = "local", session: Session = Depends(get_session)) -> list[dict]:
    # Если токен предоставлен - валидируем и используем user_id
    if token:
        user_obj = validate_session(session, token)
        if user_obj:
            # Сначала ищем по user_id (новые записи)
            rows = list(session.execute(select(WatchItem).where(WatchItem.user_id == user_obj.id)).scalars())
            # Если нет записей по user_id, показываем старые записи по user_key для плавного перехода
            if not rows:
                rows = list(session.execute(select(WatchItem).where(WatchItem.user_key == user)).scalars())
        else:
            raise HTTPException(status_code=401, detail="Не авторизован")
    else:
        # Обратная совместимость - используем user_key
        rows = list(session.execute(select(WatchItem).where(WatchItem.user_key == user)).scalars())
    # Get ItemStats for each watch item using saved quality and upgrade_level
    stats_map = {}
    for row in rows:
        stats = session.execute(
            select(ItemStats).where(
                ItemStats.item_id == row.item_id,
                ItemStats.region == settings.region,
                ItemStats.quality == row.quality,
                ItemStats.upgrade_level == row.upgrade_level
            ).limit(1)
        ).scalar_one_or_none()
        # Fallback to base variant if specific variant not found
        if stats is None:
            stats = session.execute(
                select(ItemStats).where(
                    ItemStats.item_id == row.item_id,
                    ItemStats.region == settings.region,
                    ItemStats.quality == "",
                    ItemStats.upgrade_level == 0
                ).limit(1)
            ).scalar_one_or_none()
        if stats:
            stats_map[row.id] = stats
    items = {item.id: item for item in session.execute(select(Item)).scalars()}
    return [
        {
            "id": row.id,
            "itemId": row.item_id,
            "quality": row.quality,
            "upgradeLevel": row.upgrade_level,
            "folder": row.folder,
            "color": row.color,
            "item": _row(items[row.item_id], stats_map.get(row.id), row.quality, row.upgrade_level).model_dump()
            if row.item_id in items and row.id in stats_map
            else None,
        }
        for row in rows
    ]


@router.post("/watchlist")
def watchlist_add(
    payload: WatchCreate, 
    token: str | None = Query(None),
    session: Session = Depends(get_session)
) -> dict:
    # Если токен предоставлен - валидируем и используем user_id
    if token:
        user = validate_session(session, token)
        if not user:
            raise HTTPException(status_code=401, detail="Не авторизован")
        
        # Проверяем существование записи с user_id
        exists = session.execute(
            select(WatchItem).where(
                WatchItem.user_id == user.id,
                WatchItem.item_id == payload.itemId,
                WatchItem.quality == payload.quality,
                WatchItem.upgrade_level == payload.upgradeLevel
            )
        ).scalar_one_or_none()
        if exists:
            return {"id": exists.id, "created": False}
        
        row = WatchItem(
            user_id=user.id,
            user_key=payload.user,  # Для обратной совместимости
            item_id=payload.itemId,
            quality=payload.quality,
            upgrade_level=payload.upgradeLevel,
            folder=payload.folder,
            color=payload.color
        )
    else:
        # Обратная совместимость - используем user_key
        exists = session.execute(
            select(WatchItem).where(
                WatchItem.user_key == payload.user,
                WatchItem.item_id == payload.itemId,
                WatchItem.quality == payload.quality,
                WatchItem.upgrade_level == payload.upgradeLevel
            )
        ).scalar_one_or_none()
        if exists:
            return {"id": exists.id, "created": False}
        
        row = WatchItem(
            user_key=payload.user,
            item_id=payload.itemId,
            quality=payload.quality,
            upgrade_level=payload.upgradeLevel,
            folder=payload.folder,
            color=payload.color
        )
    
    session.add(row)
    session.commit()
    return {"id": row.id, "created": True}


@router.delete("/watchlist/{item_id}")
def watchlist_remove(
    item_id: str, 
    quality: str = "", 
    upgrade_level: int = 0,
    token: str | None = Query(None),
    user: str = "local",
    session: Session = Depends(get_session)
) -> dict:
    # Если токен предоставлен - валидируем и используем user_id
    if token:
        user_obj = validate_session(session, token)
        if not user_obj:
            raise HTTPException(status_code=401, detail="Не авторизован")
        query = select(WatchItem).where(WatchItem.user_id == user_obj.id, WatchItem.item_id == item_id)
    else:
        # Обратная совместимость - используем user_key
        query = select(WatchItem).where(WatchItem.user_key == user, WatchItem.item_id == item_id)
    
    if quality:
        query = query.where(WatchItem.quality == quality)
    if upgrade_level > 0:
        query = query.where(WatchItem.upgrade_level == upgrade_level)
    
    rows = session.execute(query).scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail="Не найдено")
    for row in rows:
        session.delete(row)
    session.commit()
    return {"deleted": True}


# --- Портфель -------------------------------------------------------------


def _deal_out(deal: Deal, item: Item | None, stats: ItemStats | None) -> DealOut:
    fee = deal.fee_percent / 100
    market = stats.market_price if stats and stats.market_price is not None else 0.0
    if deal.sell_price is not None:
        gross = deal.sell_price * deal.amount
        profit = gross * (1 - fee) - deal.buy_price * deal.amount
        realized = True
    else:
        reference = deal.list_price or market
        gross = reference * deal.amount
        profit = gross * (1 - fee) - deal.buy_price * deal.amount
        realized = False
    invested = deal.buy_price * deal.amount
    return DealOut(
        id=deal.id,
        itemId=deal.item_id,
        name=item.name_ru if item else deal.item_id,
        icon=item.icon if item else "",
        state=deal.state,
        amount=deal.amount,
        buyPrice=deal.buy_price,
        boughtAt=deal.bought_at.isoformat(),
        marketPriceAtBuy=deal.market_price_at_buy,
        marketPriceNow=market,
        listPrice=deal.list_price,
        sellPrice=deal.sell_price,
        soldAt=deal.sold_at.isoformat() if deal.sold_at else None,
        feePercent=deal.fee_percent,
        invested=round(invested, 2),
        profit=round(profit, 2),
        roiPercent=round(profit / invested * 100, 2) if invested else 0.0,
        realized=realized,
        note=deal.note,
        liquidity=stats.liquidity if stats else 0.0,
    )


@router.get("/deals", response_model=PortfolioSummary)
def deals(user: str = "local", session: Session = Depends(get_session)) -> PortfolioSummary:
    rows = list(
        session.execute(select(Deal).where(Deal.user_key == user).order_by(Deal.bought_at.desc())).scalars()
    )
    items = {item.id: item for item in session.execute(select(Item)).scalars()}
    stats_map = _stats_map(session, [row.item_id for row in rows])
    # Для сделок используем статистику конкретного варианта (quality, upgrade_level)
    out = []
    for row in rows:
        item_stats_list = stats_map.get(row.item_id, [])
        # Ищем статистику для конкретного качества и заточки
        specific_stats = None
        for stats in item_stats_list:
            if stats.quality == row.quality and stats.upgrade_level == row.upgrade_level:
                specific_stats = stats
                break
        # Fallback к базовому варианту
        if specific_stats is None:
            for stats in item_stats_list:
                if stats.quality == "" and stats.upgrade_level == 0:
                    specific_stats = stats
                    break
        # Если ничего не найдено, используем первый доступный вариант
        if specific_stats is None and item_stats_list:
            specific_stats = item_stats_list[0]
        out.append(_deal_out(row, items.get(row.item_id), specific_stats))
    closed = [deal for deal in out if deal.realized]
    open_deals = [deal for deal in out if not deal.realized]
    wins = [deal for deal in closed if deal.profit > 0]
    return PortfolioSummary(
        deals=out,
        invested=round(sum(deal.invested for deal in open_deals), 2),
        realizedProfit=round(sum(deal.profit for deal in closed), 2),
        unrealizedProfit=round(sum(deal.profit for deal in open_deals), 2),
        openCount=len(open_deals),
        closedCount=len(closed),
        winRate=round(len(wins) / len(closed) * 100, 1) if closed else 0.0,
        bestDeal=max(closed, key=lambda deal: deal.profit) if closed else None,
        worstDeal=min(closed, key=lambda deal: deal.profit) if closed else None,
    )


@router.post("/deals", response_model=DealOut)
def deal_create(payload: DealCreate, session: Session = Depends(get_session)) -> DealOut:
    # Если токен предоставлен - валидируем и используем user_id
    user_id = None
    if payload.token:
        user = validate_session(session, payload.token)
        if not user:
            raise HTTPException(status_code=401, detail="Не авторизован")
        user_id = user.id
    
    item = session.get(Item, payload.itemId)
    if item is None:
        raise HTTPException(status_code=404, detail="Артефакт не найден")
    
    stats = session.execute(
        select(ItemStats).where(
            ItemStats.item_id == payload.itemId,
            ItemStats.region == settings.region,
            ItemStats.quality == payload.quality,
            ItemStats.upgrade_level == payload.upgradeLevel
        ).limit(1)
    ).scalar_one_or_none()
    # Fallback to base variant if specific variant not found
    if stats is None:
        stats = session.execute(
            select(ItemStats).where(
                ItemStats.item_id == payload.itemId,
                ItemStats.region == settings.region,
                ItemStats.quality == "",
                ItemStats.upgrade_level == 0
            ).limit(1)
        ).scalar_one_or_none()
    deal = Deal(
        user_key=payload.user,
        user_id=user_id,
        item_id=payload.itemId,
        amount=payload.amount,
        buy_price=payload.buyPrice,
        market_price_at_buy=stats.market_price if stats and stats.market_price is not None else 0.0,
        fee_percent=payload.feePercent if payload.feePercent is not None else settings.commission_percent,
        note=payload.note,
        state="bought",
        quality=payload.quality,
        upgrade_level=payload.upgradeLevel,
    )
    session.add(deal)
    session.commit()
    
    # Начисляем XP за создание сделки
    # Если есть user_id - используем его, иначе пытаемся найти пользователя по user_key
    xp_user_id = user_id
    if not xp_user_id:
        # Пытаемся найти пользователя по user_key для начисления XP
        from app.models import User
        user_by_key = session.execute(
            select(User).where(User.steam_id == payload.user)
        ).scalar_one_or_none()
        if user_by_key:
            xp_user_id = user_by_key.id
            # Обновляем user_id в сделке для связывания
            deal.user_id = xp_user_id
            session.commit()
    
    if xp_user_id:
        award_xp_for_deal(xp_user_id, deal, session)
        session.commit()
    
    return _deal_out(deal, item, stats)


@router.patch("/deals/{deal_id}", response_model=DealOut)
def deal_update(deal_id: int, payload: DealUpdate, session: Session = Depends(get_session)) -> DealOut:
    deal = session.get(Deal, deal_id)
    if deal is None:
        raise HTTPException(status_code=404, detail="Сделка не найдена")
    
    old_state = deal.state
    
    if payload.listPrice is not None:
        deal.list_price = payload.listPrice
        deal.listed_at = datetime.utcnow()
        deal.state = "listed"
    if payload.sellPrice is not None:
        deal.sell_price = payload.sellPrice
        deal.sold_at = datetime.utcnow()
        deal.state = "sold"
    if payload.note is not None:
        deal.note = payload.note
    if payload.state is not None:
        deal.state = payload.state
    
    session.commit()
    
    # Начисляем XP при изменении состояния сделки
    if deal.user_id and old_state != deal.state:
        award_xp_for_deal(deal.user_id, deal, session)
        session.commit()
    
    # Получаем статистику для конкретного варианта сделки
    stats = session.execute(
        select(ItemStats).where(
            ItemStats.item_id == deal.item_id,
            ItemStats.region == settings.region,
            ItemStats.quality == deal.quality,
            ItemStats.upgrade_level == deal.upgrade_level
        ).limit(1)
    ).scalar_one_or_none()
    # Fallback к базовому варианту
    if stats is None:
        stats = session.execute(
            select(ItemStats).where(
                ItemStats.item_id == deal.item_id,
                ItemStats.region == settings.region,
                ItemStats.quality == "",
                ItemStats.upgrade_level == 0
            ).limit(1)
        ).scalar_one_or_none()
    
    return _deal_out(deal, session.get(Item, deal.item_id), stats)


@router.delete("/deals/{deal_id}")
def deal_delete(deal_id: int, session: Session = Depends(get_session)) -> dict:
    deal = session.get(Deal, deal_id)
    if deal is None:
        raise HTTPException(status_code=404, detail="Сделка не найдена")
    session.delete(deal)
    session.commit()
    return {"deleted": True}


# --- OAuth авторизация -----------------------------------------------------


@auth_router.get("/auth/steam")
def auth_steam():
    """Перенаправляет на Steam OAuth."""
    steam_login_url = (
        f"https://steamcommunity.com/openid/login?"
        f"openid.ns=http://specs.openid.net/auth/2.0&"
        f"openid.mode=checkid_setup&"
        f"openid.return_to={settings.steam_redirect_uri}&"
        f"openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select&"
        f"openid.identity=http://specs.openid.net/auth/2.0/identifier_select"
    )
    return RedirectResponse(url=steam_login_url)


@auth_router.get("/auth/callback/steam")
async def auth_steam_callback(
    openid_identity: str = Query(..., alias="openid.identity"),
    openid_claimed_id: str = Query(..., alias="openid.claimed_id"),
    session: Session = Depends(get_session)
):
    """Обрабатывает callback от Steam OAuth."""
    # Извлекаем steam_id из identity
    steam_id = openid_identity.split("/")[-1]
    
    # Получаем информацию о пользователе
    user_info = await get_steam_user_info(steam_id)
    if not user_info:
        raise HTTPException(status_code=400, detail="Не удалось получить данные пользователя Steam")
    
    # Создаём или получаем пользователя
    user = get_or_create_steam_user(
        session,
        steam_id=user_info["steam_id"],
        username=user_info["username"],
        avatar=user_info["avatar"]
    )
    
    # Создаём сессию
    db_session = create_session(session, user)
    
    # Перенаправляем на фронтенд с токеном на страницу профиля
    frontend_url = f"http://localhost:3000/profile?token={db_session.token}"
    return RedirectResponse(url=frontend_url)


@auth_router.get("/auth/exbo")
def auth_exbo():
    """Перенаправляет на Exbo OAuth."""
    import uuid
    state = str(uuid.uuid4())
    
    exbo_auth_url = (
        f"https://exbo.net/oauth/authorize?"
        f"client_id={settings.exbo_client_id}&"
        f"redirect_uri={settings.exbo_redirect_uri}&"
        f"scope=&"
        f"response_type=code&"
        f"state={state}"
    )
    return RedirectResponse(url=exbo_auth_url)


@auth_router.get("/auth/callback/exbo")
async def auth_exbo_callback(
    code: str = Query(...),
    state: str = Query(...),
    session: Session = Depends(get_session)
):
    """Обрабатывает callback от Exbo OAuth."""
    # Обмениваем код на токен
    token_data = await exchange_exbo_code(code)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=400, detail="Не удалось получить токен доступа Exbo")
    
    # Получаем информацию о пользователе
    user_info = await get_exbo_user_info(token_data["access_token"])
    if not user_info:
        raise HTTPException(status_code=400, detail="Не удалось получить данные пользователя Exbo")
    
    # Создаём или получаем пользователя
    user = get_or_create_exbo_user(
        session,
        exbo_id=user_info["id"],
        username=user_info["username"],
        avatar=user_info["avatar"]
    )
    
    # Создаём сессию
    db_session = create_session(session, user)
    
    # Перенаправляем на фронтенд с токеном на страницу профиля
    frontend_url = f"http://localhost:3000/profile?token={db_session.token}"
    return RedirectResponse(url=frontend_url)


@auth_router.post("/auth/logout")
def auth_logout(
    token: str = Query(...),
    session: Session = Depends(get_session)
):
    """Выходитиз системы."""
    success = delete_session(session, token)
    return {"success": success}


@auth_router.get("/auth/me")
def auth_me(
    token: str = Query(...),
    session: Session = Depends(get_session)
):
    """Получает информацию о текущем пользователе."""
    user = validate_session(session, token)
    if not user:
        raise HTTPException(status_code=401, detail="Невалидный токен")
    
    xp_info = get_user_xp_info(user.id)
    
    return {
        "id": user.id,
        "username": user.username,
        "avatar": user.avatar,
        "auth_provider": user.auth_provider,
        "created_at": user.created_at.isoformat(),
        "last_login": user.last_login.isoformat(),
        "xp": xp_info["xp"],
        "level": xp_info["level"],
        "xp_progress": xp_info["progress"],
        "xp_needed": xp_info["needed"],
        "deals_count": xp_info["deals_count"],
        "total_profit": xp_info["total_profit"]
    }


# ==================== Калькулятор сборок ====================

@router.get("/containers")
def get_containers(session: Session = Depends(get_session)):
    """Получает список всех рюкзаков и контейнеров."""
    containers = session.execute(select(Container).order_by(Container.slots)).scalars().all()
    
    return [
        {
            "id": c.id,
            "item_id": c.item_id,
            "name_ru": c.name_ru,
            "icon": f"/icons/{c.container_type}/{c.item_id}.png",
            "slots": c.slots,
            "inner_protection": c.inner_protection,
            "effectiveness": c.effectiveness
        }
        for c in containers
    ]


@router.get("/armor")
def get_armor(session: Session = Depends(get_session)):
    """Получает список всей брони."""
    armor = session.execute(select(Armor).order_by(Armor.bullet_resistance.desc())).scalars().all()
    
    return [
        {
            "id": a.id,
            "item_id": a.item_id,
            "name_ru": a.name_ru,
            "icon": f"/icons/armor/{a.armor_type}/{a.item_id}.png",
            "armor_type": a.armor_type,
            "weight": a.weight,
            "durability": a.durability,
            "bullet_resistance": a.bullet_resistance,
            "tear_resistance": a.tear_resistance,
            "explosion_resistance": a.explosion_resistance,
            "electricity_resistance": a.electricity_resistance,
            "fire_resistance": a.fire_resistance,
            "chemical_resistance": a.chemical_resistance,
            "radiation_resistance": a.radiation_resistance,
            "thermal_resistance": a.thermal_resistance,
            "biological_resistance": a.biological_resistance,
            "psycho_resistance": a.psycho_resistance,
            "bleeding_resistance": a.bleeding_resistance,
            "stamina_bonus": a.stamina_bonus,
            "speed_modifier": a.speed_modifier,
            "carry_weight_bonus": a.carry_weight_bonus,
            "stability": a.stability
        }
        for a in armor
    ]


@router.get("/artifact-stats")
def get_artifact_stats(
    item_ids: str | None = Query(None),
    session: Session = Depends(get_session)
):
    """Получает характеристики артефактов."""
    query = select(ArtifactStat)
    if item_ids:
        ids_list = item_ids.split(",")
        query = query.where(ArtifactStat.item_id.in_(ids_list))
    
    stats = session.execute(query.order_by(ArtifactStat.item_id)).scalars().all()
    
    result = {}
    for stat in stats:
        if stat.item_id not in result:
            result[stat.item_id] = []
        result[stat.item_id].append({
            "stat_key": stat.stat_key,
            "stat_name_ru": stat.stat_name_ru,
            "is_negative": stat.is_negative,
            "min_value": stat.min_value,
            "max_value": stat.max_value
        })
    
    return result


@router.post("/builds/calculate")
def calculate_build(
    build_data: dict,
    session: Session = Depends(get_session)
):
    """Рассчитывает стоимость и характеристики сборки."""
    item_ids = build_data.get("item_ids", [])
    
    if not item_ids:
        return {"total_cost": 0, "stats": {}}
    
    # Получаем рыночные цены
    price_query = select(ItemStats).where(
        ItemStats.item_id.in_(item_ids),
        ItemStats.quality == "",
        ItemStats.upgrade_level == 0,
        ItemStats.region == "EU"
    )
    price_stats = session.execute(price_query).scalars().all()
    
    total_cost = 0
    for stat in price_stats:
        if stat.market_price:
            total_cost += stat.market_price
    
    # Получаем характеристики артефактов
    stats_query = select(ArtifactStat).where(ArtifactStat.item_id.in_(item_ids))
    artifact_stats = session.execute(stats_query).scalars().all()
    
    # Суммируем характеристики
    summed_stats = {}
    for stat in artifact_stats:
        if stat.stat_key not in summed_stats:
            summed_stats[stat.stat_key] = {
                "stat_name_ru": stat.stat_name_ru,
                "is_negative": stat.is_negative,
                "min_value": 0.0,
                "max_value": 0.0
            }
        summed_stats[stat.stat_key]["min_value"] += stat.min_value
        summed_stats[stat.stat_key]["max_value"] += stat.max_value
    
    return {
        "total_cost": total_cost,
        "stats": summed_stats
    }


@router.post("/builds/recommend")
def recommend_artifacts(
    build_data: dict,
    session: Session = Depends(get_session)
):
    """Рекомендует артефакты для добавления в сборку."""
    item_ids = build_data.get("item_ids", [])
    container_id = build_data.get("container_id")
    
    # Получаем характеристики уже выбранных артефактов
    existing_stats_query = select(ArtifactStat).where(ArtifactStat.item_id.in_(item_ids))
    existing_stats = session.execute(existing_stats_query).scalars().all()
    
    # Определяем какие характеристики уже есть
    existing_stat_keys = {s.stat_key for s in existing_stats}
    
    # Получаем все артефакты с характеристиками
    all_stats_query = select(ArtifactStat)
    all_stats = session.execute(all_stats_query).scalars().all()
    
    # Группируем по item_id
    artifacts_by_id = {}
    for stat in all_stats:
        if stat.item_id not in artifacts_by_id:
            artifacts_by_id[stat.item_id] = []
        artifacts_by_id[stat.item_id].append(stat)
    
    # Исключаем уже выбранные артефакты
    available_artifacts = {
        item_id: stats 
        for item_id, stats in artifacts_by_id.items() 
        if item_id not in item_ids
    }
    
    # Получаем цены для доступных артефактов
    available_ids = list(available_artifacts.keys())
    price_query = select(ItemStats).where(
        ItemStats.item_id.in_(available_ids),
        ItemStats.quality == "",
        ItemStats.upgrade_level == 0,
        ItemStats.region == "EU"
    )
    price_stats = session.execute(price_query).scalars().all()
    
    prices_by_id = {s.item_id: s.market_price for s in price_stats if s.market_price}
    
    # Рекомендуем артефакты, которые дополняют существующие характеристики
    recommendations = []
    for item_id, stats in available_artifacts.items():
        stat_keys = {s.stat_key for s in stats}
        
        # Если есть пересечение по типам характеристик - это хороший кандидат
        # Для MVP просто берем артефакты с похожими статами
        score = 0
        for stat in stats:
            # Если есть похожая характеристика - добавляем очки
            for existing in existing_stats:
                if stat.stat_key == existing.stat_key:
                    score += 1
                elif not stat.is_negative and not existing.is_negative:
                    # Оба позитивные - тоже хорошо
                    score += 0.5
        
        if score > 0:
            recommendations.append({
                "item_id": item_id,
                "price": prices_by_id.get(item_id, 0),
                "score": score,
                "stats": [
                    {
                        "stat_key": s.stat_key,
                        "stat_name_ru": s.stat_name_ru,
                        "is_negative": s.is_negative,
                        "min_value": s.min_value,
                        "max_value": s.max_value
                    }
                    for s in stats
                ]
            })
    
    # Сортируем по очкам и цене (сначала дешевле)
    recommendations.sort(key=lambda x: (-x["score"], x["price"]))
    
    return recommendations[:10]
