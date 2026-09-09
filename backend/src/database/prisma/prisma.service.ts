import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import type { AppConfig } from '../../config/configuration';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

/**
 * PostgreSQL — the system of record for structured, relational data
 * (organisations, users, leads, customers, deals, permissions).
 *
 * Prisma 7 connects through a driver adapter rather than a URL in the schema,
 * so the connection string comes from `ConfigService` here and from
 * `prisma.config.ts` for the migration CLI.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<AppConfig, true>) {
    const postgres = config.get('postgres', { infer: true });

    super({
      adapter: new PrismaPg({
        connectionString: postgres.url,
        ssl: postgres.ssl ? { rejectUnauthorized: false } : undefined,
      }),
      log: postgres.logging
        ? ([{ emit: 'event', level: 'query' }, 'info', 'warn', 'error'] as const)
        : (['warn', 'error'] as const),
    });

    if (postgres.logging) {
      // `$on('query')` only exists once the query event is registered above.
      (this as unknown as { $on: (e: 'query', cb: (event: Prisma.QueryEvent) => void) => void }).$on(
        'query',
        (event) => this.logger.debug(`${event.query} — ${event.duration}ms`),
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
