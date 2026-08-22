-- Добавить колонку user_id в таблицу deals
ALTER TABLE deals ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX ix_deals_user_id ON deals(user_id);
