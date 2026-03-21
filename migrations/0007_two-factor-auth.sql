-- Better Auth 2FA plugin schema + trusted devices
-- Adds two-factor authentication support

-- Add twoFactorEnabled flag to user table
ALTER TABLE user ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0;

-- Two-factor secrets and backup codes table
CREATE TABLE twoFactor (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backupCodes TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX twoFactor_userId_idx ON twoFactor(userId);
