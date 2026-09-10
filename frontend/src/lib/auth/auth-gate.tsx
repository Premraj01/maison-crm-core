import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-context";

/** Reachable without a session. Everything else redirects to sign-in. */
const PUBLIC_ROUTES = new Set(["/sign-in", "/register"]);

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

/**
 * Client-side guard. The session lives in localStorage, which the server render
 * cannot see, so this cannot be a `beforeLoad` redirect — it runs once the
 * provider has restored the token.
 *
 * It is a convenience, not a security boundary: every endpoint is enforced by
 * the backend's `JwtAuthGuard` regardless of what the client renders.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isPublic = isPublicRoute(pathname);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "anonymous" && !isPublic) {
      // Remember where they were headed so sign-in can return them to it.
      void navigate({ to: "/sign-in", search: { redirect: pathname }, replace: true });
      return;
    }

    if (status === "authenticated" && isPublic) {
      void navigate({ to: "/", replace: true });
    }
  }, [status, isPublic, pathname, navigate]);

  // Protected routes wait for a confirmed session, so no private page is ever
  // painted for a signed-out visitor. Public routes render straight away —
  // including on the server, where the stored token is not visible — so sign-in
  // is not hidden behind a splash on every cold load.
  if (!isPublic && status !== "authenticated") return <AuthSplash />;

  return <>{children}</>;
}

function AuthSplash() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <span className="sr-only">Checking your session…</span>
      <span
        aria-hidden
        className="size-10 animate-pulse rounded-full bg-foreground/10 ring-1 ring-border"
      />
    </div>
  );
}
