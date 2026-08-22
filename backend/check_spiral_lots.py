#!/usr/bin/env python3
"""Скрипт для проверки данных лотов для Спирали особой +5"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings

def check_spiral_lots():
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    
    with Session() as session:
        # Находим предмет Спираль
        spiral = session.execute(
            text("SELECT id, name_ru, name_en FROM items WHERE name_ru LIKE '%Спираль%' OR name_en LIKE '%Spiral%' LIMIT 5")
        ).fetchall()
        
        print("=== Найденные предметы с 'Спираль': ===")
        for row in spiral:
            print(f"ID: {row[0]}, RU: {row[1]}, EN: {row[2]}")
        
        if not spiral:
            print("Спираль не найдена")
            return
        
        # Берем первый найденный предмет
        item_id = spiral[0][0]
        print(f"\n=== Проверка лотов для предмета {item_id} ===")
        
        # Проверяем все лоты для этого предмета
        all_lots = session.execute(
            text(f"SELECT unit_price, amount, quality, upgrade_level, ends_at, gone_at FROM lot_snapshots WHERE item_id = '{item_id}' AND gone_at IS NULL ORDER BY unit_price LIMIT 20")
        ).fetchall()
        
        print(f"Всего активных лотов: {len(all_lots)}")
        
        print("\n=== Все активные лоты: ===")
        for lot in all_lots:
            print(f"Цена: {lot[0]}, Кол-во: {lot[1]}, Качество: '{lot[2]}', Заточка: {lot[3]}, До: {lot[4]}")
        
        # Проверяем лоты с качеством "Особый" и заточкой 5
        special_lots = session.execute(
            text(f"SELECT unit_price, amount, quality, upgrade_level, ends_at FROM lot_snapshots WHERE item_id = '{item_id}' AND quality = 'Особый' AND upgrade_level = 5 AND gone_at IS NULL")
        ).fetchall()
        
        print(f"\n=== Лоты с качеством 'Особый' и заточкой 5: ===")
        print(f"Количество: {len(special_lots)}")
        for lot in special_lots:
            print(f"Цена: {lot[0]}, Кол-во: {lot[1]}, До: {lot[4]}")
        
        # Проверяем все возможные значения качества для этого предмета
        qualities = session.execute(
            text(f"SELECT DISTINCT quality, COUNT(*) FROM lot_snapshots WHERE item_id = '{item_id}' AND gone_at IS NULL GROUP BY quality")
        ).fetchall()
        
        print(f"\n=== Распределение по качествам: ===")
        for quality, count in qualities:
            print(f"Качество '{quality}': {count} лотов")
        
        # Проверяем все возможные значения заточки для этого предмета
        upgrades = session.execute(
            text(f"SELECT DISTINCT upgrade_level, COUNT(*) FROM lot_snapshots WHERE item_id = '{item_id}' AND gone_at IS NULL GROUP BY upgrade_level ORDER BY upgrade_level")
        ).fetchall()
        
        print(f"\n=== Распределение по заточке: ===")
        for upgrade, count in upgrades:
            print(f"Заточка {upgrade}: {count} лотов")
        
        # Проверяем какие качества у лотов с заточкой 5
        upgrade5_lots = session.execute(
            text(f"SELECT quality, COUNT(*) FROM lot_snapshots WHERE item_id = '{item_id}' AND upgrade_level = 5 AND gone_at IS NULL GROUP BY quality")
        ).fetchall()
        
        print(f"\n=== Качества у лотов с заточкой 5: ===")
        for quality, count in upgrade5_lots:
            print(f"Качество '{quality}': {count} лотов")
        
        # Показываем все лоты с заточкой 5
        all_upgrade5 = session.execute(
            text(f"SELECT unit_price, amount, quality, upgrade_level, ends_at FROM lot_snapshots WHERE item_id = '{item_id}' AND upgrade_level = 5 AND gone_at IS NULL")
        ).fetchall()
        
        print(f"\n=== Все лоты с заточкой 5: ===")
        for lot in all_upgrade5:
            print(f"Цена: {lot[0]}, Кол-во: {lot[1]}, Качество: '{lot[2]}', Заточка: {lot[3]}, До: {lot[4]}")

if __name__ == "__main__":
    check_spiral_lots()
