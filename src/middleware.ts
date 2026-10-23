// Production subdomain + deep-link rewriter.
// www.sensiblee.in/pricing   → marketing pricing
// app.sensiblee.in/reviews   → client surface, reviews view
// admin.sensiblee.in         → platform admin
// www.sensiblee.in/g/spk-kor → guest flow for code spk-kor
// The browser URL is preserved; the app (single page route) reads x-ss-host/x-ss-path.
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "localhost").split(":")[0];
  const { pathname } = req.nextUrl;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-ss-host", host);
  requestHeaders.set("x-ss-path", pathname);

  // "/" needs no rewrite — rewriting "/" to itself re-enters the proxy in
  // production (Next 16 re-runs the proxy on internal rewrites) and hangs the
  // request forever. Just forward with the routing headers attached.
  if (pathname === "/") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // `.+` (not `.*`) keeps "/" out of the proxy entirely — same anti-loop rule
  // as above: rewritten targets must not re-match the matcher.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).+)"],
};
