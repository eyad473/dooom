CREATE TABLE IF NOT EXISTS users (
  chat_id INTEGER PRIMARY KEY,
  level TEXT DEFAULT 'A2',
  mode TEXT DEFAULT 'idle',        -- idle / writing / speaking / roleplay
  pending_prompt TEXT,             -- نص التمرين الحالي (كتابة/تحدث) أو مفتاح السيناريو (roleplay)
  last_active TEXT,                -- آخر يوم تفاعل فيه (لحساب السلسلة)
  streak INTEGER DEFAULT 0,        -- عدد الأيام المتتالية
  created_at TEXT DEFAULT (datetime('now'))
);

-- كلمات مع نظام التكرار المتباعد (SM2)
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  meaning_ar TEXT NOT NULL,
  example_en TEXT,
  ease REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  due_at TEXT DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_words_due ON words(chat_id, due_at);
CREATE INDEX IF NOT EXISTS idx_history_chat ON chat_history(chat_id, created_at);

-- مكتبة فيديوهات يوتيوب مصنّفة حسب مستوى CEFR (A1-C2)
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,       -- A1, A2, B1, B2, C1, C2
  category TEXT NOT NULL,    -- channel / series / cartoon / clips / conversation
  title_ar TEXT NOT NULL,
  note_ar TEXT,
  search_query TEXT NOT NULL -- عبارة بحث يوتيوب (رابط بحث دائم بدل رابط فيديو قابل للحذف)
);

-- سجل الفيديوهات اللي انبعثت للمستخدم (لتجنب التكرار بالاقتراح اليومي)
CREATE TABLE IF NOT EXISTS content_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  content_id INTEGER NOT NULL,
  shown_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_level ON content(level, category);
CREATE INDEX IF NOT EXISTS idx_content_log ON content_log(chat_id, content_id);

-- سجل تمارين الكتابة
CREATE TABLE IF NOT EXISTS writing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  submission TEXT NOT NULL,
  feedback TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- سجل تمارين التحدث (نص مفرّغ من الصوت + ملاحظات)
CREATE TABLE IF NOT EXISTS speaking_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  transcript TEXT,
  feedback TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_writing_chat ON writing_log(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_speaking_chat ON speaking_log(chat_id, created_at);

-- محفوظات المحادثة التمثيلية (Roleplay) - منفصلة عن الشات العام
CREATE TABLE IF NOT EXISTS roleplay_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  scenario TEXT NOT NULL,
  role TEXT NOT NULL, -- user / assistant
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_roleplay_chat ON roleplay_history(chat_id, scenario, created_at);

