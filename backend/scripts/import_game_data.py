"""Импорт данных из репозитория EXBO-Studio для калькулятора сборок."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Добавляем путь к корню проекта для импортов
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.models import ArtifactStat, Base, Container, Item, Armor
from app.config import settings


def clone_repo(repo_url: str, target_dir: Path) -> bool:
    """Клонирует репозиторий если его нет."""
    if target_dir.exists():
        print(f"Репозиторий уже существует в {target_dir}")
        return True
    
    print(f"Клонирование репозитория из {repo_url}...")
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, str(target_dir)],
            check=True,
            capture_output=True,
            text=True
        )
        print("Репозиторий успешно склонирован")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при клонировании: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False


def parse_artifact_stats_from_csv(csv_path: Path, item_id: str, item_name: str) -> list[dict]:
    """Парсит характеристики артефакта из CSV файла artifact_properties.csv"""
    stats = []
    
    try:
        import csv
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Проверяем, что строка относится к нужному артефакту
                if row['artifact_name'].strip().lower() != item_name.strip().lower():
                    continue
                
                stat_name_ru = row['stat_name'].strip()
                property_type = row['property_type'].strip()
                unit = row['unit'].strip()
                is_harmful = row['is_harmful'].strip().upper() == 'TRUE'
                
                # Парсим значения
                value_85 = float(row['value_at_85']) if row['value_at_85'] else 0.0
                value_100 = float(row['value_at_100']) if row['value_at_100'] else 0.0
                
                # Определяем статический ключ (для внутреннего использования)
                stat_key_map = {
                    'Выносливость': 'stamina_bonus',
                    'Восстановление выносливости': 'stamina_regeneration_bonus',
                    'Скорость передвижения': 'speed_modifier',
                    'Скорость бега': 'sprint_speed_modifier',
                    'Переносимый вес': 'max_weight_bonus',
                    'Живучесть': 'health_bonus',
                    'Регенерация здоровья': 'regeneration_bonus',
                    'Эффективность лечения': 'heal_efficiency',
                    'Пулестойкость': 'bullet_dmg_factor',
                    'Защита от разрыва': 'tear_dmg_factor',
                    'Защита от взрыва': 'explosion_dmg_factor',
                    'Защита от огня': 'burn_dmg_factor',
                    'Электрозащита': 'electra_dmg_factor',
                    'Химзащита': 'chemical_burn_dmg_factor',
                    'Радиация': 'radiation_accumulation' if is_harmful else 'radiation_protection',
                    'Биологическое заражение': 'biological_accumulation' if is_harmful else 'biological_protection',
                    'Пси-излучение': 'psycho_accumulation' if is_harmful else 'psycho_protection',
                    'Температура': 'thermal_accumulation' if is_harmful else 'thermal_protection',
                    'Кровотечение': 'bleeding_accumulation' if is_harmful else 'bleeding_protection',
                    'Холод': 'frost_accumulation' if is_harmful else 'frost_protection',
                    'Горение': 'combustion_accumulation' if is_harmful else 'burn_dmg_factor',
                    'Отдача': 'recoil_bonus',
                    'Покачивание': 'wiggle_bonus',
                    'Реакция на ожог': 'reaction_to_burn',
                    'Реакция на хим. ожог': 'reaction_to_chemical_burn',
                    'Реакция на электричество': 'reaction_to_electroshock',
                    'Реакция на разрыв': 'reaction_to_tear',
                    'Стойкость': 'stopping_protection',
                    'Защита от радиации': 'radiation_protection',
                    'Защита от биозаражения': 'biological_protection',
                    'Защита от пси-излучения': 'psycho_protection',
                    'Защита от температуры': 'thermal_protection',
                    'Защита от кровотечения': 'bleeding_protection',
                    'Периодическое лечение': 'periodic_heal',
                }
                
                stat_key = stat_key_map.get(stat_name_ru, stat_name_ru.lower().replace(' ', '_').replace('-', '_'))
                is_negative = is_harmful or stat_key.endswith('_accumulation')
                
                # Определяем min/max (берем экстремумы из value_at_85 и value_at_100)
                min_val = min(value_85, value_100)
                max_val = max(value_85, value_100)
                
                stats.append({
                    'stat_key': stat_key,
                    'stat_name_ru': stat_name_ru,
                    'property_type': property_type,
                    'unit': unit,
                    'is_harmful': is_harmful,
                    'is_negative': is_negative,
                    'min_value': min_val,
                    'max_value': max_val,
                    'value_at_85': value_85,
                    'value_at_100': value_100
                })
    
    except Exception as e:
        print(f"Ошибка при парсинге CSV для {item_name}: {e}")
    
    return stats


def parse_container_data(json_file: Path, item_id: str, container_type: str) -> dict | None:
    """Парсит данные контейнера/рюкзака из JSON."""
    try:
        data = json.loads(json_file.read_text(encoding='utf-8'))
        
        # Получаем русское название
        name_ru = data.get('name', {}).get('lines', {}).get('ru', '')
        if not name_ru:
            return None
        
        # Парсим infoBlocks для получения характеристик
        slots = 0
        inner_protection = 0.0
        effectiveness = 0.0
        
        for block in data.get('infoBlocks', []):
            if block.get('type') == 'list':
                for element in block.get('elements', []):
                    if element.get('type') == 'numeric':
                        name_key = element.get('name', {}).get('key', '')
                        value = element.get('value', 0)
                        
                        # Проверяем разные ключи для слотов
                        if 'size' in name_key.lower() and ('backpack' in name_key.lower() or 'container' in name_key.lower()):
                            slots = int(value)
                        # Более гибкий поиск protection
                        elif 'protection' in name_key.lower() and ('backpack' in name_key.lower() or 'container' in name_key.lower()):
                            inner_protection = value
                        # Более гибкий поиск effectiveness
                        elif 'effectiveness' in name_key.lower() and ('backpack' in name_key.lower() or 'container' in name_key.lower()):
                            effectiveness = value
        
        return {
            'item_id': item_id,
            'name_ru': name_ru,
            'container_type': container_type,
            'slots': slots,
            'inner_protection': inner_protection,
            'effectiveness': effectiveness
        }
    except Exception as e:
        print(f"Error parsing {json_file}: {e}")
        return None


def parse_armor_data(json_file: Path, item_id: str, armor_type: str) -> dict | None:
    """Парсит данные брони из JSON."""
    try:
        data = json.loads(json_file.read_text(encoding='utf-8'))
        
        # Получаем русское название
        name_ru = data.get('name', {}).get('lines', {}).get('ru', '')
        if not name_ru:
            return None
        
        # Парсим infoBlocks для получения характеристик
        weight = 0.0
        durability = 100.0
        bullet_resistance = 0.0
        tear_resistance = 0.0
        explosion_resistance = 0.0
        electricity_resistance = 0.0
        fire_resistance = 0.0
        chemical_resistance = 0.0
        radiation_resistance = 0.0
        thermal_resistance = 0.0
        biological_resistance = 0.0
        psycho_resistance = 0.0
        bleeding_resistance = 0.0
        stamina_bonus = 0.0
        speed_modifier = 0.0
        carry_weight_bonus = 0.0
        stability = 0.0
        
        for block in data.get('infoBlocks', []):
            if block.get('type') == 'list':
                for element in block.get('elements', []):
                    if element.get('type') == 'numeric':
                        name_key = element.get('name', {}).get('key', '')
                        value = element.get('value', 0)
                        
                        # Базовые характеристики
                        if 'core.tooltip.info.weight' in name_key:
                            weight = value
                        elif 'core.tooltip.info.durability' in name_key:
                            durability = value
                        
                        # Защитные характеристики
                        elif 'bullet_dmg_factor' in name_key:
                            bullet_resistance = value
                        elif 'tear_dmg_factor' in name_key:
                            tear_resistance = value
                        elif 'explosion_dmg_factor' in name_key:
                            explosion_resistance = value
                        elif 'electra_dmg_factor' in name_key:
                            electricity_resistance = value
                        elif 'burn_dmg_factor' in name_key:
                            fire_resistance = value
                        elif 'chemical_burn_dmg_factor' in name_key:
                            chemical_resistance = value
                        elif 'radiation_protection' in name_key:
                            radiation_resistance = value
                        elif 'thermal_protection' in name_key:
                            thermal_resistance = value
                        elif 'biological_protection' in name_key:
                            biological_resistance = value
                        elif 'psycho_protection' in name_key:
                            psycho_resistance = value
                        elif 'bleeding_protection' in name_key:
                            bleeding_resistance = value
                        
                        # Бонусы
                        elif 'stamina_bonus' in name_key:
                            stamina_bonus = value
                        elif 'speed_modifier' in name_key:
                            speed_modifier = value
                        elif 'max_weight_bonus' in name_key:
                            carry_weight_bonus = value
                        elif 'stopping_protection' in name_key:
                            stability = value
        
        return {
            'item_id': item_id,
            'name_ru': name_ru,
            'armor_type': armor_type,
            'weight': weight,
            'durability': durability,
            'bullet_resistance': bullet_resistance,
            'tear_resistance': tear_resistance,
            'explosion_resistance': explosion_resistance,
            'electricity_resistance': electricity_resistance,
            'fire_resistance': fire_resistance,
            'chemical_resistance': chemical_resistance,
            'radiation_resistance': radiation_resistance,
            'thermal_resistance': thermal_resistance,
            'biological_resistance': biological_resistance,
            'psycho_resistance': psycho_resistance,
            'bleeding_resistance': bleeding_resistance,
            'stamina_bonus': stamina_bonus,
            'speed_modifier': speed_modifier,
            'carry_weight_bonus': carry_weight_bonus,
            'stability': stability
        }
    except Exception as e:
        print(f"Error parsing {json_file}: {e}")
        return None


def import_artifact_stats(repo_dir: Path, session: Session) -> dict:
    """Импортирует характеристики артефактов из CSV файла artifact_properties.csv"""
    # Ищем CSV файл в корне проекта
    csv_path = Path(__file__).parent.parent.parent / 'artifact_properties.csv'
    if not csv_path.exists():
        csv_path = repo_dir.parent / 'artifact_properties.csv'
    if not csv_path.exists():
        print(f"Файл artifact_properties.csv не найден")
        return {'total': 0, 'imported': 0, 'not_found': [], 'examples': [], 'from_csv': True}
    
    # Получаем все item из нашей БД (маппинг по имени)
    existing_items = {item.name_ru.lower(): item for item in session.execute(select(Item)).scalars().all()}
    
    stats = {
        'total': 0,
        'imported': 0,
        'not_found': [],
        'examples': [],
        'from_csv': True
    }
    
    # Собираем уникальные названия артефактов из CSV
    artifact_names_in_csv = set()
    try:
        import csv
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                artifact_names_in_csv.add(row['artifact_name'].strip().lower())
    except Exception as e:
        print(f"Ошибка при чтении CSV: {e}")
        return stats
    
    # Импортируем статы для каждого артефакта из CSV
    for item_name_lower, our_item in existing_items.items():
        if item_name_lower not in artifact_names_in_csv:
            continue
        
        stats['total'] += 1
        
        # Парсим характеристики из CSV
        artifact_stats = parse_artifact_stats_from_csv(csv_path, our_item.id, our_item.name_ru)
        
        if not artifact_stats:
            continue
        
        # Удаляем старые записи для этого артефакта
        old_stats = session.execute(
            select(ArtifactStat).where(ArtifactStat.item_id == our_item.id)
        ).scalars().all()
        for old_stat in old_stats:
            session.delete(old_stat)
        
        # Добавляем новые записи
        for stat_data in artifact_stats:
            stat = ArtifactStat(
                item_id=our_item.id,
                stat_key=stat_data['stat_key'],
                stat_name_ru=stat_data['stat_name_ru'],
                property_type=stat_data.get('property_type', ''),
                unit=stat_data.get('unit', ''),
                is_harmful=stat_data.get('is_harmful', False),
                is_negative=stat_data.get('is_negative', False),
                min_value=stat_data['min_value'],
                max_value=stat_data['max_value'],
                value_at_85=stat_data.get('value_at_85', 0.0),
                value_at_100=stat_data.get('value_at_100', 0.0)
            )
            session.add(stat)
        
        stats['imported'] += 1
        
        # Сохраняем первые 3 примера
        if len(stats['examples']) < 3:
            stats['examples'].append({
                'item_id': our_item.id,
                'name': our_item.name_ru,
                'stats': artifact_stats
            })
    
    session.commit()
    return stats


def import_containers(repo_dir: Path, session: Session) -> dict:
    """Импортирует рюкзаки и контейнеры."""
    backpacks_dir = repo_dir / 'ru' / 'items' / 'backpacks'
    containers_dir = repo_dir / 'ru' / 'items' / 'containers'
    
    stats = {
        'total': 0,
        'imported': 0,
        'examples': []
    }
    
    # Импортируем рюкзаки
    if backpacks_dir.exists():
        for json_file in backpacks_dir.glob('*.json'):
            item_id = json_file.stem
            stats['total'] += 1
            
            # Парсим данные рюкзака
            container_data = parse_container_data(json_file, item_id, 'backpacks')
            
            if not container_data:
                continue
            
            # Проверяем, есть ли уже такой рюкзак
            existing = session.execute(
                select(Container).where(Container.item_id == item_id)
            ).scalar_one_or_none()
            
            if existing:
                # Обновляем существующий
                existing.name_ru = container_data['name_ru']
                existing.container_type = container_data['container_type']
                existing.slots = container_data['slots']
                existing.inner_protection = container_data['inner_protection']
                existing.effectiveness = container_data['effectiveness']
            else:
                # Создаем новый
                container = Container(**container_data)
                session.add(container)
            
            stats['imported'] += 1
            
            # Сохраняем первые 3 примера
            if len(stats['examples']) < 3:
                stats['examples'].append(container_data)
    
    # Импортируем контейнеры
    if containers_dir.exists():
        for json_file in containers_dir.glob('*.json'):
            item_id = json_file.stem
            stats['total'] += 1
            
            # Парсим данные контейнера
            container_data = parse_container_data(json_file, item_id, 'containers')
            
            if not container_data:
                continue
            
            # Проверяем, есть ли уже такой контейнер
            existing = session.execute(
                select(Container).where(Container.item_id == item_id)
            ).scalar_one_or_none()
            
            if existing:
                # Обновляем существующий
                existing.name_ru = container_data['name_ru']
                existing.container_type = container_data['container_type']
                existing.slots = container_data['slots']
                existing.inner_protection = container_data['inner_protection']
                existing.effectiveness = container_data['effectiveness']
            else:
                # Создаем новый
                container = Container(**container_data)
                session.add(container)
            
            stats['imported'] += 1
            
            # Сохраняем первые 3 примера
            if len(stats['examples']) < 3:
                stats['examples'].append(container_data)
    
    session.commit()
    return stats


def import_armor(repo_dir: Path, session: Session) -> dict:
    """Импортирует броню."""
    armor_types = ['combat', 'clothes', 'combined', 'scientist']
    
    stats = {
        'total': 0,
        'imported': 0,
        'examples': []
    }
    
    for armor_type in armor_types:
        armor_dir = repo_dir / 'ru' / 'items' / 'armor' / armor_type
        
        if not armor_dir.exists():
            print(f"Директория брони {armor_type} не найдена: {armor_dir}")
            continue
        
        for json_file in armor_dir.glob('*.json'):
            item_id = json_file.stem
            stats['total'] += 1
            
            # Парсим данные брони
            armor_data = parse_armor_data(json_file, item_id, armor_type)
            
            if not armor_data:
                continue
            
            # Проверяем, есть ли уже такая броня
            existing = session.execute(
                select(Armor).where(Armor.item_id == item_id)
            ).scalar_one_or_none()
            
            if existing:
                # Обновляем существующий
                for key, value in armor_data.items():
                    setattr(existing, key, value)
            else:
                # Создаем новый
                armor = Armor(**armor_data)
                session.add(armor)
            
            stats['imported'] += 1
            
            # Сохраняем первые 3 примера
            if len(stats['examples']) < 3:
                stats['examples'].append(armor_data)
    
    session.commit()
    return stats


def main():
    """Главная функция."""
    repo_url = "https://github.com/EXBO-Studio/stalzone-database"
    repo_dir = Path(__file__).parent.parent / 'stalzone-database'
    
    print("=" * 60)
    print("Импорт данных из репозитория EXBO-Studio")
    print("=" * 60)
    
    # Клонируем репозиторий
    if not clone_repo(repo_url, repo_dir):
        print("Не удалось склонировать репозиторий")
        return
    
    # Подключаемся к БД
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Импортируем характеристики артефактов
        print("\n" + "=" * 60)
        print("Импорт характеристик артефактов")
        print("=" * 60)
        artifact_stats = import_artifact_stats(repo_dir, session)
        
        print(f"\nВсего артефактов в репозитории: {artifact_stats['total']}")
        print(f"Успешно импортировано: {artifact_stats['imported']}")
        print(f"Не найдено в нашей БД: {len(artifact_stats['not_found'])}")
        
        if artifact_stats['not_found']:
            print(f"\nПримеры не найденных item_id: {artifact_stats['not_found'][:10]}")
        
        print("\nПримеры импортированных артефактов:")
        for example in artifact_stats['examples']:
            print(f"\n  {example['name']} ({example['item_id']}):")
            for stat in example['stats']:
                sign = "-" if stat['is_negative'] else "+"
                print(f"    {sign} {stat['stat_name_ru']}: {stat['min_value']:.2f} - {stat['max_value']:.2f}")
        
        # Импортируем контейнеры
        print("\n" + "=" * 60)
        print("Импорт контейнеров и рюкзаков")
        print("=" * 60)
        containers = import_containers(repo_dir, session)
        
        print(f"\nВсего контейнеров в репозитории: {containers['total']}")
        print(f"Успешно импортировано: {containers['imported']}")
        
        if containers['examples']:
            print(f"\nПримеры импортированных контейнеров:")
            for ex in containers['examples']:
                print(f"  - {ex['name_ru']} ({ex['container_type']}): {ex['slots']} слотов, защита: {ex['inner_protection']}%, эффективность: {ex['effectiveness']}%")
        
        # Импортируем броню
        print("\n" + "=" * 60)
        print("Импорт брони")
        print("=" * 60)
        armor = import_armor(repo_dir, session)
        
        print(f"\nВсего брони в репозитории: {armor['total']}")
        print(f"Успешно импортировано: {armor['imported']}")
        
        if armor['examples']:
            print(f"\nПримеры импортированной брони:")
            for ex in armor['examples']:
                print(f"  - {ex['name_ru']} ({ex['armor_type']}): {ex['bullet_resistance']} пулестойкость")
    
    print("\n" + "=" * 60)
    print("Импорт завершен")
    print("=" * 60)
    
    # Автоматически удаляем репозиторий (игнорируем ошибки на Windows)
    if repo_dir.exists():
        try:
            shutil.rmtree(repo_dir)
            print(f"Репозиторий {repo_dir} удален")
        except PermissionError:
            print(f"Не удалось удалить репозиторий {repo_dir} (ошибка доступа). Удалите вручную.")


if __name__ == '__main__':
    main()
