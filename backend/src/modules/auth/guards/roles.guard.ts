import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type UserRole, roleAtLeast } from '../../users/users.types';
import type { AuthenticatedRequest } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Runs after `JwtAuthGuard` and enforces `@Roles(...)`. A route with no
 * `@Roles` is open to any signed-in user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) throw new ForbiddenException('This action requires an authenticated user');

    if (!required.some((minimum) => roleAtLeast(user.role, minimum))) {
      throw new ForbiddenException(`This action requires the ${required.join(' or ')} role`);
    }
    return true;
  }
}
