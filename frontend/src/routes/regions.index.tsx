import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Map as MapIcon, Plus, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { roleLabel, regionTeamRoles } from "@/data/crm";
import { createRegion, fetchRegions, type RegionSummary } from "@/lib/api/regions";
import { useAuth } from "@/lib/auth/auth-context";
import { useCrm } from "@/lib/crm-context";
import { Banner, EmptyState, PageHeader, StatusPill } from "@/components/crm/Primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionFormDialog } from "@/components/crm/RegionForm";
import { money, teamRoleShort } from "@/lib/regions";

export const Route = createFileRoute("/regions/")({
  head: () => ({
    meta: [
      { title: "Regions — Maison CRM" },
      { name: "description", content: "Maison regions, their teams, listings and leads." },
    ],
  }),
  component: RegionsPage,
});

function RegionsPage() {
  const { token } = useAuth();
  const { properties } = useCrm();
  const [regions, setRegions] = useState<RegionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchRegions(token)
      .then((list) => {
        if (cancelled) return;
        setRegions(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load regions");
      });
    return () => {
      cancelled = true;
    };
  }, [token, nonce]);

  // Owners hold the whole portfolio, so anything without a region is visible
  // here — and to nobody else, which is worth pointing out.
  const unplaced = properties.filter((p) => !p.regionId).length;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Regions"
        description="Each region has its own team, listings and leads. Only owners and system admins see across them."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            New region
          </Button>
        }
      />

      {unplaced > 0 && (
        <div className="mb-6">
          <Banner
            tone="warning"
            title={`${unplaced} listing${unplaced === 1 ? " isn't" : "s aren't"} in a region`}
          >
            Only owners and system admins can see them until they are placed. Open a region and add
            them from its Properties tab.
          </Banner>
        </div>
      )}

      {error && (
        <Banner tone="error" title="Could not load regions">
          {error}
        </Banner>
      )}

      {!error && regions === null && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      {regions?.length === 0 && (
        <EmptyState
          icon={<MapIcon className="size-4" />}
          title="No regions yet"
          description="Create a region, then add its region head, reps, advisors and coordinators, and the listings it sells."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus />
              New region
            </Button>
          }
        />
      )}

      {regions && regions.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {regions.map((region) => (
            <RegionCard key={region.id} region={region} />
          ))}
        </div>
      )}

      <RegionFormDialog
        open={creating}
        onOpenChange={setCreating}
        title="New region"
        submitLabel="Create region"
        onSubmit={async (draft) => {
          if (!token) return;
          await createRegion(draft, token);
          toast.success(`${draft.name} created`);
          setNonce((n) => n + 1);
        }}
      />
    </>
  );
}

function RegionCard({ region }: { region: RegionSummary }) {
  return (
    <Link to="/regions/$regionId" params={{ regionId: region.id }} className="group block">
      <Card className="h-full p-6 transition-colors group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <StatusPill tone="accent">{region.code}</StatusPill>
            <h2 className="mt-3 truncate font-display text-2xl">{region.name}</h2>
            {region.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {region.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Region head
          </p>
          {region.heads.length > 0 ? (
            <p className="mt-1 text-sm font-semibold">
              {region.heads.map((h) => h.fullName).join(", ")}
            </p>
          ) : (
            <div className="mt-1">
              <StatusPill tone="warning">No region head</StatusPill>
            </div>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
          {regionTeamRoles
            .filter((role) => role !== "region_head")
            .map((role) => (
              <div key={role}>
                <dt className="truncate text-muted-foreground" title={roleLabel(role)}>
                  {teamRoleShort[role]}
                </dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums">
                  {region.team[role as keyof RegionSummary["team"]]}
                </dd>
              </div>
            ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            {region.properties} listing{region.properties === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5" />
            {region.openLeads} open of {region.leads} lead{region.leads === 1 ? "" : "s"}
          </span>
          {region.wonValue > 0 && (
            <span className="font-semibold text-success">{money(region.wonValue)} won</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
