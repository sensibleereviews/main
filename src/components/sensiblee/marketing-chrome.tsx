// Sensiblee marketing site — shared chrome (nav + footer)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCmsBanner, useCmsContact, useCmsPageTitle } from "@/lib/cms-context";
import { WhatsAppIcon, FacebookIcon, LinkedInIcon, InstagramIcon, YouTubeIcon } from "./brand";
import { cn, Menu, X, ArrowRight, ArrowUpRight, Play, Sparkles, Phone, Mail } from "./deps";

export type MarketingView =
  | "home"
  | "features"
  | "how"
  | "pricing"
  | "stories"
  | "security"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "sitemap"
  | "blog"
  | "knowledge"
  | "ticket";

export const TAGLINE = "Sensing Sensibly. Acting Intelligently";

// Shared: build a handler that sends the visitor to the demo video section on the home page
export function demoVideoHandler(navigateHome: () => void, isHome: boolean): () => void {
  return () => {
    const scroll = () => document.getElementById("demo-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (isHome) {
      // small delay so a closing mobile menu settles before we measure scroll
      setTimeout(scroll, 260);
    } else {
      navigateHome();
      setTimeout(scroll, 260);
    }
  };
}

export const NAV_LINKS: { key: MarketingView; label: string }[] = [
  { key: "features", label: "Features" },
  { key: "how", label: "How it works" },
  { key: "pricing", label: "Pricing" },
  { key: "stories", label: "Customer Stories" },
  { key: "about", label: "About Us" },
];

// Footer columns/labels below are the built-in defaults; every visitor-facing
// label is resolved through useCmsPageTitle() at render time so admin page
// renames (Website → Pages → Page name) flow to the nav, footer and sitemap
// from the single CMS source.

type ChromeProps = {
  view: MarketingView;
  onNavigate: (v: MarketingView) => void;
  onOpenApp: () => void;
  onOpenAdmin: () => void;
  onWatchDemo: () => void;
  onFreeTrial: () => void;
};

/* ------------------------------- Nav ------------------------------- */

export function MarketingNav({ view, onNavigate, onOpenApp, onWatchDemo, onFreeTrial }: ChromeProps) {
  const [open, setOpen] = useState(false);
  const banner = useCmsBanner();
  const pageTitle = useCmsPageTitle();
  const bannerLink = (NAV_LINKS.some((l) => l.key === banner.link) ? banner.link : "") as MarketingView | "";
  const navLinks = NAV_LINKS.map((l) => ({ ...l, label: pageTitle(l.key, l.label) }));

  const go = (v: MarketingView) => {
    setOpen(false);
    onNavigate(v);
  };
  const watchDemo = () => {
    setOpen(false);
    onWatchDemo();
  };

  return (
    <>
      {/* CMS-managed announcement banner (admin console → Website → Banner) */}
      {banner.enabled && banner.text && (
        <div className="bg-brand text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-5 py-2 text-center text-[12.5px] font-medium">
            <Sparkles size={13} className="shrink-0 text-mint" aria-hidden />
            <span>{banner.text}</span>
            {bannerLink && (
              <button
                onClick={() => { setOpen(false); onNavigate(bannerLink); }}
                className="inline-flex items-center gap-1 font-bold text-mint hover:underline"
              >
                {bannerLink === "contact" ? "Talk to us" : "Learn more"}
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-cream/85 shadow-[0_1px_0_rgba(16,24,40,0.02)] backdrop-blur-md">
      <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-5">
        <button
          onClick={() => go("home")}
          className="flex items-center rounded-lg outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-mint"
          aria-label="Sensiblee home"
        >
          {/* Official brand logo — opaque artwork (tagline baked in) */}
          <img
            src="/brand/logo-header.png"
            alt="Sensiblee — Sensing Sensibly. Acting Intelligently."
            className="h-[48px] w-auto"
          />
        </button>

        <nav className="hidden items-center gap-7 xl:flex" aria-label="Primary">
          {navLinks.map((l) => (
            <button
              key={l.key}
              onClick={() => go(l.key)}
              className={cn(
                "group relative whitespace-nowrap py-2 text-[15px] font-semibold transition-colors",
                view === l.key ? "text-brand" : "text-neutral-900 hover:text-mint-deep"
              )}
            >
              {l.label}
              <span
                className={cn(
                  "absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition-all",
                  view === l.key ? "bg-mint-deep" : "bg-transparent group-hover:bg-mint/60"
                )}
              />
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 xl:flex">
          <button
            onClick={watchDemo}
            className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-4 text-[13.5px] font-semibold text-brand shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-mint hover:text-brand-deep"
          >
            <Play size={14} className="text-mint-deep" /> Watch Demo
          </button>
          <button
            onClick={onOpenApp}
            className="flex h-10 items-center justify-center whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-4 text-[13.5px] font-semibold text-brand shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-mint hover:text-brand-deep"
          >
            Sign In
          </button>
          <Button
            size="sm"
            className="h-10 whitespace-nowrap rounded-xl bg-mint px-4 text-[13.5px] font-bold text-brand-deep shadow-[0_2px_8px_rgba(136,214,160,0.35)] hover:bg-mint/90"
            onClick={onFreeTrial}
          >
            Try for Free <ArrowUpRight size={15} className="ml-1" />
          </Button>
        </div>

        <button
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white xl:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-200/60 bg-cream px-5 pb-5 pt-3 xl:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {navLinks.map((l) => (
              <button
                key={l.key}
                onClick={() => go(l.key)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] font-semibold",
                  view === l.key ? "bg-mint-soft text-brand" : "text-neutral-600"
                )}
              >
                {l.label}
                <ArrowRight size={15} className="text-neutral-300" />
              </button>
            ))}
          </nav>
          <button
            onClick={watchDemo}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[14px] font-semibold text-brand"
          >
            <Play size={15} className="text-mint-deep" /> Watch Demo
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <Button variant="outline" className="h-12 rounded-xl border-brand/20 text-[14px] font-semibold" onClick={onOpenApp}>
              Sign In
            </Button>
            <Button className="h-12 rounded-xl bg-mint text-[14px] font-bold text-brand-deep hover:bg-mint/90" onClick={onFreeTrial}>
              Try for Free
            </Button>
          </div>
        </div>
      )}
    </header>
    </>
  );
}

/* ------------------------------ Footer ------------------------------ */

const FOOTER_COLS: { title: string; links: { label: string; view?: MarketingView; demo?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", view: "features" },
      { label: "How it works", view: "how" },
      { label: "Pricing", view: "pricing" },
      { label: "Customer Stories", view: "stories" },
      { label: "Watch Demo", demo: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", view: "about" },
      { label: "Blog", view: "blog" },
      { label: "Contact", view: "contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQs", view: "knowledge" },
      { label: "Submit a Ticket", view: "ticket" },
    ],
  },
];

// Bottom-bar links, rendered horizontally next to the copyright line
const FOOTER_LEGAL_LINKS: { label: string; view: MarketingView }[] = [
  { label: "Sitemap", view: "sitemap" },
  { label: "Privacy policy", view: "privacy" },
  { label: "Terms of service", view: "terms" },
  { label: "Security & Trust", view: "security" },
];

// Footer contact details are CMS-driven (Website → Contact tab); code fallback
// lives in src/lib/cms.ts → DEFAULT_CONTACT.

export function MarketingFooter({ onNavigate, onWatchDemo }: ChromeProps) {
  const contact = useCmsContact();
  const pageTitle = useCmsPageTitle();
  const footerCols = FOOTER_COLS.map((col) => ({
    ...col,
    links: col.links.map((l) => (l.view ? { ...l, label: pageTitle(l.view, l.label) } : l)),
  }));
  const legalLinks = FOOTER_LEGAL_LINKS.map((l) => ({ ...l, label: pageTitle(l.view, l.label) }));
  return (
    <footer className="mt-auto bg-brand pb-[max(env(safe-area-inset-bottom),1.25rem)] text-white">
      <div className="mx-auto max-w-6xl px-5 pt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <button
              onClick={() => onNavigate("home")}
              aria-label="Sensiblee — back to home"
              className="inline-flex cursor-pointer items-center rounded-2xl bg-white px-3.5 py-2.5 transition-transform duration-200 hover:scale-[1.03] hover:shadow-[0_8px_24px_-8px_rgba(136,214,160,0.45)]"
            >
              {/* Official brand logo — transparent artwork on light plate (tagline baked in) */}
              <img
                src="/brand/logo-footer.png"
                alt="Sensiblee — Sensing Sensibly. Acting Intelligently."
                className="h-[52px] w-auto"
              />
            </button>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-white/50">
              AI powered Customer Experience Intelligence. Turn Google reviews into your most
              reliable growth engine — sensibly.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {[
                { label: "Facebook", href: "https://www.facebook.com/sensiblee", Icon: FacebookIcon },
                { label: "LinkedIn", href: "https://www.linkedin.com/company/sensiblee", Icon: LinkedInIcon },
                { label: "Instagram", href: "https://www.instagram.com/sensiblee", Icon: InstagramIcon },
                { label: "YouTube", href: "https://www.youtube.com/@sensiblee", Icon: YouTubeIcon },
              ].map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Sensiblee on ${label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-mint hover:text-brand-deep"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {footerCols.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">{col.title}</p>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map((l, i) => (
                  <li key={`${col.title}-${i}`}>
                    <button
                      onClick={() => (l.demo ? onWatchDemo() : l.view && onNavigate(l.view))}
                      className={cn(
                        "text-[12.5px] transition-colors hover:text-mint",
                        l.demo ? "inline-flex items-center gap-1.5 font-semibold text-white/80" : "text-white/60"
                      )}
                    >
                      {l.demo && <Play size={12} className="text-mint" />}
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Get in Touch — replaces the former Legal column */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Get in Touch</p>
            <ul className="mt-3.5 space-y-2.5">
              <li>
                <a
                  href={contact.phoneHref}
                  className="flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-mint"
                >
                  <Phone size={13} className="shrink-0 text-mint" /> {contact.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-mint"
                >
                  <WhatsAppIcon size={13} className="shrink-0 text-mint" /> {contact.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-[12.5px] text-white/60 transition-colors hover:text-mint"
                >
                  <Mail size={13} className="shrink-0 text-mint" /> {contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-5 text-[11.5px] text-white/35 sm:flex-row sm:flex-wrap">
          <p>© 2026 Sensiblee. All Rights Reserved.</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {legalLinks.map((l) => (
              <button
                key={l.label}
                onClick={() => onNavigate(l.view)}
                className="transition-colors hover:text-mint"
              >
                {l.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------- Shared page hero --------------------------- */

export function PageHero({
  eyebrow,
  title,
  accent,
  description,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-32 h-52 w-52 rounded-full bg-amber-soft/60 blur-3xl" />
      <div className="mx-auto max-w-3xl px-5 pb-10 pt-14 text-center lg:pt-18">
        <span className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mint-deep">
          {eyebrow}
        </span>
        <h1 className="mt-5 text-5xl font-bold leading-[1.08] tracking-tight lg:text-[54px]">
          {title} <span className="text-mint-deep">{accent}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-neutral-500">{description}</p>
      </div>
    </section>
  );
}
