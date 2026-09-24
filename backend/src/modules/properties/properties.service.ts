import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PaginatedResult, paginated } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { type PublicProperty, publicPropertySelect, slugify } from './properties.types';

/** Postgres error for a unique-constraint violation, surfaced by Prisma. */
const UNIQUE_VIOLATION = 'P2002';

/** How many times a derived slug is suffixed before giving up. */
const SLUG_ATTEMPTS = 20;

/**
 * Properties are the one table read by both applications: the CRM writes them,
 * and the public beacon-estates website reads them through the `@Public()`
 * routes on the controller. That makes the soft-delete filter load-bearing —
 * a listing taken down in the CRM must stop appearing on the website, so every
 * read below is scoped with `deletedAt: null`.
 */
@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreatePropertyDto, actorId = 'system'): Promise<PublicProperty> {
    const { slug: requested, ...rest } = dto;
    const base = requested?.trim() ? slugify(requested) : slugify(dto.name);

    // Two agents can publish "Villa Aster" on the same afternoon, so the slug
    // is retried against the unique index rather than checked up front — a
    // check would still race through the gap between the read and the insert.
    let property: PublicProperty | null = null;
    for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      try {
        property = await this.prisma.property.create({
          data: { ...rest, slug, orgId: rest.orgId ?? null },
          select: publicPropertySelect,
        });
        break;
      } catch (error) {
        // Only a slug collision is retryable; anything else is the caller's.
        if (!isUniqueViolation(error)) throw error;
        if (requested) {
          throw new ConflictException(`A property with slug "${base}" already exists`);
        }
      }
    }

    if (!property) {
      throw new ConflictException(
        `Could not derive a free slug from "${dto.name}" — pass an explicit slug`,
      );
    }

    await this.auditLogs.record({
      actorId,
      orgId: property.orgId ?? undefined,
      action: 'property.created',
      entityType: 'property',
      entityId: property.id,
      after: { ...property },
    });

    this.announce('property.created', property);
    return property;
  }

  async findAll(query: QueryPropertyDto): Promise<PaginatedResult<PublicProperty>> {
    const where = {
      deletedAt: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.listing ? { listing: query.listing } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.archived === undefined
        ? {}
        : query.archived
          ? { status: { in: ['Sold', 'Rented'] } }
          : { status: 'Available' }),
      ...(query.featured === undefined ? {} : { featured: query.featured }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { address: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        select: publicPropertySelect,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.property.count({ where }),
    ]);
    return paginated(items, total, query);
  }

  /**
   * Accepts either a UUID or a slug, so the website can resolve
   * `/properties/casa-solana` without first looking the id up.
   */
  async findOne(idOrSlug: string): Promise<PublicProperty> {
    const property = await this.prisma.property.findFirst({
      where: {
        deletedAt: null,
        ...(isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }),
      },
      select: publicPropertySelect,
    });
    if (!property) throw new NotFoundException(`Property ${idOrSlug} not found`);
    return property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    actorId = 'system',
  ): Promise<PublicProperty> {
    const before = await this.findOne(id);

    let after: PublicProperty;
    try {
      after = await this.prisma.property.update({
        where: { id: before.id },
        data: dto.slug ? { ...dto, slug: slugify(dto.slug) } : dto,
        select: publicPropertySelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A property with slug "${dto.slug}" already exists`);
      }
      throw error;
    }

    await this.auditLogs.record({
      actorId,
      orgId: after.orgId ?? undefined,
      action: 'property.updated',
      entityType: 'property',
      entityId: after.id,
      before: { ...before },
      after: { ...after },
    });

    this.realtime.emitToEntity('property', after.id, 'property.updated', after);
    this.announce('property.updated', after);
    return after;
  }

  /** Soft delete — the row is kept for auditing, and drops off both apps. */
  async remove(id: string, actorId = 'system'): Promise<void> {
    const property = await this.findOne(id);
    await this.prisma.property.update({
      where: { id: property.id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    await this.auditLogs.record({
      actorId,
      orgId: property.orgId ?? undefined,
      action: 'property.deleted',
      entityType: 'property',
      entityId: property.id,
      before: { ...property },
    });

    this.announce('property.deleted', {
      id: property.id,
      slug: property.slug,
      orgId: property.orgId,
    });
  }

  /**
   * Listings are public, so changes go to a topic every client may subscribe
   * to — including the website, which has no organisation of its own — as well
   * as to the owning org's room for the CRM.
   */
  private announce<T extends { orgId?: string | null }>(event: string, payload: T): void {
    this.realtime.emitToTopic('properties', event, payload);
    if (payload.orgId) this.realtime.emitToOrg(payload.orgId, event, payload);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
