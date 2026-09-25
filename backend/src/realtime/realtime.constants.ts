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
  /**
   * The global roles of an organisation (system admin, owner) — the only
   * people who may hear about every region. Auto-joined on connect; the access
   * policy refuses it as a subscription, since it does not equal `org(orgId)`.
   */
  orgAdmins: (orgId: string) => `org:${orgId}:admins`,
  /** Everyone working in one region. Auto-joined on connect, never subscribed. */
  region: (regionId: string) => `region:${regionId}`,
  /** Everyone holding one record open, e.g. `entity:lead:42`. */
  entity: (type: string, id: string) => `entity:${type}:${id}`,
  /** Free-form topic channel, e.g. `topic:dashboard-metrics`. */
  topic: (name: string) => `topic:${name}`,
} as const;

export const REALTIME_OPTIONS = Symbol('REALTIME_OPTIONS');
