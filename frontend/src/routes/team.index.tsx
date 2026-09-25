import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { can, isGlobalRole, regionTeamRoles, roles, type Role } from "@/data/crm";
import { fetchRegions, type Region } from "@/lib/api/regions";
import { fetchUsers, type ApiUser } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/auth-context";
import { useCrm } from "@/lib/crm-context";
import { PageHeader, StatusPill } from "@/components/crm/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Region filter values beyond a region id. */
const ANY = "all";
const GLOBAL = "global";
const UNPLACED = "none";
export const Route = createFileRoute("/team/")({
  head: () => ({
    meta: [
      { title: "Team — Maison CRM" },
      { name: "description", content: "Maison team members and role assignments." },
      { property: "og:title", content: "Team — Maison CRM" },
      { property: "og:description", content: "Maison team members and role assignments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
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

function lastActive(at: string | null) {
  return at ? new Date(at).toLocaleDateString() : "Never";
}

function TeamPage() {
  const { role, myRegion } = useCrm();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  // From the API, which scopes it: a regional user gets their own region's
  // team only; owners and system admins get everyone, with a Region column.
  const [members, setMembers] = useState<ApiUser[] | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const regionNames = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.id, r.name])) as Record<string, string>,
    [regions],
  );
  const global = isGlobalRole(role);
  const [roleFilter, setRoleFilter] = useState<Role | typeof ANY>(ANY);
  const [regionFilter, setRegionFilter] = useState<string>(ANY);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchUsers(token)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setMembers([]);
        toast.error(e instanceof Error ? e.message : "Could not load the team");
      });
    if (global) {
      fetchRegions(token)
        .then((list) => {
          if (!cancelled) setRegions([...list].sort((a, b) => a.name.localeCompare(b.name)));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [token, global]);

  // A regional user's list only ever holds their region's team, so they are
  // offered those four roles and no region filter — the API already scoped it.
  const roleOptions = global ? roles : roles.filter((r) => regionTeamRoles.includes(r.value));
  const filtersOn = roleFilter !== ANY || regionFilter !== ANY || statusFilter !== "all";
  const shown = useMemo(
    () =>
      (members ?? []).filter(
        (m) =>
          (roleFilter === ANY || m.role === roleFilter) &&
          (statusFilter === "all" || m.isActive === (statusFilter === "active")) &&
          (!global ||
            regionFilter === ANY ||
            (regionFilter === GLOBAL
              ? isGlobalRole(m.role)
              : regionFilter === UNPLACED
                ? !isGlobalRole(m.role) && !m.regionId
                : m.regionId === regionFilter)),
      ),
    [members, roleFilter, regionFilter, statusFilter, global],
  );
  const clearFilters = () => {
    setRoleFilter(ANY);
    setRegionFilter(ANY);
    setStatusFilter("all");
  };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        description={
          global || !myRegion
            ? "People with access to this Maison workspace."
            : `Your colleagues in ${myRegion.name}.`
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/team/permissions">
                <ShieldCheck />
                Permissions
              </Link>
            </Button>
            <Button onClick={() => setOpen(true)} disabled={!can(role, "team:invite")}>
              <Plus />
              Invite user
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | typeof ANY)}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All roles</SelectItem>
            {roleOptions.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {global && (
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Filter by region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
              <SelectItem value={GLOBAL}>Owners &amp; admins</SelectItem>
              <SelectItem value={UNPLACED}>Not in a region</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {members && (
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {filtersOn ? `${shown.length} of ${members.length} people` : `${members.length} people`}
          </span>
        )}
        {filtersOn && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead className="border-b border-border bg-secondary/60 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3">User</th>
                <th>Role</th>
                {global && <th>Region</th>}
                <th>Status</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {members === null && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-sm text-muted-foreground">
                    Loading the team…
                  </td>
                </tr>
              )}
              {members !== null && shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-sm text-muted-foreground">
                    {members.length === 0 ? "Nobody here yet." : "Nobody matches these filters."}
                  </td>
                </tr>
              )}
              {shown.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="flex items-center gap-3 px-5 py-4">
                    <Avatar>
                      <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{m.fullName}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </td>
                  <td className="text-sm">{roles.find((r) => r.value === m.role)?.label}</td>
                  {global && (
                    <td className="text-sm">
                      {isGlobalRole(m.role) ? (
                        <span className="text-muted-foreground">All regions</span>
                      ) : m.regionId ? (
                        (regionNames[m.regionId] ?? "…")
                      ) : (
                        <StatusPill tone="warning">Unplaced</StatusPill>
                      )}
                    </td>
                  )}
                  <td>
                    <StatusPill tone={m.isActive ? "success" : "neutral"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </StatusPill>
                  </td>
                  <td className="text-xs text-muted-foreground">{lastActive(m.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Invite a teammate</DialogTitle>
            <DialogDescription>
              They will receive a sample invitation notification.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6 space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="name@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {roles.map((r) => (
                  <option key={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast.success("Invitation prepared");
              }}
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
