// Sensiblee CMS — client context. Marketing components read DB-backed content here;
// every selector falls back to built-in defaults when the bundle is missing or empty.
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CmsBundle, CmsContact, CmsFaqData, CmsPostData, CmsTestimonialData } from "./cms";
import { DEFAULT_CONTACT } from "./cms";
import { CMS_PAGE_SLUGS, type CmsSlug } from "./cms-defaults";
import { PAGE_CONTENT_DEFAULTS, CMS_DEFAULT_SEO } from "./cms-defaults2";
import { FAQ_SEED, POST_SEED, TESTIMONIAL_SEED } from "./cms-seed-data";
import { slugifyTitle, defaultUrlSlugFor, type Surface } from "./route-shared";

const Ctx = createContext<CmsBundle | null>(null);

export function CmsProvider({ bundle, children }: { bundle: CmsBundle | null; children: ReactNode }) {
  return <Ctx.Provider value={bundle}>{children}</Ctx.Provider>;
}

function bundle(): CmsBundle {
  // Only possible if a provider is missing — build the static fallback on the fly.
  const pages: CmsBundle["pages"] = {};
  for (const slug of CMS_PAGE_SLUGS) {
    pages[slug] = {
      slug, urlSlug: defaultUrlSlugFor(slug as Surface), title: slug, seoTitle: CMS_DEFAULT_SEO[slug].title, seoDescription: CMS_DEFAULT_SEO[slug].description,
      content: PAGE_CONTENT_DEFAULTS[slug], published: true, updatedAt: new Date(0).toISOString(),
    };
  }
  return { pages, faqs: [], posts: [], testimonials: [], banner: { enabled: false, text: "", link: "" }, contact: DEFAULT_CONTACT };
}

export function useCms(): CmsBundle {
  return useContext(Ctx) || bundle();
}

// Page content merged over built-in defaults (DB copy wins when present).
export function useCmsPage<T extends Record<string, unknown>>(slug: CmsSlug): T {
  const cms = useCms();
  return { ...(PAGE_CONTENT_DEFAULTS[slug] as T), ...((cms.pages[slug]?.content || {}) as Partial<T>) };
}

// FAQs for a surface; falls back to the built-in copy when the table is empty.
export function useCmsFaqs(section: "home" | "pricing" | "knowledge"): CmsFaqData[] {
  const cms = useCms();
  const rows = cms.faqs.filter((f) => f.section === section);
  if (rows.length > 0) return rows;
  return FAQ_SEED.filter((f) => f.section === section).map((f, i) => ({ id: `fallback-${section}-${i}`, ...f, sortOrder: i }));
}

// Published posts, newest first; falls back to the built-in articles.
export function useCmsPosts(): CmsPostData[] {
  const cms = useCms();
  if (cms.posts.length > 0) return cms.posts;
  return POST_SEED.map((p, i) => ({
    id: `fallback-post-${i}`, ...p, publishedAt: new Date(p.publishedAt).toISOString(), featuredUrl: "",
    seoTitle: p.title, seoDescription: p.excerpt,
  }));
}

export function useCmsPost(slug: string | undefined | null): CmsPostData | null {
  const posts = useCmsPosts();
  if (!slug) return null;
  // Public URLs are title-derived (full title, dash-case); stored CmsPost.slug is legacy.
  return posts.find((p) => p.slug === slug || slugifyTitle(p.title) === slug) || null;
}

export function useCmsTestimonials(): CmsTestimonialData[] {
  const cms = useCms();
  if (cms.testimonials.length > 0) return cms.testimonials;
  return TESTIMONIAL_SEED.map((t, i) => ({ id: `fallback-tsm-${i}`, ...t, mediaUrl: "" }));
}

export function useCmsBanner(): { enabled: boolean; text: string; link: string } {
  return useCms().banner;
}

// Footer contact details (Website CMS → Contact tab); falls back to built-ins.
export function useCmsContact(): CmsContact {
  return useCms().contact;
}

// Single source for visitor-facing navigation labels: every nav / footer /
// sitemap link reads the CMS page title (admin console → Website → Pages →
// Page name) and falls back to the built-in label when no page row exists.
export function useCmsPageTitle(): (surface: string, fallback: string) => string {
  const cms = useCms();
  return (surface, fallback) => {
    const t = cms.pages[surface]?.title?.trim();
    return t || fallback;
  };
}
