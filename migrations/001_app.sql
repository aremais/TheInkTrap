-- Scaffold marker. Bookstore tables (Books, Sales, Sale items, Staff)
-- are the next task; add them as 002_ and onward.
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_meta (key, value)
VALUES ('app', 'the-ink-trap')
ON CONFLICT(key) DO NOTHING;
