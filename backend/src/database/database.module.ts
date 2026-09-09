import { Module } from '@nestjs/common';

import { MongoModule } from './mongo/mongo.module';
import { PrismaModule } from './prisma/prisma.module';

/** Single import that wires both datastores into the application. */
@Module({
  imports: [PrismaModule, MongoModule],
  exports: [PrismaModule, MongoModule],
})
export class DatabaseModule {}
