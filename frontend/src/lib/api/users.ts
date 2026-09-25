import { apiRequest } from "./client";
import { can, isGlobalRole, type Role } from "@/data/crm";

/**
 * The workspace's people, used to pick who shows a property to a lead. The API
 * scopes `/users` by region, so a regional user only ever gets their own
 * region's team back; owners and system admins get everyone.
 */

export interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  regionId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface Paginated<T> {
  items: T[];
  total: number;
}

/**
 * Who a lead can be assigned to. A role that cannot edit a lead has no business
 * owning one, and a deactivated account cannot show anyone a property — neither
 * belongs in the picker, so both are filtered out here rather than in each
 * component. Asking `can(…, "lead:edit")` keeps this in step with the
 * permission matrix instead of naming roles a second time.
 */
export async function fetchAssignableAgents(token: string): Promise<ApiUser[]> {
  const page = await apiRequest<Paginated<ApiUser>>("/users?limit=200", { token });
  return page.items
    .filter((user) => user.isActive && can(user.role, "lead:edit"))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/**
 * The people who may take a lead in `regionId`: those who work in that region,
 * and nobody else — owners and system admins included, since they belong to no
 * region. A lead with no region has no one to assign it to until it is placed.
 * The API enforces the same rule; this keeps the picker from offering a choice
 * it would refuse.
 */
export function agentsForRegion(agents: ApiUser[], regionId: string | null): ApiUser[] {
  if (!regionId) return [];
  return agents.filter((agent) => !isGlobalRole(agent.role) && agent.regionId === regionId);
}

/** Everyone the caller may see — their region's team, or all of it for an owner. */
export async function fetchUsers(token: string): Promise<ApiUser[]> {
  const page = await apiRequest<Paginated<ApiUser>>("/users?limit=200", { token });
  return page.items.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** Moves a person into a region, or out of every region with `null`. Owners only. */
export function setUserRegion(
  id: string,
  regionId: string | null,
  token: string,
): Promise<ApiUser> {
  return apiRequest<ApiUser>(`/users/${id}`, { method: "PATCH", body: { regionId }, token });
}
