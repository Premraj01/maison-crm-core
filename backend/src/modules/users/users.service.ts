import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginatedResult, PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

/**
 * Reference implementation showing all three systems working together:
 * PostgreSQL for the record, Mongo for the audit trail, and the socket push —
 * copy this shape for leads, customers and deals.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly auditLogs: AuditLogService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateUserDto, actorId = 'system'): Promise<User> {
    if (await this.repo.findOne({ where: { email: dto.email } })) {
      throw new ConflictException(`A user with email ${dto.email} already exists`);
    }

    const user = await this.repo.save(this.repo.create({ ...dto, orgId: dto.orgId ?? null }));

    await this.auditLogs.record({
      actorId,
      orgId: user.orgId ?? undefined,
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      after: { ...user },
    });

    if (user.orgId) this.realtime.emitToOrg(user.orgId, 'user.created', user);

    return user;
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<User>> {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });
    return paginated(items, total, query);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId = 'system'): Promise<User> {
    const before = await this.findOne(id);
    const after = await this.repo.save(this.repo.merge({ ...before } as User, dto));

    await this.auditLogs.record({
      actorId,
      orgId: after.orgId ?? undefined,
      action: 'user.updated',
      entityType: 'user',
      entityId: id,
      before: { ...before },
      after: { ...after },
    });

    this.realtime.emitToEntity('user', id, 'user.updated', after);
    if (after.orgId) this.realtime.emitToOrg(after.orgId, 'user.updated', after);

    return after;
  }

  /** Soft delete — `deletedAt` is set, the row is kept for auditing. */
  async remove(id: string, actorId = 'system'): Promise<void> {
    const user = await this.findOne(id);
    await this.repo.softRemove(user);

    await this.auditLogs.record({
      actorId,
      orgId: user.orgId ?? undefined,
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
      before: { ...user },
    });

    if (user.orgId) this.realtime.emitToOrg(user.orgId, 'user.deleted', { id });
  }
}
