-- Adds sign-in credentials to `users`.
--
-- `passwordHash` is NOT NULL, so it is added nullable, backfilled, and only
-- then tightened — otherwise this migration could not run against a database
-- that already holds users.
--
-- The backfill value is deliberately not a valid digest. `verifyPassword`
-- (src/common/crypto/password.ts) parses the `scrypt$N$r$p$salt$key` format and
-- returns false for anything else, so a pre-existing account cannot be signed
-- into until an administrator sets a real password. It fails closed.

ALTER TABLE "users"
  ADD COLUMN "lastLoginAt" TIMESTAMPTZ(6),
  ADD COLUMN "passwordHash" VARCHAR(255);

UPDATE "users" SET "passwordHash" = 'no-password-set' WHERE "passwordHash" IS NULL;

ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL;
