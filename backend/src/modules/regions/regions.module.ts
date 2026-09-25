import { Global, Module } from '@nestjs/common';

import { RegionsController } from './regions.controller';
import { RegionsService } from './regions.service';

/**
 * Global so users, properties and leads can inject `RegionsService` to check a
 * `regionId` they are asked to assign, without each importing this module.
 */
@Global()
@Module({
  controllers: [RegionsController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
