#!/usr/bin/env python3
# Task 21 — assemble the static site: assets, API shim injection, hosting files
import re, shutil, subprocess, os
from pathlib import Path

SRC = Path("/home/z/my-project/sensiblee-static-build")
OUT = Path("/home/z/my-project/sensiblee-static")

# 1) _next/static assets from the prod build
if (OUT / "_next").exists():
    shutil.rmtree(OUT / "_next")
(OUT / "_next").mkdir(parents=True)
shutil.copytree(SRC / ".next" / "static", OUT / "_next" / "static")

# 2) public/* (brand, demo videos, robots, icons) — never overwrite exported html
for item in (SRC / "public").iterdir():
    dest = OUT / item.name
    if item.is_dir():
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(item, dest)
    else:
        shutil.copy2(item, dest)

# favicon from app dir if present (next serves it from /)
for cand in ["src/app/favicon.ico", "src/app/icon.png", "src/app/icon.svg"]:
    p = SRC / cand
    if p.exists():
        shutil.copy2(p, OUT / p.name)

# 3) static API shim
shim = """// Static preview shim — the marketing site is served without a backend.
// Marketing CTAs stay fully visual; form posts get graceful in-page responses.
(function () {
  try {
    var orig = window.fetch;
    if (!orig) return;
    var H = { "Content-Type": "application/json" };
    function jres(body, status) {
      return new Response(JSON.stringify(body), { status: status || 200, headers: H });
    }
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var m = ((init && init.method) || "GET").toUpperCase();
        if (url.indexOf("/api/auth/me") > -1) return Promise.resolve(jres({ user: null }));
        if (m === "POST" && url.indexOf("/api/demo-requests") > -1) return Promise.resolve(jres({ ok: true }));
        if (m === "POST" && url.indexOf("/api/support/ticket") > -1)
          return Promise.resolve(jres({ ok: true, ticket: { number: "TKT-2049" } }));
        if (m === "POST" && url.indexOf("/api/auth/login") > -1)
          return Promise.resolve(jres({ error: "This is a static preview of the marketing website — the app console isn't connected here." }, 503));
        if (m === "POST" && url.indexOf("/api/auth/signup") > -1)
          return Promise.resolve(jres({ error: "This is a static preview of the marketing website — trial signup isn't connected here." }, 503));
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  } catch (e) {}
})();
"""
(OUT / "static-api-shim.js").write_text(shim, encoding="utf-8")

# 4) inject shim into every exported html (right after <head>)
count = 0
for html in OUT.rglob("index.html"):
    s = html.read_text(encoding="utf-8")
    if "static-api-shim.js" in s:
        continue
    s2, n = re.subn(r"(<head\b[^>]*>)", r'\1<script src="/static-api-shim.js"></script>', s, count=1)
    if n == 1:
        html.write_text(s2, encoding="utf-8")
        count += 1
print(f"shim injected into {count} pages")

# 5) hosting files
(OUT / ".htaccess").write_text("""# Sensiblee marketing site — static hosting rules (Apache / cPanel)
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  # Serve real files and directories as-is (assets, per-page index.html)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  # Everything else falls back to the app shell — the router renders the right page
  RewriteRule ^ /index.html [L]
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType video/mp4 "access plus 1 month"
</IfModule>
""", encoding="utf-8")

(OUT / "_redirects").write_text("/* /index.html 200\n", encoding="utf-8")

# 6) sanity checks: localhost refs, missing asset dirs
bad = []
for html in OUT.rglob("index.html"):
    s = html.read_text(encoding="utf-8")
    for m in re.findall(r"https?://localhost[^\"'\\s)]*", s):
        bad.append((str(html.relative_to(OUT)), m[:80]))
print("localhost refs:", bad if bad else "none")

next_static = OUT / "_next" / "static"
sizes = subprocess.run(["du", "-sh", str(OUT), str(next_static)], capture_output=True, text=True).stdout
print(sizes)
print("top-level:", sorted(p.name for p in OUT.iterdir()))
