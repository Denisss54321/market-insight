"""Удаляет ПНВ из таблицы armor."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.models import Armor

def delete_device_armor():
    """Удаляет все записи с armor_type = 'device'."""
    engine = create_engine(settings.database_url)
    
    with Session(engine) as session:
        try:
            # Находим все записи device
            device_armor = session.execute(
                select(Armor).where(Armor.armor_type == 'device')
            ).scalars().all()
            
            count = len(device_armor)
            
            # Удаляем
            for armor in device_armor:
                session.delete(armor)
            
            session.commit()
            print(f"Удалено {count} записей ПНВ")
        except Exception as e:
            print(f"Ошибка: {e}")
            session.rollback()

if __name__ == '__main__':
    delete_device_armor()
