import { io, type Socket } from "socket.io-client";

/** Mirrors the envelope the backend wraps every server -> client message in. */
export interface RealtimeEvent<T = unknown> {
  event: string;
  room?: string;
  payload: T;
  emittedAt: string;
}

/** Room helpers — must stay in step with `backend/src/realtime/realtime.constants.ts`. */
export const Rooms = {
  user: (userId: string) => `user:${userId}`,
  org: (orgId: string) => `org:${orgId}`,
  entity: (type: string, id: string) => `entity:${type}:${id}`,
  topic: (name: string) => `topic:${name}`,
} as const;

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3000";
const WS_NAMESPACE = import.meta.env["VITE_WS_NAMESPACE"] ?? "/realtime";

let socket: Socket | null = null;

/**
 * Lazily creates the one shared connection. Safe to call from anywhere and on
 * every render — repeat calls return the same socket.
 */
export function getSocket(token?: string): Socket {
  if (socket) return socket;

  socket = io(`${API_URL}${WS_NAMESPACE}`, {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    auth: token ? { token } : {},
  });

  return socket;
}

/** Swap the credentials on the live connection, e.g. after sign-in or refresh. */
export function setSocketAuth(token: string | undefined): void {
  const current = getSocket(token);
  current.auth = token ? { token } : {};
  if (current.connected) current.disconnect();
  current.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
