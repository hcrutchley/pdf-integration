CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  entity_name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_entities_name_created
  ON entities(entity_name, created_date);

CREATE INDEX IF NOT EXISTS idx_entities_user 
  ON entities(user_id);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
