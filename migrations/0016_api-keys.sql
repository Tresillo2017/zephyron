-- API Key table for Better Auth @better-auth/api-key plugin
-- Enables API key authentication for external tools (browser extension, CLI)

DROP TABLE IF EXISTS apikey;

CREATE TABLE apikey (
  id TEXT PRIMARY KEY NOT NULL,
  configId TEXT NOT NULL DEFAULT 'default',
  name TEXT,
  start TEXT,
  prefix TEXT,
  key TEXT NOT NULL,
  referenceId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  refillInterval INTEGER,
  refillAmount INTEGER,
  lastRefillAt TEXT,
  enabled INTEGER DEFAULT 1,
  rateLimitEnabled INTEGER DEFAULT 1,
  rateLimitTimeWindow INTEGER,
  rateLimitMax INTEGER,
  requestCount INTEGER DEFAULT 0,
  remaining INTEGER,
  lastRequest TEXT,
  expiresAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  permissions TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_apikey_configId ON apikey(configId);
CREATE INDEX IF NOT EXISTS idx_apikey_referenceId ON apikey(referenceId);
CREATE INDEX IF NOT EXISTS idx_apikey_key ON apikey(key);
