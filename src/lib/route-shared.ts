// Shared route parsing (safe on server and client — no client-only APIs)
export type Surface =
  | "home" | "features" | "how" | "pricing" | "stories" | "security"
  | "about" | "contact" | "privacy" | "terms" | "sitemap"
  | "blog" | "knowledge" | "ticket"
  | "login" | "signup" | "client" | "admin" | "guest" | "notfound";

export type Route = {
  surface: Surface;
  view?: string; // client/admin sub-view, blog article slug
  code?: string; // guest location code
};

// Canonical URL slugs per marketing surface — the built-in defaults. Platform
// admins can override each page's public URL from the admin console (Website →
// Pages); overrides are hydrated from the CMS on both server and client via
// setUrlOverrides(). Internal surface names ("knowledge", "stories", …) never change.
export const SURFACE_TO_SLUG: Partial<Record<Surface, string>> = {
  about: "about-us",
  contact: "contact-us",
  stories: "customer-stories",
  how: "how-it-works",
  knowledge: "faqs",
  privacy: "privacy-policy",
  security: "security-trust",
  terms: "terms-of-service",
  ticket: "submit-a-ticket",
};

// Built-in URL for every marketing surface (home = "/"). Single source for the
// CMS loaders, admin UI hints and URL validation.
export const DEFAULT_URL_SLUGS: Record<string, string> = (() => {
  const map: Record<string, string> = { home: "", sitemap: "sitemap", blog: "blog", features: "features", pricing: "pricing" };
  for (const [surface, slug] of Object.entries(SURFACE_TO_SLUG)) map[surface] = slug;
  return map;
})();

export function defaultUrlSlugFor(surface: Surface): string {
  return DEFAULT_URL_SLUGS[surface] ?? surface;
}

// URL paths that can never be claimed by a marketing page (app surfaces + infra).
export const RESERVED_URL_SLUGS = new Set([
  "", "app", "admin", "g", "login", "signup", "api", "sitemap",
  "_next", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.json",
]);

/* ------------------------- admin-editable URL overrides ------------------------- */

export type UrlOverrides = Partial<Record<Surface, string>>;

let URL_OVERRIDES: UrlOverrides = {};

// Hydrate the runtime URL map from the CMS (server: page.tsx / loadCmsBundle;
// client: app-shell bootstrap). Idempotent — same DB state produces the same map.
export function setUrlOverrides(overrides: UrlOverrides | null | undefined): void {
  const clean: UrlOverrides = {};
  if (overrides) {
    for (const [surface, slug] of Object.entries(overrides)) {
      if (typeof slug === "string" && slug && surface !== "home" && surface !== "sitemap") clean[surface as Surface] = slug;
    }
  }
  URL_OVERRIDES = clean;
}

// Effective public URL segment for a surface (override wins, then built-in default).
export function urlSlugFor(surface: Surface): string {
  return URL_OVERRIDES[surface] || defaultUrlSlugFor(surface);
}

function reverseUrlMap(): Record<string, Surface> {
  const map: Record<string, Surface> = { sitemap: "sitemap" };
  for (const surface of Object.keys(DEFAULT_URL_SLUGS)) {
    if (surface === "home" || surface === "sitemap") continue;
    if (URL_OVERRIDES[surface]) continue; // overridden — the built-in URL dies (no redirects)
    map[defaultUrlSlugFor(surface as Surface)] = surface as Surface;
  }
  for (const [surface, slug] of Object.entries(URL_OVERRIDES)) {
    if (slug) map[slug] = surface as Surface; // overrides win
  }
  return map;
}

export const SLUG_TO_SURFACE: Record<string, Surface> = (() => {
  const map: Record<string, Surface> = {};
  for (const [surface, slug] of Object.entries(SURFACE_TO_SLUG)) map[slug] = surface as Surface;
  return map;
})();

export function parseLocation(loc: { pathname: string; hostname: string }): Route {
  const host = loc.hostname;
  const sub = host.startsWith("app.") ? "app" : host.startsWith("admin.") ? "admin" : "www";
  const p = loc.pathname.replace(/\/+$/, "") || "/";

  if (sub === "app") return { surface: "client", view: p === "/" ? "overview" : p.slice(1) };
  if (sub === "admin") return { surface: "admin", view: p === "/" ? "platform" : p.slice(1) };

  if (p.startsWith("/app/")) return { surface: "client", view: p.split("/")[2] || "overview" };
  if (p === "/app") return { surface: "client", view: "overview" };
  if (p.startsWith("/admin/")) return { surface: "admin", view: p.split("/")[2] || "platform" };
  if (p === "/admin") return { surface: "admin", view: "platform" };
  if (p.startsWith("/g/")) return { surface: "guest", code: p.split("/")[2] };
  if (p === "/login") return { surface: "login" };
  if (p === "/signup") return { surface: "signup" };

  const blogBase = urlSlugFor("blog");
  if (p === `/${blogBase}`) return { surface: "blog" };
  if (p.startsWith(`/${blogBase}/`)) {
    const slug = p.split("/")[2];
    return slug ? { surface: "blog", view: decodeURIComponent(slug) } : { surface: "blog" };
  }

  const path = p === "/" ? "" : p.slice(1);
  if (path === "") return { surface: "home" };
  const reverse = reverseUrlMap();
  if (path in reverse) return { surface: reverse[path] };
  // Unknown URL → branded 404 (per project decision: no redirects, old URLs are dead)
  return { surface: "notfound" };
}

export function hrefFor(route: Route, hostname: string): string {
  const sub = hostname.startsWith("app.") ? "app" : hostname.startsWith("admin.") ? "admin" : "www";
  if (sub === "app") return route.surface === "client" ? `/${route.view || "overview"}` : `/${route.surface === "home" ? "" : urlSlugFor(route.surface)}`;
  if (sub === "admin") return route.surface === "admin" ? `/${route.view || "platform"}` : `/${urlSlugFor(route.surface)}`;
  switch (route.surface) {
    case "client": return `/app/${route.view || "overview"}`;
    case "admin": return `/admin/${route.view || "platform"}`;
    case "guest": return `/g/${route.code}`;
    case "blog": return route.view ? `/${urlSlugFor("blog")}/${route.view}` : `/${urlSlugFor("blog")}`;
    case "home": return "/";
    default: return `/${urlSlugFor(route.surface)}`;
  }
}

/* --------------------------- blog URL helpers --------------------------- */

// Dash-case from a full article title; diacritics folded (é → e) via NFD.
// Blog URLs always derive from the full title — CmsPost.slug is legacy storage.
export function slugifyTitle(title: string): string {
  return (title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// The public URL view for a post: title-derived slug (falls back to stored slug).
export function blogPostUrlView(p: { title: string; slug: string }): string {
  return slugifyTitle(p.title) || p.slug;
}

/* --------------------------- nav string parsing --------------------------- */

const SURFACE_SET: ReadonlySet<string> = new Set<Surface>([
  "home", "features", "how", "pricing", "stories", "security",
  "about", "contact", "privacy", "terms", "sitemap",
  "blog", "knowledge", "ticket",
  "login", "signup", "client", "admin", "guest", "notfound",
]);

// Parse navigation shorthand strings: either a bare surface ("blog") or
// "surface:view" deep links ("blog:<article-slug>", "client:reviews", …).
// A colon with a known surface prefix splits into surface + view; anything
// else (or an unknown prefix) falls through as a bare surface — callers that
// pass plain view names never break.
export function parseNavString(v: string): Route {
  const ci = v.indexOf(":");
  if (ci > 0) {
    const surface = v.slice(0, ci);
    if (SURFACE_SET.has(surface)) {
      const view = v.slice(ci + 1);
      return { surface: surface as Surface, view: view || undefined };
    }
  }
  return { surface: v as Surface };
}
