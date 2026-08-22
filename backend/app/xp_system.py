"""Система опыта и уровней трейдера с защитой от обмана"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, func
from app.db import session_scope
from app.models import User, Deal
import logging

logger = logging.getLogger(__name__)

# Константы системы XP
XP_PER_DEAL_PURCHASE = 10
XP_PER_DEAL_SALE_PROFIT = 20
XP_PER_DEAL_SALE_LOSS = 5
XP_PER_WATCHLIST_ADD = 2
XP_PER_ITEM_ANALYSIS = 1

# Бонус XP за размер прибыли (1 XP за каждые 1000 рублей прибыли)
XP_PROFIT_BONUS_MULTIPLIER = 0.001

# Лимиты защиты от обмана
MAX_DEALS_PER_DAY = 500
MAX_DEALS_PER_HOUR = 100
MIN_TIME_BETWEEN_DEALS = 0  # секунд
MIN_DEAL_PRICE = 1.0  # минимальная цена сделки
MAX_DEAL_PRICE = 10000000.0  # максимальная цена сделки (10 млн)

# Формула расчета уровня: геометрическая прогрессия x2 для разницы между уровнями
# Уровень 1: 0 XP
# Уровень 2: 100 XP (разница 100)
# Уровень 3: 300 XP (разница 200)
# Уровень 4: 700 XP (разница 400)
# Уровень 5: 1500 XP (разница 800)
# Уровень 6: 3100 XP (разница 1600)
# Уровень 7: 6300 XP (разница 3200)
# Уровень 8: 12700 XP (разница 6400)
# Уровень 9: 25500 XP (разница 12800)
# Уровень 10: 51100 XP (разница 25600)
XP_PER_LEVEL_BASE = 100
MAX_LEVEL = 10

def calculate_level(xp: int) -> int:
    """Рассчитывает уровень на основе XP"""
    if xp < 0:
        return 1
    if xp == 0:
        return 1
    
    # Проверяем каждый уровень по порядку
    for level in range(1, MAX_LEVEL + 1):
        if xp < xp_for_level(level + 1):
            return level
    
    return MAX_LEVEL

def xp_for_level(level: int) -> int:
    """Возвращает необходимое XP для достижения уровня"""
    if level <= 1:
        return 0
    if level > MAX_LEVEL:
        level = MAX_LEVEL
    
    # Сумма геометрической прогрессии: 100 + 200 + 400 + ... до уровня-1
    total = 0
    for i in range(level - 1):
        total += XP_PER_LEVEL_BASE * (2 ** i)
    
    return total

def xp_progress_to_next_level(xp: int, current_level: int) -> tuple[int, int]:
    """Возвращает текущий XP и XP необходимое для следующего уровня"""
    current_level_xp = xp_for_level(current_level)
    next_level_xp = xp_for_level(current_level + 1)
    progress = xp - current_level_xp
    needed = next_level_xp - current_level_xp
    return progress, needed

def add_xp_to_user(user_id: int, xp_amount: int, reason: str, session) -> bool:
    """
    Добавляет XP пользователю с защитой от обмана
    
    Args:
        user_id: ID пользователя
        xp_amount: Количество XP для добавления
        reason: Причина начисления (для логирования)
        session: Сессия базы данных
        
    Returns:
        True если XP успешно добавлено, False если отклонено защитой
    """
    if xp_amount <= 0:
        logger.warning(f"Попытка добавить некорректное количество XP: {xp_amount}")
        return False
    
    if xp_amount > 100:  # Защита от слишком больших начислений
        logger.warning(f"Слишком большое начисление XP: {xp_amount} для пользователя {user_id}")
        return False
    
    user = session.get(User, user_id)
    if not user:
        logger.error(f"Пользователь {user_id} не найден")
        return False
    
    old_xp = user.xp
    old_level = user.level
    
    user.xp += xp_amount
    new_level = calculate_level(user.xp)
    user.level = new_level
    
    logger.info(f"Пользователь {user_id}: XP {old_xp} -> {user.xp} (+{xp_amount}), Уровень {old_level} -> {new_level}, Причина: {reason}")
    
    return True

def check_deal_limits(user_id: int, session) -> tuple[bool, str]:
    """
    Проверяет лимиты сделок для защиты от обмана
    
    Args:
        user_id: ID пользователя
        session: Сессия базы данных
        
    Returns:
        (can_make_deal, reason) - можно ли сделать сделку и причина если нет
    """
    now = datetime.utcnow()
    
    # Проверка сделок за последний час
    hour_ago = now - timedelta(hours=1)
    deals_last_hour = session.execute(
        select(func.count(Deal.id)).where(
            Deal.user_id == user_id,
            Deal.bought_at >= hour_ago
        )
    ).scalar()
    
    if deals_last_hour >= MAX_DEALS_PER_HOUR:
        return False, f"Превышен лимит сделок в час ({MAX_DEALS_PER_HOUR})"
    
    # Проверка сделок за последний день
    day_ago = now - timedelta(days=1)
    deals_last_day = session.execute(
        select(func.count(Deal.id)).where(
            Deal.user_id == user_id,
            Deal.bought_at >= day_ago
        )
    ).scalar()
    
    if deals_last_day >= MAX_DEALS_PER_DAY:
        return False, f"Превышен лимит сделок в день ({MAX_DEALS_PER_DAY})"
    
    # Проверка времени между последними сделками
    last_deal = session.execute(
        select(Deal).where(
            Deal.user_id == user_id
        ).order_by(Deal.bought_at.desc()).limit(1)
    ).scalar_one_or_none()
    
    if last_deal and last_deal.bought_at:
        time_since_last = (now - last_deal.bought_at).total_seconds()
        if time_since_last < MIN_TIME_BETWEEN_DEALS:
            return False, f"Слишком частые сделки (подождите {int(MIN_TIME_BETWEEN_DEALS - time_since_last)} сек)"
    
    return True, ""

def validate_deal_price(price: float) -> tuple[bool, str]:
    """
    Валидирует цену сделки для защиты от обмана
    
    Args:
        price: Цена сделки
        
    Returns:
        (is_valid, reason) - валидна ли цена и причина если нет
    """
    if price < MIN_DEAL_PRICE:
        return False, f"Слишком низкая цена (минимум {MIN_DEAL_PRICE})"
    
    if price > MAX_DEAL_PRICE:
        return False, f"Слишком высокая цена (максимум {MAX_DEAL_PRICE})"
    
    return True, ""

def award_xp_for_deal(user_id: int, deal: Deal, session) -> int:
    """
    Начисляет XP за сделку с защитой от обмана
    
    Args:
        user_id: ID пользователя
        deal: Объект сделки
        session: Сессия базы данных
        
    Returns:
        Количество начисленного XP
    """
    # Проверка лимитов
    can_make_deal, limit_reason = check_deal_limits(user_id, session)
    if not can_make_deal:
        logger.warning(f"Сделка отклонена по лимитам: {limit_reason}")
        return 0
    
    # Валидация цены
    price_valid, price_reason = validate_deal_price(deal.buy_price)
    if not price_valid:
        logger.warning(f"Сделка отклонена по валидации цены: {price_reason}")
        return 0
    
    # Расчет XP
    xp_amount = 0
    
    if deal.state == "bought":
        # За покупку
        xp_amount = XP_PER_DEAL_PURCHASE
        reason = f"Покупка предмета {deal.item_id}"
        
    elif deal.state == "sold":
        # За продажу
        if deal.sell_price:
            profit = deal.sell_price - deal.buy_price - (deal.buy_price * deal.fee_percent / 100)
            if profit > 0:
                # Прибыльная сделка
                xp_amount = XP_PER_DEAL_SALE_PROFIT
                # Бонус за размер прибыли
                profit_bonus = int(profit * XP_PROFIT_BONUS_MULTIPLIER)
                xp_amount += min(profit_bonus, 50)  # Максимум 50 бонусных XP
                reason = f"Прибыльная продажа {deal.item_id} (прибыль: {profit})"
            else:
                # Убыточная сделка
                xp_amount = XP_PER_DEAL_SALE_LOSS
                reason = f"Убыточная продажа {deal.item_id}"
        else:
            # Убыточная сделка (без цены продажи)
            xp_amount = XP_PER_DEAL_SALE_LOSS
            reason = f"Убыточная продажа {deal.item_id}"
    
    elif deal.state == "listed":
        # За выставление на продажу
        xp_amount = XP_PER_DEAL_PURCHASE // 2
        reason = f"Выставление на продажу {deal.item_id}"
    
    # Начисление XP
    if xp_amount > 0:
        success = add_xp_to_user(user_id, xp_amount, reason, session)
        if success:
            # Обновляем статистику пользователя
            user = session.get(User, user_id)
            if user:
                # Увеличиваем счетчик сделок только при покупке (создании сделки)
                if deal.state == "bought":
                    user.deals_count += 1
                # Вычисляем прибыль только для проданных сделок
                if deal.state == "sold" and deal.sell_price:
                    profit = deal.sell_price - deal.buy_price - (deal.buy_price * deal.fee_percent / 100)
                    user.total_profit += profit
            return xp_amount
    
    return 0

def get_user_xp_info(user_id: int) -> dict:
    """
    Возвращает информацию о XP и уровне пользователя
    
    Args:
        user_id: ID пользователя
        
    Returns:
        Словарь с информацией о XP и уровне
    """
    with session_scope() as session:
        user = session.get(User, user_id)
        if not user:
            return {
                "xp": 0,
                "level": 1,
                "progress": 0,
                "needed": 100,
                "deals_count": 0,
                "total_profit": 0.0
            }
        
        progress, needed = xp_progress_to_next_level(user.xp, user.level)
        
        return {
            "xp": user.xp,
            "level": user.level,
            "progress": progress,
            "needed": needed,
            "deals_count": user.deals_count,
            "total_profit": user.total_profit
        }
