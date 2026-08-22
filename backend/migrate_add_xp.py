"""Миграция для добавления полей XP и уровня в таблицу users"""
from app.db import session_scope
from sqlalchemy import text

def migrate():
    """Добавляет поля XP, level, deals_count, total_profit в таблицу users"""
    with session_scope() as session:
        try:
            # Проверяем, существуют ли уже колонки
            result = session.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'xp' in columns:
                print("Колонки уже существуют, миграция не требуется")
                return
            
            # Добавляем новые колонки
            session.execute(text("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0"))
            session.execute(text("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1"))
            session.execute(text("ALTER TABLE users ADD COLUMN deals_count INTEGER DEFAULT 0"))
            session.execute(text("ALTER TABLE users ADD COLUMN total_profit REAL DEFAULT 0.0"))
            
            session.commit()
            print("Миграция успешно выполнена!")
            
        except Exception as e:
            print(f"Ошибка при миграции: {e}")
            session.rollback()
            raise

if __name__ == '__main__':
    migrate()
