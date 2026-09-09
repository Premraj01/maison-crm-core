import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { RealtimeService } from '../../realtime/realtime.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly postgres: TypeOrmHealthIndicator,
    private readonly mongo: MongooseHealthIndicator,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.postgres.pingCheck('postgres', { timeout: 3000 }),
      () => this.mongo.pingCheck('mongo', { timeout: 3000 }),
      async () => ({ realtime: { status: this.realtime.isReady ? 'up' : 'down' } }),
    ]);
  }
}
