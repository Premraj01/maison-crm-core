import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

import type { AppConfig } from '../../config/configuration';
import type { RealtimePrincipal } from '../realtime.types';

/**
 * Authenticates the *handshake* and caches the principal on `socket.data`, so
 * per-message checks are free. Applied to the gateway as a whole; the gateway
 * also calls `authenticate()` directly from `handleConnection` to reject bad
 * credentials before any message is processed.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const socket = context.switchToWs().getClient<Socket>();
    return Boolean(socket.data?.principal);
  }

  /**
   * Resolves the principal for a freshly connected socket, or `null` when the
   * credentials are missing/invalid and anonymous access is disabled.
   */
  async authenticate(socket: Socket): Promise<RealtimePrincipal | null> {
    const allowAnonymous = this.config.get('realtime.allowAnonymous', { infer: true });
    const token = this.extractToken(socket);

    if (!token) {
      return allowAnonymous ? this.anonymousPrincipal(socket) : null;
    }

    try {
      const claims = await this.jwt.verifyAsync<{
        sub?: string;
        userId?: string;
        orgId?: string;
        roles?: string[];
      }>(token, { secret: this.config.get('jwt.secret', { infer: true }) });

      const userId = claims.sub ?? claims.userId;
      if (!userId) throw new Error('token carries no subject');

      return { userId, orgId: claims.orgId, roles: claims.roles ?? [], anonymous: false };
    } catch (error) {
      this.logger.warn(
        `Rejected socket ${socket.id}: ${error instanceof Error ? error.message : 'invalid token'}`,
      );
      return allowAnonymous ? this.anonymousPrincipal(socket) : null;
    }
  }

  private anonymousPrincipal(socket: Socket): RealtimePrincipal {
    return { userId: `anon:${socket.id}`, roles: [], anonymous: true };
  }

  /** Accepts `auth.token`, `Authorization: Bearer …`, or a `token` query param. */
  private extractToken(socket: Socket): string | undefined {
    const fromAuth = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (fromAuth) return fromAuth.replace(/^Bearer\s+/i, '');

    const header = socket.handshake.headers.authorization;
    if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7);

    const fromQuery = socket.handshake.query.token;
    return typeof fromQuery === 'string' ? fromQuery : undefined;
  }
}
