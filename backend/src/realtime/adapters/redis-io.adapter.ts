import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

import type { AppConfig } from '../../config/configuration';

/**
 * Fans events out across every backend instance via Redis pub/sub, so
 * `RealtimeService.emitToUser()` reaches that user even when their socket is
 * held by a different pod. Only used when `REDIS_URL` is set — a single
 * instance runs fine on the default in-memory adapter.
 */
export class RedisIoAdapter extends IoAdapter {
  private static readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  /**
   * Returns true when the Redis adapter was wired up, false when no
   * `REDIS_URL` is configured and the caller should keep the default adapter.
   */
  async connect(): Promise<boolean> {
    const config = this.app.get(ConfigService<AppConfig, true>);
    const url = config.get('realtime.redisUrl', { infer: true });
    if (!url) return false;

    const pubClient = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);

    RedisIoAdapter.logger.log('Socket.IO Redis adapter connected');
    return true;
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
