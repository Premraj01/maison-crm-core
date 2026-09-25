import { apiRequest } from "./client";
import type { Lead, LeadStage } from "@/data/crm";

/**
 * Leads are internal: every call here needs a token. The one exception lives
 * on the public website, which posts to `/leads/enquiries` anonymously — that
 * is how a "Book a viewing" click becomes a row in this list, already attached
 * to the listing the visitor was looking at.
 */

interface Paginated<T> {
  items: T[];
  total: number;
}

export interface LeadQuery {
  /** Everything enquired against one listing. */
  propertyId?: string;
  stage?: LeadStage;
  search?: string;
}

/** Fields the server owns — never sent from the CRM's forms. */
type ServerOwned =
  "id" | "createdAt" | "updatedAt" | "property" | "orgId" | "regionId" | "lastContactAt";

export type LeadDraft = Partial<Omit<Lead, ServerOwned>>;

export function fetchLeads(token: string, query: LeadQuery = {}): Promise<Paginated<Lead>> {
  const params = new URLSearchParams({ limit: "200" });
  if (query.propertyId) params.set("propertyId", query.propertyId);
  if (query.stage) params.set("stage", query.stage);
  if (query.search) params.set("search", query.search);
  return apiRequest<Paginated<Lead>>(`/leads?${params.toString()}`, { token });
}

export function createLead(draft: LeadDraft, token: string): Promise<Lead> {
  return apiRequest<Lead>("/leads", { method: "POST", body: clean(draft), token });
}

export function updateLead(id: string, draft: LeadDraft, token: string): Promise<Lead> {
  return apiRequest<Lead>(`/leads/${id}`, { method: "PATCH", body: clean(draft), token });
}

export function deleteLead(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/leads/${id}`, { method: "DELETE", token });
}

/**
 * The API validates with `forbidNonWhitelisted` and rejects an explicit
 * `undefined` for an optional field, so blank keys are dropped rather than sent.
 */
function clean(draft: LeadDraft): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(draft).filter(([, value]) => value !== undefined && value !== null),
  );
}
