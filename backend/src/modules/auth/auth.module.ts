import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import type { AppConfig } from '../../config/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * `JwtAuthGuard` and `RolesGuard` are registered globally, so a newly added
 * route is authenticated by default and has to opt out with `@Public()`.
 * Order matters: `RolesGuard` reads the user the JWT guard attaches.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('jwt.secret', { infer: true }),
        signOptions: { expiresIn: config.get('jwt.expiresIn', { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
