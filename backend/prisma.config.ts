import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 moved the migration connection URL out of `schema.prisma`. This file
 * configures the CLI (migrate / db / studio); the running app connects through
 * the driver adapter in `src/database/prisma/prisma.service.ts` instead.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Also what `prisma migrate reset` runs to repopulate the fresh database.
    seed: 'ts-node -r tsconfig-paths/register prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
