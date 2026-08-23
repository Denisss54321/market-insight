#!/usr/bin/env python3
"""
Keep-alive script для Render backend.
Запускается каждые 5 минут чтобы предотвратить спящий режим.
"""

import requests
import time
import schedule
from datetime import datetime

BACKEND_URL = "https://market-insight-backend-9qr7.onrender.com"

def ping_backend():
    """Отправляет запрос к backend чтобы поддерживать его активным."""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        print(f"[{datetime.now()}] Backend ping: {response.status_code}")
    except Exception as e:
        print(f"[{datetime.now()}] Backend ping failed: {e}")

if __name__ == "__main__":
    print("Starting keep-alive script...")
    ping_backend()  # Первый пинг сразу
    schedule.every(5).minutes.do(ping_backend)
    
    while True:
        schedule.run_pending()
        time.sleep(60)
