import type { Lead } from "@/data/crm";

/**
 * Customers are derived, not stored: a customer is someone whose lead closed.
 *
 * There is no customers table, and deliberately so — every fact a customer
 * record needs is already on the Won lead that created it (who they are, what
 * they bought, for how much, through which agent, when). Deriving keeps the
 * two permanently in step: reopen a deal in the pipeline and the customer
 * stops being one, with nothing to migrate.
 *
 * People are grouped by email, so someone who buys twice is one customer with
 * two deals rather than two rows.
 */

export interface CustomerDeal {
  leadId: string;
  property: { id: string; slug: string; name: string; address: string } | null;
  value: number;
  /** Best available close date — there is no dedicated `wonAt` column yet. */
  closedAt: number;
  agent: { id: string; fullName: string; email: string } | null;
}

export interface Customer {
  /** The person's email, lowercased — stable, and what the detail route uses. */
  id: string;
  name: string;
  email: string;
  phone: string | null;
  deals: CustomerDeal[];
  lifetimeValue: number;
  /** When they first became a customer. */
  sinceAt: number;
  /** Distinct agents who have closed for them, most recent deal first. */
  agents: string[];
}

function closedAt(lead: Lead): number {
  // `lastContactAt` is set on every edit, so the move into Won is the best
  // proxy for the close date until the backend records one explicitly.
  const touched = lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0;
  const created = new Date(lead.createdAt).getTime();
  return touched > created ? touched : created;
}

export function deriveCustomers(leads: Lead[]): Customer[] {
  const byEmail = new Map<string, Customer>();

  for (const lead of leads) {
    if (lead.stage !== "Won") continue;

    const id = lead.email.trim().toLowerCase();
    const deal: CustomerDeal = {
      leadId: lead.id,
      property: lead.property ?? null,
      value: lead.value ?? 0,
      closedAt: closedAt(lead),
      agent: lead.owner ?? null,
    };

    const existing = byEmail.get(id);
    if (existing) {
      existing.deals.push(deal);
      existing.lifetimeValue += deal.value;
      existing.sinceAt = Math.min(existing.sinceAt, deal.closedAt);
      // A later record of the same person may carry a phone the first did not.
      existing.phone = existing.phone ?? lead.phone ?? null;
      continue;
    }

    byEmail.set(id, {
      id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? null,
      deals: [deal],
      lifetimeValue: deal.value,
      sinceAt: deal.closedAt,
      agents: [],
    });
  }

  return [...byEmail.values()]
    .map((customer) => {
      customer.deals.sort((a, b) => b.closedAt - a.closedAt);
      customer.agents = [
        ...new Set(customer.deals.map((d) => d.agent?.fullName).filter((n): n is string => !!n)),
      ];
      return customer;
    })
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export function findCustomer(leads: Lead[], id: string): Customer | undefined {
  const wanted = decodeURIComponent(id).trim().toLowerCase();
  return deriveCustomers(leads).find((customer) => customer.id === wanted);
}
