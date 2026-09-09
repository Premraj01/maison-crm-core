/** Server -> client event names for the notification feature. */
export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
  READ: 'notification.read',
  ALL_READ: 'notification.all_read',
  UNREAD_COUNT: 'notification.unread_count',
} as const;
