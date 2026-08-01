-- شغّل هاد الملف فقط لو سبق ونفّذت schema.sql قبل إضافة ميزات Streak / Roleplay
-- (لو هادا أول نشر، تجاهل هاد الملف كليًا - schema.sql فيه كل شي بالفعل)

ALTER TABLE users ADD COLUMN last_active TEXT;
ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS roleplay_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  scenario TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_roleplay_chat ON roleplay_history(chat_id, scenario, created_at);
