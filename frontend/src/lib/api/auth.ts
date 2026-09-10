import type { Role } from "@/data/crm";
import { apiRequest } from "./client";

/** Mirrors `PublicUser` on the backend — every user column except the digest. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  orgId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AuthSession {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}

export function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

/** Confirms a stored token is still valid and returns a fresh copy of the user. */
export function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me", { token });
}
