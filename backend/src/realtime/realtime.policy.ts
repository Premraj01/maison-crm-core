import { Injectable } from '@nestjs/common';

import { Rooms } from './realtime.constants';
import type { RealtimePrincipal } from './realtime.types';

/**
 * Decides which rooms a client may subscribe to. This is the one place to edit
 * when your tenancy rules change — override the provider in `RealtimeModule` to
 * swap in your own implementation.
 */
@Injectable()
export class RealtimeAccessPolicy {
  canJoin(principal: RealtimePrincipal, room: string): boolean {
    // Anonymous sockets get public topics only.
    if (principal.anonymous) return room.startsWith('topic:');

    // A user may only listen on their own user room.
    if (room.startsWith('user:')) return room === Rooms.user(principal.userId);

    // Org rooms are limited to the org on the token.
    if (room.startsWith('org:'))
      return Boolean(principal.orgId) && room === Rooms.org(principal.orgId!);

    // Record- and topic-level rooms are open to any authenticated user; tighten
    // this with a permission lookup when record ACLs land.
    return room.startsWith('entity:') || room.startsWith('topic:');
  }
}
