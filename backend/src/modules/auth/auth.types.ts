import type { Request } from 'express';

import type { UserRole } from '../users/users.types';

/**
 * Claims carried by the access token. `sub`, `orgId` and `roles` are named to
 * match what `WsAuthGuard` already reads, so one token authenticates both the
 * REST API and the socket handshake.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  orgId?: string;
  roles: UserRole[];
}

/** Identity resolved from the token and re-read from Postgres on every request. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  orgId: string | null;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
