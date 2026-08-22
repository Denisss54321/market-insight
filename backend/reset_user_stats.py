"""Скрипт для сброса статистики пользователя (XP, уровень, сделки)"""
from app.db import session_scope
from app.models import User

def reset_user_stats(user_id: int = 1):
    """Сбрасывает статистику пользователя"""
    with session_scope() as session:
        user = session.get(User, user_id)
        if user:
            user.xp = 0
            user.level = 1
            user.deals_count = 0
            user.total_profit = 0.0
            session.commit()
            print(f"Статистика пользователя {user_id} сброшена:")
            print(f"  XP: 0")
            print(f"  Уровень: 1")
            print(f"  Сделок: 0")
            print(f"  Прибыль: 0.0")
        else:
            print(f"Пользователь с ID {user_id} не найден")

if __name__ == "__main__":
    reset_user_stats(1)
