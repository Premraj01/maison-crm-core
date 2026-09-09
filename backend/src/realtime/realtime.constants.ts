/** Client -> server message names. */
export const WS_INBOUND = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
} as const;

/** Server -> client message names reserved by the transport itself. */
export const WS_OUTBOUND = {
  CONNECTED: 'connected',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  PONG: 'pong',
  ERROR: 'error',
} as const;

/**
 * Room naming is the whole contract between publishers and subscribers.
 * Everything emitted goes to a room built by one of these helpers, so a feature
 * module never has to invent its own string format.
 */
export const Rooms = {
  /** Every socket a single user has open, across tabs and devices. */
  user: (userId: string) => `user:${userId}`,
  /** Everyone in an organisation — tenant-wide broadcasts. */
  org: (orgId: string) => `org:${orgId}`,
  /** Everyone holding one record open, e.g. `entity:lead:42`. */
  entity: (type: string, id: string) => `entity:${type}:${id}`,
  /** Free-form topic channel, e.g. `topic:dashboard-metrics`. */
  topic: (name: string) => `topic:${name}`,
} as const;

export const REALTIME_OPTIONS = Symbol('REALTIME_OPTIONS');
