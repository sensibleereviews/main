// Next.js instrumentation hook — runs once per server boot (nodejs runtime).
// Repairs DB state after platform checkpoint rollbacks (see src/lib/db-guard.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureDbInvariants } = await import("@/lib/db-guard");
  await ensureDbInvariants();
}
