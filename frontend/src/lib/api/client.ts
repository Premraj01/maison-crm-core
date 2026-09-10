const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3000";
const API_PREFIX = import.meta.env["VITE_API_PREFIX"] ?? "/api";

/**
 * A non-2xx response from the backend, carrying the status so callers can tell
 * "wrong password" (401) from "the server is down" without parsing strings.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The token is missing, expired, or the account was deactivated. */
  get isUnauthorized() {
    return this.status === 401;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

/**
 * Thin fetch wrapper: JSON in, JSON out, backend error messages preserved.
 * The token is passed explicitly rather than read from storage here, so this
 * module stays usable on the server, where there is no localStorage.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
      ...rest,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    // fetch only rejects when the request never completed — DNS, CORS, offline.
    throw new ApiError(0, "Could not reach the server. Is the backend running?");
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload) ?? response.statusText);
  }

  return payload as T;
}

/** Nest's exception filter sends `message` as a string, or an array for validation errors. */
function extractMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { message } = payload as { message?: unknown };

  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.filter((part) => typeof part === "string").join(", ");
  return null;
}
