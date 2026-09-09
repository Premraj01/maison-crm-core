import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';

import { PaginatedResult, paginated } from '../../common/dto/pagination.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  /**
   * Records an event. Auditing must never break the operation being audited, so
   * failures are logged rather than thrown — call `recordOrThrow` when the write
   * is legally required to succeed.
   */
  async record(dto: CreateAuditLogDto): Promise<AuditLogDocument | null> {
    try {
      return await this.model.create(dto);
    } catch (error) {
      this.logger.error(
        `Failed to write audit log ${dto.action} on ${dto.entityType}:${dto.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  async recordOrThrow(dto: CreateAuditLogDto): Promise<AuditLogDocument> {
    return this.model.create(dto);
  }

  async find(query: QueryAuditLogDto): Promise<PaginatedResult<AuditLogDocument>> {
    const filter: QueryFilter<AuditLog> = {};
    if (query.actorId) filter.actorId = query.actorId;
    if (query.orgId) filter.orgId = query.orgId;
    if (query.action) filter.action = query.action;
    if (query.entityType) filter.entityType = query.entityType;
    if (query.entityId) filter.entityId = query.entityId;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean<AuditLogDocument[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return paginated(items, total, query);
  }

  /** Full history for one record, newest first. */
  async timeline(entityType: string, entityId: string, limit = 50): Promise<AuditLogDocument[]> {
    return this.model
      .find({ entityType, entityId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<AuditLogDocument[]>()
      .exec();
  }
}
