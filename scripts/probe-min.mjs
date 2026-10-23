import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const fig = document.querySelector("figure.flex.flex-col.rounded-2xl");
  const clone = fig.cloneNode(true);
  clone.style.cssText = "position:absolute;visibility:hidden;width:min-content;left:-9999px";
  document.body.appendChild(clone);
  const minContent = clone.getBoundingClientRect().width;
  // bisect: remove parts one at a time
  const parts = {};
  const tryWithout = (sel) => {
    const c2 = fig.cloneNode(true);
    c2.style.cssText = "position:absolute;visibility:hidden;width:min-content;left:-9999px";
    const target = c2.querySelector(sel);
    if (target) target.remove();
    document.body.appendChild(c2);
    parts[sel] = Math.round(c2.getBoundingClientRect().width);
    c2.remove();
  };
  tryWithout("blockquote");
  tryWithout("figcaption");
  tryWithout("svg");
  clone.remove();
  return { minContent: Math.round(minContent), parts };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
