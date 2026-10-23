// Find elements wider than viewport (causing horizontal scroll on mobile)
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const result = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (["hidden", "clip", "auto", "scroll"].includes(s.overflowX)) return true;
    }
    return false;
  };
  const bad = [];
  document.querySelectorAll("*").forEach((el) => {
    if (clipped(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 || r.right > vw + 1 || r.left < -1) {
      const cls = (el.className && typeof el.className === "string") ? el.className.slice(0, 90) : "";
      bad.push({
        tag: el.tagName,
        cls,
        w: Math.round(r.width),
        left: Math.round(r.left),
        right: Math.round(r.right),
        text: (el.textContent || "").trim().slice(0, 40),
      });
    }
  });
  return { vw, sw, overflow: sw - vw, bad: bad.slice(0, 40) };
});

console.log(`viewport=${result.vw} scrollWidth=${result.sw} overflow=${result.overflow}px`);
console.log("--- offending elements (excluding html/body/section containers) ---");
for (const b of result.bad) {
  if (["HTML", "BODY"].includes(b.tag)) continue;
  console.log(`${b.tag} w=${b.w} L=${b.left} R=${b.right} | ${b.cls} | "${b.text}"`);
}
await browser.close();
