"""Тесты источника-симулятора: детерминизм и адекватность данных."""

import asyncio
from datetime import datetime, timedelta

from app.sources.sandbox import SandboxSource, price_level, profile


def test_profile_is_stable() -> None:
    assert profile("y1q9").base_price == profile("y1q9").base_price


def test_price_level_is_deterministic() -> None:
    moment = datetime(2026, 1, 1, 12, 0, 0)
    assert price_level("y1q9", moment) == price_level("y1q9", moment)


def test_lots_are_positive_and_have_unit_price() -> None:
    lots = asyncio.run(SandboxSource().fetch_lots("y1q9"))
    assert lots
    for lot in lots:
        assert lot.price > 0
        assert lot.amount >= 1
        assert lot.unit_price == lot.price / lot.amount
        assert lot.ends_at is not None


def test_history_is_sorted_and_recent() -> None:
    sales = asyncio.run(SandboxSource().fetch_history("y1q9"))
    assert sales
    assert sales == sorted(sales, key=lambda sale: sale.sold_at)
    assert sales[-1].sold_at <= datetime.utcnow() + timedelta(minutes=1)


def test_seed_history_covers_window() -> None:
    source = SandboxSource(history_days=30)
    sales = asyncio.run(source.seed_history("y1q9"))
    span = sales[-1].sold_at - sales[0].sold_at
    assert span > timedelta(days=20)
