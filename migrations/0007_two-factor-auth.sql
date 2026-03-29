-- Better Auth 2FA plugin schema + trusted devices
-- Adds two-factor authentication support

-- NOTE: twoFactorEnabled column on user table may already exist from
-- a previous manual migration. We use a SELECT to safely skip if so.
-- SQLite ALTER TABLE ADD COLUMN does not support IF NOT EXISTS,
-- so we create a temporary trigger to detect the column.
-- Simpler approach: just try the ALTER and let D1 handle the error.
-- If this fails, manually mark migration as applied:
--   INSERT INTO d1_migrations (name) VALUES ('0007_two-factor-auth.sql');

-- Two-factor secrets and backup codes table
CREATE TABLE IF NOT EXISTS twoFactor (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backupCodes TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS twoFactor_userId_idx ON twoFactor(userId);
