import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  KanbanSquare,
  List,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { can, stages, type Lead, type LeadStage } from "@/data/crm";
import { useCrm } from "@/lib/crm-context";
import { PageHeader, SearchField, StatusPill } from "@/components/crm/Primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Maison CRM" },
      { name: "description", content: "Track and manage every Maison sales opportunity." },
      { property: "og:title", content: "Leads — Maison CRM" },
      { property: "og:description", content: "Track and manage every Maison sales opportunity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});
function tone(stage: LeadStage) {
  return stage === "Won"
    ? "success"
    : stage === "Lost"
      ? "danger"
      : stage === "Proposal"
        ? "accent"
        : stage === "Qualified"
          ? "warning"
          : ("neutral" as const);
}
function LeadsPage() {
  const { leads, role, setLeadStage, upsertLead } = useCrm();
  const [view, setView] = useState<"table" | "kanban">("table"),
    [search, setSearch] = useState(""),
    [stage, setStage] = useState("All"),
    [selected, setSelected] = useState<Lead | null>(null),
    [editing, setEditing] = useState<Lead | null>(null),
    [sortAsc, setSortAsc] = useState(false);
  const filtered = useMemo(
    () =>
      leads
        .filter(
          (l) =>
            (stage === "All" || l.stage === stage) &&
            `${l.name} ${l.company}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => (sortAsc ? 1 : -1) * (a.value - b.value)),
    [leads, search, stage, sortAsc],
  );
  const allowed = can(role, "lead:create");
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const lead: Lead = {
      id: editing?.id ?? `L-${1050 + leads.length}`,
      name: String(f.get("name")),
      company: String(f.get("company")),
      email: String(f.get("email")),
      value: Number(f.get("value")),
      stage: String(f.get("stage")) as LeadStage,
      source: editing?.source ?? "Website",
      owner: "Maya Chen",
      lastContact: "Just now",
      note: String(f.get("note")),
    };
    upsertLead(lead);
    setEditing(null);
    toast.success(editing ? "Lead updated" : "Lead added");
  };
  return (
    <>
      <PageHeader
        eyebrow="Sales workspace"
        title="Leads"
        description={`${leads.length} opportunities · $${(leads.reduce((n, l) => n + l.value, 0) / 1e6).toFixed(2)}M total pipeline`}
        actions={
          <Button
            onClick={() =>
              setEditing({
                id: "",
                name: "",
                company: "",
                email: "",
                value: 0,
                stage: "New",
                source: "Website",
                owner: "Maya Chen",
                lastContact: "",
                note: "",
              })
            }
            disabled={!allowed}
          >
            <Plus />
            Add lead
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search leads or companies"
          />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border bg-card p-1">
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
          >
            <List />
            Table
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <KanbanSquare />
            Pipeline
          </Button>
        </div>
      </div>
      {view === "table" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-border bg-secondary/60 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Lead</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Source</th>
                  <th>
                    <button
                      className="flex items-center gap-1"
                      onClick={() => setSortAsc(!sortAsc)}
                    >
                      Value <ArrowDownUp className="size-3" />
                    </button>
                  </th>
                  <th>Last contact</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/40"
                    onClick={() => setSelected(l)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.company}</p>
                    </td>
                    <td>
                      <StatusPill tone={tone(l.stage)}>{l.stage}</StatusPill>
                    </td>
                    <td className="text-sm">{l.owner}</td>
                    <td className="text-sm text-muted-foreground">{l.source}</td>
                    <td className="text-sm font-semibold tabular-nums">
                      ${l.value.toLocaleString()}
                    </td>
                    <td className="text-xs text-muted-foreground">{l.lastContact}</td>
                    <td>
                      <MoreHorizontal className="size-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div
          className="grid gap-3 overflow-x-auto pb-4"
          style={{ gridTemplateColumns: "repeat(6,minmax(245px,1fr))" }}
        >
          {stages.map((s) => (
            <section
              key={s}
              className="rounded-md bg-secondary/55 p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (can(role, "lead:move")) {
                  setLeadStage(e.dataTransfer.getData("lead"), s);
                  toast.success(`Moved to ${s}`);
                }
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[.12em]">{s}</h2>
                <span className="text-xs text-muted-foreground">
                  {filtered.filter((l) => l.stage === s).length}
                </span>
              </div>
              <div className="space-y-3">
                {filtered
                  .filter((l) => l.stage === s)
                  .map((l) => (
                    <Card
                      key={l.id}
                      draggable={can(role, "lead:move")}
                      onDragStart={(e) => e.dataTransfer.setData("lead", l.id)}
                      onClick={() => setSelected(l)}
                      className="cursor-pointer p-4 transition-transform hover:-translate-y-0.5"
                    >
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{l.company}</p>
                      <p className="mt-5 font-display text-xl">${l.value.toLocaleString()}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">{l.owner}</p>
                    </Card>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-overlay"
            aria-label="Close lead details"
            onClick={() => setSelected(null)}
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-xl page-enter">
            <div className="flex items-center justify-between">
              <StatusPill tone={tone(selected.stage)}>{selected.stage}</StatusPill>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                <X />
              </Button>
            </div>
            <div className="mt-8 grid size-14 place-items-center rounded-full bg-secondary font-display text-xl">
              {selected.name
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </div>
            <h2 className="mt-4 font-display text-3xl">{selected.name}</h2>
            <p className="text-sm text-muted-foreground">{selected.company}</p>
            <div className="mt-6 flex gap-2">
              <Button variant="outline">
                <Mail />
                Email
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(selected);
                  setSelected(null);
                }}
                disabled={!can(role, "lead:edit")}
              >
                Edit lead
              </Button>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-5 border-y border-border py-6 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Value</dt>
                <dd className="mt-1 font-semibold">${selected.value.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Owner</dt>
                <dd className="mt-1 font-semibold">{selected.owner}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Source</dt>
                <dd className="mt-1">{selected.source}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="mt-1 truncate">{selected.email}</dd>
              </div>
            </dl>
            <h3 className="mt-7 font-display text-xl">Notes</h3>
            <p className="mt-3 rounded-md bg-secondary p-4 text-sm leading-6">{selected.note}</p>
            <h3 className="mt-7 font-display text-xl">Timeline</h3>
            {[
              "Lead added to Maison",
              "Discovery details captured",
              `Moved to ${selected.stage}`,
            ].map((x, i) => (
              <div key={x} className="ml-2 flex gap-3 border-l border-border py-3 pl-5 text-sm">
                <span className="-ml-[27px] mt-1 size-3 rounded-full border-2 border-card bg-primary" />
                <div>
                  <p>{x}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i === 2 ? selected.lastContact : `${i + 2} days ago`}
                  </p>
                </div>
              </div>
            ))}
          </aside>
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {editing?.id ? "Edit lead" : "Add a new lead"}
              </DialogTitle>
              <DialogDescription>
                Keep the record concise; details can be refined later.
              </DialogDescription>
            </DialogHeader>
            <div className="my-6 grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input name="name" required defaultValue={editing?.name} />
              </Field>
              <Field label="Company">
                <Input name="company" required defaultValue={editing?.company} />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" required defaultValue={editing?.email} />
              </Field>
              <Field label="Value">
                <Input name="value" type="number" required defaultValue={editing?.value} />
              </Field>
              <Field label="Stage">
                <select
                  name="stage"
                  defaultValue={editing?.stage}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Note">
                  <Textarea name="note" defaultValue={editing?.note} />
                </Field>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save lead</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
