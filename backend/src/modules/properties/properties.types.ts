import type { Property } from '../../generated/prisma/client';

/**
 * `kind` and `listing` are varchars in Postgres rather than enums, so the
 * allowed values live here — adding one needs an edit to this list, not a type
 * migration. Kept in step with `PropertyKind` / `ListingType` in the CRM
 * frontend's `data/crm.ts` and the website's `lib/properties.ts`.
 */
export const PROPERTY_KINDS = ['Apartment', 'House', 'Villa', 'Plot', 'Land', 'Commercial'] as const;

export const LISTING_TYPES = ['Rent', 'Sale'] as const;

/** Badge the public website prints on a card. */
export const PROPERTY_TAGS = ['Signature', 'New'] as const;

/**
 * Where a listing stands. "Sold" and "Rented" are the archived states — the
 * listing stays visible in both apps, shown blurred, rather than vanishing.
 * A listing taken off the market entirely is a soft delete instead.
 */
export const PROPERTY_STATUSES = ['Available', 'Sold', 'Rented'] as const;

export type PropertyKind = (typeof PROPERTY_KINDS)[number];
export type ListingType = (typeof LISTING_TYPES)[number];
export type PropertyTag = (typeof PROPERTY_TAGS)[number];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

/** Sold and rented listings are archived: kept, shown, but no longer on offer. */
export function isArchived(status: string): boolean {
  return status === 'Sold' || status === 'Rented';
}

/** Kinds that have rooms; the rest are bare land, where bedrooms make no sense. */
const RESIDENTIAL: readonly PropertyKind[] = ['Apartment', 'House', 'Villa'];

export function hasRooms(kind: PropertyKind): boolean {
  return RESIDENTIAL.includes(kind);
}

/**
 * Columns returned by every read. `deletedAt` is deliberately absent: listings
 * are served to the public website, which has no business seeing the soft-delete
 * bookkeeping, and a new internal column is excluded by default.
 */
export const publicPropertySelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  slug: true,
  name: true,
  address: true,
  kind: true,
  listing: true,
  status: true,
  price: true,
  bedrooms: true,
  bathrooms: true,
  area: true,
  tag: true,
  portrait: true,
  featured: true,
  details: true,
  features: true,
  images: true,
  orgId: true,
} as const;

export type PublicProperty = Omit<Property, 'deletedAt'>;

/**
 * Builds the URL slug the public site addresses a listing by. Uniqueness is
 * enforced by the database, not here — see the retry in `PropertiesService`.
 */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      // Strip accents so "Villa Aster" and "Villa Áster" don't produce slugs
      // that differ only by bytes a URL cannot carry.
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180) || 'listing'
  );
}
