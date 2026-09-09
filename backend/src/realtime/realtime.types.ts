import type { Socket } from 'socket.io';

/** Identity attached to a socket once the handshake has been authenticated. */
export interface RealtimePrincipal {
  userId: string;
  orgId?: string;
  roles: string[];
  anonymous: boolean;
}

/** A socket that has passed through `WsAuthGuard`. */
export type AuthenticatedSocket = Socket & { data: { principal: RealtimePrincipal } };

/** Envelope every server -> client message is wrapped in. */
export interface RealtimeEvent<T = unknown> {
  event: string;
  room?: string;
  payload: T;
  emittedAt: string;
}

export interface EmitOptions {
  /** Socket id to exclude — typically the client that triggered the change. */
  exceptSocketId?: string;
}
