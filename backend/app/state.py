"""Общее состояние процесса: ссылка на работающий коллектор."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.collector import Collector


@dataclass
class AppState:
    collector: Collector | None = None
    extra: dict[str, Any] = field(default_factory=dict)


app_state = AppState()
