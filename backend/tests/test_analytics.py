"""Тесты аналитики: фильтр выбросов, метрики и оценка лотов."""

from datetime import datetime, timedelta

from app.analytics import (
    LotPoint,
    SalePoint,
    compute_metrics,
    evaluate_lots,
    mad_filter,
    price_mode,
    sell_probability,
)

NOW = datetime(2026, 1, 10, 12, 0, 0)


def sales(prices: list[float], *, hours_step: float = 1.0) -> list[SalePoint]:
    total = len(prices)
    return [
        SalePoint(
            unit_price=price,
            amount=1,
            sold_at=NOW - timedelta(hours=(total - index - 1) * hours_step),
        )
        for index, price in enumerate(prices)
    ]


def test_mad_filter_removes_outliers() -> None:
    values = [100, 101, 99, 102, 98, 100, 5000]
    assert 5000 not in mad_filter([float(value) for value in values])


def test_mad_filter_keeps_small_samples() -> None:
    assert mad_filter([100.0, 5000.0]) == [100.0, 5000.0]


def test_price_mode_uses_buckets() -> None:
    assert price_mode([100.0, 101.0, 100.5, 300.0]) < 200.0


def test_compute_metrics_median_ignores_outlier() -> None:
    metrics = compute_metrics(
        sales([100, 102, 98, 101, 99, 100, 103, 97, 10_000]),
        [],
        window_hours=72,
        min_sample=5,
        mad_multiplier=3.0,
        now=NOW,
    )
    assert 95 <= metrics.market_price <= 105
    assert metrics.sample_size >= 8
    assert metrics.confidence > 0


def test_compute_metrics_without_sales_is_empty() -> None:
    metrics = compute_metrics([], [], window_hours=72, min_sample=5, mad_multiplier=3.0, now=NOW)
    assert metrics.market_price == 0
    assert metrics.confidence == 0


def test_liquidity_counts_units_per_day() -> None:
    metrics = compute_metrics(
        sales([100] * 48, hours_step=0.5),
        [],
        window_hours=24,
        min_sample=5,
        mad_multiplier=3.0,
        now=NOW,
    )
    assert 40 <= metrics.liquidity <= 60


def test_sell_probability_grows_with_liquidity() -> None:
    assert sell_probability(0.0) == 0.0
    assert sell_probability(1.0) < sell_probability(10.0) <= 1.0


def test_evaluate_lots_filters_by_profit_and_sorts_by_expected() -> None:
    metrics = compute_metrics(
        sales([1000] * 40, hours_step=0.5),
        [],
        window_hours=48,
        min_sample=5,
        mad_multiplier=3.0,
        now=NOW,
    )
    lots = [
        LotPoint(unit_price=500, price=500, amount=1, quality="", ends_at=None, lot_key="cheap"),
        LotPoint(unit_price=990, price=990, amount=1, quality="", ends_at=None, lot_key="tiny"),
        LotPoint(unit_price=1200, price=1200, amount=1, quality="", ends_at=None, lot_key="over"),
    ]
    signals = evaluate_lots(
        lots, metrics, commission_percent=5.0, min_profit=100.0, min_roi_percent=5.0
    )
    keys = [signal.lot_key for signal in signals]
    assert keys == ["cheap"]
    assert signals[0].expected_profit <= signals[0].profit


def test_evaluate_lots_without_market_price_returns_nothing() -> None:
    metrics = compute_metrics([], [], window_hours=24, min_sample=5, mad_multiplier=3.0, now=NOW)
    lots = [LotPoint(unit_price=1, price=1, amount=1, quality="", ends_at=None, lot_key="x")]
    assert evaluate_lots(lots, metrics, commission_percent=5.0, min_profit=1.0, min_roi_percent=1.0) == []
