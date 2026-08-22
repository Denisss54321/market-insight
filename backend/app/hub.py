"""Раздача живой ленты лотов подписчикам WebSocket."""

from __future__ import annotations

import asyncio
from collections import deque
from typing import Any

from fastapi import WebSocket


class FeedHub:
    def __init__(self, history_size: int = 120) -> None:
        self._clients: set[WebSocket] = set()
        self._recent: deque[dict[str, Any]] = deque(maxlen=history_size)
        self._lock = asyncio.Lock()

    @property
    def clients(self) -> int:
        return len(self._clients)

    def recent(self, limit: int = 60) -> list[dict[str, Any]]:
        items = list(self._recent)[-limit:]
        items.reverse()
        return items

    async def connect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.add(websocket)
        await websocket.send_json({"type": "snapshot", "items": self.recent()})

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        for item in message.get("items", []):
            self._recent.append(item)
        async with self._lock:
            clients = list(self._clients)
        dead: list[WebSocket] = []
        for client in clients:
            try:
                await client.send_json(message)
            except Exception:
                dead.append(client)
        if dead:
            async with self._lock:
                for client in dead:
                    self._clients.discard(client)


hub = FeedHub()
