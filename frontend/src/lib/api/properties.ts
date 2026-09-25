import { apiRequest } from "./client";
import type { Property } from "@/data/crm";

/**
 * Properties live in Postgres and are the one record shared with the public
 * beacon-estates website: what is written here is what that site renders.
 *
 * Reads are public on the API, but the CRM still sends its token: with one,
 * the API narrows the list to the caller's region, so a regional user never
 * receives another region's listings. Writes carry the token too, and the
 * backend derives the organisation and region from it.
 */

interface Paginated<T> {
  items: T[];
  total: number;
}

/** Fields the backend owns — the form never sends these. */
type ServerOwned = "id" | "slug" | "createdAt" | "updatedAt" | "orgId" | "regionId";

export type PropertyDraft = Omit<Property, ServerOwned>;

/**
 * The portfolio is small enough that the CRM holds all of it and filters in the
 * browser, which keeps the search box instant. Raise this to a real paged query
 * if a workspace ever outgrows one screenful of requests.
 */
export function fetchProperties(token: string): Promise<Paginated<Property>> {
  return apiRequest<Paginated<Property>>("/properties?limit=200", { token });
}

/**
 * Moves a listing into a region, or out of every region with `null`. Owners and
 * system admins only — the API keeps anyone else inside their own region. The
 * listing's leads move with it.
 */
export function setPropertyRegion(
  id: string,
  regionId: string | null,
  token: string,
): Promise<Property> {
  return apiRequest<Property>(`/properties/${id}`, { method: "PATCH", body: { regionId }, token });
}

export function createProperty(draft: PropertyDraft, token: string): Promise<Property> {
  return apiRequest<Property>("/properties", { method: "POST", body: clean(draft), token });
}

export function updateProperty(id: string, draft: PropertyDraft, token: string): Promise<Property> {
  return apiRequest<Property>(`/properties/${id}`, {
    method: "PATCH",
    body: clean(draft),
    token,
  });
}

export function deleteProperty(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/properties/${id}`, { method: "DELETE", token });
}

/**
 * The backend validates with `forbidNonWhitelisted`, and rejects an explicit
 * `undefined` for an optional field rather than ignoring it — so keys the form
 * left blank are dropped instead of being sent as undefined.
 */
function clean(draft: PropertyDraft): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(draft).filter(([, value]) => value !== undefined && value !== null),
  );
}
