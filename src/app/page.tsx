import { headers } from "next/headers";
import type { Metadata } from "next";
import { parseLocation } from "@/lib/route-shared";
import { loadCmsBundle, loadSeoForPath } from "@/lib/cms";
import SensibleeApp from "@/components/sensiblee/app-shell";

// Per-path SEO from the CMS (platform admin edits via admin console → Website).
// Unknown/auth/app paths return null so the layout default metadata applies.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const path = h.get("x-ss-path") || "/";
  const seo = await loadSeoForPath(path);
  if (!seo) return {};
  const base = {
    title: seo.title || undefined,
    description: seo.description || undefined,
    openGraph: {
      title: seo.title || "Sensiblee — AI powered Customer Experience Intelligence",
      description: seo.description || "Turn Google reviews into reputation growth — monitor, request, reply and analyze in one calm platform.",
      siteName: "Sensiblee",
      type: "website" as const,
    },
  };
  return base;
}

export default async function Home() {
  const h = await headers();
  const host = (h.get("x-ss-host") || h.get("host") || "localhost").split(":")[0];
  const path = h.get("x-ss-path") || "/";
  // CMS first: loadCmsBundle hydrates the admin-edited URL overrides before the
  // initial route is parsed, so custom page URLs resolve correctly on first paint.
  const cms = await loadCmsBundle();
  const initialRoute = parseLocation({ pathname: path, hostname: host });
  return <SensibleeApp initialRoute={initialRoute} cms={cms} />;
}
