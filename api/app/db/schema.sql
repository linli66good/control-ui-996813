CREATE TABLE IF NOT EXISTS learn_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_date TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_domain TEXT,
  score INTEGER DEFAULT 0,
  summary TEXT,
  content TEXT NOT NULL,
  market_feedback TEXT,
  final_view TEXT,
  is_top3 INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learn_cards_date ON learn_cards(card_date);
CREATE INDEX IF NOT EXISTS idx_learn_cards_top3 ON learn_cards(card_date, is_top3);

CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_date TEXT NOT NULL,
  news_type TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT,
  source_url TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_items_date_type ON news_items(news_date, news_type);

CREATE TABLE IF NOT EXISTS monitor_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country TEXT NOT NULL,
  asin TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monitor_targets_unique
ON monitor_targets(country, asin);

CREATE TABLE IF NOT EXISTS monitor_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_id INTEGER NOT NULL,
  price_text TEXT,
  title TEXT,
  main_image_url TEXT,
  a_plus_text TEXT,
  changed_fields TEXT,
  raw_payload TEXT,
  captured_at TEXT NOT NULL,
  FOREIGN KEY(target_id) REFERENCES monitor_targets(id)
);

CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_target_time
ON monitor_snapshots(target_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS analysis_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country TEXT NOT NULL,
  asin TEXT NOT NULL,
  input_payload TEXT,
  report_markdown TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_reports_country_asin
ON analysis_reports(country, asin, created_at DESC);
