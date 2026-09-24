import { apiRequest } from "./client";
import type { Role } from "@/data/crm";

/**
 * The workspace's people, used to pick who shows a property to a lead.
 */

export interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
}

interface Paginated<T> {
  items: T[];
  total: number;
}

/**
 * Who a lead can be assigned to. A viewer has no permission to act on one, and
 * a deactivated account cannot show anyone a property — neither belongs in the
 * picker, so both are filtered out here rather than in each component.
 */
export async function fetchAssignableAgents(token: string): Promise<ApiUser[]> {
  const page = await apiRequest<Paginated<ApiUser>>("/users?limit=200", { token });
  return page.items
    .filter((user) => user.isActive && user.role !== "viewer")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
