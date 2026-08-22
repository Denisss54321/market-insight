"""Модуль авторизации через OAuth (Steam, Exbo)."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Session as SessionModel, User


def generate_session_token() -> str:
    """Генерирует безопасный токен сессии."""
    return secrets.token_urlsafe(32)


def create_session(session: Session, user: User) -> SessionModel:
    """Создаёт новую сессию для пользователя."""
    token = generate_session_token()
    expires_at = datetime.utcnow() + timedelta(hours=settings.session_expire_hours)
    
    # Удаляем старые сессии пользователя
    session.execute(
        select(SessionModel).where(SessionModel.user_id == user.id)
    ).scalars().all()
    for old_session in session.execute(
        select(SessionModel).where(SessionModel.user_id == user.id)
    ).scalars().all():
        session.delete(old_session)
    
    db_session = SessionModel(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    session.add(db_session)
    session.commit()
    session.refresh(db_session)
    return db_session


def validate_session(session: Session, token: str) -> Optional[User]:
    """Проверяет валидность токена сессии и возвращает пользователя."""
    db_session = session.execute(
        select(SessionModel).where(
            SessionModel.token == token,
            SessionModel.expires_at > datetime.utcnow()
        )
    ).scalar_one_or_none()
    
    if db_session:
        # Получаем пользователя без обновления last_login для оптимизации
        user = session.get(User, db_session.user_id)
        if user:
            # Обновляем last_login только если прошло более 5 минут с последнего обновления
            if not user.last_login or (datetime.utcnow() - user.last_login).total_seconds() > 300:
                user.last_login = datetime.utcnow()
                session.commit()
                session.refresh(user)
            return user
    return None


def get_or_create_steam_user(session: Session, steam_id: str, username: str, avatar: str) -> User:
    """Получает или создаёт пользователя через Steam OAuth."""
    user = session.execute(
        select(User).where(User.steam_id == steam_id)
    ).scalar_one_or_none()
    
    if user:
        # Обновляем данные если изменились
        user.username = username
        user.avatar = avatar
        user.auth_provider = "steam"
        user.last_login = datetime.utcnow()
        session.commit()
        session.refresh(user)
        return user
    
    # Создаём нового пользователя
    user = User(
        steam_id=steam_id,
        username=username,
        avatar=avatar,
        auth_provider="steam",
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow()
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_or_create_exbo_user(session: Session, exbo_id: int, username: str, avatar: str) -> User:
    """Получает или создаёт пользователя через Exbo OAuth."""
    user = session.execute(
        select(User).where(User.exbo_id == exbo_id)
    ).scalar_one_or_none()
    
    if user:
        # Обновляем данные если изменились
        user.username = username
        user.avatar = avatar
        user.auth_provider = "exbo"
        user.last_login = datetime.utcnow()
        session.commit()
        session.refresh(user)
        return user
    
    # Создаём нового пользователя
    user = User(
        exbo_id=exbo_id,
        username=username,
        avatar=avatar,
        auth_provider="exbo",
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow()
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


async def get_steam_user_info(steam_id: str) -> Optional[dict]:
    """Получает информацию о пользователе Steam через Web API."""
    url = f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
    params = {
        "key": settings.steam_api_key,
        "steamids": steam_id
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            players = data.get("response", {}).get("players", [])
            
            if players and len(players) > 0:
                player = players[0]
                return {
                    "steam_id": player.get("steamid"),
                    "username": player.get("personaname", ""),
                    "avatar": player.get("avatarfull", "")
                }
        except Exception as e:
            print(f"Error fetching Steam user info: {e}")
    
    return None


async def exchange_exbo_code(code: str) -> Optional[dict]:
    """Обменивает код авторизации Exbo на токен доступа."""
    url = "https://exbo.net/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.exbo_redirect_uri,
        "client_id": settings.exbo_client_id,
        "client_secret": settings.exbo_client_secret
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, data=data, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error exchanging Exbo code: {e}")
    
    return None


async def get_exbo_user_info(access_token: str) -> Optional[dict]:
    """Получает информацию о пользователе Exbo через токен доступа."""
    url = "https://exbo.net/api/user"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return {
                "id": data.get("id"),
                "username": data.get("username", ""),
                "avatar": data.get("avatar", "")
            }
        except Exception as e:
            print(f"Error fetching Exbo user info: {e}")
    
    return None


def delete_session(session: Session, token: str) -> bool:
    """Удаляет сессию по токену."""
    db_session = session.execute(
        select(SessionModel).where(SessionModel.token == token)
    ).scalar_one_or_none()
    
    if db_session:
        session.delete(db_session)
        session.commit()
        return True
    return False
