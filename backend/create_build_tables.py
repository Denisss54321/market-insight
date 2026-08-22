"""Создание таблиц для калькулятора сборок."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from app.models import Base
from app.config import settings

def create_tables():
    """Создает таблицы для калькулятора сборок."""
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(engine)
    print("Таблицы успешно созданы")

if __name__ == '__main__':
    create_tables()
