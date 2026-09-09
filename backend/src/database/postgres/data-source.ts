import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

loadEnv();

/**
 * Standalone DataSource used by the TypeORM CLI (migration:generate / run /
 * revert). The running app builds its options from `ConfigService` instead —
 * see `postgres.module.ts` — so keep the two in sync.
 */
export const postgresDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number.parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'maison',
  password: process.env.POSTGRES_PASSWORD ?? 'maison',
  database: process.env.POSTGRES_DB ?? 'maison_crm',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  // Keep in sync with postgres.module.ts — see the note there.
  uuidExtension: 'pgcrypto',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

export default new DataSource(postgresDataSourceOptions);
