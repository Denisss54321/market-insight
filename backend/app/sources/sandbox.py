"""Симулятор рынка артефактов для разработки и демонстрации.

Demo API STALCRAFT отдаёт одинаковые фиктивные данные для любого предмета, поэтому
для проверки интерфейса нужен источник с правдоподобным рынком: у каждого артефакта
свой уровень цен, своя ликвидность и волатильность, цены дрейфуют во времени,
изредка появляются заниженные лоты.

Значения детерминированы: цена зависит от идентификатора артефакта и часа, поэтому
повторный запрос за тот же период даёт тот же результат, а история остаётся связной.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import random
from datetime import datetime, timedelta

from app.sources.base import RawLot, RawSale

QUALITIES = ("Обычный", "Необычный", "Особый", "Редкий", "Исключительный", "Легендарный")


def _seed(*parts: object) -> int:
    digest = hashlib.sha256("|".join(str(part) for part in parts).encode()).digest()
    return int.from_bytes(digest[:8], "big")


def _rng(*parts: object) -> random.Random:
    return random.Random(_seed(*parts))


class ArtefactProfile:
    """Устойчивые характеристики артефакта: уровень цены, ликвидность, волатильность."""

    def __init__(self, item_id: str) -> None:
        rng = _rng("profile", item_id)
        tier = rng.choices([1, 2, 3, 4], weights=[45, 30, 18, 7])[0]
        self.base_price = {1: 3_000, 2: 25_000, 3: 150_000, 4: 900_000}[tier] * rng.uniform(0.6, 1.6)
        self.sales_per_day = {1: 90, 2: 35, 3: 9, 4: 2.5}[tier] * rng.uniform(0.5, 1.6)
        self.volatility = rng.uniform(0.04, 0.22)
        self.trend = rng.uniform(-0.25, 0.3)  # относительное изменение за 30 дней
        self.stack_chance = 0.25 if tier == 1 else 0.05
        self.tier = tier


_PROFILES: dict[str, ArtefactProfile] = {}
_LEVELS: dict[tuple[str, int], float] = {}


def profile(item_id: str) -> ArtefactProfile:
    if item_id not in _PROFILES:
        _PROFILES[item_id] = ArtefactProfile(item_id)
    return _PROFILES[item_id]


def price_level(item_id: str, moment: datetime) -> float:
    """Уровень цены артефакта в конкретный час: тренд, суточная сезонность и шум."""

    prof = profile(item_id)
    hour_index = int(moment.timestamp() // 3600)
    cached = _LEVELS.get((item_id, hour_index))
    if cached is not None:
        return cached
    walk = 0.0
    for lag in range(24):
        rng = _rng("walk", item_id, hour_index - lag)
        walk += rng.gauss(0.0, prof.volatility / 6) * (1 - lag / 30)
    seasonal = 0.03 * math.sin((moment.hour / 24) * 2 * math.pi)
    days_from_now = (moment - datetime.utcnow()).total_seconds() / 86_400
    trend = prof.trend * (days_from_now / 30)
    level = max(1.0, prof.base_price * math.exp(walk + seasonal + trend))
    _LEVELS[(item_id, hour_index)] = level
    return level


class SandboxSource:
    """Источник-симулятор с тем же интерфейсом, что и HTTP-источник."""

    name = "sandbox"

    def __init__(self, history_days: int = 30) -> None:
        self.history_days = history_days
        self.remaining: int | None = None

    async def fetch_lots(self, item_id: str, item_quality: str = "") -> list[RawLot]:
        return await asyncio.to_thread(self._lots, item_id)

    def _lots(self, item_id: str) -> list[RawLot]:
        prof = profile(item_id)
        now = datetime.utcnow()
        minute_bucket = int(now.timestamp() // 60)
        rng = _rng("lots", item_id, minute_bucket)
        level = price_level(item_id, now)

        count = max(1, int(rng.gauss(prof.sales_per_day / 4, prof.sales_per_day / 8)))
        count = min(count, 60)
        lots: list[RawLot] = []
        for index in range(count):
            factor = rng.gauss(1.06, prof.volatility)
            # изредка кто-то выставляет заметно ниже рынка
            if rng.random() < 0.06:
                factor = rng.uniform(0.55, 0.85)
            unit = max(1.0, level * factor)
            amount = rng.choice([1, 1, 1, 5, 10]) if rng.random() < prof.stack_chance else 1
            quality = QUALITIES[min(len(QUALITIES) - 1, prof.tier - 1 + (index % 2))]
            upgrade_level = rng.choices(list(range(16)), weights=[50, 20, 10, 6, 4, 3, 2, 1.5, 1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1])[0]
            lots.append(
                RawLot(
                    item_id=item_id,
                    price=round(unit * amount),
                    amount=amount,
                    ends_at=now + timedelta(hours=rng.uniform(0.5, 24)),
                    quality=quality,
                    upgrade_level=upgrade_level,
                )
            )
        lots.sort(key=lambda lot: lot.unit_price)
        return lots

    async def fetch_history(self, item_id: str, item_quality: str = "", days: int | None = None) -> list[RawSale]:
        return await asyncio.to_thread(self._history, item_id, days)

    def _history(self, item_id: str, days: int | None = None) -> list[RawSale]:
        prof = profile(item_id)
        now = datetime.utcnow()
        hours = int((days if days is not None else 2) * 24)
        sales: list[RawSale] = []
        for hour_offset in range(hours, -1, -1):
            moment = now - timedelta(hours=hour_offset)
            rng = _rng("sales", item_id, int(moment.timestamp() // 3600))
            expected = prof.sales_per_day / 24 * (1.4 if 15 <= moment.hour <= 22 else 0.7)
            count = min(6, int(rng.random() < expected % 1) + int(expected))
            level = price_level(item_id, moment)
            for _ in range(count):
                factor = rng.gauss(1.0, prof.volatility * 0.7)
                if rng.random() < 0.02:
                    factor *= rng.uniform(1.8, 3.2)  # выброс, который должен отфильтроваться
                amount = rng.choice([1, 1, 1, 5]) if rng.random() < prof.stack_chance else 1
                unit = max(1.0, level * factor)
                quality = QUALITIES[min(len(QUALITIES) - 1, prof.tier - 1 + rng.randint(0, 1))]
                upgrade_level = rng.choices(list(range(16)), weights=[50, 20, 10, 6, 4, 3, 2, 1.5, 1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1])[0]
                sales.append(
                    RawSale(
                        item_id=item_id,
                        price=round(unit * amount),
                        amount=amount,
                        sold_at=min(now, moment + timedelta(minutes=rng.uniform(0, 59))),
                        quality=quality,
                        upgrade_level=upgrade_level,
                    )
                )
        sales.sort(key=lambda sale: sale.sold_at)
        return sales if days is not None else sales[-400:]

    async def seed_history(self, item_id: str) -> list[RawSale]:
        """Историю за N дней используем один раз при первом запуске."""
        return await self.fetch_history(item_id, days=self.history_days)

    async def close(self) -> None:
        return None
