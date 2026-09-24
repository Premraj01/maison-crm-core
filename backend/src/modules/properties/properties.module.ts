import { Module } from '@nestjs/common';

import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  // PrismaModule, RealtimeModule and AuditLogModule are global, so nothing
  // needs registering here — see UsersModule.
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
