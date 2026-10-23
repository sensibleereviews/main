// Sensiblee blog imagery — maps a stored post slug to its branded thumbnail and
// mid-article illustration. Admin-uploaded featured media (CmsPost.featuredMediaId)
// still wins over these defaults wherever it is set.

export type BlogImageSet = { thumb: string; mid: string };

// Keyed by the CmsPost.slug as stored in the DB — short dash-case keys that
// also match the actual filenames under public/blog/. (Full-title dash-case
// keys were wrong: the DB stores compact slugs, so lookups always missed.)
const BLOG_IMAGES: Record<string, BlogImageSet> = {
  "response-rate-lever": { thumb: "/blog/response-rate-lever-thumb.jpg", mid: "/blog/response-rate-lever-mid.jpg" },
  "whatsapp-review-requests": { thumb: "/blog/whatsapp-review-requests-thumb.jpg", mid: "/blog/whatsapp-review-requests-mid.jpg" },
  "qr-table-tent-playbook": { thumb: "/blog/qr-table-tent-playbook-thumb.jpg", mid: "/blog/qr-table-tent-playbook-mid.jpg" },
  "ai-learns-your-restaurants-voice": { thumb: "/blog/ai-learns-your-restaurants-voice-thumb.jpg", mid: "/blog/ai-learns-your-restaurants-voice-mid.jpg" },
  "reputation-health-score-explained": { thumb: "/blog/reputation-health-score-explained-thumb.jpg", mid: "/blog/reputation-health-score-explained-mid.jpg" },
  "one-star-recovery-playbook": { thumb: "/blog/one-star-recovery-playbook-thumb.jpg", mid: "/blog/one-star-recovery-playbook-mid.jpg" },
  "google-business-profile-monthly-checklist": { thumb: "/blog/google-business-profile-monthly-checklist-thumb.jpg", mid: "/blog/google-business-profile-monthly-checklist-mid.jpg" },
  "naming-names-in-review-replies": { thumb: "/blog/naming-names-in-review-replies-thumb.jpg", mid: "/blog/naming-names-in-review-replies-mid.jpg" },
  "weekly-feedback-loop-monday-morning": { thumb: "/blog/weekly-feedback-loop-monday-morning-thumb.jpg", mid: "/blog/weekly-feedback-loop-monday-morning-mid.jpg" },
  "review-reply-format-plays": { thumb: "/blog/review-reply-format-plays-thumb.jpg", mid: "/blog/review-reply-format-plays-mid.jpg" },
};

export function blogImagesFor(storedSlug: string): BlogImageSet | null {
  return BLOG_IMAGES[storedSlug] || null;
}

export function blogThumbFor(storedSlug: string, featuredUrl: string): string {
  if (featuredUrl) return featuredUrl;
  return BLOG_IMAGES[storedSlug]?.thumb || "";
}
