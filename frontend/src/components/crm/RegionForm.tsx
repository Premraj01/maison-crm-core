import { useState } from "react";
import { toast } from "sonner";
import type { RegionDraft } from "@/lib/api/regions";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

/** Create and edit share one form; `initial` seeds it for an edit. */
export function RegionFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initial?: RegionDraft;
  onSubmit: (draft: RegionDraft) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const draft: RegionDraft = {
      name: String(f.get("name") ?? "").trim(),
      code: String(f.get("code") ?? "")
        .trim()
        .toUpperCase(),
      description: String(f.get("description") ?? "").trim(),
    };
    setSaving(true);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the region");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed so reopening for another region re-seeds the uncontrolled fields. */}
        <form key={`${open}-${initial?.name ?? ""}`} onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
            <DialogDescription>
              A region groups a team with the listings it sells and the leads on them.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6 grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="region-name">Name</Label>
              <Input
                id="region-name"
                name="name"
                required
                maxLength={120}
                defaultValue={initial?.name}
                placeholder="West Coast"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-code">Code</Label>
              <Input
                id="region-code"
                name="code"
                required
                maxLength={12}
                pattern="[A-Za-z0-9\-]{1,12}"
                title="Up to 12 letters, digits or dashes"
                defaultValue={initial?.code}
                placeholder="WC"
                className="uppercase"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="region-description">Description</Label>
              <Textarea
                id="region-description"
                name="description"
                maxLength={2000}
                defaultValue={initial?.description}
                placeholder="Which cities or areas this region covers"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
