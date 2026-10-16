ALTER TABLE outbox ADD COLUMN next_attempt REAL NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS due_outbox ON outbox(status,next_attempt);
