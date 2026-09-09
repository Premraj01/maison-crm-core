import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { AppConfig } from '../config/configuration';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeAccessPolicy } from './realtime.policy';
import { RealtimeService } from './realtime.service';

/**
 * Plug-and-play realtime.
 *
 * Imported once in `AppModule`; because it is `@Global()`, any provider in the
 * app can inject `RealtimeService` without importing anything:
 *
 * ```ts
 * constructor(private readonly realtime: RealtimeService) {}
 * this.realtime.emitToOrg(orgId, 'lead.created', lead);
 * ```
 *
 * To reuse it in another service, copy this folder and import the module —
 * it has no dependency on any feature module.
 */
@Global()
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
  providers: [RealtimeGateway, RealtimeService, RealtimeAccessPolicy, WsAuthGuard],
  exports: [RealtimeService],
})
export class RealtimeModule {}
