"""Схема базы данных."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Item(Base):
    """Артефакт из базы предметов EXBO."""

    __tablename__ = "items"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(128))
    name_en: Mapped[str] = mapped_column(String(128), default="")
    category: Mapped[str] = mapped_column(String(64), index=True)
    quality: Mapped[str] = mapped_column(String(32), default="")
    quality_ru: Mapped[str] = mapped_column(String(32), default="")
    icon: Mapped[str] = mapped_column(String(256), default="")
    priority: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    last_scanned_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class Sale(Base):
    """Завершённая сделка (из истории аукциона)."""

    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("item_id", "region", "sold_at", "price", "amount", "quality", "upgrade_level", name="uq_sale"),
        Index("ix_sales_item_time", "item_id", "sold_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    region: Mapped[str] = mapped_column(String(8), default="EU")
    price: Mapped[float] = mapped_column(Float)
    amount: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, index=True)
    sold_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    quality: Mapped[str] = mapped_column(String(32), default="")
    upgrade_level: Mapped[int] = mapped_column(Integer, default=0)


class LotSnapshot(Base):
    """Активный лот, замеченный при очередном сканировании."""

    __tablename__ = "lot_snapshots"
    __table_args__ = (
        UniqueConstraint("item_id", "region", "lot_key", name="uq_lot"),
        Index("ix_lots_seen", "seen_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    region: Mapped[str] = mapped_column(String(8), default="EU")
    lot_key: Mapped[str] = mapped_column(String(128))
    price: Mapped[float] = mapped_column(Float)
    amount: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, index=True)
    quality: Mapped[str] = mapped_column(String(32), default="")
    upgrade_level: Mapped[int] = mapped_column(Integer, default=0)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    gone_at: Mapped[datetime | None] = mapped_column(DateTime, default=None, index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    missing_streak: Mapped[int] = mapped_column(Integer, default=0)


class ItemStats(Base):
    """Посчитанные метрики артефакта, обновляются после каждого сканирования."""

    __tablename__ = "item_stats"

    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), primary_key=True)
    region: Mapped[str] = mapped_column(String(8), primary_key=True, default="EU")
    quality: Mapped[str] = mapped_column(String(32), primary_key=True, default="")
    upgrade_level: Mapped[int] = mapped_column(Integer, primary_key=True, default=0)
    market_price: Mapped[float | None] = mapped_column(Float, default=None)
    median: Mapped[float | None] = mapped_column(Float, default=None)
    mean: Mapped[float | None] = mapped_column(Float, default=None)
    mode: Mapped[float | None] = mapped_column(Float, default=None)
    min_price: Mapped[float] = mapped_column(Float, default=0.0)
    max_price: Mapped[float] = mapped_column(Float, default=0.0)
    stddev: Mapped[float] = mapped_column(Float, default=0.0)
    volatility: Mapped[float] = mapped_column(Float, default=0.0)
    liquidity: Mapped[float] = mapped_column(Float, default=0.0)
    supply: Mapped[float] = mapped_column(Float, default=0.0)
    demand: Mapped[float] = mapped_column(Float, default=0.0)
    spread: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    sample_size: Mapped[int] = mapped_column(Integer, default=0)
    lowest_lot: Mapped[float] = mapped_column(Float, default=0.0)
    active_lots: Mapped[int] = mapped_column(Integer, default=0)
    change_24h: Mapped[float] = mapped_column(Float, default=0.0)
    change_7d: Mapped[float] = mapped_column(Float, default=0.0)
    sales_24h: Mapped[int] = mapped_column(Integer, default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MarketEvent(Base):
    """Аномалия рынка для календаря событий."""

    __tablename__ = "market_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    region: Mapped[str] = mapped_column(String(8), default="EU")
    type: Mapped[str] = mapped_column(String(32))
    magnitude: Mapped[float] = mapped_column(Float, default=0.0)
    message: Mapped[str] = mapped_column(String(256), default="")
    happened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class Deal(Base):
    """Сделка пользователя: покупка, выставление, продажа."""

    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    user_key: Mapped[str] = mapped_column(String(64), index=True, default="local")
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    state: Mapped[str] = mapped_column(String(16), default="bought")
    amount: Mapped[int] = mapped_column(Integer, default=1)
    buy_price: Mapped[float] = mapped_column(Float)
    bought_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    market_price_at_buy: Mapped[float] = mapped_column(Float, default=0.0)
    list_price: Mapped[float | None] = mapped_column(Float, default=None)
    listed_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    sell_price: Mapped[float | None] = mapped_column(Float, default=None)
    sold_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    fee_percent: Mapped[float] = mapped_column(Float, default=5.0)
    note: Mapped[str] = mapped_column(String(256), default="")
    quality: Mapped[str] = mapped_column(String(32), default="")
    upgrade_level: Mapped[int] = mapped_column(Integer, default=0)


class WatchItem(Base):
    """Артефакт в списке наблюдения."""

    __tablename__ = "watch_items"
    __table_args__ = (UniqueConstraint("user_id", "item_id", "quality", "upgrade_level", name="uq_watch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    user_key: Mapped[str] = mapped_column(String(64), index=True, default="local")  # Для обратной совместимости
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"))
    quality: Mapped[str] = mapped_column(String(32), default="")
    upgrade_level: Mapped[int] = mapped_column(Integer, default=0)
    folder: Mapped[str] = mapped_column(String(64), default="Основной")
    color: Mapped[str] = mapped_column(String(16), default="#4F8CFF")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class User(Base):
    """Пользователь системы авторизации."""

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("steam_id", name="uq_steam"), UniqueConstraint("exbo_id", name="uq_exbo"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    steam_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    exbo_id: Mapped[int | None] = mapped_column(Integer, unique=True, nullable=True, index=True)
    username: Mapped[str] = mapped_column(String(128), default="")
    avatar: Mapped[str] = mapped_column(String(256), default="")
    auth_provider: Mapped[str] = mapped_column(String(16), default="")  # "steam" or "exbo"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Система уровней трейдера
    xp: Mapped[int] = mapped_column(Integer, default=0)  # Опыт пользователя
    level: Mapped[int] = mapped_column(Integer, default=1)  # Текущий уровень
    deals_count: Mapped[int] = mapped_column(Integer, default=0)  # Общее количество сделок
    total_profit: Mapped[float] = mapped_column(Float, default=0.0)  # Общая прибыль


class Session(Base):
    """Сессия пользователя для хранения токенов."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ArtifactStat(Base):
    """Характеристики артефактов для калькулятора сборок (гибкая структура)."""

    __tablename__ = "artifact_stats"
    __table_args__ = (Index("ix_artifact_stats_item_key", "item_id", "stat_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    stat_key: Mapped[str] = mapped_column(String(128))  # напр. "stamina_bonus", "biological_accumulation"
    stat_name_ru: Mapped[str] = mapped_column(String(128))  # напр. "Выносливость"
    property_type: Mapped[str] = mapped_column(String(32), default="")  # "Основное" / "Дополнительное"
    unit: Mapped[str] = mapped_column(String(16), default="")  # "%" / ""
    is_harmful: Mapped[bool] = mapped_column(Boolean, default=False)  # TRUE если вредный стат
    is_negative: Mapped[bool] = mapped_column(Boolean, default=False)  # True для _accumulation-статов
    min_value: Mapped[float] = mapped_column(Float)
    max_value: Mapped[float] = mapped_column(Float)
    value_at_85: Mapped[float] = mapped_column(Float, default=0.0)
    value_at_100: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Container(Base):
    """Контейнеры/рюкзаки для сборок."""

    __tablename__ = "containers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)  # id из репозитория
    name_ru: Mapped[str] = mapped_column(String(128))
    container_type: Mapped[str] = mapped_column(String(16), default="backpacks")  # backpacks или containers
    slots: Mapped[int] = mapped_column(Integer)  # количество слотов
    inner_protection: Mapped[float] = mapped_column(Float, default=0.0)  # внутренняя защита, %
    effectiveness: Mapped[float] = mapped_column(Float, default=0.0)  # эффективность, %
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Armor(Base):
    """Броня для сборок."""

    __tablename__ = "armor"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)  # id из репозитория
    name_ru: Mapped[str] = mapped_column(String(128))
    armor_type: Mapped[str] = mapped_column(String(16))  # combat, clothes, combined, scientist, device
    weight: Mapped[float] = mapped_column(Float, default=0.0)  # вес
    durability: Mapped[float] = mapped_column(Float, default=100.0)  # прочность
    bullet_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # пулестойкость
    tear_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от разрыва
    explosion_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от взрыва
    electricity_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # электрозащита
    fire_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от огня
    chemical_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # химзащита
    radiation_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от радиации
    thermal_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от температуры
    biological_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от биозаражения
    psycho_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от пси-излучения
    bleeding_resistance: Mapped[float] = mapped_column(Float, default=0.0)  # защита от кровотечения
    stamina_bonus: Mapped[float] = mapped_column(Float, default=0.0)  # бонус к выносливости
    speed_modifier: Mapped[float] = mapped_column(Float, default=0.0)  # модификатор скорости
    carry_weight_bonus: Mapped[float] = mapped_column(Float, default=0.0)  # бонус к переносимому весу
    stability: Mapped[float] = mapped_column(Float, default=0.0)  # стойкость
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserBuild(Base):
    """Сохраненные сборки пользователей."""

    __tablename__ = "user_builds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    user_key: Mapped[str] = mapped_column(String(64), index=True, default="local")
    name: Mapped[str] = mapped_column(String(128), default="Моя сборка")
    container_id: Mapped[int] = mapped_column(ForeignKey("containers.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BuildArtifact(Base):
    """Артефакты в сборке."""

    __tablename__ = "build_artifacts"
    __table_args__ = (Index("ix_build_artifacts_build_slot", "build_id", "slot_position"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    build_id: Mapped[int] = mapped_column(ForeignKey("user_builds.id"), index=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"))
    quality: Mapped[str] = mapped_column(String(32), default="")
    upgrade_level: Mapped[int] = mapped_column(Integer, default=0)
    slot_position: Mapped[int] = mapped_column(Integer)  # позиция в сборке (1, 2, 3...)
