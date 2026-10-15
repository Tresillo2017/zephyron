-- Better Auth 1.7 two-factor lockout + enrollment state.
-- Existing rows are already-enrolled factors, so `verified` defaults to 1.
ALTER TABLE twoFactor ADD COLUMN verified INTEGER DEFAULT 1;
ALTER TABLE twoFactor ADD COLUMN failedVerificationCount INTEGER DEFAULT 0;
ALTER TABLE twoFactor ADD COLUMN lockedUntil TEXT;
