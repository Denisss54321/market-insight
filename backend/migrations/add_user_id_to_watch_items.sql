-- Добавление колонки user_id в таблицу watch_items
-- Миграция для поддержки авторизации

-- Добавляем колонку user_id
ALTER TABLE watch_items ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Создаем индекс для user_id
CREATE INDEX IF NOT EXISTS ix_watch_items_user_id ON watch_items(user_id);

-- Обновляем уникальное ограничение (удаляем старое, создаем новое)
-- Сначала удаляем старое ограничение
ALTER TABLE watch_items DROP CONSTRAINT IF EXISTS uq_watch;

-- Создаем новое ограничение с user_id вместо user_key
ALTER TABLE watch_items ADD CONSTRAINT uq_watch UNIQUE (user_id, item_id, quality, upgrade_level);
