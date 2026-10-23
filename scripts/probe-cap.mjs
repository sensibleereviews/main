import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const fig = document.querySelector("figure.flex.flex-col.rounded-2xl");
  const cap = fig.querySelector("figcaption");
  const parts = {};
  const tryWithout = (sel, label) => {
    const c2 = cap.cloneNode(true);
    c2.style.cssText = "position:absolute;visibility:hidden;width:min-content;left:-9999px";
    c2.querySelectorAll(sel).forEach((n) => n.remove());
    document.body.appendChild(c2);
    parts[label] = Math.round(c2.getBoundingClientRect().width);
    c2.remove();
  };
  tryWithout("div.min-w-0", "no-name-role");
  tryWithout("span.flex.items-center", "no-stars");
  tryWithout("img,span.rounded-full", "no-avatar");
  // also: what's the computed white-space of the truncate p's
  const p1 = cap.querySelector("p");
  const ps = getComputedStyle(p1);
  // raw text widths
  const measure = cap.querySelector("div.min-w-0 p:last-child");
  const span = document.createElement("span");
  span.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:400 11px sans-serif";
  span.textContent = measure.textContent;
  document.body.appendChild(span);
  const roleW = Math.round(span.getBoundingClientRect().width);
  span.remove();
  return { parts, roleTextW: roleW, roleText: measure.textContent, whiteSpace: ps.whiteSpace, overflow: ps.overflow };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
