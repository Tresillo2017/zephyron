-- Better Auth tables + Invite Codes + User Profiles
-- This replaces the hand-rolled users table from 0001

-- Better Auth core: user table
-- We drop our old 'users' table and recreate with Better Auth's expected schema
DROP TABLE IF EXISTS users;

CREATE TABLE user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Admin plugin fields
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  banReason TEXT,
  banExpires TEXT,
  -- Zephyron custom fields
  reputation INTEGER DEFAULT 0,
  total_annotations INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  invite_code TEXT
);

CREATE INDEX user_email_idx ON user(email);

-- Better Auth core: session table
CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  -- Admin plugin fields
  impersonatedBy TEXT
);

CREATE INDEX session_userId_idx ON session(userId);
CREATE INDEX session_token_idx ON session(token);

-- Better Auth core: account table
CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX account_userId_idx ON account(userId);

-- Better Auth core: verification table
CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invite codes table
CREATE TABLE invite_codes (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX invite_codes_code_idx ON invite_codes(code);

-- Update foreign keys in existing tables to reference new 'user' table
-- (annotations, votes, playlists, listen_history reference user_id)
-- These columns already allow NULL for anonymous users so no data loss
