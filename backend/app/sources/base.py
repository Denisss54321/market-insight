"""Общие типы источников рыночных данных."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class RawLot:
    item_id: str
    price: float
    amount: int
    ends_at: datetime | None
    quality: str = ""
    upgrade_level: int = 0

    @property
    def unit_price(self) -> float:
        return self.price / self.amount if self.amount else self.price

    @property
    def key(self) -> str:
        end = self.ends_at.isoformat() if self.ends_at else "-"
        return f"{self.price:.0f}:{self.amount}:{end}:{self.quality}:{self.upgrade_level}"


@dataclass(frozen=True, slots=True)
class RawSale:
    item_id: str
    price: float
    amount: int
    sold_at: datetime
    quality: str = ""
    upgrade_level: int = 0

    @property
    def unit_price(self) -> float:
        return self.price / self.amount if self.amount else self.price


class MarketSource(Protocol):
    """Источник данных аукциона."""

    name: str

    async def fetch_lots(self, item_id: str, item_quality: str = "") -> list[RawLot]: ...

    async def fetch_history(self, item_id: str, item_quality: str = "") -> list[RawSale]: ...

    async def close(self) -> None: ...
