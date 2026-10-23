// E2E verification — page name + URL/slug editing for marketing pages (Task 31)
import { setUrlOverrides, urlSlugFor, hrefFor, parseLocation } from "/home/z/my-project/src/lib/route-shared.ts";
const BASE = "http://127.0.0.1:3000";
let cookie = "";

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
    redirect: "manual",
  });
  const jar = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (!cookie) {
    const sess = jar.find((c) => c.startsWith("ss_session="));
    if (sess) cookie = sess.split(";")[0];
  }
  return res;
}

let pass = 0, failCount = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { failCount++; console.log(`  ✗ FAIL: ${name} ${extra}`); }
}

const is404 = (t) => t.includes("page not found"); // branded 404 eyebrow — unique to the 404 view

async function putPage(slug, payload) {
  const res = await req(`/api/cms/pages/${slug}`, { method: "PUT", body: JSON.stringify(payload) });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

(async () => {
  console.log("— auth —");
  const login = await req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@sensiblee.in", password: "Demo@1234" }) });
  check("admin login", login.status === 200, `status ${login.status}`);
  check("session cookie captured", cookie.startsWith("ss_session="), cookie.slice(0, 30));

  console.log("— baseline (defaults intact) —");
  let r = await req("/about-us"); let t = await r.text();
  check("/about-us renders About (no 404)", r.status === 200 && t.includes("Sensiblee, in brief") && !is404(t));
  const me = await req("/api/auth/me"); const mej = await me.json();
  check("session accepted by API", me.status === 200 && !!mej.user, JSON.stringify(mej).slice(0, 80));

  console.log("— GET pages list carries urlSlug —");
  r = await req("/api/cms/pages");
  const list = await r.json();
  check("GET /api/cms/pages 200", r.status === 200);
  check("rows expose urlSlug field", Array.isArray(list.pages) && list.pages.every((p) => "urlSlug" in p));

  console.log("— rename About: title + URL —");
  let put = await putPage("about", { title: "Our Story", urlSlug: "our-story" });
  check("PUT about accepts new name+URL", put.status === 200, JSON.stringify(put.json));
  setUrlOverrides({ about: "our-story" }); // mirror what the server hydrated from the CMS

  r = await req("/our-story"); t = await r.text();
  check("/our-story renders About page", r.status === 200 && t.includes("Sensiblee, in brief") && !is404(t), `status ${r.status}`);
  check("/our-story SSR <title> = About SEO", /<title>About us — sensing sensibly/i.test(t), (t.match(/<title>([^<]*)<\/title>/) || [, "no title"])[1]);
  r = await req("/about-us"); t = await r.text();
  check("old /about-us now branded 404 (no redirect)", r.status === 200 && is404(t));
  // Internal-link layer is JS-navigation (hrefFor at click time) — assert the module directly.
  check("hrefFor({about}) → /our-story", hrefFor({ surface: "about" }, "www.sensiblee.in") === "/our-story");
  check("hrefFor blog article → /our-story kept for posts base", hrefFor({ surface: "blog" }, "www") === "/blog");

  console.log("— validation —");
  put = await putPage("about", { urlSlug: "pricing" });
  check("collision with /pricing rejected (400)", put.status === 400, `status ${put.status}`);
  put = await putPage("about", { urlSlug: "admin" });
  check("reserved path rejected (400)", put.status === 400, `status ${put.status}`);
  put = await putPage("about", { urlSlug: "Not A -- Slug!!" });
  check("messy input normalised (not-a-slug)", put.status === 200 && put.json.page?.urlSlug === "not-a-slug", JSON.stringify(put.json));
  put = await putPage("home", { urlSlug: "start" });
  check("homepage URL fixed (400)", put.status === 400, `status ${put.status}`);

  console.log("— blog base rename —");
  put = await putPage("blog", { urlSlug: "journal" });
  check("PUT blog → /journal", put.status === 200, JSON.stringify(put.json));
  setUrlOverrides({ about: "our-story", blog: "journal" }); // mirror server state
  r = await req("/journal"); t = await r.text();
  check("/journal renders blog listing", r.status === 200 && !is404(t) && t.includes("min read"), `status ${r.status}`);
  check("hrefFor blog → /journal", hrefFor({ surface: "blog" }, "www") === "/journal");
  check("hrefFor blog article → /journal/<view>", hrefFor({ surface: "blog", view: "abc" }, "www") === "/journal/abc");
  check("parseLocation /journal/xyz → blog article", parseLocation({ pathname: "/journal/xyz", hostname: "www.sensiblee.in" }).surface === "blog");
  r = await req("/blog"); t = await r.text();
  check("old /blog now branded 404", is404(t));

  console.log("— reset to defaults —");
  put = await putPage("about", { title: "About us", urlSlug: "" });
  check("reset about → default /about-us", put.status === 200 && put.json.page?.urlSlug === "", JSON.stringify(put.json));
  put = await putPage("blog", { urlSlug: "" });
  check("reset blog → default /blog", put.status === 200, JSON.stringify(put.json));
  setUrlOverrides(null); // both overridden pages reset — mirror server state
  r = await req("/our-story"); t = await r.text();
  check("custom /our-story now 404 after reset", is404(t));
  r = await req("/about-us"); t = await r.text();
  check("/about-us back online", r.status === 200 && t.includes("Sensiblee, in brief") && !is404(t));
  r = await req("/blog"); t = await r.text();
  check("/blog back online", r.status === 200 && !is404(t));
  check("defaults restored in link layer", urlSlugFor("about") === "about-us" && urlSlugFor("blog") === "blog");
  check("parseLocation /about-us restored", parseLocation({ pathname: "/about-us", hostname: "www.sensiblee.in" }).surface === "about");
  check("override map cleared — /our-story dead", parseLocation({ pathname: "/our-story", hostname: "www.sensiblee.in" }).surface === "notfound");
  // Cross-check the routing module end-to-end with a fresh override set.
  setUrlOverrides({ about: "our-story", blog: "journal" });
  check("hrefFor honours overrides (about)", hrefFor({ surface: "about" }, "www") === "/our-story");
  check("parseLocation honours overrides (about)", parseLocation({ pathname: "/our-story", hostname: "www.sensiblee.in" }).surface === "about");
  check("overridden default dies in parse", parseLocation({ pathname: "/about-us", hostname: "www.sensiblee.in" }).surface === "notfound");
  check("app-subdomain marketing links follow override", hrefFor({ surface: "about" }, "app.sensiblee.in") === "/our-story");
  setUrlOverrides(null);

  console.log(`\nRESULT: ${pass} passed, ${failCount} failed`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
