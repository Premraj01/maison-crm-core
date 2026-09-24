import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PaginatedResult, paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuditLogService } from '../audit-log/audit-log.service';
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
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogService,
    private readonly realtime: RealtimeService,
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
          select: { id: true, orgId: true, name: true },
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

  async create(dto: CreateLeadDto, actorId = 'system') {
    assertValueForStage(dto.stage ?? 'New', dto.value ?? null);

    const lead = await guardReferences(() =>
      this.prisma.lead.create({
        data: {
          ...dto,
          message: dto.message ?? '',
          stage: dto.stage ?? 'New',
          source: dto.source ?? 'Website',
        },
        select: leadSelect,
      }),
    );

    await this.auditLogs.record({
      actorId,
      orgId: lead.orgId ?? undefined,
      action: 'lead.created',
      entityType: 'lead',
      entityId: lead.id,
      after: { ...lead },
    });

    this.announce('lead.created', lead);
    return lead;
  }

  async findAll(query: QueryLeadDto): Promise<PaginatedResult<Lead>> {
    const where = {
      deletedAt: null,
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

  async findOne(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      select: leadSelect,
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, actorId = 'system') {
    const before = await this.findOne(id);

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
          // Any edit is contact of a sort; moving a card up the pipeline is the
          // clearest signal the CRM has that someone touched this lead.
          lastContactAt: new Date(),
        },
        select: leadSelect,
      }),
    );

    await this.auditLogs.record({
      actorId,
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
  async remove(id: string, actorId = 'system'): Promise<void> {
    const lead = await this.findOne(id);
    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    await this.auditLogs.record({
      actorId,
      orgId: lead.orgId ?? undefined,
      action: 'lead.deleted',
      entityType: 'lead',
      entityId: id,
      before: { ...lead },
    });

    this.announce('lead.deleted', { id, orgId: lead.orgId });
  }

  /**
   * Leads are internal, so unlike properties there is no public topic — only
   * the owning organisation's room, and a per-listing topic the CRM's property
   * view can subscribe to.
   */
  private announce<T extends { orgId?: string | null; propertyId?: string | null }>(
    event: string,
    payload: T,
  ): void {
    if (payload.orgId) this.realtime.emitToOrg(payload.orgId, event, payload);
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
