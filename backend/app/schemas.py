"""Схемы ответов и запросов API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ItemRow(BaseModel):
    id: str
    name: str
    nameEn: str
    category: str
    icon: str
    quality: str
    upgradeLevel: int
    marketPrice: float | None
    median: float | None
    mean: float | None
    mode: float | None
    lowestLot: float | None
    activeLots: int | None
    liquidity: float | None
    volatility: float | None
    spread: float | None
    confidence: float | None
    change24h: float | None
    change7d: float | None
    sales24h: int | None
    sampleSize: int | None
    updatedAt: str | None
    variants: list[dict[str, Any]] = []
    minPrice: float | None = None
    maxPrice: float | None = None
    totalLiquidity: float | None = None


class CatalogResponse(BaseModel):
    total: int
    items: list[ItemRow]


class ItemDetail(BaseModel):
    item: ItemRow
    lots: list[dict[str, Any]]
    variants: list[dict[str, Any]] = []


class MarketSummary(BaseModel):
    totalItems: int
    trackedItems: int
    sales24h: int
    volume24h: float
    activeLots: int
    avgLiquidity: float
    gainers: list[dict[str, Any]]
    losers: list[dict[str, Any]]
    mostLiquid: list[dict[str, Any]]
    mostVolatile: list[dict[str, Any]]
    heatmap: list[dict[str, Any]]
    events: list[dict[str, Any]]


class WatchCreate(BaseModel):
    itemId: str
    quality: str = ""
    upgradeLevel: int = 0
    user: str = "local"
    folder: str = "Основной"
    color: str = "#4F8CFF"


class DealCreate(BaseModel):
    itemId: str
    buyPrice: float
    amount: int = 1
    user: str = "local"
    feePercent: float | None = None
    note: str = ""
    quality: str = ""
    upgradeLevel: int = 0
    token: str | None = None


class DealUpdate(BaseModel):
    listPrice: float | None = None
    sellPrice: float | None = None
    note: str | None = None
    state: str | None = None


class DealOut(BaseModel):
    id: int
    itemId: str
    name: str
    icon: str
    state: str
    amount: int
    buyPrice: float
    boughtAt: str
    marketPriceAtBuy: float
    marketPriceNow: float
    listPrice: float | None
    sellPrice: float | None
    soldAt: str | None
    feePercent: float
    invested: float
    profit: float
    roiPercent: float
    realized: bool
    note: str
    liquidity: float


class PortfolioSummary(BaseModel):
    deals: list[DealOut]
    invested: float
    realizedProfit: float
    unrealizedProfit: float
    openCount: int
    closedCount: int
    winRate: float
    bestDeal: DealOut | None
    worstDeal: DealOut | None
