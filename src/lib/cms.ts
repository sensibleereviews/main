// Sensiblee CMS — server-side loaders. All reads fail soft: if the CMS tables are
// missing or the DB is unreachable, the marketing site renders from built-in defaults.
import { db } from "./db";
import { CMS_PAGE_SLUGS, CMS_PAGE_TITLES, type CmsSlug } from "./cms-defaults";
import { PAGE_CONTENT_DEFAULTS, CMS_DEFAULT_SEO } from "./cms-defaults2";
import { FAQ_SEED, POST_SEED, TESTIMONIAL_SEED } from "./cms-seed-data";
import { defaultUrlSlugFor, setUrlOverrides, slugifyTitle, urlSlugFor, type Surface, type UrlOverrides } from "./route-shared";

export type CmsPageData = {
  slug: string; urlSlug: string; title: string; seoTitle: string; seoDescription: string;
  content: Record<string, unknown>; published: boolean; updatedAt: string;
};
export type CmsFaqData = { id: string; section: string; category: string; question: string; answer: string; sortOrder: number };
export type CmsPostData = {
  id: string; slug: string; title: string; tag: string; excerpt: string; body: string; readTime: string;
  author: string; authorRole: string; publishedAt: string; featuredUrl: string; seoTitle: string; seoDescription: string;
  summary: string;
};
export type CmsTestimonialData = { id: string; quote: string; name: string; role: string; stars: number; mediaUrl: string };
export type CmsBanner = { enabled: boolean; text: string; link: string };
export type CmsContact = { phoneDisplay: string; phoneHref: string; whatsappHref: string; email: string };

// Built-in contact fallbacks — the CMS keys (contact_phone / contact_whatsapp /
// contact_email) override these from the admin console, Website → Contact.
export const DEFAULT_CONTACT: CmsContact = {
  phoneDisplay: "+91 93547 60585",
  phoneHref: "tel:+919354760585",
  whatsappHref: "https://wa.me/919354760585",
  email: "hello@sensiblee.in",
};

function contactFromSettings(map: Map<string, string>): CmsContact {
  const phoneDisplay = map.get("contact_phone")?.trim() || DEFAULT_CONTACT.phoneDisplay;
  const digits = phoneDisplay.replace(/\D/g, "");
  const wa = (map.get("contact_whatsapp") || "").replace(/\D/g, "");
  return {
    phoneDisplay,
    phoneHref: `tel:+${digits}`,
    whatsappHref: `https://wa.me/${wa || digits}`,
    email: map.get("contact_email")?.trim() || DEFAULT_CONTACT.email,
  };
}

export type CmsBundle = {
  pages: Record<string, CmsPageData>;
  faqs: CmsFaqData[];
  posts: CmsPostData[];
  testimonials: CmsTestimonialData[];
  banner: CmsBanner;
  contact: CmsContact;
};

const mediaUrl = (id: string | null | undefined) => (id ? `/api/cms/media/${id}` : "");

function fallbackBundle(): CmsBundle {
  const pages: Record<string, CmsPageData> = {};
  for (const slug of CMS_PAGE_SLUGS) {
    pages[slug] = {
      slug, urlSlug: defaultUrlSlugFor(slug as Surface), title: CMS_PAGE_TITLES[slug],
      seoTitle: CMS_DEFAULT_SEO[slug].title, seoDescription: CMS_DEFAULT_SEO[slug].description,
      content: PAGE_CONTENT_DEFAULTS[slug], published: true, updatedAt: new Date(0).toISOString(),
    };
  }
  return {
    pages,
    faqs: FAQ_SEED.map((f, i) => ({ id: `fallback-faq-${i}`, ...f, sortOrder: i })),
    posts: POST_SEED.map((p, i) => ({
      id: `fallback-post-${i}`, ...p, publishedAt: new Date(p.publishedAt).toISOString(), featuredUrl: "",
      seoTitle: p.title, seoDescription: p.excerpt,
    })),
    testimonials: TESTIMONIAL_SEED.map((t, i) => ({ id: `fallback-tsm-${i}`, ...t, mediaUrl: "" })),
    banner: { enabled: false, text: "", link: "" },
    contact: DEFAULT_CONTACT,
  };
}

export async function loadCmsBundle(): Promise<CmsBundle> {
  try {
    const [pageRows, faqRows, postRows, tsmRows, settings] = await Promise.all([
      db.cmsPage.findMany(),
      db.cmsFaq.findMany({ where: { published: true }, orderBy: [{ section: "asc" }, { sortOrder: "asc" }] }),
      db.cmsPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } }),
      db.cmsTestimonial.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
      db.cmsSetting.findMany(),
    ]);

    const pages: Record<string, CmsPageData> = fallbackBundle().pages;
    for (const row of pageRows) {
      if (!(CMS_PAGE_SLUGS as readonly string[]).includes(row.slug)) continue;
      let content: Record<string, unknown> = {};
      try { content = JSON.parse(row.content) as Record<string, unknown>; } catch { content = {}; }
      pages[row.slug] = {
        slug: row.slug, urlSlug: row.urlSlug?.trim() || defaultUrlSlugFor(row.slug as Surface),
        title: row.title, seoTitle: row.seoTitle, seoDescription: row.seoDescription,
        content: { ...PAGE_CONTENT_DEFAULTS[row.slug as CmsSlug], ...content },
        published: row.published, updatedAt: row.updatedAt.toISOString(),
      };
    }

    // Hydrate the router's URL overrides so server-side parsing (initial route +
    // metadata) matches the admin-edited URLs. Client hydrates the same map from
    // this bundle in app-shell.
    const overrides: UrlOverrides = {};
    for (const [slug, page] of Object.entries(pages)) {
      if (slug !== "home" && page.urlSlug) overrides[slug as Surface] = page.urlSlug;
    }
    setUrlOverrides(overrides);

    const map = new Map(settings.map((s) => [s.key, s.value]));
    return {
      pages,
      faqs: faqRows.map((f) => ({ id: f.id, section: f.section, category: f.category, question: f.question, answer: f.answer, sortOrder: f.sortOrder })),
      posts: postRows.map((p) => ({
        id: p.id, slug: p.slug, title: p.title, tag: p.tag, excerpt: p.excerpt, body: p.body,
        readTime: p.readTime, author: p.author, authorRole: p.authorRole,
        publishedAt: p.publishedAt.toISOString(), featuredUrl: mediaUrl(p.featuredMediaId),
        seoTitle: p.seoTitle, seoDescription: p.seoDescription,
        summary: (p as { summary?: string | null }).summary || "",
      })),
      testimonials: tsmRows.map((t) => ({ id: t.id, quote: t.quote, name: t.name, role: t.role, stars: t.stars, mediaUrl: mediaUrl(t.mediaId) })),
      banner: {
        enabled: map.get("banner_enabled") === "true",
        text: map.get("banner_text") || "",
        link: map.get("banner_link") || "",
      },
      contact: contactFromSettings(map),
    };
  } catch {
    setUrlOverrides(null); // DB unavailable — routing falls back to built-in URLs
    return fallbackBundle();
  }
}

// Per-path SEO for generateMetadata. Returns null for non-marketing paths so the
// layout default metadata applies untouched.
export async function loadSeoForPath(pathname: string): Promise<{ title: string; description: string } | null> {
  const p = (pathname || "/").replace(/\/+$/, "") || "/";
  if (p.startsWith("/app") || p.startsWith("/admin") || p.startsWith("/g/") || p === "/login" || p === "/signup") return null;

  try {
    const blogBase = urlSlugFor("blog");
    if (p === `/${blogBase}` || p.startsWith(`/${blogBase}/`)) {
      const view = decodeURIComponent(p.split("/")[2] || "");
      if (view) {
        const posts = await db.cmsPost.findMany({ where: { published: true } });
        const post = posts.find((c) => c.slug === view || slugifyTitle(c.title) === view);
        if (post) return { title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt };
      }
      // blog listing itself → falls through to the page lookup below
    }
    // Resolve the URL segment → internal CmsSlug, honouring admin-edited URLs.
    const rows = await db.cmsPage.findMany({ select: { slug: true, urlSlug: true } });
    const reverse: Record<string, string> = { "": "home", home: "home" };
    for (const s of CMS_PAGE_SLUGS) reverse[defaultUrlSlugFor(s as Surface)] = s;
    reverse[""] = "home";
    reverse["home"] = "home";
    for (const r of rows) {
      const eff = r.urlSlug?.trim();
      if (eff) reverse[eff] = r.slug; // overrides win
    }
    const isHome = p === "/" || p === "";
    const urlSlug = isHome ? "home" : p.slice(1);
    const slug = isHome ? "home" : (reverse[urlSlug] || reverse[urlSlug.toLowerCase()]);
    if (!slug || !(CMS_PAGE_SLUGS as readonly string[]).includes(slug)) return null;
    const page = await db.cmsPage.findUnique({ where: { slug } });
    const fallback = CMS_DEFAULT_SEO[slug as CmsSlug] || null;
    if (!page) return fallback;
    return {
      title: page.seoTitle || fallback?.title || "",
      description: page.seoDescription || fallback?.description || "",
    };
  } catch {
    return null;
  }
}
