import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';

import { PrismaService } from '../../database/prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { RealtimeService } from '../../realtime/realtime.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly postgres: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly mongo: MongooseHealthIndicator,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.postgres.pingCheck('postgres', this.prisma).withTimeout(3000),
      () => this.mongo.pingCheck('mongo', { timeout: 3000 }),
      async () => ({ realtime: { status: this.realtime.isReady ? 'up' : 'down' } }),
    ]);
  }
}
