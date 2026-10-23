import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTenantPerm } from "@/lib/auth";
import { handleError, readJson, fail } from "@/lib/api";

// Guest contact book (doc §1E "Upload or import customer contact records where
// authorized" + "Record consent and messaging eligibility"). Numbers matching the
// WhatsApp suppression list (WaOptOut) are imported but marked optedOut.

const PHONE_RE = /(\+?\d[\d\s-]{7,16}\d)/;
const INDIAN_MOBILE = /^(?:\+?91[-\s]?)?[6-9]\d{9}$/;

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  const last10 = digits.slice(-10);
  return INDIAN_MOBILE.test(digits) || INDIAN_MOBILE.test(last10) ? last10 : null;
}

export async function GET() {
  try {
    const sess = await requireTenantPerm("campaigns_manage");
    const [contacts, optOuts] = await Promise.all([
      db.contact.findMany({ where: { tenantId: sess.tenantId! }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.waOptOut.findMany({ where: { tenantId: sess.tenantId! }, select: { phone: true, reason: true, note: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    const suppressed = new Set(optOuts.map((o) => o.phone));
    return NextResponse.json({
      contacts: contacts.map((c) => ({
        id: c.id, name: c.name, phone: c.phone, consent: c.consent, source: c.source,
        optedOut: c.optedOut || suppressed.has(c.phone),
        at: new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      })),
      optOuts: optOuts.map((o) => ({ phone: o.phone, reason: o.reason, note: o.note, at: new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) })),
      stats: {
        total: contacts.length,
        eligible: contacts.filter((c) => c.consent && !c.optedOut && !suppressed.has(c.phone)).length,
        suppressed: contacts.filter((c) => c.optedOut || suppressed.has(c.phone)).length,
        optOuts: optOuts.length,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

// Import contacts — paste lines of "name, phone" (name optional) or bare numbers.
// Dedupes against the existing book and flags numbers on the suppression list.
export async function POST(req: Request) {
  try {
    const sess = await requireTenantPerm("campaigns_manage");
    const body = await readJson<{ text?: string; consent?: boolean; source?: string }>(req);
    if (!body.text?.trim()) return fail(400, "Paste at least one contact line");

    const optOuts = await db.waOptOut.findMany({ where: { tenantId: sess.tenantId! }, select: { phone: true } });
    const suppressed = new Set(optOuts.map((o) => o.phone));
    const existing = await db.contact.findMany({ where: { tenantId: sess.tenantId! }, select: { phone: true } });
    const seen = new Set(existing.map((c) => c.phone));

    let imported = 0, duplicates = 0, invalid = 0, suppressedCount = 0;
    for (const line of body.text.split(/\r?\n/)) {
      const phoneMatch = line.match(PHONE_RE);
      if (!phoneMatch) { if (line.trim()) invalid++; continue; }
      const phone = normalisePhone(phoneMatch[1]);
      if (!phone) { invalid++; continue; }
      if (seen.has(phone)) { duplicates++; continue; }
      const name = line.replace(phoneMatch[1], "").replace(/[,;|]+/g, " ").trim() || `Guest ${phone.slice(-4)}`;
      const isSuppressed = suppressed.has(phone);
      if (isSuppressed) suppressedCount++;
      await db.contact.create({
        data: {
          tenantId: sess.tenantId!, name: name.slice(0, 60), phone,
          consent: body.consent !== false, source: body.source === "manual" ? "manual" : "import",
          optedOut: isSuppressed,
        },
      });
      seen.add(phone);
      imported++;
    }
    await db.activityLog.create({
      data: { tenantId: sess.tenantId!, actor: sess.email, action: "contacts.imported", detail: `${imported} contacts imported (${duplicates} duplicates skipped, ${suppressedCount} suppressed)` },
    });
    return NextResponse.json({ imported, duplicates, invalid, suppressed: suppressedCount });
  } catch (err) {
    return handleError(err);
  }
}

// Remove a contact (typo / GDPR erasure)
export async function DELETE(req: Request) {
  try {
    const sess = await requireTenantPerm("campaigns_manage");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return fail(400, "Contact id required");
    const row = await db.contact.findUnique({ where: { id } });
    if (!row || row.tenantId !== sess.tenantId) return fail(404, "Contact not found");
    await db.contact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
