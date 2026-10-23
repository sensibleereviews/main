// Task 48 data patch — demo review dataset for the Reputation OS narrative.
// Idempotent: deletes prior "[ops]" rows, then re-inserts a calibrated mix:
//   - waiting-time cluster at HSR (peak 6–9 PM, prev-window mentions for trend)
//   - billing at Indiranagar, parking at Koramangala
//   - enough positives that the brand reads healthy with one at-risk branch
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const STAFF = ["Amit Kumar", "Priya Nambiar", "Vikram Rao", "Meera Pillai", "Rahul Menon", "Sneha Das"];

async function main() {
  const spk = await db.tenant.findUnique({ where: { slug: "spice-route" } });
  if (!spk) { console.log("SPK tenant missing"); return; }

  // 1) staff roster into tenant settings
  const settings = JSON.parse(spk.settings || "{}");
  if (!settings.staff || !settings.staff.length) {
    settings.staff = STAFF.map((name, i) => ({ id: `st${i + 1}`, name, role: i === 0 ? "Floor manager" : "Senior associate" }));
    await db.tenant.update({ where: { id: spk.id }, data: { settings: JSON.stringify(settings) } });
    console.log(`settings.staff roster set (${STAFF.length})`);
  }

  const locs = await db.location.findMany({ where: { tenantId: spk.id }, orderBy: { createdAt: "asc" } });
  const [kor, ind, hsr] = locs;

  // 2) inject staff names into seeded reviews lacking any (non-[ops] rows only)
  const reviews = await db.review.findMany({
    where: { tenantId: spk.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, text: true, stars: true },
  });
  const hasStaff = (t) => STAFF.some((s) => t.includes(s.split(" ")[0]));
  const NEG_VARIANTS = [
    "Waited 45 minutes past our slot on a Saturday evening — Amit at the host desk looked completely disorganized and no one acknowledged the delay.",
    "The wait crossed 40 minutes even with the place half empty. Vikram eventually sorted the order mix-up but the evening was gone.",
    "Staff seemed rushed and short-tempered during the dinner rush. Meera ignored two follow-ups before we got the bill.",
  ];
  const POS_VARIANTS = [
    "Sneha looked after us beautifully — attentive without hovering, and the kitchen paced the courses perfectly.",
    "Shoutout to Rahul for remembering our usual order and getting the filter coffee out in minutes.",
    "Priya turned a fully-booked Saturday into a smooth evening — tables cleared on time and everyone on the floor was in sync.",
  ];
  let ni = 0, pi = 0, patched = 0;
  for (const r of reviews) {
    if (r.text.includes("[ops]") || hasStaff(r.text)) continue;
    if (r.stars <= 2 && ni < 3) {
      await db.review.update({ where: { id: r.id }, data: { text: NEG_VARIANTS[ni++] } });
      patched++;
    } else if (r.stars >= 4 && pi < 3) {
      await db.review.update({ where: { id: r.id }, data: { text: POS_VARIANTS[pi++] } });
      patched++;
    }
  }
  console.log(`patched ${patched} seeded reviews with staff mentions`);

  // 3) calibrated [ops] dataset (delete-then-insert for idempotency)
  const del = await db.review.deleteMany({ where: { tenantId: spk.id, text: { contains: "[ops]" } } });
  console.log(`removed ${del.count} prior [ops] rows`);

  const AUTHORS = ["Rhea Kapoor", "Sameer Shah", "Tanvi Joshi", "Kabir Anand", "Ira Malik", "Yash Trivedi", "Noor Siddiqui", "Aditi Rane", "Farhan Qureshi", "Lata Menon", "Jay Shah", "Preeti Kaur", "Rohan Dutta", "Sana Wagh", "Devika Raman", "Arjun Sethi", "Naina Kohli", "Vivek Chandra", "Tara Bhatt", "Mihir Soni"];
  let ai = 0;
  const ts = (d, h) => { const t = new Date(Date.now() - d * 86400_000); t.setUTCHours(h, 15, 0, 0); return t; };
  const rows = [];
  const add = (loc, days, hour, stars, text, author) => rows.push({
    locationId: loc.id, author: author || AUTHORS[ai++ % AUTHORS.length], stars, text,
    sentiment: stars >= 4 ? "positive" : stars <= 2 ? "negative" : "neutral",
    keywords: JSON.stringify(stars >= 4 ? ["service", "staff courtesy"] : stars === 3 ? ["value", "service"] : ["wait time", "service"]),
    status: "replied", createdAt: ts(days, hour), repliedAt: ts(days, Math.min(23, hour + 2)),
  });

  // --- HSR: the waiting-time story (doc narrative) ---
  add(hsr, 4, 19, 1, "[ops] Third visit in a month with the same story — waited 50 minutes at dinner. Amit at the host desk looked disorganized and staff kept switching.");
  add(hsr, 8, 20, 2, "[ops] Waiting time again crossed 45 minutes for a table we booked. Amit tried but the evening shift is clearly understaffed.");
  add(hsr, 14, 21, 2, "[ops] Slow service even at 7 PM. Waited 35 minutes for the starter and the bill took another 20.");
  add(hsr, 21, 18, 1, "[ops] Reservation not honoured. Staff behaviour at the counter was dismissive when we asked about the queue.");
  add(hsr, 26, 20, 2, "[ops] Waited almost an hour on a Saturday. Kitchen looked overwhelmed — waiting time is now the norm, not the exception.");
  add(hsr, 36, 19, 2, "[ops] 40-minute wait with a reservation — same as last month. Vikram was polite but the queue management needs fixing.");
  add(hsr, 44, 20, 2, "[ops] Long wait again, 6 PM to nearly 7. The evening rush needs one more person at the desk.");
  // --- Indiranagar: billing + one staff-behaviour flag ---
  add(ind, 6, 19, 2, "[ops] Billing error — charged twice for the same dish. Took 15 minutes at the counter to fix.");
  add(ind, 20, 20, 2, "[ops] Order mix-up at the counter and a long wait for the correction.");
  add(ind, 38, 19, 2, "[ops] Bill had two items we never ordered. Counter was chaotic at peak hour.");
  add(ind, 10, 21, 2, "[ops] The floor seemed understaffed and our server Rahul looked stretched thin across too many tables.");
  // --- Koramangala: parking + wait ---
  add(kor, 12, 19, 2, "[ops] Waited 30 minutes past the booking. Parking made it worse. Food remained good.");
  add(kor, 25, 20, 2, "[ops] Weekend waiting time is unpredictable — 40 minutes with a reservation.");
  add(kor, 41, 19, 2, "[ops] Valet queue on a Saturday took longer than the kitchen.");
  // --- positives, last 30d (brand reads healthy) ---
  add(hsr, 2, 20, 5, "[ops] Priya turned our anniversary dinner into something special — attentive, warm, and the dessert platter was on the house.");
  add(hsr, 9, 19, 5, "[ops] Meera ran our 12-person team dinner flawlessly. Courses paced perfectly, zero waiting time.");
  add(hsr, 16, 13, 4, "[ops] Lunch service was quick and courteous — Sneha kept our table moving without ever rushing us.");
  add(hsr, 23, 12, 5, "[ops] Best filter coffee in the area and the staff remembered our order from two weeks ago.");
  add(hsr, 6, 13, 5, "[ops] Sunday brunch with the kids — high chairs ready, Rahul sorted a last-minute extra seat without a fuss.");
  add(hsr, 17, 12, 4, "[ops] The appam-stew combo is back on the menu. Quick service even at the 1 PM rush.");
  add(hsr, 29, 12, 4, "[ops] Consistent quality on a third visit this month. The morning crew is very dependable.");
  add(ind, 3, 13, 5, "[ops] Amit at the host desk remembered our corner table and had the coffee out in minutes.");
  add(ind, 11, 20, 5, "[ops] Billing was swift and accurate this time — the counter team has clearly tightened up.");
  add(ind, 18, 12, 4, "[ops] Smooth work lunch. Priya's recommendations were spot on.");
  add(ind, 24, 19, 5, "[ops] Weekend dinner handled beautifully — zero wait with a booking, warm service throughout.");
  add(ind, 15, 12, 4, "[ops] Quiet corner table for a client call, coffee refills without asking.");
  add(kor, 5, 19, 5, "[ops] Sneha's recommendations were spot on. Courteous staff, seamless evening.");
  add(kor, 13, 13, 4, "[ops] Quick weekday lunch — in and out in 40 minutes with proper coffee.");
  add(kor, 19, 20, 5, "[ops] The mutton sukka had proper heat and Rahul paced the courses perfectly.");
  add(kor, 27, 12, 4, "[ops] Valet was quick this time and the table was ready on the dot.");
  add(kor, 8, 12, 5, "[ops] Booked for eight, seated in five minutes. The team sings happy birthday without being asked.");
  add(kor, 22, 13, 4, "[ops] Portion sizes have improved and the staff flagged the wait time honestly at the door.");
  // --- positives, prior window (stabilises the trend dimension) ---
  add(hsr, 33, 19, 5, "[ops] Team dinner went off without a hitch — 14 people, everyone served together.");
  add(ind, 35, 13, 4, "[ops] Reliable as ever for a client lunch. Quiet corner, quick service.");
  add(kor, 40, 19, 5, "[ops] Anniversary done right — the crew even arranged a dessert plate unasked.");
  add(kor, 47, 12, 4, "[ops] Consistent brunch spot. Staff courtesy is the constant here.");

  for (const r of rows) await db.review.create({ data: { tenantId: spk.id, ...r } });
  console.log(`inserted ${rows.length} calibrated [ops] reviews`);

  const negs = await db.review.count({ where: { tenantId: spk.id, stars: { lte: 2 } } });
  const total = await db.review.count({ where: { tenantId: spk.id } });
  console.log(`SPK reviews: ${total} total, ${negs} negative`);
}

main().then(() => process.exit(0));
