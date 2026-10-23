// Sensiblee marketing pages 4 — Blog, Knowledgebase, Submit a Ticket
"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { PageHero } from "./marketing-chrome";
import { useRouter } from "@/lib/router";
import { useCmsPage, useCmsFaqs, useCmsPosts, useCmsPost } from "@/lib/cms-context";
import { blogImagesFor, blogThumbFor } from "@/lib/blog-images";
import { blogPostUrlView } from "@/lib/route-shared";
import type { BlogContent, KnowledgeContent, TicketContent } from "@/lib/cms-defaults2";
import { WhatsAppIcon } from "./brand";
import {
  cn, ArrowRight, ArrowUpRight, BookOpen, Search, Check, CheckCircle2, LifeBuoy,
  Ticket as TicketIcon, Clock, Tag, Sparkles, AlertTriangle, ChevronRight, Headphones,
  Linkedin, Facebook, Twitter, Link2, Share2, Newspaper, Play,
} from "./deps";

type NavFn = (v: string) => void;
type PageProps = { onNavigate: NavFn };

/* ================================ BLOG ================================ */

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// SSR-safe page URL for share links (useSyncExternalStore avoids set-state-in-effect).
const subscribePageUrl = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
const usePageUrl = () =>
  useSyncExternalStore(subscribePageUrl, () => window.location.href, () => "https://sensiblee.in");

function ShareRow({ title, compact }: { title: string; compact?: boolean }) {
  const url = usePageUrl();
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API can be blocked — fall back to a hidden textarea copy.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* give up silently */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, Icon: Linkedin },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, Icon: Facebook },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, Icon: Twitter },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} — ${url}`)}`, Icon: WhatsAppIcon },
  ];

  if (compact) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="mr-1 hidden text-[11.5px] font-semibold text-neutral-400 sm:inline">Share</span>
        {links.slice(0, 4).map(({ label, href, Icon }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${label}`}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-neutral-400 transition-colors hover:bg-mint-soft hover:text-mint-deep">
            <Icon size={13} />
          </a>
        ))}
        <button onClick={copy} aria-label="Copy link"
          className="flex h-7 items-center gap-1 rounded-full bg-surface px-2.5 text-[10.5px] font-bold text-neutral-400 transition-colors hover:bg-mint-soft hover:text-mint-deep">
          {copied ? <Check size={12} className="text-mint-deep" /> : <Link2 size={12} />} {copied ? "Copied!" : "Copy link"}
        </button>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-neutral-100 py-4">
      <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-neutral-400">
        <Share2 size={13} /> Share this article
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-2">
        {links.map(({ label, href, Icon }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 text-[12px] font-semibold text-neutral-500 transition-colors hover:border-mint hover:text-mint-deep">
            <Icon size={13} /> {label}
          </a>
        ))}
        <button onClick={copy}
          className="flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 text-[12px] font-semibold text-neutral-500 transition-colors hover:border-mint hover:text-mint-deep">
          {copied ? <Check size={13} className="text-mint-deep" /> : <Link2 size={13} />} {copied ? "Copied!" : "Copy link"}
        </button>
      </span>
    </div>
  );
}

export function BlogPage({ slug, onNavigate }: PageProps & { slug?: string }) {
  const { navigate } = useRouter();
  const c = useCmsPage<BlogContent>("blog");
  const posts = useCmsPosts();
  const post = useCmsPost(slug);

  // 3 "Keep reading" picks — deterministic per post (Fisher-Yates seeded by post id),
  // excluding the current article.
  const related = useMemo(() => {
    if (!post) return [];
    const pool = posts.filter((p) => p.id !== post.id);
    let seed = 0;
    for (const ch of post.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rand = (n: number) => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }, [post, posts]);

  if (slug && post) {
    const storedSlug = post.slug;
    const imgs = blogImagesFor(storedSlug);
    const thumb = post.featuredUrl || imgs?.thumb || "";
    const midImg = imgs?.mid || "";
    const summary = post.summary || post.excerpt;

    // Body renderer: "## " → h2, "### " → h3, else paragraph; the mid-article
    // illustration slots in after the middle block.
    const blocks = post.body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const midIndex = Math.max(1, Math.ceil(blocks.length / 2));
    const article = post.featuredUrl ? blocks : (
      <>
        {blocks.slice(0, midIndex).map((para, i) => {
          if (para.startsWith("### ")) return <h3 key={i} className="pt-1 text-[17.5px] font-bold tracking-tight text-brand">{para.slice(4)}</h3>;
          if (para.startsWith("## ")) return <h2 key={i} className="pt-2 text-[21px] font-bold tracking-tight text-brand">{para.slice(3)}</h2>;
          return <p key={i} className="text-[14.5px] leading-[1.75] text-neutral-600">{para}</p>;
        })}
        {midImg && (
          <figure className="my-7">
            <img src={midImg} alt="" loading="lazy" className="aspect-[16/9] w-full rounded-2xl border border-neutral-200/70 object-cover" />
            <figcaption className="mt-2 text-center text-[11px] text-neutral-400">Sensiblee turns review signals into one calm, actionable loop.</figcaption>
          </figure>
        )}
        {blocks.slice(midIndex).map((para, i) => {
          if (para.startsWith("### ")) return <h3 key={i + midIndex} className="pt-1 text-[17.5px] font-bold tracking-tight text-brand">{para.slice(4)}</h3>;
          if (para.startsWith("## ")) return <h2 key={i + midIndex} className="pt-2 text-[21px] font-bold tracking-tight text-brand">{para.slice(3)}</h2>;
          return <p key={i + midIndex} className="text-[14.5px] leading-[1.75] text-neutral-600">{para}</p>;
        })}
      </>
    );

    return (
      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-5 pb-14 pt-12">
          <button onClick={() => navigate({ surface: "blog" })} className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-brand">
            <ChevronRight size={14} className="rotate-180" /> All articles
          </button>

          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mint-deep">
            <Tag size={11} /> {post.tag}
          </span>
          <h1 className="mt-4 text-[32px] font-bold leading-[1.14] tracking-tight">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[12.5px] text-neutral-400">
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="flex items-center gap-1.5"><Clock size={13} /> {fmtDate(post.publishedAt)} · {post.readTime}</span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand">
                  <Sparkles size={11} className="text-mint" />
                </span>
                <span className="font-semibold text-neutral-500">{post.author}</span> · {post.authorRole}
              </span>
            </span>
            <ShareRow title={post.title} compact />
          </div>

          {/* Summary — "In this article" */}
          <aside className="mt-7 rounded-2xl border border-mint/30 bg-mint-soft/60 p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">
              <BookOpen size={12} /> In this article
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-600">{summary}</p>
          </aside>

          {thumb && (
            <figure className="mt-7">
              <img src={thumb} alt={post.title} className="aspect-[2/1] w-full rounded-3xl border border-neutral-200/70 object-cover" />
            </figure>
          )}

          <div className="mt-8 space-y-5">{article}</div>

          <div className="mt-9"><ShareRow title={post.title} /></div>

          {/* Dual CTA — Watch Demo / Try for Free */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => { navigate({ surface: "home" }); setTimeout(() => document.getElementById("demo-video")?.scrollIntoView({ behavior: "smooth", block: "start" }), 260); }}
              className="group flex items-center gap-3.5 rounded-2xl border border-neutral-200/70 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-mint hover:shadow-lg"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint-soft text-mint-deep transition-colors group-hover:bg-mint group-hover:text-brand-deep">
                <Play size={17} className="fill-current" />
              </span>
              <span>
                <span className="block text-[14px] font-bold text-brand">Watch Demo</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-neutral-400">4-minute narrated tour, no signup</span>
              </span>
            </button>
            <button
              onClick={() => onNavigate("signup")}
              className="group flex items-center gap-3.5 rounded-2xl border border-neutral-200/70 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-mint hover:shadow-lg"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint-soft text-mint-deep transition-colors group-hover:bg-mint group-hover:text-brand-deep">
                <ArrowUpRight size={17} />
              </span>
              <span>
                <span className="block text-[14px] font-bold text-brand">Try for Free</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-neutral-400">7-day trial on your live Google profile</span>
              </span>
            </button>
          </div>

          {/* Keep reading — 3 other posts + back to listing */}
          {related.length > 0 && (
            <section className="mt-11">
              <h2 className="text-[19px] font-bold tracking-tight text-brand">Keep reading</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {related.map((r) => {
                  const rThumb = blogThumbFor(r.slug, r.featuredUrl);
                  return (
                    <button key={r.id} onClick={() => navigate({ surface: "blog", view: blogPostUrlView(r) })}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <span className="block aspect-[16/10] overflow-hidden bg-surface">
                        {rThumb ? (
                          <img src={rThumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mint-soft to-amber-soft/50 text-mint-deep"><Newspaper size={22} /></span>
                        )}
                      </span>
                      <span className="flex flex-1 flex-col p-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-mint-deep">{r.tag}</span>
                        <span className="mt-1.5 block text-[13px] font-bold leading-snug text-brand">{r.title}</span>
                        <span className="mt-auto block pt-2 text-[11px] text-neutral-400">{fmtDate(r.publishedAt)} · {r.readTime}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => navigate({ surface: "blog" })} className="mx-auto mt-6 flex items-center gap-1.5 text-[13px] font-semibold text-mint-deep hover:underline">
                <ChevronRight size={14} className="rotate-180" /> Back to all articles
              </button>
            </section>
          )}
        </article>
      </main>
    );
  }

  if (slug && !post) {
    return (
      <main className="flex-1">
        <section className="mx-auto max-w-xl px-5 py-24 text-center">
          <BookOpen size={28} className="mx-auto text-neutral-300" />
          <h1 className="mt-4 text-[24px] font-bold tracking-tight">Article not found</h1>
          <p className="mt-2 text-[13.5px] text-neutral-500">It may be unpublished or the link is wrong.</p>
          <Button className="mt-6 h-11 rounded-2xl bg-brand px-5 text-[13.5px] text-white hover:bg-brand-deep" onClick={() => navigate({ surface: "blog" })}>
            Browse all articles
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <PageHero eyebrow={c.eyebrow} title={c.title} accent={c.accent} description={c.description} />
      <section className="mx-auto max-w-4xl px-5 pb-12">
        <div className="grid gap-5">
          {posts.map((p) => {
            const thumb = blogThumbFor(p.slug, p.featuredUrl);
            return (
              <button
                key={p.id}
                onClick={() => navigate({ surface: "blog", view: blogPostUrlView(p) })}
                className="group grid overflow-hidden rounded-3xl border border-neutral-200/70 bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-lg sm:grid-cols-[240px_1fr]"
              >
                <span className="block aspect-[16/10] overflow-hidden bg-surface sm:aspect-auto sm:h-full">
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mint-soft to-amber-soft/50 text-mint-deep"><Newspaper size={26} /></span>
                  )}
                </span>
                <span className="flex flex-1 flex-col p-5 lg:p-6">
                  <span className="flex flex-wrap items-center gap-2.5 text-[11.5px] text-neutral-400">
                    <span className="rounded-full bg-mint-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mint-deep">{p.tag}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {fmtDate(p.publishedAt)} · {p.readTime}</span>
                  </span>
                  <span className="mt-2.5 block text-[18px] font-bold leading-snug tracking-tight text-brand">{p.title}</span>
                  <span className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-neutral-500">{p.excerpt}</span>
                  <span className="mt-auto flex items-center gap-2 pt-4 text-[12px] text-neutral-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand">
                      <Sparkles size={10} className="text-mint" />
                    </span>
                    <span className="font-semibold text-neutral-500">{p.author}</span> · {p.authorRole}
                    <span className="ml-auto hidden items-center gap-1.5 font-semibold text-brand sm:inline-flex">
                      Read article <ArrowRight size={13} className="text-mint-deep transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[12.5px] text-neutral-400">
          <BookOpen size={14} /> {c.footnote}
        </p>
      </section>
    </main>
  );
}

/* ============================ KNOWLEDGEBASE ============================ */

export function KnowledgebasePage({ onNavigate }: PageProps) {
  const c = useCmsPage<KnowledgeContent>("knowledge");
  const faqs = useCmsFaqs("knowledge");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const cats: { cat: string; blurb: string }[] = [...c.categories];
    for (const f of faqs) {
      if (!cats.some((x) => x.cat === f.category)) cats.push({ cat: f.category, blurb: "" });
    }
    return cats
      .map(({ cat, blurb }) => ({
        cat,
        blurb,
        items: faqs.filter((f) => f.category === cat && (!query || (f.question + " " + f.answer).toLowerCase().includes(query))),
      }))
      .filter((g) => g.items.length > 0);
  }, [c.categories, faqs, query]);
  const total = faqs.length;
  const hits = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <main className="flex-1">
      <PageHero eyebrow={c.eyebrow} title={c.title} accent={c.accent} description={total > 0 ? `${c.description} ${total} short answers, no support ticket required.` : c.description} />
      <section className="mx-auto max-w-3xl px-5 pb-12">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="h-13 w-full rounded-2xl border border-neutral-200 bg-white py-3.5 pl-11 pr-4 text-[14px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none focus:border-mint focus:ring-2 focus:ring-mint/30"
            aria-label="Search the FAQs"
          />
        </div>
        {query && (
          <p className="mt-3 text-[12.5px] text-neutral-400">
            {hits} answer{hits === 1 ? "" : "s"} match “{q.trim()}”
          </p>
        )}

        <div className="mt-6 space-y-5">
          {groups.map((g) => (
            <div key={g.cat} className="rounded-3xl border border-neutral-200/70 bg-white p-6">
              <h2 className="text-[19px] font-bold tracking-tight text-brand">{g.cat}</h2>
              {g.blurb && <p className="mt-0.5 text-[12.5px] text-neutral-400">{g.blurb}</p>}
              <div className="mt-4 space-y-4">
                {g.items.map((i) => (
                  <details key={i.id} className="group rounded-2xl border border-neutral-100 bg-cream/60 p-4 open:bg-white open:shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-brand [&::-webkit-details-marker]:hidden">
                      {i.question}
                      <ChevronRight size={15} className="shrink-0 text-neutral-300 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-neutral-500">{i.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-8 text-center">
              <p className="text-[14px] font-semibold text-brand">{c.noMatchTitle} “{q.trim()}”</p>
              <p className="mt-1 text-[12.5px] text-neutral-400">{c.noMatchSub}</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl bg-brand px-7 py-6 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="flex items-center gap-2 text-[17px] font-bold text-white">
              <Headphones size={17} className="text-mint" /> {c.ctaTitle}
            </h3>
            <p className="mt-1 text-[13px] text-white/55">{c.ctaSub}</p>
          </div>
          <Button className="h-11 shrink-0 rounded-2xl bg-mint px-5 text-[13.5px] font-bold text-brand-deep hover:bg-mint/90" onClick={() => onNavigate("ticket")}>
            {c.ctaButton} <ArrowUpRight size={14} className="ml-1" />
          </Button>
        </div>
      </section>
    </main>
  );
}

/* ============================= SUBMIT A TICKET ============================= */

const PRIORITIES = [
  { key: "low", label: "Low", hint: "Question or feedback" },
  { key: "normal", label: "Normal", hint: "Something's off" },
  { key: "high", label: "High", hint: "Workflow is blocked" },
];

export function TicketPage({ onNavigate }: PageProps) {
  const c = useCmsPage<TicketContent>("ticket");
  const [form, setForm] = useState({ name: "", email: "", business: "", topic: "Technical issue", priority: "normal", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ticketNo, setTicketNo] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Please tell us your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Enter a valid email — the reply lands there";
    if (form.message.trim().length < 15) errs.message = "A sentence or two helps us help you (min 15 characters)";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit");
      setTicketNo(data.ticket.number);
    } catch {
      setErrors({ message: "Something went wrong submitting the ticket — please try again, or email support@sensiblee.in." });
    } finally {
      setBusy(false);
    }
  };

  if (ticketNo) {
    return (
      <main className="flex-1">
        <section className="mx-auto max-w-xl px-5 py-20 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-mint-soft">
            <CheckCircle2 size={30} className="text-mint-deep" />
          </span>
          <h1 className="mt-5 text-[28px] font-bold tracking-tight">Ticket {ticketNo} received</h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-neutral-500">
            Thanks {form.name.split(" ")[0]} — your ticket is with the support desk. You&apos;ll get a reply at{" "}
            <span className="font-semibold text-brand">{form.email}</span> within one business day
            {form.priority === "high" ? " (high-priority tickets jump the queue)" : ""}.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button className="h-11 rounded-2xl bg-brand px-5 text-[13.5px] text-white hover:bg-brand-deep" onClick={() => onNavigate("home")}>
              Back to home
            </Button>
            <Button variant="outline" className="h-11 rounded-2xl border-brand/20 px-5 text-[13.5px]" onClick={() => onNavigate("knowledge")}>
              Browse the FAQs
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <PageHero eyebrow={c.eyebrow} title={c.title} accent={c.accent} description={c.description} />
      <section className="mx-auto max-w-2xl px-5 pb-14">
        <form onSubmit={submit} noValidate className="rounded-3xl border border-neutral-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" error={errors.name}>
              <input value={form.name} onChange={set("name")} placeholder="Anand Menon" className={inputCls} />
            </Field>
            <Field label="Work email" error={errors.email}>
              <input value={form.email} onChange={set("email")} type="email" placeholder="you@yourbusiness.in" className={inputCls} />
            </Field>
            <Field label="Business (optional)">
              <input value={form.business} onChange={set("business")} placeholder="Spice Route Kitchen" className={inputCls} />
            </Field>
            <Field label="Topic">
              <select value={form.topic} onChange={set("topic")} className={cn(inputCls, "appearance-none")}>
                {c.topics.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-neutral-500">Priority</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => setForm((f) => ({ ...f, priority: p.key }))}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-left transition-all",
                    form.priority === p.key ? "border-mint bg-mint-soft shadow-[0_0_0_1px_var(--color-mint)]" : "border-neutral-200 bg-white hover:border-neutral-300"
                  )}
                  aria-pressed={form.priority === p.key}
                >
                  <span className={cn("flex items-center gap-1.5 text-[13px] font-bold", form.priority === p.key && p.key === "high" ? "text-amber-deep" : "text-brand")}>
                    {p.key === "high" && <AlertTriangle size={13} />}
                    {p.label}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-neutral-400">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Field label="What happened?" error={errors.message}>
              <textarea
                value={form.message}
                onChange={set("message")}
                rows={5}
                placeholder="What you expected, what happened instead, and when it started. Screenshots welcome at support@sensiblee.in (quote your ticket number)."
                className={cn(inputCls, "h-auto py-3 leading-relaxed")}
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="flex items-center gap-1.5 text-[11.5px] text-neutral-400">
              <LifeBuoy size={13} className="text-mint-deep" /> Replies come from support@sensiblee.in · one business day
            </p>
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-2xl bg-mint px-6 text-[14px] font-bold text-brand-deep hover:bg-mint/90 sm:w-auto">
              {busy ? "Submitting…" : <>Submit Ticket <TicketIcon size={15} className="ml-1.5" /></>}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-[12.5px] text-neutral-400">
          Looking for a quicker answer? The <button onClick={() => onNavigate("knowledge")} className="font-semibold text-mint-deep hover:underline">FAQs</button> cover the most common questions.
        </p>
      </section>
    </main>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-neutral-200 bg-cream/60 px-3.5 text-[13.5px] outline-none focus:border-mint focus:ring-2 focus:ring-mint/30";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-500">
          <AlertTriangle size={11} /> {error}
        </span>
      )}
    </label>
  );
}

void Check;
