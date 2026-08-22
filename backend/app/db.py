"""Подключение к базе и сессии SQLAlchemy."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models import Base

settings.data_dir.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
    future=True,
)
SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def init_db() -> None:
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        if settings.database_url.startswith("sqlite"):
            connection.exec_driver_sql("PRAGMA journal_mode=WAL")
            connection.exec_driver_sql("PRAGMA encoding='UTF-8'")
        else:
            # Миграции для PostgreSQL
            try:
                # Добавляем first_seen_at в lot_snapshots
                result = connection.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'lot_snapshots' AND column_name = 'first_seen_at'
                """))
                if result.fetchone() is None:
                    connection.execute(text("ALTER TABLE lot_snapshots ADD COLUMN first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                
                # Изменяем nullable для item_stats
                result = connection.execute(text("""
                    SELECT column_name, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'item_stats' AND column_name = 'market_price'
                """))
                row = result.fetchone()
                if row and row[1] == 'YES':
                    # Уже nullable, пропускаем
                    pass
                else:
                    connection.execute(text("ALTER TABLE item_stats ALTER COLUMN market_price DROP NOT NULL"))
                    connection.execute(text("ALTER TABLE item_stats ALTER COLUMN median DROP NOT NULL"))
                    connection.execute(text("ALTER TABLE item_stats ALTER COLUMN mean DROP NOT NULL"))
                    connection.execute(text("ALTER TABLE item_stats ALTER COLUMN mode DROP NOT NULL"))
            except Exception as e:
                print(f"Migration error: {e}")
                pass  # Игнорируем ошибки при миграции


@contextmanager
def session_scope() -> Iterator[Session]:
    session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session() -> Iterator[Session]:
    """Зависимость FastAPI."""
    session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
