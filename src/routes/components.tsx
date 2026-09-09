import { createFileRoute } from "@tanstack/react-router";
import { Archive, Bell, Inbox, LoaderCircle, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Banner,
  EmptyState,
  PageHeader,
  SearchField,
  StatusPill,
} from "@/components/crm/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export const Route = createFileRoute("/components")({
  head: () => ({
    meta: [
      { title: "Components — Maison CRM" },
      { name: "description", content: "Maison CRM design system component reference." },
      { property: "og:title", content: "Components — Maison CRM" },
      { property: "og:description", content: "Maison CRM design system component reference." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Components,
});
function Components() {
  return (
    <>
      <PageHeader
        eyebrow="Design system"
        title="Components"
        description="The shared Maison interface language in one working reference."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>
              <Plus />
              Primary
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2 />
              Danger
            </Button>
            <Button disabled>
              <LoaderCircle className="animate-spin" />
              Loading
            </Button>
          </div>
        </Section>
        <Section title="Status & identity">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill>New</StatusPill>
            <StatusPill tone="accent">Proposal</StatusPill>
            <StatusPill tone="success">Strong</StatusPill>
            <StatusPill tone="warning">Watch</StatusPill>
            <StatusPill tone="danger">At risk</StatusPill>
            <Avatar>
              <AvatarFallback>MC</AvatarFallback>
            </Avatar>
          </div>
        </Section>
        <Section title="Form controls">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input className="mt-2" placeholder="Full name" />
            </div>
            <div>
              <Label>Role</Label>
              <Select defaultValue="manager">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea className="mt-2" placeholder="Add context…" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox /> Send a copy
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch defaultChecked /> Notifications
            </label>
          </div>
        </Section>
        <Section title="Feedback">
          <div className="space-y-3">
            <Banner tone="info" title="Information">
              A helpful piece of contextual guidance.
            </Banner>
            <Banner tone="success" title="Changes saved">
              The record is up to date.
            </Banner>
            <Banner tone="warning" title="Review needed">
              One field may need your attention.
            </Banner>
            <Banner tone="error" title="Unable to continue">
              Check the details and try again.
            </Banner>
          </div>
        </Section>
        <Section title="Overlays & menus">
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">A Maison dialog</DialogTitle>
                  <DialogDescription>Focused, calm and clear.</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Archive />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell />
                  Notify
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Bell />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => toast.success("Toast sent")}>Show toast</Button>
          </div>
        </Section>
        <Section title="Tabs">
          <Tabs defaultValue="one">
            <TabsList>
              <TabsTrigger value="one">Overview</TabsTrigger>
              <TabsTrigger value="two">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="one" className="pt-4 text-sm text-muted-foreground">
              Overview content appears here.
            </TabsContent>
            <TabsContent value="two" className="pt-4 text-sm text-muted-foreground">
              Activity content appears here.
            </TabsContent>
          </Tabs>
        </Section>
        <Section title="Loading states">
          <div className="space-y-3">
            <Skeleton className="shimmer h-24 w-full" />
            <div className="flex gap-3">
              <Skeleton className="shimmer size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="shimmer h-3 w-1/3" />
                <Skeleton className="shimmer h-3 w-2/3" />
              </div>
            </div>
            <Skeleton className="shimmer h-36 w-full" />
          </div>
        </Section>
        <Section title="Empty & search">
          <div className="space-y-4">
            <SearchField value="" onChange={() => {}} placeholder="Search records" />
            <EmptyState
              icon={<Inbox className="size-4" />}
              title="Nothing here yet"
              description="New records will appear in this space."
              action={
                <Button size="sm">
                  <Plus />
                  Add record
                </Button>
              }
            />
          </div>
        </Section>
      </div>
    </>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
