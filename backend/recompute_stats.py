"""
Скрипт для принудительного пересчёта метрик всех артефактов.
Использует новые настройки (window_hours=72) для корректного расчёта ликвидности.
"""

from app.db import session_scope
from app.models import Item, Sale, LotSnapshot, ItemStats
from app.collector import Collector
from app.config import settings
from sqlalchemy import select
import sys

def recompute_all_stats():
    """Пересчитывает метрики для всех артефактов."""
    
    print(f"Настройки: window_hours={settings.history_window_hours}, min_sample={settings.min_sample_size}")
    
    with session_scope() as session:
        # Получаем все уникальные item_id
        item_ids = session.execute(select(Item.id)).scalars().all()
        print(f"Найдено {len(item_ids)} артефактов")
        
        for i, item_id in enumerate(item_ids, 1):
            try:
                # Используем существующий метод _recompute из Collector
                metrics, previous, metrics_by_variant = Collector._recompute(session, item_id)
                
                print(f"[{i}/{len(item_ids)}] {item_id}: пересчитано {len(metrics_by_variant)} вариантов")
                
            except Exception as e:
                print(f"[{i}/{len(item_ids)}] {item_id}: ОШИБКА - {e}")
                continue
        
        print("\nПересчёт завершён. Изменения сохранены в базу данных.")

if __name__ == "__main__":
    print("Запуск пересчёта метрик...")
    recompute_all_stats()
