"""Скрипт для установки XP пользователя для тестирования уровней"""
import os
import sys

# Устанавливаем правильную директорию для импортов
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db import session_scope
from app.models import User
from app.xp_system import calculate_level, xp_for_level

def set_user_xp(user_id: int = 1, xp: int = 0):
    """Устанавливает XP пользователя и пересчитывает уровень"""
    with session_scope() as session:
        user = session.get(User, user_id)
        if user:
            user.xp = xp
            user.level = calculate_level(xp)
            session.commit()
            level = user.level
            next_level_xp = xp_for_level(level + 1)
            current_level_xp = xp_for_level(level)
            progress = xp - current_level_xp
            needed = next_level_xp - current_level_xp
            
            print(f"Статистика пользователя {user_id} обновлена:")
            print(f"  XP: {xp}")
            print(f"  Уровень: {level}")
            print(f"  Прогресс: {progress} / {needed} XP")
            print(f"  Следующий уровень: {next_level_xp} XP")
        else:
            print(f"Пользователь с ID {user_id} не найден")

if __name__ == "__main__":
    # Примеры XP для каждого уровня (суммарное значение):
    # Уровень 1: 0 XP
    # Уровень 2: 100 XP
    # Уровень 3: 300 XP
    # Уровень 4: 700 XP
    # Уровень 5: 1500 XP
    # Уровень 6: 3100 XP
    # Уровень 7: 6300 XP
    # Уровень 8: 12700 XP
    # Уровень 9: 25500 XP
    # Уровень 10: 51100 XP
    
    if len(sys.argv) > 1:
        xp = int(sys.argv[1])
    else:
        xp = 100  # По умолчанию уровень 2
    
    set_user_xp(1, xp)
