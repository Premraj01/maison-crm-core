import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PaginatedResult, paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { type Viewer, regionWhere, writableRegion } from '../regions/region-scope';
import { RegionsService } from '../regions/regions.service';
import { isGlobalRole, isUserRole } from '../users/users.types';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { leadSelect, requiresValue } from './leads.types';
import type { Prisma } from '../../generated/prisma/client';

/** Postgres rejected a foreign key — an ownerId or propertyId with no row. */
const FK_VIOLATION = 'P2003';

/** A lead shaped by `leadSelect` — with its listing and assigned agent joined in. */
type Lead = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

/**
 * Leads arrive from two places, and the difference matters:
 *
 *  - an agent adding one in the CRM, authenticated, able to set any field;
 *  - a stranger filling in the website's viewing form, anonymous, able to set
 *    only their own details and which listing they were looking at.
 *
 * `captureEnquiry` is the second path. It is the only write in the codebase
 * reachable without a token, so it constrains everything itself: the stage is
 * always New, the source always Website, the organisation is inherited from
 * the listing rather than supplied, and the listing is resolved from a public
 * slug so no internal id has to be guessable.
 *
 * Each lead belongs to a region: its listing's, or for a general enquiry the
 * region of whoever added it. Everything else here is scoped to the caller's
 * region through `region-scope.ts`.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogService,
    private readonly realtime: RealtimeService,
    private readonly regions: RegionsService,
  ) {}

  /** The public website's viewing form. No token; see the class comment. */
  async captureEnquiry(dto: CreateEnquiryDto) {
    const { propertySlug, ...rest } = dto;

    // Resolved rather than trusted: an unknown or withdrawn slug produces a
    // general enquiry instead of an error, because losing a real buyer to a
    // stale link is worse than losing which listing they meant.
    const property = propertySlug
      ? await this.prisma.property.findFirst({
          where: { slug: propertySlug, deletedAt: null },
          select: { id: true, orgId: true, regionId: true, name: true },
        })
      : null;

    if (propertySlug && !property) {
      this.logger.warn(`Enquiry named unknown property slug "${propertySlug}"`);
    }

    const lead = await this.prisma.lead.create({
      data: {
        ...rest,
        message: rest.message ?? '',
        // Not from the request — a public caller does not get to choose these.
        stage: 'New',
        source: 'Website',
        propertyId: property?.id ?? null,
        orgId: property?.orgId ?? null,
        // Lands straight in the region that sells the listing. A general
        // enquiry has no region; the global roles pick it up and place it.
        regionId: property?.regionId ?? null,
        ownerId: null,
      },
      select: leadSelect,
    });

    await this.auditLogs.record({
      actorId: 'public',
      orgId: lead.orgId ?? undefined,
      action: 'lead.captured',
      entityType: 'lead',
      entityId: lead.id,
      after: { ...lead },
    });

    // Agents watching the pipeline see it arrive without reloading.
    this.announce('lead.created', lead);
    return lead;
  }

  async create(dto: CreateLeadDto, actor: AuthenticatedUser) {
    assertValueForStage(dto.stage ?? 'New', dto.value ?? null);

    const regionId = await this.resolveRegion(actor, dto.propertyId, dto.regionId);
    await this.assertOwnerFits(dto.ownerId, regionId);

    const lead = await guardReferences(() =>
      this.prisma.lead.create({
        data: {
          ...dto,
          regionId,
          message: dto.message ?? '',
          stage: dto.stage ?? 'New',
          source: dto.source ?? 'Website',
        },
        select: leadSelect,
      }),
    );

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: lead.orgId ?? undefined,
      action: 'lead.created',
      entityType: 'lead',
      entityId: lead.id,
      after: { ...lead },
    });

    this.announce('lead.created', lead);
    return lead;
  }

  async findAll(query: QueryLeadDto, viewer: Viewer): Promise<PaginatedResult<Lead>> {
    const where = {
      deletedAt: null,
      ...regionWhere(viewer),
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        select: leadSelect,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return paginated(items as Lead[], total, query);
  }

  async findOne(id: string, viewer: Viewer) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...regionWhere(viewer) },
      select: leadSelect,
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, actor: AuthenticatedUser) {
    const before = await this.findOne(id, actor);

    // Re-derived only when the listing or region is being changed, so moving
    // a pipeline card never re-checks placement.
    const regionId =
      dto.propertyId !== undefined || dto.regionId !== undefined
        ? await this.resolveRegion(
            actor,
            dto.propertyId === undefined ? before.propertyId : dto.propertyId,
            dto.regionId === undefined ? before.regionId : dto.regionId,
          )
        : before.regionId;
    if (dto.ownerId !== undefined || regionId !== before.regionId) {
      await this.assertOwnerFits(dto.ownerId === undefined ? before.ownerId : dto.ownerId, regionId);
    }

    // Checked against the state the lead will END in: a request may move the
    // stage, set the value, or both at once, and only the result matters.
    assertValueForStage(
      dto.stage ?? before.stage,
      dto.value === undefined ? before.value : dto.value,
    );

    const after = await guardReferences(() =>
      this.prisma.lead.update({
        where: { id },
        data: {
          ...dto,
          regionId,
          // Any edit is contact of a sort; moving a card up the pipeline is the
          // clearest signal the CRM has that someone touched this lead.
          lastContactAt: new Date(),
        },
        select: leadSelect,
      }),
    );

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: after.orgId ?? undefined,
      action: 'lead.updated',
      entityType: 'lead',
      entityId: id,
      before: { ...before },
      after: { ...after },
    });

    this.realtime.emitToEntity('lead', id, 'lead.updated', after);
    this.announce('lead.updated', after);
    return after;
  }

  /** Soft delete — the row is kept for auditing. */
  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const lead = await this.findOne(id, actor);
    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    await this.auditLogs.record({
      actorId: actor.id,
      orgId: lead.orgId ?? undefined,
      action: 'lead.deleted',
      entityType: 'lead',
      entityId: id,
      before: { ...lead },
    });

    this.announce('lead.deleted', { id, orgId: lead.orgId, regionId: lead.regionId });
  }

  /**
   * The region a lead belongs in. A listing decides it when there is one — and
   * must be a listing the actor can see, so nobody files a lead against another
   * region's property. Otherwise it is the actor's region, or for an owner the
   * region they named.
   */
  private async resolveRegion(
    actor: AuthenticatedUser,
    propertyId: string | null | undefined,
    requested: string | null | undefined,
  ): Promise<string | null> {
    if (propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: propertyId, deletedAt: null, ...regionWhere(actor) },
        select: { regionId: true },
      });
      if (!property) throw new BadRequestException('That agent or listing does not exist');
      return property.regionId;
    }
    const regionId = writableRegion(actor, requested);
    await this.regions.assertAssignable(regionId);
    return regionId;
  }

  /**
   * The assigned agent must be an active member of the lead's own region.
   * Owners and system admins belong to no region, so they cannot hold a lead,
   * and a lead with no region cannot be assigned until it is placed. One
   * message for every miss, so the check cannot be used to discover other
   * regions' staff.
   */
  private async assertOwnerFits(ownerId: string | null | undefined, regionId: string | null) {
    if (!ownerId) return;
    const owner = regionId
      ? await this.prisma.user.findFirst({
          where: { id: ownerId, regionId, deletedAt: null, isActive: true },
          select: { role: true },
        })
      : null;
    const fits = owner !== null && isUserRole(owner.role) && !isGlobalRole(owner.role);
    if (!fits) throw new BadRequestException("Only someone in this lead's region can take it");
  }

  /**
   * Leads are internal, so unlike properties there is no public topic — only
   * the global roles and the lead's own region hear about it, plus a
   * per-listing topic the CRM's property view can subscribe to.
   */
  private announce<
    T extends { orgId?: string | null; regionId?: string | null; propertyId?: string | null },
  >(event: string, payload: T): void {
    this.realtime.emitToRegionScope(event, payload);
    if (payload.propertyId) {
      this.realtime.emitToEntity('property', payload.propertyId, event, payload);
    }
  }
}

/**
 * A lead at Proposal or beyond must carry the value negotiated with the
 * customer. Zero counts as absent — no deal is worth nothing.
 */
function assertValueForStage(stage: string, value: number | null): void {
  if (requiresValue(stage) && !value) {
    throw new BadRequestException(
      `A lead at "${stage}" needs the value negotiated with the customer.`,
    );
  }
}

/**
 * Turns a foreign-key rejection into a 400 rather than a 500. It means the
 * request named an agent or a listing that does not exist — the caller's
 * mistake, not the server's.
 */
async function guardReferences<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === FK_VIOLATION
    ) {
      throw new BadRequestException('That agent or listing does not exist');
    }
    throw error;
  }
}
