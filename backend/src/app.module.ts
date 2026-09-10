import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UsersModule } from './modules/users/users.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    // Global — every module can inject RealtimeService and AuditLogService.
    RealtimeModule,
    AuditLogModule,
    // Registers JwtAuthGuard and RolesGuard globally: every route below is
    // authenticated unless it opts out with @Public().
    AuthModule,
    NotificationsModule,
    UsersModule,
    HealthModule,
  ],
})
export class AppModule {}
