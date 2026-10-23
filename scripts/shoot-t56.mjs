// Task 56 — evidence screenshots: hero notch-3, annual pricing, mobile home, Google chooser, how page
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/home/z/my-project/download/preview-evidence";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

// Desktop home — hero notch 3 + annual pricing
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2600);
const hero = page.locator(".hero-anim").first();
await hero.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await hero.screenshot({ path: `${OUT}/t56-hero-desktop.png` });

const pricingSection = page.locator("section", { hasText: "Most popular" }).first();
await pricingSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await pricingSection.getByRole("button", { name: "Annual · 20% off" }).click();
await page.waitForTimeout(400);
const starterTxt = await pricingSection.locator("div.relative", { hasText: "Starter" }).first().innerText();
console.log(starterTxt.includes("1,199") && starterTxt.includes("14,390") ? "PASS: annual ₹1,199/mo · ₹14,390/yr (20% off)" : "FAIL: annual pricing — " + starterTxt.slice(0, 120));
await pricingSection.screenshot({ path: `${OUT}/t56-pricing-annual.png` });

// nutshell section (bullets)
const nutshell = page.locator("section", { hasText: "platform in a nutshell" }).first();
await nutshell.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await nutshell.screenshot({ path: `${OUT}/t56-nutshell-bullets.png` });

// Google chooser — login page
const login = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await login.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await login.waitForTimeout(800);
await login.getByRole("button", { name: "Continue with Google" }).click();
await login.waitForTimeout(500);
const chooserVisible = await login.getByText("Choose an account").isVisible();
console.log(chooserVisible ? "PASS: Google account chooser opens" : "FAIL: chooser not visible");
await login.screenshot({ path: `${OUT}/t56-google-login.png` });

// how-it-works — first week section
const how = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await how.goto("http://localhost:3000/how-it-works", { waitUntil: "networkidle" });
await how.waitForTimeout(800);
const firstWeek = how.locator("section", { hasText: "Your first week" }).first();
await firstWeek.scrollIntoViewIfNeeded();
await how.waitForTimeout(400);
await firstWeek.screenshot({ path: `${OUT}/t56-how-first-week.png` });

// Mobile home — no horizontal scroll, footer logo
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mob.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await mob.waitForTimeout(2400);
const sw = await mob.evaluate(() => document.documentElement.scrollWidth);
console.log(sw <= 390 ? `PASS: mobile scrollWidth ${sw} (no horizontal overflow)` : `FAIL: mobile scrollWidth ${sw}`);
await mob.screenshot({ path: `${OUT}/t56-home-mobile-top.png` });
await mob.locator("footer").scrollIntoViewIfNeeded();
await mob.waitForTimeout(400);
await mob.locator("footer").screenshot({ path: `${OUT}/t56-footer-mobile.png` });

await browser.close();
console.log("t56 screenshots saved");
