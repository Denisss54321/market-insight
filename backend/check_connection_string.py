"""Проверка текущей connection string"""
from app.config import settings

print(f"DATABASE_URL: {settings.database_url}")
print(f"Source: {settings.source}")
print(f"API Base URL: {settings.api_base_url}")
print(f"Region: {settings.region}")
