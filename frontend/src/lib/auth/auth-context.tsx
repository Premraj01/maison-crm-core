import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "@/lib/api/client";
import { fetchCurrentUser, login as loginRequest, type AuthUser } from "@/lib/api/auth";
import { disconnectSocket, setSocketAuth } from "@/lib/realtime/client";

const STORAGE_KEY = "maison-auth";

/**
 * `loading` covers both the server render and the first client tick, before the
 * stored token has been re-checked. Route guards must wait it out rather than
 * treating it as signed out, or every reload would flash the sign-in page.
 */
type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredSession {
  token: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<StoredSession | null>(null);

  // Restore on mount, then confirm with the backend. The cached user is shown
  // immediately so the app does not blank out on every reload; if the token has
  // expired or the account was deactivated, /auth/me rejects and we sign out.
  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      setStatus("anonymous");
      return;
    }

    setSession(stored);
    setStatus("authenticated");
    setSocketAuth(stored.token);

    let cancelled = false;
    fetchCurrentUser(stored.token)
      .then((user) => {
        if (cancelled) return;
        const next = { token: stored.token, user };
        setSession(next);
        writeStoredSession(next);
      })
      .catch((error: unknown) => {
        // A network blip must not sign the user out — only a rejected token does.
        if (cancelled || !(error instanceof ApiError) || !error.isUnauthorized) return;
        clearStoredSession();
        setSession(null);
        setStatus("anonymous");
        setSocketAuth(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    const next = { token: result.accessToken, user: result.user };

    writeStoredSession(next);
    setSession(next);
    setStatus("authenticated");
    // Re-open the socket with the new credentials so org events start arriving.
    setSocketAuth(next.token);

    return result.user;
  }, []);

  const signOut = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setStatus("anonymous");
    // Drop the connection entirely — a fresh one is made at the next sign-in.
    disconnectSocket();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user: session?.user ?? null, token: session?.token ?? null, signIn, signOut }),
    [status, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

/**
 * The token lives in localStorage, which is readable by any script on the
 * origin. That is the right trade for a starter — it keeps the API stateless
 * and the same token authenticates the WebSocket handshake. Moving to an
 * httpOnly cookie later means changing this module and the backend's login
 * response; nothing in between needs to know.
 */
function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const { token, user } = parsed as Partial<StoredSession>;
    if (typeof token !== "string" || !token || !user?.id) return null;

    return { token, user };
  } catch {
    // Unreadable or malformed storage — treat it as signed out.
    return null;
  }
}

function writeStoredSession(value: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode or a full quota: the session still works for this tab.
  }
}

function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing useful to do */
  }
}
