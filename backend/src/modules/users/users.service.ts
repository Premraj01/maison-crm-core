import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PaginatedResult, PaginationQueryDto, paginated } from '../../common/dto/pagination.dto';
import { hashPassword } from '../../common/crypto/password';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { type Viewer, isRegional, regionWhere, writableRegion } from '../regions/region-scope';
import { RegionsService } from '../regions/regions.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { type PublicUser, type UserRole, isGlobalRole, publicUserSelect } from './users.types';

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
 *
 * Every method also takes the caller, and scopes by region: a region head sees
 * and manages their own region's people only, and cannot hand out a global role.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogService,
    private readonly realtime: RealtimeService,
    private readonly regions: RegionsService,
  ) {}

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<PublicUser> {
    const { password, ...rest } = dto;
    const regionId = await this.placement(actor, rest.role, rest.regionId);

    let user: PublicUser;
    try {
      user = await this.prisma.user.create({
        data: {
          ...rest,
          email: rest.email.trim().toLowerCase(),
          orgId: rest.orgId ?? null,
          regionId,
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
      actorId: actor.id,
      orgId: user.orgId ?? undefined,
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      after: { ...user },
    });

    this.realtime.emitToRegionScope('user.created', user);

    return user;
  }

  async findAll(query: PaginationQueryDto, viewer: Viewer): Promise<PaginatedResult<PublicUser>> {
    const where = { deletedAt: null, ...regionWhere(viewer) };
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

  async findOne(id: string, viewer: Viewer): Promise<PublicUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, ...regionWhere(viewer) },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<PublicUser> {
    const before = await this.findOne(id, actor);

    // Only re-derive the region when something that decides it is changing, so
    // renaming someone never moves them.
    const placementChanges = dto.role !== undefined || dto.regionId !== undefined;
    const regionId = placementChanges
      ? await this.placement(
          actor,
          dto.role ?? (before.role as UserRole),
          dto.regionId === undefined ? before.regionId : dto.regionId,
        )
      : before.regionId;

    let after: PublicUser;
    try {
      after = await this.prisma.user.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
          regionId,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A user with email ${dto.email} already exists`);
      }
      throw error;
    }

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: after.orgId ?? undefined,
      action: 'user.updated',
      entityType: 'user',
      entityId: id,
      before: { ...before },
      after: { ...after },
    });

    this.realtime.emitToEntity('user', id, 'user.updated', after);
    this.realtime.emitToRegionScope('user.updated', after);

    return after;
  }

  /** Soft delete — `deletedAt` is set, the row is kept for auditing. */
  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const user = await this.findOne(id, actor);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: user.orgId ?? undefined,
      action: 'user.deleted',
      entityType: 'user',
      entityId: id,
      before: { ...user },
    });

    this.realtime.emitToRegionScope('user.deleted', {
      id,
      orgId: user.orgId,
      regionId: user.regionId,
    });
  }

  /**
   * The region an account with `role` should be in. The global roles are in
   * none. A regional actor may only place people in their own region, and may
   * not grant a global role — which would lift the person out of every region
   * boundary, the actor's own included.
   */
  private async placement(
    actor: AuthenticatedUser,
    role: UserRole | undefined,
    requested: string | null | undefined,
  ): Promise<string | null> {
    if (role && isGlobalRole(role)) {
      if (isRegional(actor)) {
        throw new ForbiddenException('Only an owner or system admin can grant that role');
      }
      return null;
    }
    const regionId = writableRegion(actor, requested);
    await this.regions.assertAssignable(regionId);
    return regionId;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}
