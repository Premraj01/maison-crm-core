import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { AuthenticatedRequest, AuthenticatedUser } from '../auth.types';

/**
 * Injects the signed-in user, or one of its fields:
 *
 * ```ts
 * findMine(@CurrentUser('id') userId: string) {}
 * ```
 *
 * Only usable on routes the `JwtAuthGuard` covers — on a `@Public()` route the
 * request carries no user and this resolves to `undefined`.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) return undefined;
    return field ? request.user[field] : request.user;
  },
);
