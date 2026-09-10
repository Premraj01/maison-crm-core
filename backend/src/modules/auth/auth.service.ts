import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { hashPassword, verifyPassword } from '../../common/crypto/password';
import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { type PublicUser, isUserRole, publicUserSelect } from '../users/users.types';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './auth.types';

/**
 * One message for every failure — a wrong password, an unknown address, a
 * deactivated account — so the response cannot be used to enumerate who has
 * an account here.
 */
const INVALID_CREDENTIALS = 'Incorrect email or password';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Verified against when no user matches, so a miss costs the same scrypt work
   * as a hit and the response time gives nothing away. Built once, lazily.
   */
  private decoyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly auditLogs: AuditLogService,
  ) {}

  async login(
    dto: LoginDto,
    context: { ip?: string; userAgent?: string } = {},
  ): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const record = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { ...publicUserSelect, passwordHash: true },
    });

    // Spend the same time on an unknown address as on a real one.
    const passwordMatches = record
      ? await verifyPassword(dto.password, record.passwordHash)
      : await verifyPassword(dto.password, await this.getDecoyHash());

    if (!record || !passwordMatches || !record.isActive || !isUserRole(record.role)) {
      await this.recordFailure(email, record?.id, context);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Drop the digest before the record travels any further.
    const { passwordHash: _hash, ...user } = record;

    // Best-effort: a failed timestamp write must not cost the user their sign-in.
    await this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() }, select: { id: true } })
      .catch((error: unknown) => {
        this.logger.warn(`Could not update lastLoginAt for ${user.id}: ${describe(error)}`);
      });

    await this.auditLogs.record({
      actorId: user.id,
      orgId: user.orgId ?? undefined,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return {
      accessToken: await this.signToken(user),
      expiresIn: this.config.get('jwt.expiresIn', { infer: true }),
      user,
    };
  }

  /** Fresh copy of the signed-in user — the guard has already proved the token. */
  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: publicUserSelect,
    });
    if (!user) throw new UnauthorizedException('Account is no longer active');
    return user;
  }

  private async signToken(user: PublicUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: isUserRole(user.role) ? [user.role] : [],
      ...(user.orgId ? { orgId: user.orgId } : {}),
    };
    return this.jwt.signAsync(payload);
  }

  private async recordFailure(
    email: string,
    userId: string | undefined,
    context: { ip?: string; userAgent?: string },
  ): Promise<void> {
    await this.auditLogs.record({
      actorId: userId ?? 'anonymous',
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: userId ?? email,
      metadata: { email },
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }

  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= hashPassword(`decoy:${Math.random()}`);
    return this.decoyHash;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
