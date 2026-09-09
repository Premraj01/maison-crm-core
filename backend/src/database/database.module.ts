import { Module } from '@nestjs/common';

import { MongoModule } from './mongo/mongo.module';
import { PostgresModule } from './postgres/postgres.module';

/** Single import that wires both datastores into the application. */
@Module({
  imports: [PostgresModule, MongoModule],
  exports: [PostgresModule, MongoModule],
})
export class DatabaseModule {}
