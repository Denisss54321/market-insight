"""Фоновый сборщик данных: обходит артефакты по приоритетам и наполняет базу."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import asdict
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.analytics import (
    LotPoint,
    Metrics,
    SalePoint,
    compute_metrics,
    detect_events,
    evaluate_lots,
)
from app.config import settings
from app.db import session_scope
from app.hub import hub
from app.models import Item, ItemStats, LotSnapshot, MarketEvent, Sale
from app.sources.base import MarketSource
from app.sources.http_source import HttpMarketSource
from app.sources.sandbox import SandboxSource

logger = logging.getLogger(__name__)


def build_source() -> MarketSource:
    if settings.source == "sandbox":
        return SandboxSource(history_days=settings.seed_history_days)
    source = HttpMarketSource(settings)
    # HttpMarketSource требует асинхронной инициализации для OAuth2
    return source


def load_catalog() -> list[dict]:
    path = settings.data_dir / "artefacts.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def seed_items() -> None:
    """Загружает список артефактов из базы предметов EXBO."""
    catalog = load_catalog()
    with session_scope() as session:
        existing = {row[0] for row in session.execute(select(Item.id))}
        for entry in catalog:
            if entry["id"] in existing:
                continue
            # Преобразуем "common" в "Обычный"
            quality = entry.get("quality", "")
            if quality == "common":
                quality = "Обычный"
            quality_ru = entry.get("quality_ru", "")
            if quality_ru == "common":
                quality_ru = "Обычный"
            session.add(
                Item(
                    id=entry["id"],
                    name_ru=entry["name_ru"],
                    name_en=entry.get("name_en", ""),
                    category=entry["category"],
                    quality=quality,
                    quality_ru=quality_ru,
                    icon=entry.get("icon", ""),
                )
            )
        # Обновляем существующие записи с пустым качеством
        catalog_map = {entry["id"]: entry for entry in catalog}
        for item in session.execute(select(Item)).scalars():
            if not item.quality and item.id in catalog_map:
                entry = catalog_map[item.id]
                quality = entry.get("quality", "")
                if quality == "common":
                    quality = "Обычный"
                quality_ru = entry.get("quality_ru", "")
                if quality_ru == "common":
                    quality_ru = "Обычный"
                item.quality = quality
                item.quality_ru = quality_ru
    logger.info("Каталог артефактов: %s позиций", len(catalog))


class Collector:
    """Сканирует артефакты: горячие часто, холодные редко."""

    def __init__(self, source: MarketSource) -> None:
        self.source = source
        self.started_at = datetime.utcnow()
        self.cycles = 0
        self.last_scan_at: datetime | None = None
        self.last_error: str | None = None
        self._stop = asyncio.Event()
        self._seeded: set[str] = set()
        self._seen_lots: set[str] = self._load_seen_lots()  # Загружаем из персистентного хранилища

    def _load_seen_lots(self) -> set[str]:
        """Загружает отслеживаемые лоты из файла при старте."""
        path = settings.data_dir / "seen_lots.json"
        try:
            if path.exists():
                with path.open(encoding="utf-8") as handle:
                    data = json.load(handle)
                    cutoff = datetime.utcnow().timestamp() - 86400
                    return {key for key, ts in data.items() if ts > cutoff}
        except Exception as error:
            logger.warning("Ошибка загрузки seen_lots: %s", error)
        return set()

    def _save_seen_lots(self) -> None:
        """Сохраняет отслеживаемые лоты в файл."""
        path = settings.data_dir / "seen_lots.json"
        try:
            data = {key: datetime.utcnow().timestamp() for key in self._seen_lots}
            with path.open("w", encoding="utf-8") as handle:
                json.dump(data, handle)
        except Exception as error:
            logger.warning("Ошибка сохранения seen_lots: %s", error)

    @property
    def status(self) -> dict:
        remaining = getattr(self.source, "remaining", None)
        return {
            "source": getattr(self.source, "name", "unknown"),
            "region": settings.region,
            "started_at": self.started_at.isoformat(),
            "cycles": self.cycles,
            "last_scan_at": self.last_scan_at.isoformat() if self.last_scan_at else None,
            "rate_limit_remaining": remaining,
            "last_error": self.last_error,
        }

    async def run(self) -> None:
        # Инициализируем источник данных (например, для OAuth2)
        if hasattr(self.source, 'initialize'):
            try:
                await self.source.initialize()
                logger.info("Источник данных инициализирован")
            except Exception as error:
                logger.error("Ошибка инициализации источника данных: %s", error)
                self.last_error = str(error)
                # Если инициализация не удалась, останавливаем коллектор
                logger.error("Коллектор остановлен из-за ошибки инициализации")
                return
        
        while not self._stop.is_set():
            try:
                await self._cycle()
            except Exception as error:
                self.last_error = str(error)
                logger.exception("Ошибка цикла сканирования")
            await asyncio.sleep(2.0)

    def stop(self) -> None:
        self._stop.set()

    async def _cycle(self) -> None:
        due_items = self._due_items()
        logger.info("Цикл #%d: обрабатывается %d предметов", self.cycles + 1, len(due_items))
        for item_id in due_items:
            if self._stop.is_set():
                return
            try:
                await self.scan_item(item_id)
            except Exception:
                logger.exception("Ошибка сканирования item_id=%s", item_id)
        self.cycles += 1

    def _due_items(self) -> list[str]:
        """Выбирает артефакты, которым пора обновиться, по трём очередям."""
        now = datetime.utcnow()
        with session_scope() as session:
            items = session.execute(
                select(Item.id, Item.priority, Item.last_scanned_at).order_by(Item.priority.desc())
            ).all()
        due: list[str] = []
        for index, (item_id, _priority, last_scanned) in enumerate(items):
            if index < settings.hot_items:
                interval = settings.hot_interval_seconds
            elif index < settings.hot_items + settings.warm_items:
                interval = settings.warm_interval_seconds
            else:
                interval = settings.cold_interval_seconds
            if last_scanned is None or (now - last_scanned).total_seconds() >= interval:
                due.append(item_id)
        return due

    async def scan_item(self, item_id: str) -> None:
        # Получаем качество из Item
        with session_scope() as session:
            item = session.get(Item, item_id)
            item_quality = item.quality if item else ""
        
        history_days = None
        if item_id not in self._seeded and isinstance(self.source, SandboxSource):
            sales = await self.source.seed_history(item_id)
            history_days = settings.seed_history_days
            self._seeded.add(item_id)
        else:
            sales = await self.source.fetch_history(item_id, item_quality)
        
        lots = await self.source.fetch_lots(item_id, item_quality)
        self.last_scan_at = datetime.utcnow()

        metrics, name, icon, gone_lots, metrics_by_variant, new_lot_keys = await asyncio.to_thread(self._persist, item_id, sales, lots)

        # Фильтруем только новые лоты (которые еще не были отправлены)
        new_lots = [lot for lot in lots if lot.key not in self._seen_lots]
        # Добавляем новые лоты в отслеживание
        if new_lots:
            for lot in new_lots:
                self._seen_lots.add(lot.key)
            self._save_seen_lots()  # Сохраняем после добавления новых лотов
        
        # Очищаем старые записи из _seen_lots (чтобы не рос бесконечно)
        if len(self._seen_lots) > 10000:
            # Оставляем только последние 5000 записей
            self._seen_lots = set(list(self._seen_lots)[-5000:])
            self._save_seen_lots()

        # Строим сигналы только для новых лотов, которые реально сохранились в БД
        signals = evaluate_lots(
            [
                LotPoint(
                    unit_price=lot.unit_price,
                    price=lot.price,
                    amount=lot.amount,
                    quality=lot.quality,
                    upgrade_level=lot.upgrade_level,
                    ends_at=lot.ends_at,
                    lot_key=lot.key,
                )
                for lot in lots if lot.key in new_lot_keys  # Только новые лоты из БД
            ],
            metrics_by_variant,
            commission_percent=settings.commission_percent,
            min_profit=settings.min_profit,
            min_roi_percent=settings.min_roi_percent,
        )
        logger.info("Broadcast: item=%s, lots=%d, signals=%d, gone=%d", item_id, len(lots), len(signals), len(gone_lots))
        if signals:
            await hub.broadcast(
                {
                    "type": "lots",
                    "items": [
                        {
                            "itemId": item_id,
                            "name": name,
                            "icon": icon,
                            "price": signal.price,
                            "unitPrice": signal.unit_price,
                            "amount": signal.amount,
                            "quality": signal.quality,
                            "upgradeLevel": signal.upgrade_level,
                            "marketPrice": signal.market_price,
                            "profit": signal.profit,
                            "roi": signal.roi_percent,
                            "expectedProfit": signal.expected_profit,
                            "sellProbability": signal.sell_probability,
                            "confidence": signal.confidence,
                            "liquidity": signal.liquidity,
                            "endsAt": signal.ends_at.isoformat() if signal.ends_at else None,
                            "seenAt": self.last_scan_at.isoformat(),
                            "lotKey": signal.lot_key,
                        }
                        for signal in signals[:12]
                    ],
                }
            )
        # Отправляем уведомление о проданных лотах
        if gone_lots:
            await hub.broadcast(
                {
                    "type": "lot_removed",
                    "lotKeys": gone_lots,
                }
            )
        if history_days:
            logger.info("Первичная история %s: %s сделок за %s дней", item_id, len(sales), history_days)

    def _persist(self, item_id: str, sales, lots) -> tuple[Metrics, str, str, list[str], dict, set[str]]:
        """Сохраняет данные и пересчитывает метрики. Выполняется в отдельном потоке."""
        with session_scope() as session:
            self._store_sales(session, item_id, sales)
            gone_lots, new_lot_keys = self._store_lots(session, item_id, lots)
            metrics, previous, metrics_by_variant = self._recompute(session, item_id)
            item = session.get(Item, item_id)
            if item is not None:
                item.last_scanned_at = self.last_scan_at
                if metrics.market_price is None:
                    item.priority = metrics.liquidity  # Понижаем приоритет для непрогретых предметов
                else:
                    item.priority = metrics.liquidity * max(metrics.market_price, 1) ** 0.5
            for event_type, magnitude, message in detect_events(metrics, previous):
                session.add(
                    MarketEvent(
                        item_id=item_id, type=event_type, magnitude=magnitude, message=message
                    )
                )
            return metrics, (item.name_ru if item else item_id), (item.icon if item else ""), gone_lots, metrics_by_variant, new_lot_keys

    @staticmethod
    def _store_sales(session, item_id: str, sales) -> None:
        latest = session.execute(
            select(Sale.sold_at).where(Sale.item_id == item_id).order_by(Sale.sold_at.desc()).limit(1)
        ).scalar()
        fresh = [sale for sale in sales if latest is None or sale.sold_at > latest]
        if not fresh:
            return
        session.add_all(
            [
                Sale(
                    item_id=item_id,
                    region=settings.region,
                    price=sale.price,
                    amount=sale.amount,
                    unit_price=sale.unit_price,
                    sold_at=sale.sold_at,
                    quality=sale.quality,
                    upgrade_level=sale.upgrade_level,
                )
                for sale in fresh
            ]
        )
        try:
            session.flush()
        except IntegrityError:
            session.rollback()

    @staticmethod
    def _store_lots(session, item_id: str, lots) -> tuple[list[str], set[str]]:
        MISSING_CONFIRMATIONS_REQUIRED = 2
        now = datetime.utcnow()
        # Получаем все лоты для этого предмета, включая уже помеченные как gone_at
        all_known = {
            row.lot_key: row
            for row in session.execute(
                select(LotSnapshot).where(LotSnapshot.item_id == item_id)
            ).scalars()
        }
        # Активные лоты (без gone_at)
        known = {
            key: row for key, row in all_known.items() if row.gone_at is None
        }
        seen_keys = set()
        processed_this_batch = set()  # Дедупликация внутри одного батча
        for lot in lots:
            if lot.key in processed_this_batch:
                continue  # Дубликат внутри одного ответа API — пропускаем
            processed_this_batch.add(lot.key)
            seen_keys.add(lot.key)
            if lot.key in known:
                # Лот активен - обновляем
                known[lot.key].seen_at = now
                known[lot.key].missing_streak = 0  # Сбрасываем счётчик пропусков
                continue
            elif lot.key in all_known:
                # Лот был помечен как gone_at - "воскрешаем"
                row = all_known[lot.key]
                row.gone_at = None
                row.seen_at = now
                row.missing_streak = 0
                row.price = lot.price
                row.amount = lot.amount
                row.unit_price = lot.unit_price
                row.quality = lot.quality
                row.upgrade_level = lot.upgrade_level
                row.ends_at = lot.ends_at
                continue
            # Новый лот - добавляем
            session.add(
                LotSnapshot(
                    item_id=item_id,
                    region=settings.region,
                    lot_key=lot.key,
                    price=lot.price,
                    amount=lot.amount,
                    unit_price=lot.unit_price,
                    quality=lot.quality,
                    upgrade_level=lot.upgrade_level,
                    ends_at=lot.ends_at,
                    seen_at=now,
                    first_seen_at=now,
                    missing_streak=0,
                )
            )
        gone_lots = []
        for key, row in known.items():
            if key not in seen_keys:
                row.missing_streak = (row.missing_streak or 0) + 1
                if row.missing_streak >= MISSING_CONFIRMATIONS_REQUIRED:
                    row.gone_at = now
                    gone_lots.append(key)
        try:
            session.flush()
        except Exception:
            logger.exception("Ошибка записи лотов для item_id=%s", item_id)
            session.rollback()
            raise
        # Новые лоты - те, которых не было ни в known, ни в all_known до этого скана
        new_lot_keys = seen_keys - all_known.keys()
        return gone_lots, new_lot_keys

    @staticmethod
    def _recompute(session, item_id: str) -> tuple[Metrics, Metrics | None, dict]:
        since = datetime.utcnow() - timedelta(days=30)
        # Группируем продажи и лоты по (quality, upgrade_level)
        sales_rows = session.execute(
            select(Sale).where(Sale.item_id == item_id, Sale.sold_at >= since).order_by(Sale.sold_at)
        ).scalars().all()
        lots_rows = session.execute(
            select(LotSnapshot).where(
                LotSnapshot.item_id == item_id, LotSnapshot.gone_at.is_(None)
            )
        ).scalars().all()
        
        # Группируем по комбинации (quality, upgrade_level)
        from collections import defaultdict
        sales_by_variant = defaultdict(list)
        lots_by_variant = defaultdict(list)
        
        for row in sales_rows:
            key = (row.quality or "", row.upgrade_level or 0)
            sales_by_variant[key].append(
                SalePoint(unit_price=row.unit_price, amount=row.amount, sold_at=row.sold_at, quality=row.quality or "", upgrade_level=row.upgrade_level or 0)
            )
        
        for row in lots_rows:
            key = (row.quality or "", row.upgrade_level or 0)
            lots_by_variant[key].append(
                LotPoint(
                    unit_price=row.unit_price,
                    price=row.price,
                    amount=row.amount,
                    quality=row.quality or "",
                    upgrade_level=row.upgrade_level or 0,
                    ends_at=row.ends_at,
                    lot_key=row.lot_key,
                )
            )
        
        # Считаем метрики для каждой комбинации
        all_metrics = []
        metrics_by_variant = {}  # Словарь для быстрого доступа к метрикам по (quality, upgrade_level)
        for key in set(sales_by_variant.keys()) | set(lots_by_variant.keys()):
            quality, upgrade_level = key
            sales = sales_by_variant.get(key, [])
            lots = lots_by_variant.get(key, [])
            metrics = compute_metrics(
                sales,
                lots,
                window_hours=settings.history_window_hours,
                min_sample=settings.min_sample_size,
                mad_multiplier=settings.mad_multiplier,
            )
            metrics_by_variant[(quality, upgrade_level)] = metrics
            stats = session.get(ItemStats, {"item_id": item_id, "region": settings.region, "quality": quality, "upgrade_level": upgrade_level})
            previous: Metrics | None = None
            if stats is not None:
                previous = Metrics(
                    market_price=stats.market_price,
                    median=stats.median,
                    mean=stats.mean,
                    mode=stats.mode,
                    min_price=stats.min_price,
                    max_price=stats.max_price,
                    stddev=stats.stddev,
                    volatility=stats.volatility,
                    liquidity=stats.liquidity,
                    supply=stats.supply,
                    demand=stats.demand,
                    spread=stats.spread,
                    confidence=stats.confidence,
                    sample_size=stats.sample_size,
                    lowest_lot=stats.lowest_lot,
                    active_lots=stats.active_lots,
                    change_24h=stats.change_24h,
                    change_7d=stats.change_7d,
                    sales_24h=stats.sales_24h,
                )
            else:
                stats = ItemStats(item_id=item_id, region=settings.region, quality=quality, upgrade_level=upgrade_level)
                session.add(stats)
            for field, value in asdict(metrics).items():
                setattr(stats, field, value)
            stats.computed_at = datetime.utcnow()
            all_metrics.append((metrics, previous))
        
        # Возвращаем агрегированные метрики (для совместимости с существующим кодом) и словарь по вариантам
        if all_metrics:
            # Берем метрики с наибольшей ликвидностью как "основные"
            main_metrics, main_previous = max(all_metrics, key=lambda x: x[0].liquidity)
            return main_metrics, main_previous, metrics_by_variant
        
        # Если нет данных, возвращаем пустые метрики
        empty_metrics = compute_metrics([], [], window_hours=settings.history_window_hours, min_sample=settings.min_sample_size, mad_multiplier=settings.mad_multiplier)
        return empty_metrics, None, {}
