"""Скрипт для экспорта данных через Neon API с правильным project ID"""
import requests
import json
from datetime import datetime, timezone

NEON_PROJECT_ID = "morning-brook-69286352"
NEON_API_KEY = "napi_uqw21badrqqi37v2l0xblofp2i656tmm2hh40agr3ybvidokw15d6p9r5gq5nogq"

def get_connection_string():
    """Получает connection string через Neon API"""
    headers = {
        "Authorization": f"Bearer {NEON_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        # Сначала получаем список веток
        response = requests.get(
            f"https://console.neon.tech/api/v2/projects/{NEON_PROJECT_ID}/branches",
            headers=headers
        )
        
        if response.status_code == 200:
            branches = response.json()
            print(f"Ветки: {json.dumps(branches, indent=2)}")
            
            if branches.get("branches"):
                # Берем первую ветку (обычно это main/primary)
                branch_id = branches["branches"][0]["id"]
                print(f"Используем ветку: {branch_id}")
                
                # Получаем connection string для ветки
                response = requests.post(
                    f"https://console.neon.tech/api/v2/projects/{NEON_PROJECT_ID}/branches/{branch_id}/connection-uri",
                    headers=headers
                )
                
                if response.status_code == 200:
                    connection_data = response.json()
                    connection_uri = connection_data.get("uri")
                    if connection_uri:
                        return connection_uri
                    else:
                        print("Не удалось получить connection URI из ответа")
                        print(json.dumps(connection_data, indent=2))
                        return None
                else:
                    print(f"Ошибка получения connection URI: {response.status_code}")
                    print(response.text)
                    return None
            else:
                print("Ветки не найдены")
                return None
        else:
            print(f"Ошибка получения веток: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Ошибка при получении connection string: {e}")
        return None

def export_via_neon_api():
    """Экспорт через Neon API с правильным project ID"""
    
    connection_uri = get_connection_string()
    if not connection_uri:
        print("Не удалось получить connection string")
        return
    
    print(f"Connection URI получен: {connection_uri[:50]}...")
    
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        conn = psycopg2.connect(connection_uri)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        data = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "items": [],
            "item_stats": [],
            "sales": [],
            "lot_snapshots": [],
            "market_events": [],
            "deals": [],
            "watch_items": [],
            "users": [],
            "sessions": []
        }
        
        # SQL запросы для экспорта
        sql_queries = {
            "items": "SELECT * FROM items",
            "item_stats": "SELECT * FROM item_stats", 
            "sales": "SELECT * FROM sales ORDER BY sold_at DESC LIMIT 1000",
            "lot_snapshots": "SELECT * FROM lot_snapshots ORDER BY seen_at DESC LIMIT 500",
            "market_events": "SELECT * FROM market_events",
            "deals": "SELECT * FROM deals",
            "watch_items": "SELECT * FROM watch_items",
            "users": "SELECT * FROM users",
            "sessions": "SELECT * FROM sessions"
        }
        
        for table_name, query in sql_queries.items():
            try:
                cursor.execute(query)
                rows = cursor.fetchall()
                
                # Конвертируем datetime в строки
                for row in rows:
                    row_dict = dict(row)
                    for key, value in row_dict.items():
                        if isinstance(value, datetime):
                            row_dict[key] = value.isoformat()
                    data[table_name].append(row_dict)
                
                print(f"Экспортировано {len(data[table_name])} записей из {table_name}")
            except Exception as e:
                print(f"Ошибка при экспорте {table_name}: {e}")
        
        cursor.close()
        conn.close()
        
        # Сохраняем в JSON
        with open('data_export.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Экспорт завершен. Данные сохранены в data_export.json")
        
    except ImportError:
        print("psycopg2 не установлен. Попробуйте: pip install psycopg2-binary")
    except Exception as e:
        print(f"Ошибка при подключении к базе: {e}")

if __name__ == '__main__':
    export_via_neon_api()
