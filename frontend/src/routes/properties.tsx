import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bath,
  BedDouble,
  Building2,
  Archive,
  ExternalLink,
  MessageSquare,
  ImagePlus,
  Images,
  MapPin,
  Pencil,
  Plus,
  Ruler,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  can,
  hasRooms,
  isArchived,
  isGlobalRole,
  listingTypes,
  propertyKinds,
  propertyStatuses,
  type ListingType,
  type Property,
  type PropertyKind,
  type PropertyStatus,
} from "@/data/crm";
import { useAuth } from "@/lib/auth/auth-context";
import { createProperty, updateProperty, type PropertyDraft } from "@/lib/api/properties";
import { fetchRegions, type Region } from "@/lib/api/regions";
import { useCrm } from "@/lib/crm-context";
import { EmptyState, PageHeader, SearchField, StatusPill } from "@/components/crm/Primitives";
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

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: "Properties — Maison CRM" },
      { name: "description", content: "Every listing in the portfolio, to rent or to buy." },
      { property: "og:title", content: "Properties — Maison CRM" },
      {
        property: "og:description",
        content: "Every listing in the portfolio, to rent or to buy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertiesPage,
});

/** Listings are held in memory, so uploads are read into data URLs rather than
 *  posted anywhere. Swap this for a real upload once the backend has a
 *  properties table — the rest of the page only ever sees `string[]`. */
function readImages(files: FileList) {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    ),
  );
}

/** Where the public beacon-estates site is served, so a synced listing can link
 *  through to its own page. Both apps default to Vite's port 8080, so whichever
 *  starts second lands on 8081 — set VITE_SITE_URL rather than relying on that. */
const SITE_URL = (import.meta.env["VITE_SITE_URL"] ?? "http://localhost:8081").replace(/\/$/, "");

/** A price is optional on a listing, so every display of one goes through here. */
function priceLabel(p: Property) {
  if (p.price === undefined || p.price === null) return "Price on request";
  const amount = p.price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return p.listing === "Rent" ? `${amount} / mo` : amount;
}

const emptyProperty: Property = {
  id: "",
  slug: "",
  name: "",
  address: "",
  kind: "Apartment",
  listing: "Sale",
  status: "Available",
  details: "",
  features: [],
  images: [],
};

function PropertiesPage() {
  const {
    properties,
    propertiesStatus,
    propertiesError,
    role,
    upsertProperty,
    reloadProperties,
    leads,
  } = useCrm();
  // How many people have enquired about each listing. Counted from the leads
  // already in context rather than a per-card request — and it is why the
  // count is only as fresh as the leads list.
  const enquiries = useMemo(() => {
    const byProperty = new Map<string, number>();
    for (const lead of leads) {
      if (lead.propertyId)
        byProperty.set(lead.propertyId, (byProperty.get(lead.propertyId) ?? 0) + 1);
    }
    return byProperty;
  }, [leads]);
  const { token } = useAuth();
  const [search, setSearch] = useState(""),
    [kindFilter, setKindFilter] = useState("All"),
    [statusFilter, setStatusFilter] = useState("Available"),
    [listingFilter, setListingFilter] = useState("All"),
    [regionFilter, setRegionFilter] = useState("All"),
    [editing, setEditing] = useState<Property | null>(null);
  const canCreate = can(role, "property:create"),
    canEdit = can(role, "property:edit");

  // Only owners and system admins see more than one region, so only they get
  // the region filter and the per-region grouping. Everyone else's list is
  // already their own region's, and the API refuses them `/regions` anyway.
  const global = isGlobalRole(role);
  const [regions, setRegions] = useState<Region[]>([]);
  useEffect(() => {
    if (!token || !global) {
      setRegions([]);
      return;
    }
    let cancelled = false;
    fetchRegions(token)
      .then((list) => {
        if (!cancelled) setRegions(list);
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, global]);
  const regionName = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions]);

  const filtered = useMemo(
    () =>
      properties.filter(
        (p) =>
          (kindFilter === "All" || p.kind === kindFilter) &&
          (listingFilter === "All" || p.listing === listingFilter) &&
          (statusFilter === "All" ||
            (statusFilter === "Archived" ? isArchived(p.status) : p.status === statusFilter)) &&
          (regionFilter === "All" ||
            (regionFilter === "None" ? !p.regionId : p.regionId === regionFilter)) &&
          `${p.name} ${p.address}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [properties, search, kindFilter, listingFilter, statusFilter, regionFilter],
  );

  // Sorted by region name, A to Z, with listings in no region last. Within a
  // region the API's order (newest first) is kept, since the sort is stable.
  // A region the list doesn't know yet (just created elsewhere) sorts with the
  // unplaced rather than vanishing.
  const groups = useMemo(() => {
    if (!global) return [{ key: "all", title: null as string | null, items: filtered }];
    const byRegion = new Map<string, Property[]>();
    for (const p of filtered) {
      const key = p.regionId && regionName.has(p.regionId) ? p.regionId : "none";
      byRegion.set(key, [...(byRegion.get(key) ?? []), p]);
    }
    return [...byRegion.entries()]
      .map(([key, items]) => ({
        key,
        title: key === "none" ? "Not in a region" : (regionName.get(key) ?? ""),
        items,
      }))
      .sort((a, b) =>
        a.key === "none" ? 1 : b.key === "none" ? -1 : a.title.localeCompare(b.title),
      );
  }, [filtered, global, regionName]);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        description={`${properties.filter((p) => !isArchived(p.status)).length} on the market · ${properties.filter((p) => isArchived(p.status)).length} archived · ${properties.length} in total`}
        actions={
          <Button onClick={() => setEditing(emptyProperty)} disabled={!canCreate}>
            <Plus />
            Add property
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name or address"
          />
        </div>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All types</SelectItem>
            {propertyKinds.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Available">On the market</SelectItem>
            <SelectItem value="Archived">Archived (sold &amp; rented)</SelectItem>
            <SelectItem value="Sold">Sold</SelectItem>
            <SelectItem value="Rented">Rented</SelectItem>
            <SelectItem value="All">All listings</SelectItem>
          </SelectContent>
        </Select>
        <Select value={listingFilter} onValueChange={setListingFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Rent &amp; sale</SelectItem>
            {listingTypes.map((l) => (
              <SelectItem key={l} value={l}>
                For {l.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {global && (
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
              <SelectItem value="None">Not in a region</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {propertiesStatus === "loading" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="h-80 animate-pulse bg-secondary/50" />
          ))}
        </div>
      ) : propertiesStatus === "error" ? (
        <EmptyState
          icon={<Building2 />}
          title="Could not load the portfolio"
          description={propertiesError ?? "The API did not respond."}
          action={
            <Button variant="secondary" onClick={reloadProperties}>
              Try again
            </Button>
          }
        />
      ) : filtered.length ? (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              {group.title && (
                <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-2">
                  <h2
                    className={`font-display text-2xl ${group.key === "none" ? "text-muted-foreground" : ""}`}
                  >
                    {group.title}
                  </h2>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {group.items.length} listing{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((p) => (
                  <Card
                    key={p.id}
                    className="reveal-card group flex h-full flex-col overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                      {p.images.length ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          // Archived listings are blurred rather than hidden. The
                          // slight scale hides the transparent edge blur leaves.
                          className={`size-full object-cover transition-transform duration-300 ${
                            isArchived(p.status)
                              ? "scale-110 blur-[6px] saturate-50"
                              : "group-hover:scale-[1.03]"
                          }`}
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-muted-foreground">
                          <Building2 className="size-8" />
                        </div>
                      )}
                      {isArchived(p.status) && (
                        <div className="absolute inset-0 grid place-items-center bg-overlay">
                          <span className="rounded-full bg-background/95 px-4 py-1.5 font-display text-lg tracking-wide">
                            {p.status}
                          </span>
                        </div>
                      )}
                      <div className="absolute left-3 top-3">
                        <StatusPill
                          tone={
                            isArchived(p.status)
                              ? "neutral"
                              : p.listing === "Rent"
                                ? "accent"
                                : "success"
                          }
                        >
                          {isArchived(p.status) ? p.status : `For ${p.listing.toLowerCase()}`}
                        </StatusPill>
                      </div>
                      {(enquiries.get(p.id) ?? 0) > 0 && (
                        <Link
                          to="/leads"
                          search={{ property: p.id }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-transform hover:scale-105"
                          title="See the enquiries for this listing"
                        >
                          <MessageSquare className="size-3" />
                          {enquiries.get(p.id)}
                        </Link>
                      )}
                      {p.images.length > 1 && (
                        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-overlay px-2 py-1 text-[11px] font-semibold text-white">
                          <Images className="size-3" />
                          {p.images.length}
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex flex-1 flex-col p-5 ${isArchived(p.status) ? "opacity-70" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-display text-xl leading-tight">{p.name}</h2>
                        <StatusPill>{p.kind}</StatusPill>
                      </div>
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="mt-px size-3.5 shrink-0" />
                        <span>{p.address}</span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {p.bedrooms != null && (
                          <span className="inline-flex items-center gap-1.5">
                            <BedDouble className="size-3.5" />
                            {p.bedrooms} bed
                          </span>
                        )}
                        {p.bathrooms != null && (
                          <span className="inline-flex items-center gap-1.5">
                            <Bath className="size-3.5" />
                            {p.bathrooms} bath
                          </span>
                        )}
                        {p.area != null && (
                          <span className="inline-flex items-center gap-1.5">
                            <Ruler className="size-3.5" />
                            {p.area.toLocaleString("en-US")} sq ft
                          </span>
                        )}
                      </div>
                      {p.details && (
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {p.details}
                        </p>
                      )}
                      {p.features && p.features.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.features.slice(0, 3).map((f) => (
                            <span
                              key={f}
                              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {f}
                            </span>
                          ))}
                          {p.features.length > 3 && (
                            <span className="px-1 py-0.5 text-[10px] text-muted-foreground">
                              +{p.features.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                            {isArchived(p.status)
                              ? p.status === "Sold"
                                ? "Sold for"
                                : "Let at"
                              : p.listing === "Rent"
                                ? "Rent"
                                : "Asking price"}
                          </p>
                          <p
                            className={`mt-1 font-semibold ${p.price === undefined || p.price === null ? "text-muted-foreground" : ""}`}
                          >
                            {priceLabel(p)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {p.slug && (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={`${SITE_URL}/properties/${p.slug}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink />
                                View on site
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(p)}
                            disabled={!canEdit}
                          >
                            <Pencil />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 />}
          title={properties.length ? "No properties match" : "No properties yet"}
          description={
            properties.length
              ? "Try a different search, type, region, or rent/sale filter."
              : "Add your first listing to start building the portfolio."
          }
          action={
            canCreate && !properties.length ? (
              <Button onClick={() => setEditing(emptyProperty)}>
                <Plus />
                Add property
              </Button>
            ) : undefined
          }
        />
      )}

      {editing && (
        <PropertyDialog
          property={editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (!token) {
              toast.error("Your session has expired — sign in again");
              return;
            }
            const isEdit = Boolean(editing.id);
            try {
              // The saved row comes back from the server, so the list shows the
              // slug and timestamps it assigned rather than a local guess.
              const saved = isEdit
                ? await updateProperty(editing.id, draft, token)
                : await createProperty(draft, token);
              upsertProperty(saved);
              setEditing(null);
              toast.success(
                isEdit ? "Property updated" : `Published — live at /properties/${saved.slug}`,
              );
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not save the property");
            }
          }}
        />
      )}
    </>
  );
}

function PropertyDialog({
  property,
  onClose,
  onSave,
}: {
  property: Property;
  onClose: () => void;
  onSave: (draft: PropertyDraft) => Promise<void>;
}) {
  // Kind and listing drive which fields are shown, so they are controlled;
  // everything else is read off the form on submit.
  const [kind, setKind] = useState<PropertyKind>(property.kind);
  const [listing, setListing] = useState<ListingType>(property.listing);
  const [status, setStatus] = useState<PropertyStatus>(property.status);
  const [images, setImages] = useState<string[]>(property.images);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const rooms = hasRooms(kind);

  const pickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const added = await readImages(files);
      setImages((current) => [...current, ...added]);
    } catch {
      toast.error("Could not read those images");
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // A blank number input is "not recorded", not zero — and the API rejects an
    // explicit undefined for an optional field, so those keys are dropped by
    // `clean()` in the API client rather than sent.
    const num = (key: string) => {
      const raw = String(f.get(key) ?? "").trim();
      return raw === "" ? undefined : Number(raw);
    };

    setSaving(true);
    await onSave({
      name: String(f.get("name")).trim(),
      address: String(f.get("address")).trim(),
      kind,
      listing,
      status,
      price: num("price"),
      bedrooms: rooms ? num("bedrooms") : undefined,
      bathrooms: rooms ? num("bathrooms") : undefined,
      area: num("area"),
      details: String(f.get("details")).trim(),
      images,
      // Presentation and authored prose are the website's; they round-trip
      // untouched so a save here cannot strip a published listing of them.
      features: property.features,
      ...(property.tag ? { tag: property.tag } : {}),
      ...(property.portrait ? { portrait: property.portrait } : {}),
      ...(property.featured ? { featured: property.featured } : {}),
    });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {property.id ? "Edit property" : "Add a property"}
            </DialogTitle>
            <DialogDescription>
              Photographs and an address are what clients respond to; the rest can follow.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-5">
            <div className="space-y-2">
              <Label>Images</Label>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((src, i) => (
                  <div
                    key={`${i}-${src.slice(-16)}`}
                    className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border"
                  >
                    <img
                      src={src}
                      alt={`Property image ${i + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((c) => c.filter((_, at) => at !== i))}
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-overlay text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      <X className="size-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded-sm bg-overlay px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="grid aspect-[4/3] place-items-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <span className="text-center">
                    <ImagePlus className="mx-auto size-5" />
                    <span className="mt-1 block text-[10px] uppercase tracking-wider">Add</span>
                  </span>
                </button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => pickImages(e.target.files)}
              />
              <p className="text-xs text-muted-foreground">
                The first image is used as the cover on the listing card.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Property name">
                <Input
                  name="name"
                  required
                  defaultValue={property.name}
                  placeholder="Ashford Terrace 12B"
                />
              </Field>
              <Field label="Property type">
                <Select value={kind} onValueChange={(v) => setKind(v as PropertyKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyKinds.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <Input
                    name="address"
                    required
                    defaultValue={property.address}
                    placeholder="Street, locality, city"
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Listing type">
                <div className="flex rounded-md border border-border bg-card p-1">
                  {listingTypes.map((l) => (
                    <Button
                      key={l}
                      type="button"
                      variant={listing === l ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setListing(l)}
                    >
                      For {l.toLowerCase()}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as PropertyStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "Available" ? "On the market" : `${s} — archived`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={listing === "Rent" ? "Monthly rent (optional)" : "Price (optional)"}>
                <Input
                  name="price"
                  type="number"
                  min="0"
                  defaultValue={property.price ?? ""}
                  placeholder="Leave blank for price on request"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {rooms && (
                <>
                  <Field label="Bedrooms">
                    <Input
                      name="bedrooms"
                      type="number"
                      min="0"
                      defaultValue={property.bedrooms ?? ""}
                    />
                  </Field>
                  <Field label="Bathrooms">
                    <Input
                      name="bathrooms"
                      type="number"
                      min="0"
                      defaultValue={property.bathrooms ?? ""}
                    />
                  </Field>
                </>
              )}
              <Field label={rooms ? "Built-up area (sq ft)" : "Plot size (sq ft)"}>
                <Input name="area" type="number" min="0" defaultValue={property.area ?? ""} />
              </Field>
            </div>

            <Field label="More details">
              <Textarea
                name="details"
                rows={3}
                defaultValue={property.details}
                placeholder={
                  rooms
                    ? "Facing, floor, furnishing, parking, amenities…"
                    : "Dimensions, frontage, approvals, title status…"
                }
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
