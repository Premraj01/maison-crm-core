import { useEffect, useRef, useState } from "react";

import { getSocket, type RealtimeEvent } from "./client";

export interface RealtimeStatus {
  connected: boolean;
  socketId: string | undefined;
}

/**
 * Subscribe to one server event.
 *
 * ```tsx
 * useRealtimeEvent<Notification>("notification.created", (n) => toast(n.title));
 * ```
 *
 * The handler is kept in a ref, so passing an inline arrow function does not
 * resubscribe on every render.
 */
export function useRealtimeEvent<T = unknown>(
  event: string,
  handler: (payload: T, meta: RealtimeEvent<T>) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    const listener = (message: RealtimeEvent<T>) => {
      handlerRef.current(message?.payload as T, message);
    };

    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event, enabled]);
}

/**
 * Join a room for as long as the component is mounted.
 *
 * ```tsx
 * useRealtimeRoom(Rooms.entity("lead", leadId));
 * ```
 *
 * `user:` and `org:` rooms are joined automatically by the server at handshake,
 * so only entity/topic rooms need this.
 */
export function useRealtimeRoom(room: string | undefined, enabled = true): void {
  useEffect(() => {
    if (!room || !enabled) return;

    const socket = getSocket();
    const join = () => socket.emit("subscribe", { room });

    if (socket.connected) join();
    // Re-join after a reconnect, otherwise the room is lost with the old session.
    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
      if (socket.connected) socket.emit("unsubscribe", { room });
    };
  }, [room, enabled]);
}

/** Live connection status, for a badge or an offline banner. */
export function useRealtimeStatus(): RealtimeStatus {
  const [state, setState] = useState<RealtimeStatus>(() => {
    const socket = getSocket();
    return { connected: socket.connected, socketId: socket.id };
  });

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setState({ connected: true, socketId: socket.id });
    const onDisconnect = () => setState({ connected: false, socketId: undefined });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return state;
}
