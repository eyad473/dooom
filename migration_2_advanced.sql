-- شغّل هاد فقط لو سبق ونشرت البوت قبل إضافة (تحليل الأخطاء / المنهج الأسبوعي / البحث الدلالي)

CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_error_chat ON error_log(chat_id, category);

CREATE TABLE IF NOT EXISTS weekly_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_weekly_chat ON weekly_plan(chat_id, week_start);
