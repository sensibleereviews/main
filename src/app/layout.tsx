import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Pre-hydration display-theme bootstrapping — applies the stored Light/Dark
// preference ("system" resolves against the OS scheme) before first paint so
// the dashboards never flash the wrong mode. Mirrors src/lib/theme.tsx.
const themeInit = `(function(){try{var t=localStorage.getItem("sensiblee-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

// Brand typography: Poppins — Body Regular · Buttons SemiBold · H2 Bold · H1/Logo ExtraBold
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sensiblee — AI powered Customer Experience Intelligence",
  description: "Sensing Sensibly. Acting Intelligently. Sensiblee turns your Google reviews into reputation growth — 15-minute monitoring, WhatsApp & QR review requests, AI-drafted replies you approve, and multi-location reputation analytics.",
  keywords: ["Sensiblee", "reputation management", "Google reviews", "customer experience", "AI replies", "WhatsApp review requests", "SaaS India"],
  authors: [{ name: "Sensiblee" }],
  openGraph: {
    title: "Sensiblee — AI powered Customer Experience Intelligence",
    description: "Turn Google reviews into reputation growth. Monitor, request, reply and analyze — all in one calm, sensible platform.",
    siteName: "Sensiblee",
    type: "website",
  },
  // Favicon: served from src/app/ file conventions (favicon.ico + icon.png + apple-icon.png),
  // derived from the official logo mark — no metadata.icons entry needed.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
