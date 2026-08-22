"""Расчёт рыночных метрик и торговых сигналов.

Ключевое правило: рыночная цена никогда не берётся как минимальный активный лот.
Она считается по завершённым сделкам после фильтрации выбросов.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True, slots=True)
class SalePoint:
    unit_price: float
    amount: int
    sold_at: datetime
    quality: str = ""
    upgrade_level: int = 0


@dataclass(frozen=True, slots=True)
class LotPoint:
    unit_price: float
    price: float
    amount: int
    quality: str = ""
    upgrade_level: int = 0
    ends_at: datetime | None = None
    lot_key: str = ""


@dataclass(frozen=True, slots=True)
class Metrics:
    market_price: float | None
    median: float | None
    mean: float | None
    mode: float | None
    min_price: float
    max_price: float
    stddev: float
    volatility: float
    liquidity: float
    supply: float
    demand: float
    spread: float
    confidence: float
    sample_size: int
    lowest_lot: float
    active_lots: int
    change_24h: float
    change_7d: float
    sales_24h: int


@dataclass(frozen=True, slots=True)
class Signal:
    unit_price: float
    price: float
    amount: int
    quality: str
    upgrade_level: int
    market_price: float
    commission: float
    net_value: float
    profit: float
    roi_percent: float
    sell_probability: float
    expected_profit: float
    confidence: float
    liquidity: float
    ends_at: datetime | None
    lot_key: str


def mad_filter(values: list[float], multiplier: float = 3.0) -> list[float]:
    if not values:
        return []
    if len(values) < 4:
        # Слишком мало данных для честной статистики — не фильтруем,
        # просто отдаём как есть. Гейт MIN_SAMPLE_SIZE выше не даст
        # этому результату попасть в market_price напоказ.
        return list(values)

    median = statistics.median(values)
    deviations = [abs(value - median) for value in values]
    mad = statistics.median(deviations)
    if mad == 0:
        return list(values)
    kept = [value for value in values if abs(value - median) <= multiplier * mad * 1.4826]
    return kept or list(values)


def price_mode(values: list[float], bucket_ratio: float = 0.02) -> float:
    """Мода по относительным ценовым корзинам: точное совпадение цен не требуется."""
    if not values:
        return 0.0
    ordered = sorted(values)
    best_center, best_count = ordered[0], 0
    for anchor in ordered:
        low, high = anchor * (1 - bucket_ratio), anchor * (1 + bucket_ratio)
        bucket = [value for value in ordered if low <= value <= high]
        if len(bucket) > best_count:
            best_center, best_count = statistics.median(bucket), len(bucket)
    return best_center


def compute_metrics(
    sales: list[SalePoint],
    lots: list[LotPoint],
    *,
    window_hours: int,
    min_sample: int,
    mad_multiplier: float,
    now: datetime | None = None,
) -> Metrics:
    now = now or datetime.utcnow()
    window_start = now - timedelta(hours=window_hours)
    windowed = [sale for sale in sales if sale.sold_at >= window_start]
    if len(windowed) < min_sample:
        windowed = sales[-max(min_sample, 1):]

    prices = [sale.unit_price for sale in windowed]
    filtered = mad_filter(prices, mad_multiplier) if prices else []
    sample = len(filtered)

    MIN_SAMPLE_SIZE = 4

    median = statistics.median(filtered) if sample >= MIN_SAMPLE_SIZE else None
    mean = statistics.fmean(filtered) if sample >= MIN_SAMPLE_SIZE else None
    mode = price_mode(filtered) if sample >= MIN_SAMPLE_SIZE else None
    stddev = statistics.pstdev(filtered) if sample > 1 else 0.0
    volatility = stddev / median if median else 0.0

    # Ликвидность: считаем только по продажам внутри окна window_hours —
    # это предотвращает завышение ликвидности для редких артефактов.
    # Делим на фиксированное окно (window_hours), а не на период между продажами.
    windowed_in_window = [sale for sale in sales if sale.sold_at >= window_start]
    if windowed_in_window:
        filtered_in_window = mad_filter([s.unit_price for s in windowed_in_window], mad_multiplier)
        liq_sales = [s for s in windowed_in_window if s.unit_price in set(filtered_in_window)] if filtered_in_window else windowed_in_window
        liquidity = sum(s.amount for s in liq_sales) / (window_hours / 24)
    else:
        liquidity = 0.0  # нет продаж в окне — артефакт неликвиден

    day_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)
    recent = [sale.unit_price for sale in sales if sale.sold_at >= day_ago]
    prev_day = [sale.unit_price for sale in sales if day_ago - timedelta(hours=24) <= sale.sold_at < day_ago]
    prev_week = [sale.unit_price for sale in sales if week_ago - timedelta(days=1) <= sale.sold_at < week_ago]

    def change(current: list[float], previous: list[float]) -> float:
        if not current or not previous:
            return 0.0
        base = statistics.median(previous)
        return (statistics.median(current) - base) / base * 100 if base else 0.0

    lowest_lot = min((lot.unit_price for lot in lots), default=0.0)
    spread = (median - lowest_lot) / median * 100 if median is not None and median > 0 and lowest_lot else 0.0

    # доверие: размер выборки, свежесть и разброс
    freshness = 1.0
    if sales:
        age_hours = (now - sales[-1].sold_at).total_seconds() / 3600
        freshness = max(0.0, 1 - age_hours / (window_hours or 24))
    size_score = min(1.0, sample / 30)  # насыщение при 30 продажах — репрезентативная выборка
    spread_score = max(0.0, 1 - volatility * 2)
    confidence = (
        round(100 * (0.45 * size_score + 0.3 * freshness + 0.25 * spread_score), 1) if sample else 0.0
    )

    supply = float(len(lots))
    demand = liquidity / supply if supply else liquidity

    return Metrics(
        market_price=round(median, 2) if median is not None else None,
        median=round(median, 2) if median is not None else None,
        mean=round(mean, 2) if mean is not None else None,
        mode=round(mode, 2) if mode is not None else None,
        min_price=round(min(filtered), 2) if filtered else 0.0,
        max_price=round(max(filtered), 2) if filtered else 0.0,
        stddev=round(stddev, 2),
        volatility=round(volatility, 4),
        liquidity=round(liquidity, 2),
        supply=supply,
        demand=round(demand, 3),
        spread=round(spread, 2),
        confidence=confidence,
        sample_size=sample,
        lowest_lot=round(lowest_lot, 2),
        active_lots=len(lots),
        change_24h=round(change(recent, prev_day), 2),
        change_7d=round(change(recent, prev_week), 2),
        sales_24h=len(recent),
    )


def sell_probability(liquidity_per_day: float, hours: float = 24.0) -> float:
    """Вероятность продать хотя бы одну штуку за указанный срок (пуассоновская оценка)."""
    if liquidity_per_day <= 0:
        return 0.0
    rate = liquidity_per_day * (hours / 24)
    return round(1 - math.exp(-rate), 4)


def evaluate_lots(
    lots: list[LotPoint],
    metrics_or_dict: Metrics | dict[tuple[str, int], Metrics],
    *,
    commission_percent: float,
    min_profit: float,
    min_roi_percent: float,
) -> list[Signal]:
    """Возвращает выгодные лоты, отсортированные по ожидаемой прибыли с учётом риска.
    
    Если передан словарь метрик по вариантам, использует метрику для конкретного (quality, upgrade_level).
    Иначе использует общую метрику для всех лотов.
    """
    signals: list[Signal] = []
    
    for lot in lots:
        # Определяем метрики для конкретного варианта лота
        if isinstance(metrics_or_dict, dict):
            key = (lot.quality or "", lot.upgrade_level or 0)
            metrics = metrics_or_dict.get(key)
            if metrics is None:
                continue  # Нет метрик для этого варианта - пропускаем лот
        else:
            metrics = metrics_or_dict
        
        market_price = metrics.market_price
        confidence = metrics.confidence
        
        # Без fallback: если нет рыночной цены (нет истории), не показываем лоты
        if market_price is None or market_price <= 0:
            continue
        
        probability = sell_probability(metrics.liquidity)
        commission = market_price * commission_percent / 100
        net_value = market_price - commission
        profit = (net_value - lot.unit_price) * lot.amount
        roi = (net_value - lot.unit_price) / lot.unit_price * 100 if lot.unit_price else 0.0
        if profit < min_profit or roi < min_roi_percent:
            continue
        expected = profit * probability * (confidence / 100)
        signals.append(
            Signal(
                unit_price=round(lot.unit_price, 2),
                price=round(lot.price, 2),
                amount=lot.amount,
                quality=lot.quality,
                upgrade_level=lot.upgrade_level,
                market_price=market_price,
                commission=round(commission * lot.amount, 2),
                net_value=round(net_value * lot.amount, 2),
                profit=round(profit, 2),
                roi_percent=round(roi, 2),
                sell_probability=probability,
                expected_profit=round(expected, 2),
                confidence=confidence,
                liquidity=metrics.liquidity,
                ends_at=lot.ends_at,
                lot_key=lot.lot_key,
            )
        )
    signals.sort(key=lambda signal: signal.expected_profit, reverse=True)
    return signals


def detect_events(metrics: Metrics, previous: Metrics | None) -> list[tuple[str, float, str]]:
    """Аномалии для календаря рынка."""
    events: list[tuple[str, float, str]] = []
    if previous is None or not previous.market_price or metrics.market_price is None:
        return events
    change = (metrics.market_price - previous.market_price) / previous.market_price * 100 if previous.market_price else 0
    if change >= 12:
        events.append(("price_spike", round(change, 2), f"Цена выросла на {change:.1f}%"))
    elif change <= -12:
        events.append(("price_drop", round(change, 2), f"Цена упала на {abs(change):.1f}%"))
    if (
        previous.active_lots >= 3
        and metrics.active_lots >= previous.active_lots * 2
        and metrics.active_lots - previous.active_lots >= 5
    ):
        events.append(("supply_spike", float(metrics.active_lots), "Резкий рост предложения"))
    if previous.liquidity and metrics.liquidity >= previous.liquidity * 2:
        events.append(("volume_spike", round(metrics.liquidity, 2), "Всплеск объёма продаж"))
    return events


# Гейт для будущей фильтрации "выгодные предложения"
MIN_SAMPLE_FOR_DEALS = 8
MIN_CONFIDENCE_FOR_DEALS = 0.5
DEAL_THRESHOLD = 0.7

def is_ready_for_deals(stats: ItemStats) -> bool:
    return (
        stats is not None
        and stats.sample_size >= MIN_SAMPLE_FOR_DEALS
        and stats.confidence is not None
        and stats.confidence >= MIN_CONFIDENCE_FOR_DEALS
    )

def deal_ratio(lot_unit_price: float, stats: ItemStats) -> float | None:
    if not is_ready_for_deals(stats) or not stats.median:
        return None
    return lot_unit_price / stats.median

def is_good_deal(lot_unit_price: float, stats: ItemStats) -> bool:
    ratio = deal_ratio(lot_unit_price, stats)
    return ratio is not None and ratio <= DEAL_THRESHOLD
