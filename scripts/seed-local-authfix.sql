-- LOCAL ONLY. Brings the local D1 schema in line with what Better Auth 1.7 expects
-- (the dev server otherwise fails with "Database schema mismatch").
-- Does NOT touch migrations/. Applied by scripts/seed-local.sh when the column is missing.
--
-- 1) better-auth device-authorization plugin looks for a `deviceCode` table
--    (see node_modules/better-auth/dist/plugins/device-authorization/schema.mjs).
--    The repo's migrations/0024 creates `device_code` with different columns.
CREATE TABLE IF NOT EXISTS deviceCode (
    id TEXT PRIMARY KEY NOT NULL,
    deviceCode TEXT NOT NULL,
    userCode TEXT NOT NULL,
    userId TEXT,
    expiresAt TEXT NOT NULL,
    status TEXT NOT NULL,
    lastPolledAt TEXT,
    pollingInterval INTEGER,
    clientId TEXT,
    scope TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS deviceCode_deviceCode_uidx ON deviceCode(deviceCode);
CREATE UNIQUE INDEX IF NOT EXISTS deviceCode_userCode_uidx ON deviceCode(userCode);

-- 2) better-auth twoFactor plugin expects user.twoFactorEnabled.
--    NOT idempotent: seed-local.sh only runs this when the column is absent.
ALTER TABLE user ADD COLUMN twoFactorEnabled INTEGER NOT NULL DEFAULT 0;
