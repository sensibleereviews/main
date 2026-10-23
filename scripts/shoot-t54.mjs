// Task 54 — screenshot hero preview + expanded home pricing (desktop + mobile)
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/home/z/my-project/download/preview-evidence";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// Desktop
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2600); // let hero animations settle (ring draw, bars, badges)

// hero preview section
const hero = page.locator(".hero-anim").first();
await hero.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await hero.screenshot({ path: `${OUT}/t54-hero-desktop.png` });

// pricing teaser section — find section containing "Most popular"
const pricingSection = page.locator("section", { hasText: "Most popular" }).first();
await pricingSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await pricingSection.screenshot({ path: `${OUT}/t54-pricing-desktop.png` });

// full home for context
await page.screenshot({ path: `${OUT}/t54-home-full.png`, fullPage: false });

// Mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mob.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await mob.waitForTimeout(2400);
const heroM = mob.locator(".hero-anim").first();
await heroM.scrollIntoViewIfNeeded();
await mob.waitForTimeout(800);
await heroM.screenshot({ path: `${OUT}/t54-hero-mobile.png` });
const pricingM = mob.locator("section", { hasText: "Most popular" }).first();
await pricingM.scrollIntoViewIfNeeded();
await mob.waitForTimeout(600);
await pricingM.screenshot({ path: `${OUT}/t54-pricing-mobile.png` });

await browser.close();
console.log("screenshots saved:", OUT);
