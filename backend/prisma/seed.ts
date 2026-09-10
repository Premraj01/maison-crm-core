import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { hashPassword } from '../src/common/crypto/password';
import { PrismaClient } from '../src/generated/prisma/client';
import { USER_ROLES, type UserRole } from '../src/modules/users/users.types';

/**
 * Development seed — one signed-in-able account per role, so every branch of
 * the permission matrix can be exercised by actually signing in.
 *
 * Idempotent: re-running updates the existing rows rather than failing on the
 * unique email, and rewrites the password so a forgotten seed login is always
 * recoverable with `npm run db:seed`.
 */

/** Shared across the seeded accounts; overridable for a shared dev database. */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Maison!2026';

/** A single fixed org, so the seeded users share realtime rooms and org-scoped queries. */
const SEED_ORG_ID = process.env.SEED_ORG_ID ?? '00000000-0000-4000-8000-000000000001';

interface SeedUser {
  email: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
}

const SEED_USERS: SeedUser[] = [
  { email: 'owner@maison.co', fullName: 'Maya Chen', role: 'owner' },
  { email: 'admin@maison.co', fullName: 'Jon Bell', role: 'admin' },
  { email: 'agent@maison.co', fullName: 'Sam Rivera', role: 'agent' },
  { email: 'viewer@maison.co', fullName: 'Ana Moreau', role: 'viewer' },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set — copy .env.example to .env');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    assertEveryRoleCovered();

    for (const seed of SEED_USERS) {
      const email = seed.email.toLowerCase();
      const passwordHash = await hashPassword(SEED_PASSWORD);
      const fields = {
        fullName: seed.fullName,
        role: seed.role,
        orgId: SEED_ORG_ID,
        isActive: seed.isActive ?? true,
        passwordHash,
        // Undo a soft delete, so a seeded account can always be brought back.
        deletedAt: null,
      };

      const user = await prisma.user.upsert({
        where: { email },
        create: { email, ...fields },
        update: fields,
        select: { id: true, email: true, role: true },
      });

      console.log(`  ${user.role.padEnd(6)}  ${user.email.padEnd(20)}  ${user.id}`);
    }

    console.log(`\nSeeded ${SEED_USERS.length} users in org ${SEED_ORG_ID}.`);
    console.log(`Password for all of them: ${SEED_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

/** Guards the promise in the file header: adding a role must add an account. */
function assertEveryRoleCovered(): void {
  const seeded = new Set(SEED_USERS.map((user) => user.role));
  const missing = USER_ROLES.filter((role) => !seeded.has(role));
  if (missing.length > 0) {
    throw new Error(`No seed user for role(s): ${missing.join(', ')} — add one to SEED_USERS.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
