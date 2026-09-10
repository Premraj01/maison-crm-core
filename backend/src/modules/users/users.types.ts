import type { User } from '../../generated/prisma/client';

/**
 * `role` is a varchar in Postgres rather than an enum, so the allowed values
 * live here. Adding one needs no migration — only an edit to this list.
 *
 * Ordered most to least privileged; `RolesGuard` uses that order so
 * `@Roles('admin')` also admits an owner.
 */
export const USER_ROLES = ['owner', 'admin', 'agent', 'viewer'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
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
  role: true,
  isActive: true,
  lastLoginAt: true,
} as const;

export type PublicUser = Omit<User, 'passwordHash'>;
