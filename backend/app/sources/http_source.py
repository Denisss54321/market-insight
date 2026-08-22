"""Источник данных по официальному API STALCRAFT (demo или production)."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime

import httpx

from app.config import Settings
from app.sources.base import RawLot, RawSale

logger = logging.getLogger(__name__)


class RateLimiter:
    """Скользящее окно запросов в минуту, безопасно для asyncio."""

    def __init__(self, max_calls: int, period: float = 60.0) -> None:
        self._max_calls = max(1, max_calls)
        self._period = period
        self._calls: list[float] = []
        self._lock = asyncio.Lock()

    async def acquire(self) -> float:
        async with self._lock:
            waited = 0.0
            while True:
                now = time.monotonic()
                self._calls = [ts for ts in self._calls if now - ts < self._period]
                if len(self._calls) < self._max_calls:
                    self._calls.append(now)
                    return waited
                sleep_for = self._period - (now - self._calls[0]) + 0.01
                waited += sleep_for
                await asyncio.sleep(sleep_for)


async def get_oauth_token(client_id: str, client_secret: str) -> str:
    """Получает OAuth2 токен для STALCRAFT API."""
    async with httpx.AsyncClient() as client:
        # Пробуем разные возможные endpoints для OAuth2
        endpoints = [
            "https://eapi.stalcraft.net/oauth/token",
            "https://auth.stalcraft.net/oauth/token",
            "https://api.stalcraft.net/oauth/token",
            "https://exbo.net/oauth/token",
        ]
        
        for endpoint in endpoints:
            try:
                response = await client.post(
                    endpoint,
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "grant_type": "client_credentials",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                if response.status_code == 200:
                    token_data = response.json()
                    return token_data["access_token"]
                logger.warning("Endpoint %s вернул статус %s", endpoint, response.status_code)
            except Exception as e:
                logger.warning("Ошибка при запросе к %s: %s", endpoint, e)
                continue
        
        raise RuntimeError("Не удалось получить OAuth2 токен ни с одного endpoint. Проверьте правильность Client ID и Client Secret.")


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


QUALITY_MAP = {
    0: "Обычный",
    1: "Необычный",
    2: "Особый",
    3: "Редкий",
    4: "Исключительный",
    5: "Легендарный",
}


def _parse_quality(qlt: int | None, fallback: str = "") -> str:
    """Преобразует числовое качество из API в строковое название."""
    if qlt is not None and qlt in QUALITY_MAP:
        return QUALITY_MAP[qlt]
    # Если API возвращает строку "common" (в qlt как строка или в fallback), преобразуем в "Обычный"
    if fallback == "common":
        return "Обычный"
    # Если qlt это строка "common" (случай, когда API возвращает строку вместо числа)
    if isinstance(qlt, str) and qlt == "common":
        return "Обычный"
    return fallback


class HttpMarketSource:
    """Читает лоты и историю через HTTP. Ретраи, бэкофф, учёт rate limit."""

    def __init__(self, settings: Settings) -> None:
        self.name = settings.source
        self._settings = settings
        self._limiter = RateLimiter(settings.requests_per_minute)
        self._token: str | None = None
        self._client: httpx.AsyncClient | None = None
        self.remaining: int | None = None
        
        # Если есть client_id и client_secret, получаем токен автоматически
        if settings.client_id and settings.client_secret:
            self._token = settings.api_token
        elif settings.api_token:
            self._token = settings.api_token

    async def initialize(self) -> None:
        """Инициализирует HTTP клиент с Secret Based Authentication."""
        # Используем Secret Based Authentication (Client-Id и Client-Secret в заголовках)
        headers = {"Accept": "application/json"}
        
        if self._settings.client_id:
            headers["Client-Id"] = self._settings.client_id
        if self._settings.client_secret:
            headers["Client-Secret"] = self._settings.client_secret
        
        self._client = httpx.AsyncClient(
            base_url=self._settings.api_base_url.rstrip("/"),
            headers=headers,
            timeout=self._settings.request_timeout,
        )
        logger.info("HTTP клиент инициализирован с Secret Based Authentication")

    async def _get(self, path: str, params: dict[str, str | int]) -> dict:
        attempts = 3
        for attempt in range(1, attempts + 1):
            await self._limiter.acquire()
            try:
                response = await self._client.get(path, params=params)
            except httpx.HTTPError as error:
                if attempt == attempts:
                    raise
                logger.warning("Сетевая ошибка %s (попытка %s): %s", path, attempt, error)
                await asyncio.sleep(2**attempt)
                continue

            remaining = response.headers.get("x-ratelimit-remaining")
            if remaining is not None:
                self.remaining = int(remaining)

            if response.status_code == 429 or response.status_code >= 500:
                if attempt == attempts:
                    response.raise_for_status()
                await asyncio.sleep(2**attempt)
                continue
            response.raise_for_status()
            return response.json()
        raise RuntimeError("Недостижимая ветка")

    async def fetch_lots(self, item_id: str, item_quality: str = "") -> list[RawLot]:
        region = self._settings.region
        payload = await self._get(
            f"/{region}/auction/{item_id}/lots",
            {"limit": 200, "sort": "buyout_price", "order": "asc", "additional": "true"},
        )
        lots: list[RawLot] = []
        for raw in payload.get("lots", []):
            # Используем только buyoutPrice, игнорируем startPrice
            price = raw.get("buyoutPrice")
            if not price:
                continue
            additional = raw.get("additional") or {}
            # Приоритет: качество из API (qlt) > качество из Item > пустая строка
            api_qlt = additional.get("qlt")
            quality = _parse_quality(api_qlt, item_quality)
            upgrade_level = int(additional.get("ptn") or 0)
            
            # Логирование для отладки качества Спирали
            if item_id == "gyq5" and upgrade_level == 5:
                logger.info("Спираль +5: api_qlt=%s, item_quality=%s, parsed_quality=%s, price=%s", 
                           api_qlt, item_quality, quality, price)
            
            # Логирование всех полей сырого ответа для поиска уникального ID
            if item_id == "gy10":  # Предмет из ошибки
                logger.info("gy10 сырой ответ: keys=%s, lot_id=%s", list(raw.keys()), raw.get("id"))
            
            lots.append(
                RawLot(
                    item_id=item_id,
                    price=float(price),
                    amount=int(raw.get("amount") or 1),
                    ends_at=_parse_time(raw.get("endTime")),
                    quality=quality,
                    upgrade_level=upgrade_level,
                )
            )
        return lots

    async def fetch_history(self, item_id: str, item_quality: str = "") -> list[RawSale]:
        region = self._settings.region
        payload = await self._get(
            f"/{region}/auction/{item_id}/history", {"limit": 200, "additional": "true"}
        )
        sales: list[RawSale] = []
        for raw in payload.get("prices", []):
            sold_at = _parse_time(raw.get("time"))
            price = raw.get("price")
            amount = int(raw.get("amount") or 1)
            if sold_at is None or not price:
                continue
            additional = raw.get("additional") or {}
            # Приоритет: качество из API (qlt) > качество из Item > пустая строка
            api_qlt = additional.get("qlt")
            quality = _parse_quality(api_qlt, item_quality)
            upgrade_level = int(additional.get("ptn") or 0)
            # Делим полную цену на amount для получения unit_price
            unit_price = float(price) / amount if amount > 0 else float(price)
            sales.append(
                RawSale(
                    item_id=item_id,
                    price=float(price),
                    amount=amount,
                    sold_at=sold_at,
                    quality=quality,
                    upgrade_level=upgrade_level,
                )
            )
        return sales

    async def close(self) -> None:
        await self._client.aclose()
