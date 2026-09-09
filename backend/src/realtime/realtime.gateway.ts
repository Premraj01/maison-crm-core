import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';

import { SubscribeDto } from './dto/subscribe.dto';
import { WsExceptionFilter } from './filters/ws-exception.filter';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { Rooms, WS_INBOUND, WS_OUTBOUND } from './realtime.constants';
import { RealtimeAccessPolicy } from './realtime.policy';
import { RealtimeService } from './realtime.service';
import type { AuthenticatedSocket } from './realtime.types';

/**
 * Transport layer. Feature modules should not talk to this class — they inject
 * `RealtimeService` instead. The gateway only handles connect, authenticate,
 * room subscription and disconnect.
 *
 * The namespace/path are read from the environment because gateway decorators
 * are evaluated before the DI container (and therefore `ConfigService`) exists.
 */
@UseFilters(WsExceptionFilter)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({
  namespace: process.env.WS_NAMESPACE ?? '/realtime',
  path: process.env.WS_PATH ?? '/socket.io',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly authGuard: WsAuthGuard,
    private readonly policy: RealtimeAccessPolicy,
  ) {}

  afterInit(server: Server): void {
    // Hand the server to the service so the rest of the app can emit through it.
    this.realtime.bind(server);
    this.logger.log(
      `Realtime gateway ready on namespace ${process.env.WS_NAMESPACE ?? '/realtime'}`,
    );
  }

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const principal = await this.authGuard.authenticate(socket);

    if (!principal) {
      socket.emit(WS_OUTBOUND.ERROR, { message: 'Unauthorized' });
      socket.disconnect(true);
      return;
    }

    socket.data.principal = principal;

    // Auto-join the rooms the client is always entitled to, so callers can emit
    // to a user or org without the client subscribing first.
    if (!principal.anonymous) {
      await socket.join(Rooms.user(principal.userId));
      if (principal.orgId) await socket.join(Rooms.org(principal.orgId));
    }

    socket.emit(WS_OUTBOUND.CONNECTED, {
      socketId: socket.id,
      userId: principal.userId,
      orgId: principal.orgId,
      anonymous: principal.anonymous,
    });

    this.logger.debug(`Connected ${socket.id} (user ${principal.userId})`);
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    this.logger.debug(`Disconnected ${socket.id}`);
  }

  @SubscribeMessage(WS_INBOUND.SUBSCRIBE)
  async onSubscribe(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: SubscribeDto,
  ): Promise<void> {
    if (!this.policy.canJoin(socket.data.principal, body.room)) {
      throw new WsException(`Not allowed to subscribe to ${body.room}`);
    }

    await socket.join(body.room);
    socket.emit(WS_OUTBOUND.SUBSCRIBED, { room: body.room });
  }

  @SubscribeMessage(WS_INBOUND.UNSUBSCRIBE)
  async onUnsubscribe(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: SubscribeDto,
  ): Promise<void> {
    await socket.leave(body.room);
    socket.emit(WS_OUTBOUND.UNSUBSCRIBED, { room: body.room });
  }

  /** Application-level heartbeat, useful for measuring round-trip latency. */
  @SubscribeMessage(WS_INBOUND.PING)
  onPing(@ConnectedSocket() socket: AuthenticatedSocket): void {
    socket.emit(WS_OUTBOUND.PONG, { at: new Date().toISOString() });
  }
}
