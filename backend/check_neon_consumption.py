"""Скрипт для проверки проектов и потребления ресурсов Neon"""
import requests
import json

NEON_API_KEY = "napi_uqw21badrqqi37v2l0xblofp2i656tmm2hh40agr3ybvidokw15d6p9r5gq5nogq"

def list_projects():
    """Получает список всех проектов"""
    headers = {
        "Authorization": f"Bearer {NEON_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            "https://console.neon.tech/api/v2/projects",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Список проектов:")
            print(json.dumps(data, indent=2))
            return data
        else:
            print(f"Ошибка: {response.text}")
            return None
            
    except Exception as e:
        print(f"Ошибка при запросе: {e}")
        return None

def check_consumption(project_id):
    """Проверяет потребление ресурсов проекта"""
    headers = {
        "Authorization": f"Bearer {NEON_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"https://console.neon.tech/api/v2/projects/{project_id}/consumption",
            headers=headers
        )
        
        print(f"\nStatus Code для consumption: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Потребление ресурсов:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Ошибка: {response.text}")
            
    except Exception as e:
        print(f"Ошибка при запросе: {e}")

if __name__ == '__main__':
    projects = list_projects()
    if projects and projects.get("projects"):
        for project in projects["projects"]:
            project_id = project.get("id")
            project_name = project.get("name", "Unknown")
            print(f"\nПроверяем проект: {project_name} ({project_id})")
            check_consumption(project_id)
