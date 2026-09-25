/**
 * Stages and sources are varchars in Postgres rather than enums, matching
 * `User.role` — adding one is an edit here, not a type migration. Kept in step
 * with `LeadStage` in the CRM frontend's `data/crm.ts`.
 */
export const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'] as const;

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Event',
  'Organic',
  'Outbound',
  'Partner',
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

/**
 * Stages a lead cannot be in without a value. A proposal IS a number — the
 * figure negotiated with the customer — so there is nothing to put in front of
 * them without one, and a won deal with no value would silently drop out of
 * every revenue total.
 *
 * Enforced in `LeadsService`, not just the CRM's forms, so the rule holds for
 * any client.
 */
export const VALUE_REQUIRED_STAGES: readonly LeadStage[] = ['Proposal', 'Won'];

export function requiresValue(stage: string): boolean {
  return (VALUE_REQUIRED_STAGES as readonly string[]).includes(stage);
}
export type LeadSource = (typeof LEAD_SOURCES)[number];

/**
 * Every read carries the listing the enquiry came from and the agent assigned
 * to show it, because a lead is nearly useless without both — the CRM shows
 * them on the row, and the website's viewing form is why `property` is usually
 * set while `owner` usually is not until someone picks the lead up.
 */
export const leadSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  stage: true,
  source: true,
  interest: true,
  value: true,
  propertyId: true,
  ownerId: true,
  orgId: true,
  regionId: true,
  lastContactAt: true,
  property: { select: { id: true, slug: true, name: true, address: true } },
  /// The agent who will show the property. Only their name and email — never
  /// the rest of the user row.
  owner: { select: { id: true, fullName: true, email: true } },
} as const;
