// Sensiblee auth — scrypt password hashing + HMAC-signed session tokens (httpOnly cookie)
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { effectivePermissions, hasPerm } from "./permissions";

const SECRET = process.env.SESSION_SECRET || "sensiblee-dev-secret-change-in-production";
export const SESSION_COOKIE = "ss_session";
export const RESTORE_COOKIE = "ss_restore";
const SESSION_DAYS = 7;

export type SessionPayload = {
  uid: string;
  role: string;
  tenantId?: string;
  name: string;
  email: string;
  imp?: string; // admin uid when impersonating
  exp: number; // epoch ms
};

/* ------------------------------ passwords ------------------------------ */

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pw, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/* ------------------------------- tokens -------------------------------- */

const b64u = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uDec = (str: string) => Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();

function sign(data: string): string {
  return b64u(createHmac("sha256", SECRET).update(data).digest());
}

export function signToken(payload: Omit<SessionPayload, "exp">, days = SESSION_DAYS): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + days * 86400_000 };
  const body = b64u(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token?: string | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64uDec(body)) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ------------------------------- session ------------------------------- */

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifyToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new ApiError(401, "Not signed in");
  return s;
}

export async function requirePlatformAdmin(): Promise<SessionPayload> {
  // Accepts all platform staff roles: super admin, managers and observers
  const s = await requireSession();
  if (!["platform_admin", "platform_manager", "platform_observer"].includes(s.role)) {
    throw new ApiError(403, "Platform admin only");
  }
  return s;
}

export async function requirePlatformOperator(): Promise<SessionPayload> {
  // Super admin + managers can mutate; observers are read-only
  const s = await requirePlatformAdmin();
  if (s.role === "platform_observer") throw new ApiError(403, "Read-only access — ask a platform admin for changes");
  return s;
}

export async function requireSuperAdmin(): Promise<SessionPayload> {
  const s = await requirePlatformAdmin();
  if (s.role !== "platform_admin") throw new ApiError(403, "Super admin only");
  return s;
}

export async function requireTenantUser(): Promise<SessionPayload> {
  const s = await requireSession();
  if (!s.tenantId) throw new ApiError(403, "Tenant workspace required");
  return s;
}

/* ------------------------------ permissions ---------------------------- */

// Resolve the effective permission ids for the signed-in user from the DB.
export async function loadPermissions(sess: SessionPayload): Promise<string[]> {
  const user = await db.user.findUnique({ where: { id: sess.uid }, select: { role: true, roleId: true, roleRef: true } });
  if (!user) return [];
  return effectivePermissions(user.role, user.roleRef);
}

// Tenant write guard: owner passes always; team members need the permission.
export async function requireTenantPerm(perm: string): Promise<SessionPayload> {
  const s = await requireTenantUser();
  const perms = await loadPermissions(s);
  if (!hasPerm(perms, perm)) {
    if (s.role === "observer") throw new ApiError(403, "Read-only access — ask the workspace owner for changes");
    throw new ApiError(403, `Missing permission: ${perm.replace(/_/g, " ")} — ask the workspace owner for access`);
  }
  return s;
}

// Platform write guard: super admin passes always; staff need the permission.
export async function requirePlatformPerm(perm: string): Promise<SessionPayload> {
  const s = await requirePlatformAdmin();
  const perms = await loadPermissions(s);
  if (!hasPerm(perms, perm)) {
    if (s.role === "platform_observer") throw new ApiError(403, "Read-only access — ask a platform admin for changes");
    throw new ApiError(403, `Missing permission: ${perm.replace(/_/g, " ")} — ask a super admin for access`);
  }
  return s;
}

/* -------------------------------- errors ------------------------------- */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function loadUser(sess: SessionPayload) {
  return db.user.findUnique({ where: { id: sess.uid }, include: { tenant: { include: { plan: true } } } });
}
