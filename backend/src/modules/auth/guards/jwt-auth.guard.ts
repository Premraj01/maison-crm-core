import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import type { AppConfig } from '../../../config/configuration';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { isUserRole } from '../../users/users.types';
import type { AuthenticatedRequest, AuthenticatedUser, JwtPayload } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Registered globally in `AuthModule`, so every route is authenticated unless
 * it is marked `@Public()`.
 *
 * The user is re-read from Postgres on each request rather than trusted from
 * the token: a deactivated, deleted or re-roled account loses access at once
 * instead of when the token expires. The same goes for `regionId` — moving
 * someone to another region changes what they can see on their next request.
 *
 * On a `@Public()` route a bearer token is optional but still honoured: when a
 * valid one is sent the user is attached, so a public read can narrow itself
 * for a signed-in caller (the CRM's region-scoped property list) while the
 * anonymous website gets the same response as before. A bad token there is
 * ignored rather than rejected — the route is public either way.
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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (isPublic) {
      if (token) request.user = await this.resolve(token).catch(() => undefined);
      return true;
    }

    if (!token) throw new UnauthorizedException('Missing bearer token');
    request.user = await this.resolve(token);
    return true;
  }

  private async resolve(token: string): Promise<AuthenticatedUser> {
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
      select: { id: true, email: true, fullName: true, role: true, orgId: true, regionId: true },
    });
    if (!user) throw new UnauthorizedException('Account is no longer active');
    if (!isUserRole(user.role)) throw new UnauthorizedException('Account has an unknown role');

    return { ...user, role: user.role };
  }
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header?.toLowerCase().startsWith('bearer ')) return undefined;
  return header.slice(7).trim() || undefined;
}
