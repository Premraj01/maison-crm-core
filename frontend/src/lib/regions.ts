import type { Role } from "@/data/crm";

export function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Plural, compact names for a region's team roles — used on cards and tab headings. */
export const teamRoleHeading: Partial<Record<Role, string>> = {
  region_head: "Region head",
  sales_development_rep: "Sales development reps",
  property_advisor: "Property advisors",
  transaction_coordinator: "Transaction coordinators",
};

export const teamRoleShort: Partial<Record<Role, string>> = {
  sales_development_rep: "SDRs",
  property_advisor: "Advisors",
  transaction_coordinator: "Coordinators",
};
