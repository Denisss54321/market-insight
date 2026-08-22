"""Проверка пути к БД."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings

print(f"Путь к БД из настроек: {settings.database_url}")
print(f"Абсолютный путь: {Path(settings.database_url.replace('sqlite:///', '')).absolute()}")
