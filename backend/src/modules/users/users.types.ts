import type { User } from '../../generated/prisma/client';

/**
 * `role` is a varchar in Postgres rather than an enum, so the allowed values
 * live here. Adding one needs no migration — only an edit to this list.
 *
 * The list order IS the privilege order (most to least), because `roleAtLeast`
 * compares indexes and `RolesGuard` uses it — so `@Roles('region_head')` also
 * admits an owner and a system admin.
 *
 * NOTE: the ranking below is provisional. It is the order the roles were
 * specified in, not a decided hierarchy — the tiers between `region_head` and
 * `transaction_coordinator` in particular still have to be settled. Treat a
 * `@Roles(...)` on one of those as "not final" until it is.
 */
export const USER_ROLES = [
  /** Platform-level operator: everything, across every organisation. */
  'system_admin',
  /** Owns the organisation — full control of its workspace. */
  'owner',
  /** Runs a region: its people, its listings, its pipeline. */
  'region_head',
  /** Qualifies inbound enquiries and hands them on. */
  'sales_development_rep',
  /** Shows listings and closes with the customer. */
  'property_advisor',
  /** Carries a deal through paperwork to completion. */
  'transaction_coordinator',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** The role a new account gets when none is named. */
export const DEFAULT_USER_ROLE: UserRole = 'property_advisor';

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Roles that see across every region. Everyone else is confined to the region
 * on their account — see `modules/regions/region-scope.ts`, which is where that
 * rule is enforced.
 */
export const GLOBAL_ROLES: readonly UserRole[] = ['system_admin', 'owner'];

export function isGlobalRole(role: UserRole): boolean {
  return GLOBAL_ROLES.includes(role);
}

/** True when `role` is at least as privileged as `minimum`. */
export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return USER_ROLES.indexOf(role) <= USER_ROLES.indexOf(minimum);
}

/**
 * Every column except `passwordHash`. Passed as the `select` on every user read
 * so the digest cannot reach a response by accident — a new sensitive column is
 * excluded by default, because it has to be added here to be returned.
 */
export const publicUserSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  email: true,
  fullName: true,
  orgId: true,
  regionId: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
} as const;

export type PublicUser = Omit<User, 'passwordHash'>;
