import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { isGlobalRole } from '../users/users.types';

/**
 * The one rule behind regions: `system_admin` and `owner` see every region;
 * everyone else sees only the region on their own account. Users, properties
 * and leads each carry a `regionId`, and every read and write of them goes
 * through the helpers below — so the rule is enforced by the API, not merely
 * hidden by the CRM's navigation.
 *
 * A regional user who has not been placed in a region yet sees nothing
 * regional at all, rather than everything that happens to be unassigned.
 */

/** Who is asking. `undefined` is an anonymous caller on a `@Public()` route. */
export type Viewer = Pick<AuthenticatedUser, 'id' | 'role' | 'regionId'>;

/** True when the viewer is bounded by a region — i.e. is not a global role. */
export function isRegional(viewer: Viewer): boolean {
  return !isGlobalRole(viewer.role);
}

/**
 * A Prisma `where` fragment limiting a user, property or lead query to what the
 * viewer may see. Spread it into the query's own filters:
 *
 * ```ts
 * where: { deletedAt: null, ...regionWhere(viewer) }
 * ```
 *
 * `id: { in: [] }` matches nothing — used for a regional user with no region,
 * because `regionId: null` would instead match every unplaced record.
 */
export function regionWhere(viewer: Viewer): { regionId?: string; id?: { in: string[] } } {
  if (!isRegional(viewer)) return {};
  return viewer.regionId ? { regionId: viewer.regionId } : { id: { in: [] } };
}

/**
 * Throws unless the viewer may see a record in `regionId`. A 404 rather than a
 * 403, so probing ids cannot reveal that another region's record exists.
 */
export function assertVisible(
  viewer: Viewer,
  regionId: string | null,
  label: string,
): void {
  if (!isRegional(viewer)) return;
  if (!viewer.regionId || regionId !== viewer.regionId) {
    throw new NotFoundException(`${label} not found`);
  }
}

/**
 * The region a write should land in. A regional user always writes into their
 * own region, whatever the request says; a global user may name any region, or
 * leave the record unplaced.
 */
export function writableRegion(viewer: Viewer, requested: string | null | undefined): string | null {
  if (!isRegional(viewer)) return requested ?? null;
  if (!viewer.regionId) {
    throw new ForbiddenException('Your account is not in a region yet — ask an owner to add you to one');
  }
  if (requested && requested !== viewer.regionId) {
    throw new ForbiddenException('You can only work within your own region');
  }
  return viewer.regionId;
}
