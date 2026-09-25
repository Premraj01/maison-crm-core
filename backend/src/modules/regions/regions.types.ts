import type { Region } from '../../generated/prisma/client';

/** Columns returned by every region read — `deletedAt` stays internal. */
export const regionSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  code: true,
  description: true,
  orgId: true,
} as const;

export type PublicRegion = Omit<Region, 'deletedAt'>;

/** Roles that make up a region's team, in the order the CRM lists them. */
export const REGION_TEAM_ROLES = [
  'region_head',
  'sales_development_rep',
  'property_advisor',
  'transaction_coordinator',
] as const;

/** Leads still in play — everything short of a closed outcome. */
export const OPEN_LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal'] as const;

/** One region on the overview: the record plus the headline numbers. */
export interface RegionSummary extends PublicRegion {
  /** Region heads by name; normally one, but nothing stops a region having two. */
  heads: { id: string; fullName: string; email: string }[];
  /** Active members per team role, keyed by role. */
  team: Record<(typeof REGION_TEAM_ROLES)[number], number>;
  properties: number;
  leads: number;
  openLeads: number;
  /** Sum of `value` across Won leads, whole currency units. */
  wonValue: number;
}
