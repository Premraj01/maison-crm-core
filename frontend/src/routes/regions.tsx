import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { isGlobalRole } from "@/data/crm";
import { useCrm } from "@/lib/crm-context";
import { EmptyState, FullPageLoader } from "@/components/crm/Primitives";

export const Route = createFileRoute("/regions")({ component: RegionsLayout });

/**
 * Regions are for owners and system admins. The sidebar hides the link from
 * everyone else, and this covers a typed URL — but the real boundary is the
 * API, which answers 403 to every other role on `/regions`.
 */
function RegionsLayout() {
  const { role } = useCrm();
  if (role === null) return <FullPageLoader />;
  if (!isGlobalRole(role)) {
    return (
      <EmptyState
        icon={<Lock className="size-4" />}
        title="Regions are for owners"
        description="Only owners and system admins can see across regions. Your leads, listings and team are already limited to your own region."
      />
    );
  }
  return <Outlet />;
}
