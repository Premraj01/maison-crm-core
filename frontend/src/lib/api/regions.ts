import { apiRequest } from "./client";
import type { Lead, Property, Role } from "@/data/crm";
import type { ApiUser } from "./users";

/**
 * Regions are managed by owners and system admins only; the API answers 403 to
 * anyone else on every call here except `fetchMyRegion`, which returns the
 * caller's own region and names no other.
 */

export interface Region {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  code: string;
  description: string;
  orgId: string | null;
}

/** One card on the overview. Mirrors `RegionSummary` in the backend's `regions.types.ts`. */
export interface RegionSummary extends Region {
  heads: { id: string; fullName: string; email: string }[];
  team: Record<Exclude<Role, "system_admin" | "owner">, number>;
  properties: number;
  leads: number;
  openLeads: number;
  wonValue: number;
}

/** One region in full — its people, listings, and the leads on them. */
export interface RegionDetail extends Region {
  members: ApiUser[];
  properties: Property[];
  leads: Lead[];
}

export interface RegionDraft {
  name: string;
  code: string;
  description?: string;
}

export function fetchRegions(token: string): Promise<RegionSummary[]> {
  return apiRequest<RegionSummary[]>("/regions", { token });
}

export function fetchRegion(id: string, token: string): Promise<RegionDetail> {
  return apiRequest<RegionDetail>(`/regions/${id}`, { token });
}

/** The signed-in user's region, or null for the global roles and the unplaced. */
export function fetchMyRegion(token: string): Promise<Region | null> {
  return apiRequest<Region | null>("/regions/mine", { token });
}

export function createRegion(draft: RegionDraft, token: string): Promise<Region> {
  return apiRequest<Region>("/regions", { method: "POST", body: draft, token });
}

export function updateRegion(
  id: string,
  draft: Partial<RegionDraft>,
  token: string,
): Promise<Region> {
  return apiRequest<Region>(`/regions/${id}`, { method: "PATCH", body: draft, token });
}

/** Soft delete. Its people, listings and leads are released, not removed. */
export function deleteRegion(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/regions/${id}`, { method: "DELETE", token });
}
