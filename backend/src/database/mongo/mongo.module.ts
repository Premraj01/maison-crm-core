import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import type { AppConfig } from '../../config/configuration';

/**
 * MongoDB — schema-flexible stores: audit logs, notifications, activity feeds,
 * webhook payloads and anything else that does not belong in a relational table.
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('mongo.uri', { infer: true }),
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class MongoModule {}
