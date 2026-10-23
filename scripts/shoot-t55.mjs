// Task 55 — hero enlarged one more notch + billing toggle interaction test (home pricing)
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/home/z/my-project/download/preview-evidence";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let failures = 0;
const ok = (cond, label) => {
  console.log((cond ? "PASS" : "FAIL") + ": " + label);
  if (!cond) failures++;
};

// ---------- Desktop ----------
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2600); // hero animations settle (ring draw, bars, trend)

// hero preview — enlarged
const hero = page.locator(".hero-anim").first();
await hero.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
const heroBox = await hero.boundingBox();
console.log("hero box:", Math.round(heroBox.width) + "x" + Math.round(heroBox.height));
await hero.screenshot({ path: `${OUT}/t55-hero-desktop.png` });

// pricing teaser section
const pricingSection = page.locator("section", { hasText: "Most popular" }).first();
await pricingSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);

// toggle: default monthly → starter ₹1,499
const starterCard = pricingSection.locator("div.relative", { hasText: "Starter" }).first();
const monthlyTxt = await starterCard.innerText();
ok(monthlyTxt.includes("1,499") && monthlyTxt.includes("/month"), "default Monthly shows ₹1,499 /month");
await pricingSection.screenshot({ path: `${OUT}/t55-pricing-monthly.png` });

// toggle → Annual
await pricingSection.getByRole("button", { name: "Annual · 2 months free" }).click();
await page.waitForTimeout(400);
const annualTxt = await starterCard.innerText();
ok(annualTxt.includes("1,249"), "Annual shows per-month ₹1,249 (14,990/12)");
ok(annualTxt.includes("14,990"), "Annual shows ₹14,990 billed yearly");
ok(annualTxt.includes("1 location"), "Annual keeps meta row (locations/seats)");
await pricingSection.screenshot({ path: `${OUT}/t55-pricing-annual.png` });

// growth card sanity under annual
const growthTxt = await pricingSection.locator("div.relative", { hasText: "Growth" }).first().innerText();
ok(growthTxt.includes("2,916"), "Growth annual per-month ₹2,916 (34,990/12)");

// toggle → Half-yearly
await pricingSection.getByRole("button", { name: "Half-yearly · 1 month free" }).click();
await page.waitForTimeout(400);
const halfTxt = await starterCard.innerText();
ok(halfTxt.includes("7,495"), "Half-yearly shows ₹7,495 every 6 mo");

// back to Monthly
await pricingSection.getByRole("button", { name: "Monthly", exact: true }).click();
await page.waitForTimeout(300);
const backTxt = await starterCard.innerText();
ok(backTxt.includes("1,499"), "back to Monthly shows ₹1,499 again");

// full home context shot
await page.screenshot({ path: `${OUT}/t55-home-full.png`, fullPage: false });

// ---------- Mobile ----------
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mob.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await mob.waitForTimeout(2400);
const heroM = mob.locator(".hero-anim").first();
await heroM.scrollIntoViewIfNeeded();
await mob.waitForTimeout(800);
await heroM.screenshot({ path: `${OUT}/t55-hero-mobile.png` });
const pricingM = mob.locator("section", { hasText: "Most popular" }).first();
await pricingM.scrollIntoViewIfNeeded();
await mob.waitForTimeout(600);
await pricingM.getByRole("button", { name: "Annual · 2 months free" }).click();
await mob.waitForTimeout(400);
const mobAnnual = await pricingM.innerText();
ok(mobAnnual.includes("1,249"), "mobile annual toggle works too");
await pricingM.screenshot({ path: `${OUT}/t55-pricing-mobile-annual.png` });

await browser.close();
console.log(failures === 0 ? "ALL TOGGLE CHECKS PASS" : failures + " CHECKS FAILED");
console.log("screenshots saved:", OUT);
process.exit(failures === 0 ? 0 : 1);
