"""Откат миграции: преобразование quality='' обратно в quality='Обычный'."""

from sqlalchemy import text
from app.db import engine

def rollback_base_variants():
    with engine.begin() as connection:
        # Проверяем количество записей для отката
        count = connection.execute(text("""
            SELECT COUNT(*) FROM item_stats 
            WHERE quality = '' AND upgrade_level = 0
        """)).fetchone()
        print(f"Found {count[0]} records with quality='' and upgrade_level=0")
        
        if count[0] > 0:
            # Проверяем, есть ли уже записи с quality='Обычный' для тех же предметов
            duplicates = connection.execute(text("""
                SELECT COUNT(*) FROM item_stats s1
                WHERE s1.quality = '' AND s1.upgrade_level = 0
                AND EXISTS (
                    SELECT 1 FROM item_stats s2 
                    WHERE s2.item_id = s1.item_id 
                    AND s2.region = s1.region 
                    AND s2.quality = 'Обычный' 
                    AND s2.upgrade_level = 0
                )
            """)).fetchone()
            print(f"Found {duplicates[0]} potential duplicates")
            
            if duplicates[0] > 0:
                print("Deleting duplicates (keeping quality='' as fallback)")
                connection.execute(text("""
                    DELETE FROM item_stats s1
                    WHERE s1.quality = '' AND s1.upgrade_level = 0
                    AND EXISTS (
                        SELECT 1 FROM item_stats s2 
                        WHERE s2.item_id = s1.item_id 
                        AND s2.region = s1.region 
                        AND s2.quality = 'Обычный' 
                        AND s2.upgrade_level = 0
                    )
                """))
            
            # Преобразуем оставшиеся записи
            result = connection.execute(text("""
                UPDATE item_stats 
                SET quality = 'Обычный' 
                WHERE quality = '' AND upgrade_level = 0
            """))
            print(f"Updated {result.rowcount} rows from quality='' to quality='Обычный'")
        
        print("Rollback completed")

if __name__ == "__main__":
    rollback_base_variants()
