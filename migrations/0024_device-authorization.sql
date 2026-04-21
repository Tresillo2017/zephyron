-- migrations/0024_device-authorization.sql
-- Device Authorization Grant — stores pending device auth requests

CREATE TABLE IF NOT EXISTS device_code (
    id TEXT NOT NULL PRIMARY KEY,
    client_id TEXT NOT NULL,
    device_code TEXT NOT NULL UNIQUE,
    user_code TEXT NOT NULL UNIQUE,
    verification_uri TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    interval INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending',
    user_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS device_code_device_code_idx ON device_code(device_code);
CREATE INDEX IF NOT EXISTS device_code_user_code_idx ON device_code(user_code);
