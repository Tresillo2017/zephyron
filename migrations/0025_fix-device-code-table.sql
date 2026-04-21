-- migrations/0025_fix-device-code-table.sql
-- Rename device_code table to deviceCode (camelCase) as expected by Better Auth.
-- Also align column names to camelCase to match Better Auth's schema.

DROP TABLE IF EXISTS device_code;

CREATE TABLE IF NOT EXISTS deviceCode (
    id TEXT NOT NULL PRIMARY KEY,
    deviceCode TEXT NOT NULL UNIQUE,
    userCode TEXT NOT NULL UNIQUE,
    clientId TEXT,
    userId TEXT,
    expiresAt INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lastPolledAt INTEGER,
    pollingInterval INTEGER,
    scope TEXT,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
);
