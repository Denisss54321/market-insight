-- Миграция: добавление колонки missing_streak в таблицу lot_snapshots
-- Дата: 2026-07-31
-- Описание: Защита от ложного исчезновения лотов при неполных ответах API

ALTER TABLE lot_snapshots ADD COLUMN missing_streak INTEGER DEFAULT 0;
