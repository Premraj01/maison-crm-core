import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { leadSelect } from '../leads/leads.types';
import { publicPropertySelect } from '../properties/properties.types';
import { publicUserSelect } from '../users/users.types';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import {
  OPEN_LEAD_STAGES,
  type PublicRegion,
  REGION_TEAM_ROLES,
  type RegionSummary,
  regionSelect,
} from './regions.types';

/**
 * Managing regions is for the global roles only — the controller enforces
 * that with `@Roles('owner')`. The one read open to everyone is `mine`, which
 * returns the caller's own region and nothing about any other.
 *
 * What a regional user may see *inside* the other modules is decided by
 * `region-scope.ts`, not here.
 */
@Injectable()
export class RegionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateRegionDto, actor: AuthenticatedUser): Promise<PublicRegion> {
    await this.assertNameFree(dto.name);

    const region = await this.prisma.region.create({
      data: { ...dto, description: dto.description ?? '', orgId: actor.orgId },
      select: regionSelect,
    });

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: region.orgId ?? undefined,
      action: 'region.created',
      entityType: 'region',
      entityId: region.id,
      after: { ...region },
    });
    this.announce('region.created', region);
    return region;
  }

  /** Every region with its headline numbers — the overview page. */
  async findAll(): Promise<RegionSummary[]> {
    const regions = await this.prisma.region.findMany({
      where: { deletedAt: null },
      select: regionSelect,
      orderBy: { name: 'asc' },
    });
    if (regions.length === 0) return [];

    const ids = regions.map((region) => region.id);
    // Four grouped counts rather than a count per region, so the page costs the
    // same whether there are three regions or thirty.
    const [members, heads, properties, leads, openLeads, won] = await this.prisma.$transaction([
      this.prisma.user.groupBy({
        by: ['regionId', 'role'],
        where: { regionId: { in: ids }, deletedAt: null, isActive: true },
        orderBy: { regionId: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { regionId: { in: ids }, role: 'region_head', deletedAt: null, isActive: true },
        select: { id: true, fullName: true, email: true, regionId: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.property.groupBy({
        by: ['regionId'],
        where: { regionId: { in: ids }, deletedAt: null },
        orderBy: { regionId: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['regionId'],
        where: { regionId: { in: ids }, deletedAt: null },
        orderBy: { regionId: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['regionId'],
        where: { regionId: { in: ids }, deletedAt: null, stage: { in: [...OPEN_LEAD_STAGES] } },
        orderBy: { regionId: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['regionId'],
        where: { regionId: { in: ids }, deletedAt: null, stage: 'Won' },
        orderBy: { regionId: 'asc' },
        _sum: { value: true },
      }),
    ]);

    const countFor = (rows: { regionId: string | null; _count?: unknown }[], id: string) => {
      const row = rows.find((r) => r.regionId === id) as { _count?: { _all?: number } } | undefined;
      return row?._count?._all ?? 0;
    };

    return regions.map((region) => {
      const team = Object.fromEntries(
        REGION_TEAM_ROLES.map((role) => {
          const row = members.find((m) => m.regionId === region.id && m.role === role) as
            | { _count?: { _all?: number } }
            | undefined;
          return [role, row?._count?._all ?? 0];
        }),
      ) as RegionSummary['team'];

      const wonRow = won.find((r) => r.regionId === region.id) as
        | { _sum?: { value?: number | null } }
        | undefined;

      return {
        ...region,
        heads: heads
          .filter((head) => head.regionId === region.id)
          .map(({ regionId: _region, ...head }) => head),
        team,
        properties: countFor(properties, region.id),
        leads: countFor(leads, region.id),
        openLeads: countFor(openLeads, region.id),
        wonValue: wonRow?._sum?.value ?? 0,
      };
    });
  }

  /**
   * One region in full: its people, its listings and the leads on them. The
   * portfolio is small enough to return whole, as the CRM's other lists do.
   */
  async findOne(id: string) {
    const region = await this.requireRegion(id);
    const [members, properties, leads] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { regionId: id, deletedAt: null },
        select: publicUserSelect,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.property.findMany({
        where: { regionId: id, deletedAt: null },
        select: publicPropertySelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.findMany({
        where: { regionId: id, deletedAt: null },
        select: leadSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { ...region, members, properties, leads };
  }

  /** The caller's own region, or null. Safe for any role — it names no other. */
  async mine(regionId: string | null): Promise<PublicRegion | null> {
    if (!regionId) return null;
    return this.prisma.region.findFirst({
      where: { id: regionId, deletedAt: null },
      select: regionSelect,
    });
  }

  async update(id: string, dto: UpdateRegionDto, actor: AuthenticatedUser): Promise<PublicRegion> {
    const before = await this.requireRegion(id);
    if (dto.name && dto.name.toLowerCase() !== before.name.toLowerCase()) {
      await this.assertNameFree(dto.name);
    }

    const after = await this.prisma.region.update({
      where: { id },
      data: dto,
      select: regionSelect,
    });

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: after.orgId ?? undefined,
      action: 'region.updated',
      entityType: 'region',
      entityId: id,
      before: { ...before },
      after: { ...after },
    });
    this.announce('region.updated', after);
    return after;
  }

  /**
   * Soft delete. The foreign keys' `SET NULL` only fires on a real delete, so
   * the region's people, listings and leads are released here, in the same
   * transaction — otherwise they would stay bound to a region nobody can open.
   * Released records become visible to the global roles only until re-placed.
   */
  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const region = await this.requireRegion(id);
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { regionId: id }, data: { regionId: null } }),
      this.prisma.property.updateMany({ where: { regionId: id }, data: { regionId: null } }),
      this.prisma.lead.updateMany({ where: { regionId: id }, data: { regionId: null } }),
      this.prisma.region.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true },
      }),
    ]);

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: region.orgId ?? undefined,
      action: 'region.deleted',
      entityType: 'region',
      entityId: id,
      before: { ...region },
    });
    this.announce('region.deleted', { id, orgId: region.orgId });
  }

  /**
   * For the other modules: rejects a `regionId` that names no live region. The
   * foreign key already stops a made-up id, but not one soft-deleted above.
   */
  async assertAssignable(regionId: string | null | undefined): Promise<void> {
    if (!regionId) return;
    const found = await this.prisma.region.findFirst({
      where: { id: regionId, deletedAt: null },
      select: { id: true },
    });
    if (!found) throw new BadRequestException('That region does not exist');
  }

  private async requireRegion(id: string): Promise<PublicRegion> {
    const region = await this.prisma.region.findFirst({
      where: { id, deletedAt: null },
      select: regionSelect,
    });
    if (!region) throw new NotFoundException(`Region ${id} not found`);
    return region;
  }

  /**
   * Names are unique among live regions, case-insensitively. Checked rather
   * than indexed because a unique index would also count soft-deleted rows.
   */
  private async assertNameFree(name: string): Promise<void> {
    const clash = await this.prisma.region.findFirst({
      where: { deletedAt: null, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`A region named "${name}" already exists`);
  }

  /** Region records are for the global roles, so they go to the admins' room only. */
  private announce<T extends { orgId?: string | null }>(event: string, payload: T): void {
    if (payload.orgId) this.realtime.emitToOrgAdmins(payload.orgId, event, payload);
  }
}
