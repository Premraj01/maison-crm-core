import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { AppConfig } from '../../config/configuration';

/**
 * PostgreSQL — the system of record for structured, relational data
 * (organisations, users, leads, customers, deals, permissions).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const postgres = config.get('postgres', { infer: true });
        return {
          type: 'postgres' as const,
          host: postgres.host,
          port: postgres.port,
          username: postgres.username,
          password: postgres.password,
          database: postgres.database,
          // Entities are picked up from whichever feature modules call
          // `TypeOrmModule.forFeature([...])`, so new modules need no wiring here.
          autoLoadEntities: true,
          synchronize: postgres.synchronize,
          logging: postgres.logging,
          ssl: postgres.ssl ? { rejectUnauthorized: false } : false,
          // Emits gen_random_uuid() for uuid PKs — built into Postgres 13+, so a
          // fresh database needs no superuser-installed extension.
          uuidExtension: 'pgcrypto' as const,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: false,
          retryAttempts: 5,
          retryDelay: 3000,
        };
      },
    }),
  ],
})
export class PostgresModule {}
