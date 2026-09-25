-- Replaces the old role set (owner, admin, agent, viewer) with the six roles in
-- `USER_ROLES` (src/modules/users/users.types.ts). `users.role` is a varchar, so
-- the values themselves are remapped here rather than a type being altered.
--
-- The mapping keeps every existing account signed-in-able:
--   owner  -> owner                  (unchanged)
--   admin  -> region_head            (the management tier)
--   agent  -> property_advisor       (shows listings, closes)
--   viewer -> transaction_coordinator (the least privileged role)
UPDATE "users" SET "role" = 'region_head' WHERE "role" = 'admin';
UPDATE "users" SET "role" = 'property_advisor' WHERE "role" = 'agent';
UPDATE "users" SET "role" = 'transaction_coordinator' WHERE "role" = 'viewer';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'property_advisor';
