// Route-handler helpers: JSON responses, error wrapping, body parsing
import { NextResponse } from "next/server";
import { ApiError } from "./auth";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) return fail(err.status, err.message);
  console.error("[api]", err);
  const msg = err instanceof Error ? err.message : "Unexpected server error";
  return fail(500, msg);
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

export function requireFields(obj: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === "");
  if (missing.length) throw new ApiError(400, `Missing required fields: ${missing.join(", ")}`);
}

export function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
