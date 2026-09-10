import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import type { AppConfig } from '../../../config/configuration';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { isUserRole } from '../../users/users.types';
import type { AuthenticatedRequest, JwtPayload } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Registered globally in `AuthModule`, so every route is authenticated unless
 * it is marked `@Public()`.
 *
 * The user is re-read from Postgres on each request rather than trusted from
 * the token: a deactivated, deleted or re-roled account loses access at once
 * instead of when the token expires.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let claims: JwtPayload;
    try {
      claims = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('jwt.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: claims.sub, deletedAt: null, isActive: true },
      select: { id: true, email: true, fullName: true, role: true, orgId: true },
    });
    if (!user) throw new UnauthorizedException('Account is no longer active');
    if (!isUserRole(user.role)) throw new UnauthorizedException('Account has an unknown role');

    request.user = { ...user, role: user.role };
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header?.toLowerCase().startsWith('bearer ')) return undefined;
  return header.slice(7).trim() || undefined;
}
