"""Миграция: преобразование quality='Обычный' и upgrade_level=0 в quality=''."""

from sqlalchemy import text
from app.db import engine

def migrate_base_variants():
    with engine.begin() as connection:
        # Проверяем количество записей для миграции
        count = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats 
            WHERE quality = 'Обычный' AND upgrade_level = 0
        """)).fetchone()
        print(f"Found {count[0]} records with quality='Обычный' and upgrade_level=0")
        
        if count[0] > 0:
            # Проверяем, есть ли уже записи с quality='' для тех же предметов
            duplicates = connection.execute(text("""
                SELECT COUNT(*) FROM item_stats s1
                WHERE s1.quality = 'Обычный' AND s1.upgrade_level = 0
                AND EXISTS (
                    SELECT 1 FROM item_stats s2 
                    WHERE s2.item_id = s1.item_id 
                    AND s2.region = s1.region 
                    AND s2.quality = '' 
                    AND s2.upgrade_level = 0
                )
            """)).fetchone()
            print(f"Found {duplicates[0]} potential duplicates")
            
            if duplicates[0] > 0:
                print("Deleting duplicates (keeping quality='Обычный' as fallback)")
                connection.execute(text("""
                    DELETE FROM item_stats s1
                    WHERE s1.quality = 'Обычный' AND s1.upgrade_level = 0
                    AND EXISTS (
                        SELECT 1 FROM item_stats s2 
                        WHERE s2.item_id = s1.item_id 
                        AND s2.region = s1.region 
                        AND s2.quality = '' 
                        AND s2.upgrade_level = 0
                    )
                """))
            
            # Преобразуем оставшиеся записи
            result = connection.execute(text("""
                UPDATE item_stats 
                SET quality = '' 
                WHERE quality = 'Обычный' AND upgrade_level = 0
            """))
            print(f"Updated {result.rowcount} rows from quality='Обычный' to quality=''")
        
        print("Migration completed")

if __name__ == "__main__":
    migrate_base_variants()
