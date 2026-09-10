import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import doodle from "@/assets/builder-doodle.jpg";

interface SignInSearch {
  /** Where AuthGate sent us from, so sign-in can return the user to it. */
  redirect?: string;
}

export const Route = createFileRoute("/sign-in")({
  // Only same-origin paths are honoured — an absolute URL here would turn the
  // sign-in page into an open redirect.
  validateSearch: (search: Record<string, unknown>): SignInSearch => {
    const redirect = search["redirect"];
    return typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")
      ? { redirect }
      : {};
  },
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
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      await signIn(email, password);
      // `redirect` is validated above, so this cannot leave the app.
      await navigate({ to: redirect ?? "/", replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Something went wrong signing you in. Please try again.",
      );
      setPassword("");
      setSubmitting(false);
    }
  }

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
            Enter the credentials for your workspace account.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                disabled={submitting}
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  placeholder="••••••••"
                  className="pr-10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Maison?{" "}
            <Link to="/register" className="font-semibold text-primary">
              Create an account
            </Link>
          </p>
          <SeedAccountHint
            onPick={(seedEmail) => {
              setEmail(seedEmail);
              setPassword(SEED_PASSWORD);
              setError(null);
            }}
          />
        </div>
      </section>
    </main>
  );
}

/** Matches `SEED_PASSWORD` in `backend/prisma/seed.ts`. */
const SEED_PASSWORD = "Maison!2026";

const SEED_ACCOUNTS = [
  { role: "Owner", email: "owner@maison.co" },
  { role: "Admin", email: "admin@maison.co" },
  { role: "Agent", email: "agent@maison.co" },
  { role: "Viewer", email: "viewer@maison.co" },
];

/**
 * Development affordance for the seeded accounts — one per role, so each branch
 * of the permission matrix can be tried without retyping credentials. Vite
 * strips this from a production build.
 */
function SeedAccountHint({ onPick }: { onPick: (email: string) => void }) {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="mt-8 rounded-md border border-dashed border-border p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
        Development · seeded accounts
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SEED_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => onPick(account.email)}
            className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary"
          >
            {account.role}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Run <code className="font-mono">npm run db:seed</code> in the backend, then pick a role to
        fill the form.
      </p>
    </div>
  );
}
