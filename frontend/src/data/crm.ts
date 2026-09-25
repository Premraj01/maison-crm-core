/**
 * Mirrors `USER_ROLES` in `backend/src/modules/users/users.types.ts`, in the
 * same order. Roles come from the signed-in user, so the two lists have to
 * agree — a role the backend issues that is missing here has no permissions.
 *
 * The ranking is provisional, as it is on the backend: these are the six roles,
 * not a settled hierarchy.
 */
export type Role =
  | "system_admin"
  | "owner"
  | "region_head"
  | "sales_development_rep"
  | "property_advisor"
  | "transaction_coordinator";
export type LeadStage = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";
export type PermissionAction = "lead:create" | "lead:edit" | "lead:move" | "team:invite" | "team:manage" | "settings:edit" | "customer:edit" | "property:create" | "property:edit";
/// What the property physically is. Drives which detail fields the form asks
/// for — `hasRooms` below decides bedrooms/bathrooms vs. bare land.
export type PropertyKind = "Apartment" | "House" | "Villa" | "Plot" | "Land" | "Commercial";
/// Whether the listing is on the market to rent or to buy.
export type ListingType = "Rent" | "Sale";
/// Where a listing stands. Sold and Rented are the archived states — the
/// listing stays visible in both apps, shown blurred, rather than vanishing.
/// Mirrors `PROPERTY_STATUSES` in the backend's `properties.types.ts`.
export type PropertyStatus = "Available" | "Sold" | "Rented";
/// Badge the public website prints on a listing card.
export type PropertyTag = "Signature" | "New";

/// A lead as the API returns it. Most arrive from the public website's
/// "Book a viewing" form, which is why `property` is usually set — it records
/// which listing the person was looking at when they enquired.
export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone?: string | null | undefined;
  /// What the enquirer wrote. Public input — render as text, never as markup.
  message: string;
  stage: LeadStage;
  source: string;
  /// Which option the website form was on ("Booking a viewing", and so on).
  interest?: string | null | undefined;
  value?: number | null | undefined;
  /// The listing enquired about, joined in by the API. Null for a general
  /// enquiry, or if the listing was withdrawn after the enquiry came in.
  propertyId?: string | null | undefined;
  property?: { id: string; slug: string; name: string; address: string } | null | undefined;
  /// The agent assigned to show the property. Unassigned until someone picks
  /// the lead up; `owner` is joined in by the API when it is set.
  ownerId?: string | null | undefined;
  owner?: { id: string; fullName: string; email: string } | null | undefined;
  orgId?: string | null | undefined;
  /// The region working this lead — its listing's, or its author's for a
  /// general enquiry. Set by the API; the CRM never sends it for a lead.
  regionId?: string | null | undefined;
  lastContactAt?: string | null | undefined;
}
/// A listing in the portfolio, as the API returns it. This is the one record
/// shared with the public beacon-estates website — the backend's `Property`
/// model is the source of truth, and this mirrors it.
export interface Property {
  id: string;
  /// When the listing was added. Sent by the API; used for the dashboard's
  /// month-by-month region chart.
  createdAt?: string | undefined;
  /// URL slug the public site addresses the listing by. Derived by the backend
  /// from the name on create; present on every listing the API returns.
  slug: string;
  name: string;
  address: string;
  kind: PropertyKind;
  listing: ListingType;
  status: PropertyStatus;
  /// `exactOptionalPropertyTypes` is on, so optional fields spell out
  /// `| undefined`. All of these are genuinely unknown for some listings:
  /// a price before it is agreed, rooms on bare land.
  price?: number | null | undefined;
  bedrooms?: number | null | undefined;
  bathrooms?: number | null | undefined;
  area?: number | null | undefined;
  /// Presentation, rendered by the public website.
  tag?: PropertyTag | null | undefined;
  portrait?: boolean | undefined;
  featured?: boolean | undefined;
  details: string;
  features: string[];
  images: string[];
  orgId?: string | null | undefined;
  /// The region whose team sells this listing. Null until an owner places it.
  regionId?: string | null | undefined;
}

export interface TeamMember { id: string; name: string; email: string; role: Role; initials: string; active: boolean }
export interface Task { id: string; title: string; due: string; done: boolean; priority: "High" | "Normal" }

export const stages: LeadStage[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
/// Stages a lead cannot be in without a value — the figure negotiated with the
/// customer. Mirrors `VALUE_REQUIRED_STAGES` in the backend's `leads.types.ts`,
/// which enforces it; this copy exists so the CRM can ask for the number
/// instead of letting the save fail.
export const valueRequiredStages: LeadStage[] = ["Proposal", "Won"];
export function stageNeedsValue(stage: LeadStage) { return valueRequiredStages.includes(stage); }
export const propertyKinds: PropertyKind[] = ["Apartment", "House", "Villa", "Plot", "Land", "Commercial"];
export const listingTypes: ListingType[] = ["Rent", "Sale"];
export const propertyStatuses: PropertyStatus[] = ["Available", "Sold", "Rented"];
/// Sold and rented listings are archived: kept and shown, but no longer on offer.
export function isArchived(status: PropertyStatus) { return status === "Sold" || status === "Rented"; }
export const propertyTags: PropertyTag[] = ["Signature", "New"];
/// Kinds that have rooms. Anything else is bare land, where only the area and
/// free-text details make sense.
const residential: PropertyKind[] = ["Apartment", "House", "Villa"];
export function hasRooms(kind: PropertyKind) { return residential.includes(kind); }
export const roles: { value: Role; label: string }[] = [
  { value: "system_admin", label: "System Admin" }, { value: "owner", label: "Owner" },
  { value: "region_head", label: "Region Head" }, { value: "sales_development_rep", label: "Sales Development Rep" },
  { value: "property_advisor", label: "Property Advisor" }, { value: "transaction_coordinator", label: "Transaction Coordinator" },
];
export function roleLabel(role: Role) { return roles.find(r => r.value === role)?.label ?? role; }
/// Mirrors `GLOBAL_ROLES` in the backend's `users.types.ts`: the only roles that
/// see across regions, and so the only ones shown the Regions page. Everyone
/// else is confined to their own region — by the API, not just this check.
export const globalRoles: Role[] = ["system_admin", "owner"];
export function isGlobalRole(role: Role | null) { return role !== null && globalRoles.includes(role); }
/// The roles that make up a region's team, in the order the Regions page lists them.
export const regionTeamRoles: Role[] = ["region_head", "sales_development_rep", "property_advisor", "transaction_coordinator"];




// Names and roles match the accounts created by `backend/prisma/seed.ts`, so a
// seeded sign-in lands on a team list that already contains the signed-in user.
export const team: TeamMember[] = [
  { id:"U-1", name:"Rhea Kapoor", email:"sysadmin@maison.co", role:"system_admin", initials:"RK", active:true },
  { id:"U-2", name:"Maya Chen", email:"owner@maison.co", role:"owner", initials:"MC", active:true },
  { id:"U-3", name:"Jon Bell", email:"region@maison.co", role:"region_head", initials:"JB", active:true },
  { id:"U-4", name:"Ana Moreau", email:"sdr@maison.co", role:"sales_development_rep", initials:"AM", active:true },
  { id:"U-5", name:"Sam Rivera", email:"advisor@maison.co", role:"property_advisor", initials:"SR", active:true },
  { id:"U-6", name:"Tobias Reyes", email:"coordinator@maison.co", role:"transaction_coordinator", initials:"TR", active:true },
];
export const tasks: Task[] = [
  { id:"T1", title:"Send revised proposal to Elena", due:"Today", done:false, priority:"High" },
  { id:"T2", title:"Prepare Northline discovery brief", due:"Today", done:false, priority:"Normal" },
  { id:"T3", title:"Confirm Friday committee call", due:"Tomorrow", done:false, priority:"Normal" },
  { id:"T4", title:"Archive August pipeline report", due:"Sep 8", done:true, priority:"Normal" },
];
/// Provisional, like the ranking: the six roles are in place, but who may do
/// what is still to be settled. The three management tiers keep everything the
/// old owner/admin pair had, and `property_advisor` keeps exactly what `agent`
/// had, so the migration in `20260925000000_replace_user_roles` changes no
/// existing account's capabilities.
const everything: PermissionAction[] = ["lead:create","lead:edit","lead:move","team:invite","team:manage","settings:edit","customer:edit","property:create","property:edit"];
const permissions: Record<Role, PermissionAction[]> = {
  system_admin:everything,
  owner:everything,
  region_head:everything,
  sales_development_rep:["lead:create","lead:edit","lead:move","customer:edit"],
  property_advisor:["lead:create","lead:edit","lead:move","customer:edit","property:create","property:edit"],
  transaction_coordinator:["lead:edit","customer:edit"],
};
/// `null` is the signed-out — or not-yet-restored — session: no permissions at
/// all, which is what the old `viewer` fallback stood in for.
export function can(role: Role | null, action: PermissionAction) { return role !== null && permissions[role].includes(action); }
export const permissionRows: { label:string; action: PermissionAction }[] = [
  {label:"Create leads",action:"lead:create"},{label:"Edit leads",action:"lead:edit"},{label:"Move pipeline cards",action:"lead:move"},
  {label:"Edit customers",action:"customer:edit"},{label:"Add properties",action:"property:create"},{label:"Edit properties",action:"property:edit"},{label:"Invite team members",action:"team:invite"},{label:"Manage roles",action:"team:manage"},{label:"Edit workspace settings",action:"settings:edit"},
];
