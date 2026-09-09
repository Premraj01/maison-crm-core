import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import doodle from "@/assets/builder-doodle.jpg";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — Maison CRM" },
      { name: "description", content: "Sign in to the Maison client relationship workspace." },
      { property: "og:title", content: "Sign in — Maison CRM" },
      {
        property: "og:description",
        content: "Sign in to the Maison client relationship workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-border bg-secondary lg:block">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 p-10">
          <span className="grid size-11 place-items-center rounded-full bg-foreground font-display text-lg text-background">
            M
          </span>
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
            Every relationship, <span className="italic text-primary">considered.</span>
          </blockquote>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            A quieter way to manage the people, conversations and opportunities that move your work
            forward.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="page-enter w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-full bg-foreground font-display text-background">
              M
            </span>
            <span className="font-display text-xl">Maison</span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">
            Welcome back
          </p>
          <h1 className="mt-3 font-display text-4xl">Sign in to Maison</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use any details to preview the workspace.
          </p>
          <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input id="password" type="password" placeholder="••••••••" />
                <Eye className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <Button asChild size="lg" className="w-full">
              <Link to="/">
                Sign in <ArrowRight />
              </Link>
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Maison?{" "}
            <Link to="/register" className="font-semibold text-primary">
              Create an account
            </Link>
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Visual preview only · no account required
          </p>
        </div>
      </section>
    </main>
  );
}
