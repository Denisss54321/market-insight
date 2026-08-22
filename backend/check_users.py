"""Проверка пользователей в SQLite базе"""
from sqlalchemy import select, func
from app.db import session_scope
from app.models import User, Session as SessionModel

def check_users():
    """Проверяет наличие пользователей"""
    with session_scope() as session:
        # Проверяем Users
        users_count = session.execute(select(func.count(User.id))).scalar()
        print(f"Users: {users_count}")
        
        # Проверяем Sessions
        sessions_count = session.execute(select(func.count(SessionModel.id))).scalar()
        print(f"Sessions: {sessions_count}")
        
        # Показываем пользователей если есть
        if users_count > 0:
            users = session.execute(select(User)).scalars().all()
            print("\nПользователи:")
            for user in users:
                print(f"  ID: {user.id}, Username: {user.username}, Avatar: {user.avatar}, Provider: {user.auth_provider}")
        else:
            print("Нет пользователей в базе")

if __name__ == '__main__':
    check_users()
