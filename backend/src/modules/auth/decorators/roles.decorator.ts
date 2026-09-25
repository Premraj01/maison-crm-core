import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '../../users/users.types';

export const ROLES_KEY = 'auth:roles';

/**
 * Restricts a route to the listed roles, or anything more privileged — see
 * `roleAtLeast` in `users.types.ts`. `@Roles('region_head')` therefore admits
 * owners and system admins.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
