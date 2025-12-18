CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  entity_name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_name_created
  ON entities(entity_name, created_date);