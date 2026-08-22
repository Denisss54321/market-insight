"""Тестовый скрипт для получения сырого JSON от API."""

import asyncio
import httpx
import json

async def test_api():
    client_id = "3533"
    client_secret = "aS0vCSNPCzWJlZChUvaiIZOobmWRdUsjgXbPgfCB"
    
    headers = {
        "Accept": "application/json",
        "Client-Id": client_id,
        "Client-Secret": client_secret,
    }
    
    async with httpx.AsyncClient() as client:
        # Собираем все примеры с upgrade_bonus
        examples = []
        
        # Попробуем несколько разных артефактов
        for item_id in ["zjzn", "q1lk", "rn1z", "y5yw", "wglp", "4lml"]:
            print(f"\n=== TESTING {item_id} ===")
            
            # История
            response = await client.get(
                f"https://eapi.stalcraft.net/RU/auction/{item_id}/history",
                params={"limit": 200, "additional": "true"},
                headers=headers
            )
            data = response.json()
            for item in data['prices']:
                add = item.get('additional', {})
                if add.get('upgrade_bonus', 0) != 0 or add.get('ptn', 0) != 0:
                    examples.append(item)
            
            # Лоты
            response = await client.get(
                f"https://eapi.stalcraft.net/RU/auction/{item_id}/lots",
                params={"limit": 200, "sort": "buyout_price", "order": "asc", "additional": "true"},
                headers=headers
            )
            data = response.json()
            for item in data['lots']:
                add = item.get('additional', {})
                if add.get('upgrade_bonus', 0) != 0 or add.get('ptn', 0) != 0:
                    examples.append(item)
        
        print(f"\n=== FOUND {len(examples)} EXAMPLES WITH UPGRADE ===")
        for i, ex in enumerate(examples[:10]):  # Покажем первые 10
            print(f"\n--- Example {i+1} ---")
            print(json.dumps(ex, indent=2))

if __name__ == "__main__":
    asyncio.run(test_api())
