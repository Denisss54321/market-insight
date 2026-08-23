"""Настройки приложения. Всё переопределяется переменными окружения MI_*."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MI_", env_file=".env", extra="ignore")

    # Источник данных: sandbox (симулятор), demo (dapi.stalcraft.net), live (eapi.stalcraft.net)
    source: str = "sandbox"
    api_base_url: str = "https://eapi.stalcraft.net"
    api_token: str = ""
    region: str = "EU"

    # OAuth2 credentials для получения токена STALCRAFT API
    client_id: str = ""
    client_secret: str = ""

    # Лимиты и расписание сканирования
    requests_per_minute: int = 45
    request_timeout: float = 10.0
    hot_interval_seconds: float = 45.0
    warm_interval_seconds: float = 300.0
    cold_interval_seconds: float = 3600.0
    hot_items: int = 20
    warm_items: int = 40

    # Экономика
    commission_percent: float = 5.0
    min_profit: float = 500.0
    min_roi_percent: float = 8.0

    # Аналитика
    history_window_hours: int = 72
    min_sample_size: int = 8
    mad_multiplier: float = 3.0

    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'market_insight.db'}"
    seed_history_days: int = 30
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # OAuth - Steam
    steam_api_key: str = ""
    steam_redirect_uri: str = "http://localhost:8002/auth/callback/steam"

    # OAuth - Exbo
    exbo_client_id: str = ""
    exbo_client_secret: str = ""
    exbo_redirect_uri: str = "http://localhost:8002/auth/callback/exbo"

    # Frontend URL for OAuth callbacks
    frontend_url: str = "http://localhost:3000"

    # Сессии
    session_expire_hours: int = 720

    @property
    def data_dir(self) -> Path:
        return BASE_DIR / "data"

    @property
    def cors_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
