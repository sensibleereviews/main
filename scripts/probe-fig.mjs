import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const fig = document.querySelector("figure.flex.flex-col.rounded-2xl");
  if (!fig) return "no figure";
  const grid = fig.parentElement;
  const cs = getComputedStyle(grid);
  const walk = (el, depth, out) => {
    if (depth > 4) return;
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.width > 360) out.push(`${"  ".repeat(depth)}${c.tagName}.${(c.className+"").slice(0,50)} w=${Math.round(r.width)} sw=${c.scrollWidth} minw=${getComputedStyle(c).minWidth}`);
      walk(c, depth + 1, out);
    }
  };
  const out = [];
  walk(fig, 0, out);
  return { gridCols: cs.gridTemplateColumns, gridW: Math.round(grid.getBoundingClientRect().width), figW: Math.round(fig.getBoundingClientRect().width), kids: out.join("\n") };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
