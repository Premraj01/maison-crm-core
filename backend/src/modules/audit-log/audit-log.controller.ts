import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogs: AuditLogService) {}

  @Get()
  find(@Query() query: QueryAuditLogDto) {
    return this.auditLogs.find(query);
  }

  @Get(':entityType/:entityId')
  timeline(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.auditLogs.timeline(entityType, entityId);
  }
}
