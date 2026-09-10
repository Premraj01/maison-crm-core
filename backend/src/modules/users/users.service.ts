import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PaginatedResult, PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';
import { hashPassword } from '../../common/crypto/password';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { type PublicUser, publicUserSelect } from './users.types';

/** Postgres error for a unique-constraint violation, surfaced by Prisma. */
const UNIQUE_VIOLATION = 'P2002';

/**
 * Reference implementation showing all three systems working together:
 * PostgreSQL for the record, Mongo for the audit trail, and the socket push —
 * copy this shape for leads, customers and deals.
 *
 * Deletes are soft, and Prisma applies no implicit filter for that, so every
 * read below is scoped with `deletedAt: null`. Every query also passes
 * `publicUserSelect`, which leaves `passwordHash` behind — so no response, audit
 * entry or socket payload can carry the digest.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateUserDto, actorId = 'system'): Promise<PublicUser> {
    const { password, ...rest } = dto;

    let user: PublicUser;
    try {
      user = await this.prisma.user.create({
        data: {
          ...rest,
          email: rest.email.trim().toLowerCase(),
          orgId: rest.orgId ?? null,
          passwordHash: await hashPassword(password),
        },
        select: publicUserSelect,
      });
    } catch (error) {
      // Let the database decide: checking first would still race two parallel
      // creates through the gap between the read and the insert.
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A user with email ${dto.email} already exists`);
      }
      throw error;
    }

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

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<PublicUser>> {
    const where = { deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(items, total, query);
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId = 'system'): Promise<PublicUser> {
    const before = await this.findOne(id);

    let after: PublicUser;
    try {
      after = await this.prisma.user.update({
        where: { id },
        data: dto.email ? { ...dto, email: dto.email.trim().toLowerCase() } : dto,
        select: publicUserSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A user with email ${dto.email} already exists`);
      }
      throw error;
    }

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
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}
