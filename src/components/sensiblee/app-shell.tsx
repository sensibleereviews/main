// SensibleeApp — surface conductor. Renders the right surface from the URL route,
// gates client/admin surfaces behind real auth, and shows the impersonation banner.
"use client";

import { useEffect, useMemo } from "react";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider } from "@/lib/theme";
import { SensibleeRouterProvider, useRouter, type Route } from "@/lib/router";
import { CmsProvider } from "@/lib/cms-context";
import { setUrlOverrides, parseNavString, type Surface, type UrlOverrides } from "@/lib/route-shared";
import type { CmsBundle } from "@/lib/cms";
import { MarketingNav, MarketingFooter, demoVideoHandler, type MarketingView } from "./marketing-chrome";
import { HomePage } from "./marketing-home";
import { FeaturesPage, HowPage, PricingPage, CtaBand } from "./marketing-pages";
import { AboutPage, ContactPage, PrivacyPage, TermsPage } from "./marketing-pages2";
import { StoriesPage, SecurityPage, SitemapPage } from "./marketing-pages3";
import { BlogPage, KnowledgebasePage, TicketPage } from "./marketing-pages4";
import { LoginPage, SignupPage } from "./auth-pages";
import { Button } from "@/components/ui/button";
import { ClientDashboard } from "./client-dashboard";
import { AdminConsole } from "./admin-console";
import { GuestSurface } from "./guest-view";
import { BrandLogo, StarRating, GoogleG, WhatsAppIcon } from "./brand";
import { cn, Sparkles, ArrowUpRight, Building2, ArrowRight, Check, Quote, Smartphone, ShieldCheck, X, Play } from "./deps";

export default function SensibleeApp({ initialRoute, cms }: { initialRoute: Route; cms?: CmsBundle | null }) {
  // Hydrate the router's URL map from the server-loaded CMS so every internal
  // link (nav, footer, sitemap, banner) follows admin-edited page URLs. The same
  // overrides were already applied server-side inside loadCmsBundle.
  useMemo(() => {
    const overrides: UrlOverrides = {};
    if (cms?.pages) {
      for (const [slug, page] of Object.entries(cms.pages)) {
        if (slug !== "home" && page.urlSlug) overrides[slug as Surface] = page.urlSlug;
      }
    }
    setUrlOverrides(overrides);
  }, [cms]);

  return (
    <ThemeProvider>
      <SessionProvider>
        <CmsProvider bundle={cms ?? null}>
          <SensibleeRouterProvider initialRoute={initialRoute}>
            <Shell />
          </SensibleeRouterProvider>
        </CmsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const { route, navigate } = useRouter();
  const { user, loading, refresh } = useSession();

  // Marketing surface callbacks. onNavigate accepts bare surfaces ("blog") and
  // "surface:view" deep links ("blog:<article-slug>") — home page blog cards
  // rely on the latter; without parsing they 404 as an unknown surface.
  const onNavigate = (v: string) => navigate(parseNavString(v));
  const onOpenApp = () => navigate({ surface: "client" });
  const onOpenAdmin = () => navigate({ surface: "admin" });
  const onOpenGuest = () => navigate({ surface: "guest" });
  const onAuthed = (role: string) => navigate(role.startsWith("platform_") ? { surface: "admin" } : { surface: "client" });
  const onWatchDemo = demoVideoHandler(() => navigate({ surface: "home" }), route.surface === "home");
  const onFreeTrial = () => navigate({ surface: "signup" });

  /* ------------------------------ auth-gated surfaces ------------------------------ */
  if (route.surface === "client") {
    if (loading) return <FullLoader label="Loading your workspace…" />;
    if (!user) return <AuthGate><LoginPage onNavigate={onNavigate} onAuthed={onAuthed} /></AuthGate>;
    if (user.role.startsWith("platform_") && !user.impersonatedBy) {
      // platform staff land on the console unless impersonating
      return <AdminConsole />;
    }
    return <ClientDashboard />;
  }

  if (route.surface === "admin") {
    if (loading) return <FullLoader label="Loading platform console…" />;
    if (!user || !user.role.startsWith("platform_")) {
      return <AuthGate note="The admin console needs a platform admin account."><LoginPage onNavigate={onNavigate} onAuthed={onAuthed} /></AuthGate>;
    }
    return <AdminConsole />;
  }

  if (route.surface === "guest") {
    return <GuestSurface code={route.code || "spk-kor"} standalone={!!route.code} />;
  }

  if (route.surface === "login") {
    return <AuthFrame>{loading ? <FullLoader label="Checking session…" /> : user ? <AlreadyIn name={user.name} onGo={onAuthed} role={user.role} /> : <LoginPage onNavigate={onNavigate} onAuthed={onAuthed} />}</AuthFrame>;
  }

  if (route.surface === "signup") {
    return <AuthFrame>{loading ? <FullLoader label="Checking session…" /> : user ? <AlreadyIn name={user.name} onGo={onAuthed} role={user.role} /> : <SignupPage onNavigate={onNavigate} onAuthed={onAuthed} />}</AuthFrame>;
  }

  /* --------------------------------- marketing --------------------------------- */
  const view = (["home", "features", "how", "pricing", "stories", "security", "about", "contact", "privacy", "terms", "sitemap", "blog", "knowledge", "ticket"].includes(route.surface)
    ? route.surface
    : "notfound") as MarketingView | "notfound";

  const nav = { view: view === "notfound" ? "home" : view, onNavigate, onOpenApp, onOpenAdmin, onWatchDemo, onFreeTrial };

  return (
    <div className="skin-light flex min-h-screen flex-col overflow-x-clip bg-cream text-brand">
      <MarketingNav {...nav} />
      {view === "notfound" && <NotFoundView onNavigate={onNavigate} onWatchDemo={onWatchDemo} />}
      {view === "features" && <FeaturesPage onNavigate={onNavigate} />}
      {view === "how" && <HowPage onNavigate={onNavigate} />}
      {view === "pricing" && <PricingPage onNavigate={onNavigate} />}
      {view === "stories" && <StoriesPage onNavigate={onNavigate} />}
      {view === "security" && <SecurityPage onNavigate={onNavigate} />}
      {view === "about" && <AboutPage onNavigate={onNavigate} />}
      {view === "contact" && <ContactPage onNavigate={onNavigate} />}
      {view === "privacy" && <PrivacyPage onNavigate={onNavigate} />}
      {view === "terms" && <TermsPage onNavigate={onNavigate} />}
      {view === "sitemap" && <SitemapPage onNavigate={onNavigate} />}
      {view === "blog" && <BlogPage slug={route.surface === "blog" ? route.view : undefined} onNavigate={onNavigate} />}
      {view === "knowledge" && <KnowledgebasePage onNavigate={onNavigate} />}
      {view === "ticket" && <TicketPage onNavigate={onNavigate} />}
      {view === "home" && <HomePage nav={{ onNavigate, onOpenApp, onOpenAdmin, onOpenGuest, onWatchDemo }} />}
      <MarketingFooter {...nav} />
    </div>
  );
}

/* ------------------------------- helpers ------------------------------- */

// Branded 404 — unknown URLs render the full site chrome with a friendly miss view.
function NotFoundView({ onNavigate, onWatchDemo }: { onNavigate: (v: string) => void; onWatchDemo: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <span className="rounded-full border border-mint/40 bg-mint-soft px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mint-deep">
        404 · page not found
      </span>
      <h1 className="mt-5 text-4xl font-bold tracking-tight lg:text-[44px]">
        This page doesn&apos;t <span className="text-mint-deep">exist.</span>
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-neutral-500">
        The address may be old or mistyped — our URLs changed when the site grew. Everything
        worth finding is one click away.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <Button className="h-11 rounded-2xl bg-brand px-5 text-[13.5px] text-white hover:bg-brand-deep" onClick={() => onNavigate("home")}>
          Back to home <ArrowRight size={15} className="ml-1.5" />
        </Button>
        <Button variant="outline" className="h-11 rounded-2xl border-brand/20 px-5 text-[13.5px]" onClick={() => onNavigate("blog")}>
          Read the blog
        </Button>
        <Button variant="ghost" className="h-11 rounded-2xl px-5 text-[13.5px] text-neutral-600 hover:bg-white" onClick={onWatchDemo}>
          <Play size={15} className="mr-2 fill-mint-deep text-mint-deep" /> Watch Demo
        </Button>
      </div>
    </main>
  );
}

function FullLoader({ label }: { label: string }) {
  return (
    <div className="skin skin-client flex min-h-screen flex-col items-center justify-center gap-3 bg-cream text-brand">
      <BrandLogo height={40} />
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-mint-deep" />
      </div>
      <p className="text-[12.5px] text-neutral-400">{label}</p>
    </div>
  );
}

function AuthGate({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="skin skin-client flex min-h-screen flex-col bg-cream text-brand">
      {note && (
        <div className="border-b border-amber-200/70 bg-amber-soft/60 px-5 py-2.5 text-center text-[12.5px] font-medium text-amber-deep">
          {note}
        </div>
      )}
      {children}
    </div>
  );
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return <div className="skin skin-client flex min-h-screen flex-col bg-cream text-brand">{children}</div>;
}

function AlreadyIn({ name, role, onGo }: { name: string; role: string; onGo: (role: string) => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-soft text-mint-deep"><Check size={24} /></span>
      <h1 className="text-[22px] font-bold">You&apos;re signed in as {name}</h1>
      <p className="text-[13px] text-neutral-500">
        {role.startsWith("platform_") ? "Sensiblee HQ" : "Workspace owner"}
      </p>
      <div className="flex gap-2.5">
        <Button className="h-11 rounded-2xl bg-brand px-5 text-[13px] text-white hover:bg-brand-deep" onClick={() => onGo(role)}>
          Go to {role.startsWith("platform_") ? "console" : "dashboard"} <ArrowRight size={15} className="ml-1" />
        </Button>
      </div>
    </main>
  );
}

// Session refresh trigger when the tab regains focus (keeps impersonation state honest)
export function useRefreshOnFocus() {
  const { refresh } = useSession();
  useEffect(() => {
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);
}

void CtaBand; void StarRating; void GoogleG; void WhatsAppIcon; void Sparkles; void ArrowUpRight; void Building2; void ArrowRight; void Quote; void Smartphone; void ShieldCheck; void X; void cn;
