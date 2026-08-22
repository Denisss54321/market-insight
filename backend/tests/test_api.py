"""Тесты REST API на отдельной временной базе."""

import os
import tempfile
from datetime import datetime, timedelta

import pytest

TEMP_DB = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["MI_DATABASE_URL"] = f"sqlite:///{TEMP_DB}"

from fastapi.testclient import TestClient  # noqa: E402

from app.api.routes import router  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import init_db, session_scope  # noqa: E402
from app.models import Item, ItemStats, Sale  # noqa: E402


@pytest.fixture(scope="module")
def client() -> TestClient:
    from fastapi import FastAPI

    init_db()
    now = datetime.utcnow()
    with session_scope() as session:
        session.add(
            Item(id="y1q9", name_ru="Медуза", name_en="Jellyfish", category="thermal", icon="/i.png")
        )
        session.add(
            ItemStats(
                item_id="y1q9",
                region=settings.region,
                market_price=1000,
                median=1000,
                mean=1010,
                mode=990,
                min_price=900,
                max_price=1100,
                stddev=50,
                volatility=0.05,
                liquidity=12,
                supply=5,
                demand=2.4,
                spread=10,
                confidence=80,
                sample_size=40,
                lowest_lot=900,
                active_lots=5,
                change_24h=1.5,
                change_7d=-2.0,
                sales_24h=12,
            )
        )
        for index in range(40):
            session.add(
                Sale(
                    item_id="y1q9",
                    region=settings.region,
                    price=1000 + index,
                    amount=1,
                    unit_price=1000 + index,
                    sold_at=now - timedelta(hours=index),
                )
            )

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_catalog_returns_item(client: TestClient) -> None:
    response = client.get("/api/catalog")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["name"] == "Медуза"
    assert payload["items"][0]["marketPrice"] == 1000


def test_catalog_search_filters(client: TestClient) -> None:
    assert client.get("/api/catalog?search=медуз").json()["total"] == 1
    assert client.get("/api/catalog?search=неттакого").json()["total"] == 0


def test_item_detail_and_history(client: TestClient) -> None:
    detail = client.get("/api/items/y1q9").json()
    assert detail["item"]["id"] == "y1q9"

    history = client.get("/api/items/y1q9/history?days=7").json()
    assert history["totalSales"] == 40
    assert history["points"]
    assert len(history["seasonality"]) == 24


def test_unknown_item_returns_404(client: TestClient) -> None:
    assert client.get("/api/items/nope").status_code == 404


def test_market_summary(client: TestClient) -> None:
    summary = client.get("/api/market/summary").json()
    assert summary["totalItems"] == 1
    assert summary["trackedItems"] == 1
    assert summary["heatmap"]


def test_watchlist_roundtrip(client: TestClient) -> None:
    assert client.post("/api/watchlist", json={"itemId": "y1q9"}).json()["created"] is True
    assert client.post("/api/watchlist", json={"itemId": "y1q9"}).json()["created"] is False
    rows = client.get("/api/watchlist").json()
    assert rows[0]["item"]["name"] == "Медуза"
    client.delete("/api/watchlist/y1q9")
    assert client.get("/api/watchlist").json() == []


def test_deal_lifecycle_counts_profit(client: TestClient) -> None:
    created = client.post("/api/deals", json={"itemId": "y1q9", "buyPrice": 600, "amount": 2}).json()
    deal_id = created["id"]
    assert created["state"] == "bought"
    assert created["invested"] == 1200

    listed = client.patch(f"/api/deals/{deal_id}", json={"listPrice": 1100}).json()
    assert listed["state"] == "listed"

    sold = client.patch(f"/api/deals/{deal_id}", json={"sellPrice": 1000}).json()
    assert sold["state"] == "sold"
    assert sold["realized"] is True
    # 2 × 1000 минус комиссия минус вложенные 1200
    expected = 2 * 1000 * (1 - settings.commission_percent / 100) - 1200
    assert sold["profit"] == pytest.approx(expected, abs=0.01)
    assert sold["roiPercent"] == pytest.approx(expected / 1200 * 100, abs=0.01)

    portfolio = client.get("/api/deals").json()
    assert portfolio["closedCount"] == 1
    assert portfolio["realizedProfit"] == pytest.approx(expected, abs=0.01)

    client.delete(f"/api/deals/{deal_id}")
    assert client.get("/api/deals").json()["deals"] == []
