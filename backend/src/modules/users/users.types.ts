/**
 * `role` is a varchar in Postgres rather than an enum, so the allowed values
 * live here. Adding one needs no migration — only an edit to this list.
 */
export const USER_ROLES = ['owner', 'admin', 'agent', 'viewer'] as const;

export type UserRole = (typeof USER_ROLES)[number];
