import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Pencil, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isGlobalRole, regionTeamRoles, roleLabel } from "@/data/crm";
import { setPropertyRegion } from "@/lib/api/properties";
import { deleteRegion, fetchRegion, updateRegion, type RegionDetail } from "@/lib/api/regions";
import { fetchUsers, setUserRegion, type ApiUser } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/auth-context";
import { useCrm } from "@/lib/crm-context";
import { RegionFormDialog } from "@/components/crm/RegionForm";
import { money, teamRoleHeading } from "@/lib/regions";
import {
  Banner,
  EmptyState,
  FullPageLoader,
  PageHeader,
  StatusPill,
} from "@/components/crm/Primitives";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/regions/$regionId")({
  head: () => ({ meta: [{ title: "Region — Maison CRM" }] }),
  component: RegionPage,
});

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function RegionPage() {
  const { regionId } = Route.useParams();
  const { token } = useAuth();
  const { properties, reloadProperties, reloadLeads } = useCrm();
  const navigate = useNavigate();

  const [region, setRegion] = useState<RegionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<ApiUser[]>([]);
  const [nonce, setNonce] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([fetchRegion(regionId, token), fetchUsers(token)])
      .then(([detail, users]) => {
        if (cancelled) return;
        setRegion(detail);
        setPeople(users);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this region");
      });
    return () => {
      cancelled = true;
    };
  }, [token, regionId, nonce]);

  const refresh = () => setNonce((n) => n + 1);

  /** Runs one assignment, then reloads this page and the app-wide lists it touches. */
  const run = async (action: () => Promise<unknown>, done: string, alsoLeads = false) => {
    if (!token) return;
    setBusy(true);
    try {
      await action();
      toast.success(done);
      refresh();
      reloadProperties();
      if (alsoLeads) reloadLeads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // People who could join: anyone not already here, except the global roles,
  // who belong to no region.
  const candidates = useMemo(
    () => people.filter((u) => u.regionId !== regionId && !isGlobalRole(u.role) && u.isActive),
    [people, regionId],
  );
  const otherListings = useMemo(
    () =>
      properties
        .filter((p) => p.regionId !== regionId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [properties, regionId],
  );

  if (error) {
    return (
      <>
        <BackLink />
        <Banner tone="error" title="Could not load this region">
          {error}
        </Banner>
      </>
    );
  }
  if (!region) return <FullPageLoader />;

  const heads = region.members.filter((m) => m.role === "region_head");
  const open = region.leads.filter((l) => l.stage !== "Won" && l.stage !== "Lost").length;
  const won = region.leads
    .filter((l) => l.stage === "Won")
    .reduce((sum, l) => sum + (l.value ?? 0), 0);

  return (
    <>
      <BackLink />
      <PageHeader
        eyebrow={`Region · ${region.code}`}
        title={region.name}
        {...(region.description ? { description: region.description } : {})}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Delete
            </Button>
          </>
        }
      />

      {heads.length === 0 && (
        <div className="mb-6">
          <Banner tone="warning" title="This region has no region head">
            Add someone with the Region Head role from the Team tab, or move an existing region head
            here.
          </Banner>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Team" value={region.members.length} />
        <Stat label="Listings" value={region.properties.length} />
        <Stat label="Open leads" value={open} hint={`${region.leads.length} in total`} />
        <Stat label="Won" value={money(won)} />
      </div>

      <Tabs defaultValue="team">
        <TabsList className="mb-5 h-auto max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="team">Team ({region.members.length})</TabsTrigger>
          <TabsTrigger value="properties">Properties ({region.properties.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({region.leads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-5">
          <AddRow
            label="Add a person to this region"
            placeholder={
              candidates.length ? "Choose someone…" : "Everyone eligible is already here"
            }
            disabled={busy || candidates.length === 0}
            options={candidates.map((u) => ({
              value: u.id,
              label: `${u.fullName} — ${roleLabel(u.role)}${u.regionId ? " (moves from another region)" : ""}`,
            }))}
            onPick={(id) => {
              const user = candidates.find((u) => u.id === id);
              void run(
                () => setUserRegion(id, regionId, token!),
                `${user?.fullName ?? "They"} joined ${region.name}`,
              );
            }}
          />
          {regionTeamRoles.map((role) => {
            const members = region.members.filter((m) => m.role === role);
            return (
              <Card key={role} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                    {teamRoleHeading[role]}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {members.length}
                  </span>
                </div>
                {members.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">Nobody yet.</p>
                ) : (
                  <ul>
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
                      >
                        <Avatar>
                          <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{m.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        {!m.isActive && <StatusPill>Inactive</StatusPill>}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          title={`Remove ${m.fullName} from ${region.name}`}
                          onClick={() =>
                            void run(
                              () => setUserRegion(m.id, null, token!),
                              `${m.fullName} left ${region.name}`,
                            )
                          }
                        >
                          <X />
                          <span className="sr-only">Remove from region</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="properties" className="space-y-5">
          <AddRow
            label="Add a listing to this region"
            placeholder={
              otherListings.length ? "Choose a listing…" : "Every listing is already here"
            }
            disabled={busy || otherListings.length === 0}
            options={otherListings.map((p) => ({
              value: p.id,
              label: `${p.name} — ${p.address}${p.regionId ? " (moves from another region)" : ""}`,
            }))}
            onPick={(id) => {
              const listing = otherListings.find((p) => p.id === id);
              void run(
                () => setPropertyRegion(id, regionId, token!),
                `${listing?.name ?? "Listing"} moved to ${region.name}, with its leads`,
                true,
              );
            }}
          />
          {region.properties.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-4" />}
              title="No listings"
              description="Add the listings this region's team sells. Their leads come with them."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="border-b border-border bg-secondary/60 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">Listing</th>
                      <th>Kind</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Leads</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {region.properties.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.address}</p>
                        </td>
                        <td className="text-sm">
                          {p.kind} · {p.listing}
                        </td>
                        <td>
                          <StatusPill tone={p.status === "Available" ? "success" : "neutral"}>
                            {p.status}
                          </StatusPill>
                        </td>
                        <td className="text-sm tabular-nums">
                          {p.price ? money(p.price) : "On request"}
                        </td>
                        <td className="text-sm tabular-nums">
                          {region.leads.filter((l) => l.propertyId === p.id).length}
                        </td>
                        <td className="pr-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            title={`Remove ${p.name} from ${region.name}`}
                            onClick={() =>
                              void run(
                                () => setPropertyRegion(p.id, null, token!),
                                `${p.name} removed from ${region.name}`,
                                true,
                              )
                            }
                          >
                            <X />
                            <span className="sr-only">Remove from region</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leads">
          {region.leads.length === 0 ? (
            <EmptyState
              icon={<UserRound className="size-4" />}
              title="No leads"
              description="Enquiries on this region's listings land here, as do leads its team adds."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="border-b border-border bg-secondary/60 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">Lead</th>
                      <th>Listing</th>
                      <th>Stage</th>
                      <th>Showing agent</th>
                      <th>Value</th>
                      <th>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {region.leads.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.email}</p>
                        </td>
                        <td className="text-sm">{l.property?.name ?? "General enquiry"}</td>
                        <td>
                          <StatusPill
                            tone={
                              l.stage === "Won"
                                ? "success"
                                : l.stage === "Lost"
                                  ? "danger"
                                  : "accent"
                            }
                          >
                            {l.stage}
                          </StatusPill>
                        </td>
                        <td className="text-sm">
                          {l.owner?.fullName ?? (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </td>
                        <td className="text-sm tabular-nums">{l.value ? money(l.value) : "—"}</td>
                        <td className="text-xs text-muted-foreground">
                          {new Date(l.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <RegionFormDialog
        open={editing}
        onOpenChange={setEditing}
        title={`Edit ${region.name}`}
        submitLabel="Save changes"
        initial={{ name: region.name, code: region.code, description: region.description }}
        onSubmit={async (draft) => {
          if (!token) return;
          await updateRegion(region.id, draft, token);
          toast.success("Region updated");
          refresh();
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {region.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {region.members.length} people, {region.properties.length} listings and{" "}
              {region.leads.length} leads are kept but leave the region — until you place them
              elsewhere, only owners and system admins will see them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void run(
                  async () => {
                    await deleteRegion(region.id, token!);
                    await navigate({ to: "/regions" });
                  },
                  `${region.name} deleted`,
                  true,
                )
              }
            >
              Delete region
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/regions"
      className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      All regions
    </Link>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/** A picker that acts as soon as something is chosen, then resets. */
function AddRow({
  label,
  placeholder,
  options,
  disabled,
  onPick,
}: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled: boolean;
  onPick: (value: string) => void;
}) {
  const [key, setKey] = useState(0);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="shrink-0 text-sm font-semibold">{label}</span>
      <div className="sm:max-w-md sm:flex-1">
        <Select
          key={key}
          disabled={disabled}
          onValueChange={(v) => {
            onPick(v);
            setKey((k) => k + 1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
