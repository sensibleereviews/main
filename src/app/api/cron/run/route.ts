import { NextResponse } from "next/server";
import { runCronTasks } from "@/lib/cron-runner";
import { getSession } from "@/lib/auth";

// Endpoint to trigger background cron execution
// Can be called by external schedulers (e.g. Vercel Cron, CRON_SECRET) or by platform admins
export async function GET(req: Request) {
  return handleCronRun(req);
}

export async function POST(req: Request) {
  return handleCronRun(req);
}

async function handleCronRun(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "sensiblee_cron_secret_2026";
  const hasSecret = authHeader === `Bearer ${cronSecret}`;

  if (!hasSecret) {
    const sess = await getSession();
    const isAdmin = sess && ["platform_admin", "platform_manager", "owner"].includes(sess.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Provide CRON_SECRET or an admin session." }, { status: 401 });
    }
  }

  const summary = await runCronTasks();
  return NextResponse.json(summary);
}
