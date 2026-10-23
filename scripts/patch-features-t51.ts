// Task 51 — seed data for the features-list completion sprint:
//   1. tenant flag opt-ins for the demo workspaces (whatsapp_requests + monthly_pdf)
//      so the new compliance gates behave correctly out of the box
//   2. a starter guest contact book for the primary tenant
// Idempotent — safe to re-run.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // --- ensure flags + opt-ins -------------------------------------------------
  const waFlag = await db.featureFlag.upsert({
    where: { key: "whatsapp_requests" },
    update: { enabled: true },
    create: { key: "whatsapp_requests", label: "WhatsApp review requests", description: "Send review invitations over the WhatsApp Business Cloud API.", enabled: true },
  });
  const pdfFlag = await db.featureFlag.upsert({
    where: { key: "monthly_pdf" },
    update: {},
    create: { key: "monthly_pdf", label: "Monthly PDF report", description: "Automated month-in-review PDF.", enabled: false },
  });

  const tenants = await db.tenant.findMany({ select: { id: true, name: true } });
  for (const t of tenants) {
    await db.tenantFlag.upsert({
      where: { tenantId_flagId: { tenantId: t.id, flagId: waFlag.id } },
      update: { optedIn: true },
      create: { tenantId: t.id, flagId: waFlag.id, optedIn: true },
    });
    await db.tenantFlag.upsert({
      where: { tenantId_flagId: { tenantId: t.id, flagId: pdfFlag.id } },
      update: { optedIn: true },
      create: { tenantId: t.id, flagId: pdfFlag.id, optedIn: true },
    });
  }
  console.log(`flag opt-ins ensured for ${tenants.length} tenants`);

  // --- starter contact book ----------------------------------------------------
  const primary = tenants[0];
  const existing = await db.contact.count({ where: { tenantId: primary.id } });
  if (existing === 0) {
    const people: [string, string][] = [
      ["Ananya Sharma", "9876543210"],
      ["Rohit Menon", "9876501234"],
      ["Priya Nair", "9843012345"],
      ["Karthik Iyer", "9880012345"],
      ["Meera Krishnan", "9900456789"],
      ["Aditya Rao", "9765432109"],
      ["Sneha Kulkarni", "9740012345"],
      ["Vikram Desai", "9823456789"],
    ];
    for (const [name, phone] of people) {
      await db.contact.create({ data: { tenantId: primary.id, name, phone, consent: true, source: "import" } });
    }
    console.log(`seeded ${people.length} contacts for ${primary.name}`);
  } else {
    console.log(`contact book already has ${existing} rows — skipped`);
  }

  // --- one starter report schedule so the Reports tab is not empty -------------
  const scheduleCount = await db.reportSchedule.count();
  if (scheduleCount === 0 && tenants[0]) {
    await db.reportSchedule.create({
      data: {
        name: "Monthly owner report",
        template: "monthly_summary",
        frequency: "monthly",
        dayOfMonth: 1,
        hour: 8,
        recipients: "owner@spiceroute.in",
        format: "pdf",
        enabled: true,
      },
    });
    console.log("starter monthly report schedule created");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
