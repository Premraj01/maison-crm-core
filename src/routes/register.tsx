import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import doodle from "@/assets/builder-doodle.jpg";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Maison CRM" },
      { name: "description", content: "Create a Maison account and start managing clients, leads and deals." },
      { property: "og:title", content: "Create account — Maison CRM" },
      { property: "og:description", content: "Create a Maison account and start managing clients, leads and deals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Register,
});

function Register() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="flex items-center justify-center p-6">
        <div className="page-enter w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-full bg-foreground font-display text-background">M</span>
            <span className="font-display text-xl">Maison</span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">Get started</p>
          <h1 className="mt-3 font-display text-4xl">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">A few details and your workspace is ready.</p>
          <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first">First name</Label>
                <Input id="first" placeholder="Elena" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Last name</Label>
                <Input id="last" placeholder="Rossi" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" placeholder="Maison Studio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type="password" placeholder="At least 8 characters" />
                <Eye className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
              <Checkbox className="mt-0.5" />
              <span>I agree to the terms of service and privacy policy.</span>
            </label>
            <Button asChild size="lg" className="w-full">
              <Link to="/">Create account <ArrowRight /></Link>
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/sign-in" className="font-semibold text-primary">Sign in</Link>
          </p>
        </div>
      </section>
      <section className="relative hidden overflow-hidden border-l border-border bg-secondary lg:block">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 p-10">
          <span className="grid size-11 place-items-center rounded-full bg-foreground font-display text-lg text-background">M</span>
          <span className="font-display text-xl">Maison</span>
        </div>
        <img
          src={doodle}
          alt="Hand-drawn doodle of houses, blueprints and building tools"
          width={1024}
          height={1280}
          className="size-full object-cover opacity-95 mix-blend-multiply dark:opacity-70 dark:mix-blend-screen dark:invert"
        />
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-secondary via-secondary/90 to-transparent p-10 pt-24">
          <blockquote className="max-w-md font-display text-4xl leading-[1.1]">
            Build something <span className="italic text-primary">lasting.</span>
          </blockquote>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Leads, customers and conversations — gathered in one calm, considered workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
