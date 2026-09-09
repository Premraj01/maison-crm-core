import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import { Rooms } from './realtime.constants';
import type { EmitOptions, RealtimeEvent } from './realtime.types';

/**
 * The only class a feature module needs to touch.
 *
 * `RealtimeModule` is global, so injecting this anywhere is enough to push data
 * to connected clients — no extra imports, no direct socket handling:
 *
 * ```ts
 * constructor(private readonly realtime: RealtimeService) {}
 *
 * await this.realtime.emitToUser(userId, 'notification.created', notification);
 * await this.realtime.emitToEntity('lead', leadId, 'lead.updated', lead);
 * ```
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server?: Server;

  /** Called by the gateway once Socket.IO is up. */
  bind(server: Server): void {
    this.server = server;
  }

  get isReady(): boolean {
    return Boolean(this.server);
  }

  /** Emit to every socket belonging to one user (all tabs and devices). */
  emitToUser<T>(userId: string, event: string, payload: T, options?: EmitOptions): void {
    this.emitToRoom(Rooms.user(userId), event, payload, options);
  }

  /** Emit to everyone in an organisation. */
  emitToOrg<T>(orgId: string, event: string, payload: T, options?: EmitOptions): void {
    this.emitToRoom(Rooms.org(orgId), event, payload, options);
  }

  /** Emit to everyone currently watching one record, e.g. a lead detail page. */
  emitToEntity<T>(
    type: string,
    id: string,
    event: string,
    payload: T,
    options?: EmitOptions,
  ): void {
    this.emitToRoom(Rooms.entity(type, id), event, payload, options);
  }

  /** Emit to a free-form topic channel. */
  emitToTopic<T>(name: string, event: string, payload: T, options?: EmitOptions): void {
    this.emitToRoom(Rooms.topic(name), event, payload, options);
  }

  /** Emit to an explicit room name. */
  emitToRoom<T>(room: string, event: string, payload: T, options?: EmitOptions): void {
    const server = this.requireServer();
    if (!server) return;

    const envelope = this.envelope(event, payload, room);
    const channel = options?.exceptSocketId
      ? server.to(room).except(options.exceptSocketId)
      : server.to(room);

    channel.emit(event, envelope);
  }

  /** Emit to a single socket. */
  emitToClient<T>(socketId: string, event: string, payload: T): void {
    const server = this.requireServer();
    if (!server) return;
    server.to(socketId).emit(event, this.envelope(event, payload));
  }

  /** Emit to every connected client in the namespace. */
  broadcast<T>(event: string, payload: T, options?: EmitOptions): void {
    const server = this.requireServer();
    if (!server) return;

    const envelope = this.envelope(event, payload);
    if (options?.exceptSocketId) {
      server.except(options.exceptSocketId).emit(event, envelope);
      return;
    }
    server.emit(event, envelope);
  }

  /** Socket ids currently joined to a room (cluster-wide when Redis is on). */
  async getRoomMembers(room: string): Promise<string[]> {
    const server = this.requireServer();
    if (!server) return [];
    const sockets = await server.in(room).fetchSockets();
    return sockets.map((socket) => socket.id);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return (await this.getRoomMembers(Rooms.user(userId))).length > 0;
  }

  /** Force every socket of a user to disconnect — e.g. after a token revoke. */
  disconnectUser(userId: string): void {
    const server = this.requireServer();
    if (!server) return;
    server.in(Rooms.user(userId)).disconnectSockets(true);
  }

  private envelope<T>(event: string, payload: T, room?: string): RealtimeEvent<T> {
    return { event, room, payload, emittedAt: new Date().toISOString() };
  }

  /**
   * Emitting before the gateway is up (or in a job/CLI process that never boots
   * it) is a no-op rather than a crash — realtime delivery is best-effort.
   */
  private requireServer(): Server | undefined {
    if (!this.server) {
      this.logger.warn('Realtime server not initialised — event dropped.');
    }
    return this.server;
  }
}
