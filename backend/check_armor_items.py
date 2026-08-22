"""Проверка конкретных предметов брони."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from sqlalchemy import create_engine, select, or_
from sqlalchemy.orm import Session
from app.models import Armor

def check_armor_items():
    """Проверяет конкретные предметы."""
    engine = create_engine(settings.database_url)
    
    with Session(engine) as session:
        # Ищем все предметы
        items = session.execute(
            select(Armor)
        ).scalars().all()
        
        print("Все предметы брони:")
        for item in items:
            icon_path = f"/icons/armor/{item.armor_type}/{item.item_id}.png"
            print(f"{item.item_id}: {item.name_ru} - {item.armor_type} - {icon_path}")

if __name__ == '__main__':
    check_armor_items()
