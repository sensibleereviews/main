// E2E verification for the CMS-editable tax rate. Run: node scripts/verify-tax.mjs
import { execSync } from "child_process";
import { writeFileSync } from "fs";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (cond, label) => { console.log((cond ? "PASS" : "FAIL") + " | " + label); cond ? pass++ : fail++; };

async function main() {
  const login = async (email) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Demo@1234" }),
    });
    const m = (res.headers.get("set-cookie") || "").match(/ss_session=[^;]+/);
    return m ? m[0] : "";
  };

  const adminCookie = await login("admin@sensiblee.in");
  const ownerCookie = await login("anand@spiceroute.in");
  ok(adminCookie.length > 20 && ownerCookie.length > 20, "admin + owner sessions obtained");

  // 1. default rate exposed via settings GET
  let r = await fetch(`${BASE}/api/cms/settings`, { headers: { cookie: adminCookie } });
  let j = await r.json();
  const orig = j.settings.tax_percent;
  ok(r.status === 200 && orig === "18", `settings GET exposes tax_percent (got ${orig})`);

  // 2. owner cannot edit settings
  r = await fetch(`${BASE}/api/cms/settings`, {
    method: "PUT", headers: { "Content-Type": "application/json", cookie: ownerCookie },
    body: JSON.stringify({ tax_percent: "12.5" }),
  });
  ok(r.status === 403 || r.status === 401, "tenant owner cannot PUT cms settings");

  // 3. invalid values rejected
  for (const bad of ["abc", "150", "-5", ""]) {
    r = await fetch(`${BASE}/api/cms/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ tax_percent: bad }),
    });
    ok(r.status === 400, `invalid tax_percent "${bad}" rejected with 400`);
  }

  // 4. valid change → normalized storage
  r = await fetch(`${BASE}/api/cms/settings`, {
    method: "PUT", headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ tax_percent: "12.5" }),
  });
  ok(r.status === 200, "PUT tax_percent=12.5 succeeds");
  r = await fetch(`${BASE}/api/cms/settings`, { headers: { cookie: adminCookie } });
  j = await r.json();
  ok(j.settings.tax_percent === "12.5", `stored value normalized to 12.5 (got ${j.settings.tax_percent})`);

  // 5. invoice detail recomputes GST at the new rate and returns taxPercent
  r = await fetch(`${BASE}/api/billing`, { headers: { cookie: ownerCookie } });
  j = await r.json();
  const inv = j.invoices[0];
  const expectedGst = Math.round(inv.amount * 0.125);
  r = await fetch(`${BASE}/api/billing/invoices/${inv.id}`, { headers: { cookie: ownerCookie } });
  j = await r.json();
  ok(j.invoice.taxPercent === 12.5 && j.invoice.gst === expectedGst && j.invoice.total === inv.amount + expectedGst,
    `invoice detail GST at 12.5% (${inv.amount} -> gst ${j.invoice.gst}, total ${j.invoice.total})`);

  // 6. invoice PDF renders with the dynamic label
  r = await fetch(`${BASE}/api/billing/invoices/${inv.id}/pdf`, { headers: { cookie: ownerCookie } });
  const pdf = Buffer.from(await r.arrayBuffer());
  ok(r.status === 200 && pdf.subarray(0, 5).toString() === "%PDF-", `invoice PDF renders (${pdf.length} bytes)`);
  writeFileSync("/tmp/tax-inv.pdf", pdf);
  let text = "";
  try { text = execSync("pdftotext /tmp/tax-inv.pdf - 2>/dev/null || true", { encoding: "utf8" }); } catch {}
  if (!text) {
    // fallback: python pypdf
    try { text = execSync(`python3 -c "import pypdf,sys;print(pypdf.PdfReader('/tmp/tax-inv.pdf').pages[0].extract_text())"`, { encoding: "utf8" }); } catch {}
  }
  ok(/GST @ 12\.5%/.test(text) && /applied at 12\.5%/.test(text), "PDF contains 'GST @ 12.5%' + fine print at 12.5%");

  // 7. admin detail route also carries the rate
  r = await fetch(`${BASE}/api/admin/invoices/${inv.id}`, { headers: { cookie: adminCookie } });
  j = await r.json();
  ok(j.invoice.taxPercent === 12.5 && j.invoice.gst === expectedGst, "admin invoice detail mirrors rate");

  // 8. restore default 18%
  r = await fetch(`${BASE}/api/cms/settings`, {
    method: "PUT", headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ tax_percent: "18" }),
  });
  r = await fetch(`${BASE}/api/cms/settings`, { headers: { cookie: adminCookie } });
  j = await r.json();
  ok(j.settings.tax_percent === "18", "restored tax_percent to 18");
  r = await fetch(`${BASE}/api/billing/invoices/${inv.id}`, { headers: { cookie: ownerCookie } });
  j = await r.json();
  ok(j.invoice.taxPercent === 18 && j.invoice.gst === Math.round(inv.amount * 0.18), "invoice GST back at 18%");

  console.log(`\nAPI RESULTS: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
