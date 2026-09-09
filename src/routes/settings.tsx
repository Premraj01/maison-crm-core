import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { can, stages } from "@/data/crm";
import { useCrm } from "@/lib/crm-context";
import { Banner, PageHeader } from "@/components/crm/Primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Maison CRM" },
      { name: "description", content: "Profile, appearance, notification, and pipeline settings." },
      { property: "og:title", content: "Settings — Maison CRM" },
      {
        property: "og:description",
        content: "Profile, appearance, notification, and pipeline settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});
function SettingsPage() {
  const { theme, setTheme, role } = useCrm();
  const [notifs, setNotifs] = useState({ deals: true, tasks: true, digest: false });
  const editable = can(role, "settings:edit");
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Personalize your working preferences and pipeline."
      />
      <Tabs defaultValue="profile">
        <TabsList className="mb-5 h-auto max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="font-display text-xl">Your profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <Field label="First name">
                <Input defaultValue="Maya" />
              </Field>
              <Field label="Last name">
                <Input defaultValue="Chen" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email">
                  <Input defaultValue="maya@maison.co" />
                </Field>
              </div>
              <Button onClick={() => toast.success("Profile updated")} disabled={!editable}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="font-display text-xl">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`rounded-md border p-4 text-left ${theme === "light" ? "border-primary ring-2 ring-ring/20" : "border-border"}`}
                >
                  <Sun className="size-5" />
                  <p className="mt-8 text-sm font-semibold">Light</p>
                  <p className="text-xs text-muted-foreground">Paper and cream</p>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`rounded-md border p-4 text-left ${theme === "dark" ? "border-primary ring-2 ring-ring/20" : "border-border"}`}
                >
                  <Moon className="size-5" />
                  <p className="mt-8 text-sm font-semibold">Dark</p>
                  <p className="text-xs text-muted-foreground">Ink and terracotta</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="font-display text-xl">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {[
                { key: "deals", title: "Deal activity", desc: "Stage changes and proposal views" },
                { key: "tasks", title: "Task reminders", desc: "Upcoming and overdue tasks" },
                {
                  key: "digest",
                  title: "Weekly digest",
                  desc: "A Monday summary of your pipeline",
                },
              ].map(({ key, title, desc }) => (
                <div
                  key={key}
                  className="flex items-center gap-4 border-b border-border py-4 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={notifs[key as keyof typeof notifs]}
                    onCheckedChange={(v) => setNotifs((n) => ({ ...n, [key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pipeline">
          <div className="max-w-2xl space-y-4">
            {!editable && (
              <Banner tone="warning" title="Read-only preview">
                This role can view pipeline stages but cannot change them.
              </Banner>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">Pipeline stages</CardTitle>
              </CardHeader>
              <CardContent>
                {stages.map((s, i) => (
                  <div
                    key={s}
                    className="flex items-center gap-3 border-b border-border py-3 last:border-0"
                  >
                    <GripVertical className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{s}</span>
                    <span className="text-xs text-muted-foreground">Stage {i + 1}</span>
                  </div>
                ))}
                <Button
                  className="mt-5"
                  variant="outline"
                  disabled={!editable}
                  onClick={() => toast.success("Stage order saved")}
                >
                  Save stage order
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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
