#!/usr/bin/env python3
# Sensiblee marketing site -> static editable HTML export (for GBP API application hosting).
# Captures SSR HTML from the dev server, strips Next.js runtime, localises CSS,
# rewrites links/assets, converts CTA buttons to placeholder <a> links, bundles assets.
import json, os, re, shutil, subprocess, sys, unicodedata
from urllib.parse import urlparse
from bs4 import BeautifulSoup

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/scripts/static-export/site"
PUB = "/home/z/my-project/public"
DEV = "/home/z/my-project/scripts/static-export/dev"

# ---------------------------------------------------------------- page map
PAGES = [  # (url path, output file)
    ("/", "index.html"),
    ("/features", "features.html"),
    ("/how-it-works", "how-it-works.html"),
    ("/pricing", "pricing.html"),
    ("/customer-stories", "customer-stories.html"),
    ("/about-us", "about-us.html"),
    ("/contact-us", "contact-us.html"),
    ("/blog", "blog.html"),
    ("/faqs", "faqs.html"),
    ("/security-trust", "security-trust.html"),
    ("/sitemap", "sitemap.html"),
    ("/privacy-policy", "privacy-policy.html"),
    ("/terms-of-service", "terms-of-service.html"),
    ("/submit-a-ticket", "submit-a-ticket.html"),
]
BLOG_POSTS = [  # (slug, title) — from DB
    ("response-rate-is-the-most-underrated-lever-in-hospitality-reputation", "Response rate is the most underrated lever in hospitality reputation"),
    ("whatsapp-review-requests-the-polite-way-to-multiply-your-google-reviews", "WhatsApp review requests: the polite way to multiply your Google reviews"),
    ("the-qr-on-the-table-turning-dissent-into-private-feedback-and-delight-into-public-proof", "The QR on the table: turning dissent into private feedback and delight into public proof"),
    ("how-an-ai-learns-your-restaurants-voice-without-sounding-like-a-robot", "How an AI learns your restaurant's voice without sounding like a robot"),
    ("the-reputation-health-score-one-number-that-replaces-your-monday-meeting", "The reputation health score: one number that replaces your Monday meeting"),
    ("the-1-star-recovery-playbook-turning-your-angriest-guest-into-your-loudest-advocate", "The 1-star recovery playbook: turning your angriest guest into your loudest advocate"),
    ("the-15-minute-google-business-profile-checklist-every-indian-restaurant-should-run-monthly", "The 15-minute Google Business Profile checklist every Indian restaurant should run monthly"),
    ("why-naming-names-in-review-replies-is-the-cheapest-staff-motivation-youll-ever-buy", "Why naming names in review replies is the cheapest staff motivation you'll ever buy"),
    ("from-saturday-night-chaos-to-a-calm-monday-building-a-weekly-feedback-loop-that-actually-runs", "From Saturday-night chaos to a calm Monday: building a weekly feedback loop that actually runs"),
    ("short-reply-or-long-reply-format-plays-for-every-type-of-google-review", "Short reply or long reply? Format plays for every type of Google review"),
]
for slug, _ in BLOG_POSTS:
    PAGES.append((f"/blog/{slug}", f"blog/{slug}.html"))

# URL path (no trailing slash) -> output file, for link rewriting
PATH2FILE = {p: f for p, f in PAGES}
PATH2FILE["/blog"] = "blog.html"

# exact-text button -> placeholder target (page-level overrides win)
BTN_EXACT = {
    "try for free": "signup.html",
    "sign in": "signin.html",
    "watch demo": "demo.html",
    "watch the demo": "demo.html",
    "see customer stories": "customer-stories.html",
    "security & trust": "security-trust.html",
    "all articles": "blog.html",
    "browse the faqs": "faqs.html",
    "limited period offer": "contact-us.html",
    "back to all articles": "blog.html",
    "talk to us": "contact-us.html",
    "explore features": "features.html",
    "see the journey": "how-it-works.html",
    "full comparison": "pricing.html",
    "more answers": "faqs.html",
    "create free account": "signup.html",
}
# startswith button -> target (cards with label+desc text, e.g. sitemap / article CTA)
BTN_PREFIX = [
    ("try for free", "signup.html"),
    ("sign in", "signin.html"),
    ("watch demo", "demo.html"),
    ("features", "features.html"),
    ("how it works", "how-it-works.html"),
    ("pricing", "pricing.html"),
    ("customer stories", "customer-stories.html"),
    ("about us", "about-us.html"),
    ("about", "about-us.html"),
    ("contact us", "contact-us.html"),
    ("contact", "contact-us.html"),
    ("blog", "blog.html"),
    ("faqs", "faqs.html"),
    ("submit a ticket", "submit-a-ticket.html"),
    ("security & trust", "security-trust.html"),
    ("privacy policy", "privacy-policy.html"),
    ("terms of service", "terms-of-service.html"),
    ("sitemap", "sitemap.html"),
    ("home", "index.html"),
    ("login", "signin.html"),
    ("signup", "signup.html"),
]
# page-level exact overrides: pricing plan CTAs navigate to contact
BTN_EXACT_OVERRIDES = {
    "pricing.html": {"try for free": "contact-us.html"},
}

CYCLE_LABELS = {"monthly", "half-yearly · 1 month free", "annual · 2 months free"}

def norm(s):
    s = unicodedata.normalize("NFKC", s or "")
    return re.sub(r"\s+", " ", s).strip().lower()

def fetch(path):
    r = subprocess.run(["curl", "-s", "--max-time", "60", BASE + path], capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        raise RuntimeError(f"fetch failed: {path}")
    return r.stdout

# ---------------------------------------------------------------- transform
def rewrite_href(pfx, href):
    """Return rewritten href for internal links/asset refs; None = leave as-is."""

# NOTE: run `python3 scripts/make-contact-functional.py` after this build —
# it wires the contact/ticket forms to FormSubmit email delivery (sensibleereviews@gmail.com).
    if not href:
        return None
    href = href.strip()
    if href.startswith(("mailto:", "tel:", "https://", "http://", "#", "data:")):
        return None
    if not href.startswith("/"):
        return None  # already relative (shouldn't happen in SSR)
    path, _, frag = href.partition("#")
    if path in ("/sitemap.xml", "/robots.txt", "/manifest.json", "/favicon.ico"):
        return ("" if path == "/sitemap.xml" else path) + (f"#{frag}" if frag else "") or None
    if path in PATH2FILE:
        target = PATH2FILE[path]
        return pfx + target + (f"#{frag}" if frag else "")
    # asset (exists under public/)
    disk = os.path.join(PUB, path.lstrip("/"))
    if os.path.isfile(disk):
        return pfx + "assets/" + path.lstrip("/")
    return None  # unknown internal ref — drop later by caller decision

def transform(html, url_path, out_file, report):
    pfx = "" if "/" not in out_file else "../"
    soup = BeautifulSoup(html, "lxml")

    # -- head: strip scripts + preloads, localise stylesheet, fix icon links
    for t in soup.find_all(["script", "noscript"]):
        t.decompose()
    css_href = None
    ICON_MAP = {"/favicon.ico": "favicon.ico", "/icon.png": "icon.png", "/apple-icon.png": "apple-icon.png"}
    for link in soup.find_all("link"):
        rel = " ".join(link.get("rel", []))
        href = link.get("href", "")
        base = href.split("?")[0]
        if base in ICON_MAP:
            src_disk = os.path.join("/home/z/my-project/src/app", ICON_MAP[base].lstrip("/"))
            if os.path.isfile(src_disk):
                shutil.copy2(src_disk, os.path.join(OUT, ICON_MAP[base]))
                link["href"] = pfx + ICON_MAP[base]
            else:
                link.decompose()
            continue
        if "preload" in rel or "modulepreload" in rel or "prefetch" in rel or "preconnect" in rel:
            link.decompose()
        elif link.get("rel") == ["stylesheet"] or "stylesheet" in rel:
            if css_href is None:
                css_href = link.get("href")
            link.decompose()
    icon = soup.new_tag("link", rel="stylesheet", href=pfx + "assets/site.css")
    soup.head.append(icon)
    js = soup.new_tag("script", src=pfx + "assets/site.js", defer=True)
    soup.body.append(js)

    # -- meta/og image rewrite
    for sel, attr in ((soup.find_all("meta"), "content"),):
        for m in sel:
            if m.get("property") in ("og:image", "twitter:image") and m.get(attr, "").startswith("/"):
                disk = os.path.join(PUB, m[attr].lstrip("/"))
                if os.path.isfile(disk):
                    m[attr] = pfx + "assets/" + m[attr].lstrip("/")

    # -- remove the dead pricing billing-cycle switcher
    for div in soup.find_all("div"):
        btns = div.find_all("button", recursive=False)
        if btns and {norm(b.get_text()) for b in btns} == CYCLE_LABELS:
            div.decompose()
            report.append(f"  removed cycle switcher on {out_file}")
            break

    # -- plain anchors
    for a in soup.find_all("a", href=True):
        new = rewrite_href(pfx, a["href"])
        if new is not None:
            a["href"] = new

    # -- images / sources
    for tag in soup.find_all(["img", "source"]):
        for attr in ("src", "srcset"):
            v = tag.get(attr)
            if not v:
                continue
            if attr == "srcset":
                parts = []
                for cand in v.split(","):
                    u = cand.strip().split(" ")[0]
                    new = rewrite_href(pfx, u)
                    parts.append((new if new else u) + (" " + cand.strip().split(" ", 1)[1] if " " in cand.strip() else ""))
                tag[attr] = ", ".join(parts)
            else:
                new = rewrite_href(pfx, v)
                if new is not None:
                    tag[attr] = new

    # -- buttons -> placeholder links
    for btn in soup.find_all("button"):
        txt = norm(btn.get_text())
        if not txt:
            continue
        aria = (btn.get("aria-label") or "").lower()
        cls = btn.get("class", [])
        if btn.has_attr("aria-expanded"):
            continue  # accordion trigger — site.js handles
        if txt == "copy link":
            continue  # site.js clipboard handler
        if btn.find_parent("form"):
            continue  # form UI (chips, selectors, submit) — site.js placeholder note
        if "menu" in aria or "close" in aria:  # hamburger — panel absent in static, hide
            btn["class"] = cls + ["site-hide"]
            continue
        target = None
        page_over = BTN_EXACT_OVERRIDES.get(out_file, {})
        if txt in page_over:
            target = page_over[txt]
        elif txt in BTN_EXACT:
            target = BTN_EXACT[txt]
        else:
            for slug, title in BLOG_POSTS:
                if title.lower() in txt:
                    target = pfx + f"blog/{slug}.html"
                    break
            if target is None:
                for label, dest in BTN_PREFIX:
                    if txt == label or (txt.startswith(label) and len(txt) > len(label) + 24):
                        target = dest
                        break
            if target is None and txt.startswith("module "):
                target = "features.html"  # home module showcase cards
        if target:
            if not target.startswith(("http", "../")) and "/" in out_file:
                target = pfx + target  # subdirectory pages need ../ prefix
            a = soup.new_tag("a", href=target)
            for k, v in btn.attrs.items():
                a[k] = v
            a.string = ""
            for child in list(btn.children):
                a.append(child.extract())
            btn.replace_with(a)
        else:
            report.append(f"  unmapped button on {out_file}: {txt[:70]!r}")

    # -- forms: mark for site.js placeholder handling
    for f in soup.find_all("form"):
        f["data-static-placeholder"] = "1"

    # -- html class flag
    if soup.html:
        soup.html["class"] = (soup.html.get("class") or []) + ["static-export"]
    return str(soup)

# ---------------------------------------------------------------- main
def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT + "/assets", exist_ok=True)
    os.makedirs(OUT + "/blog", exist_ok=True)
    os.makedirs(DEV, exist_ok=True)
    report = []

    # 0. static behaviours js
    SITE_JS = r"""// Sensiblee static export — minimal progressive behaviours for the placeholder build.
(function () {
  "use strict";
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest('[data-slot="accordion-trigger"]');
    if (trigger) {
      var item = trigger.closest('[data-slot="accordion-item"]') || trigger.parentElement;
      var content = item && item.querySelector('[data-slot="accordion-content"]');
      var open = trigger.getAttribute("data-state") === "open";
      trigger.setAttribute("data-state", open ? "closed" : "open");
      if (item) item.setAttribute("data-state", open ? "closed" : "open");
      if (content) {
        content.setAttribute("data-state", open ? "closed" : "open");
        if (open) content.setAttribute("hidden", "");
        else content.removeAttribute("hidden");
      }
      return;
    }
  });
  document.querySelectorAll('form[data-static-placeholder]').forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var old = form.querySelector(".static-note");
      if (old) old.remove();
      var note = document.createElement("p");
      note.className = "static-note";
      note.style.cssText = "margin:12px 0 0;padding:10px 14px;border-radius:12px;background:#ecfdf3;border:1px solid #88d6a0;color:#1c5b38;font-size:12.5px;font-weight:600;";
      note.textContent = "This is a placeholder form in the static demo build — no data is sent.";
      form.appendChild(note);
    });
  });
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || btn.textContent.trim().toLowerCase() !== "copy link") return;
    e.preventDefault();
    var t = btn.textContent;
    var done = function () {
      btn.textContent = "Link copied";
      setTimeout(function () { btn.textContent = t; }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, done);
    else done();
  });
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || btn.textContent.trim().toLowerCase() !== "send inquiry") return;
    e.preventDefault();
    var card = btn.closest("div") || btn.parentElement;
    var old = document.querySelector(".static-note");
    if (old) old.remove();
    var note = document.createElement("p");
    note.className = "static-note";
    note.style.cssText = "margin:12px 0 0;padding:10px 14px;border-radius:12px;background:#ecfdf3;border:1px solid #88d6a0;color:#1c5b38;font-size:12.5px;font-weight:600;";
    note.textContent = "This is a placeholder in the static demo build — no data is sent. Reach us at hello@sensiblee.in.";
    (card || btn.parentElement).appendChild(note);
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash) {
      var el = document.querySelector(url.hash);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
})();"""
    open(f"{OUT}/assets/site.js", "w").write(SITE_JS)

    # 1. stylesheet
    home = fetch("/")
    m = re.search(r'<link rel="stylesheet" href="([^"]+)"', home)
    if not m:
        raise RuntimeError("stylesheet link not found")
    css_url = m.group(1).replace("&amp;", "&")
    css = fetch(css_url)
    open(f"{OUT}/assets/site.css", "w").write(css)
    print(f"css: {len(css)//1024}KB -> assets/site.css")

    # 2. pages
    for path, out_file in PAGES:
        html = fetch(path)
        open(f"{DEV}/{out_file.replace('/', '_')}.raw.html", "w").write(html)
        out = transform(html, path, out_file, report)
        dest = f"{OUT}/{out_file}"
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        open(dest, "w").write(out)
        print(f"page {path} -> {out_file} ({len(out)//1024}KB)")

    # 3. assets referenced in output html
    referenced = set()
    for root, _, files in os.walk(OUT):
        for fn in files:
            if not fn.endswith(".html"):
                continue
            txt = open(os.path.join(root, fn)).read()
            for u in re.findall(r'(?:src|href|content)="(assets/[^"]+)"', txt):
                referenced.add(u.replace("../", ""))
    copied = 0
    for ref in sorted(referenced):
        disk = os.path.join(PUB, ref[len("assets/"):])
        if os.path.isfile(disk):
            dest = os.path.join(OUT, ref)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(disk, dest)
            copied += 1
    print(f"assets copied: {copied}/{len(referenced)}")

    # 3b. webfonts — CSS references ../media/*.woff2 relative to assets/, so
    # copying next/font woff2 files into <root>/media/ makes the URLs resolve.
    media_src = "/home/z/my-project/.next/dev/static/media"
    fonts = 0
    if os.path.isdir(media_src):
        os.makedirs(f"{OUT}/media", exist_ok=True)
        for fn in os.listdir(media_src):
            if fn.endswith((".woff2", ".woff")):
                shutil.copy2(os.path.join(media_src, fn), f"{OUT}/media/{fn}")
                fonts += 1
    print(f"webfonts copied: {fonts}")

    # 4. demo placeholder page
    demo = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Product demo — Sensiblee</title>
<link rel="stylesheet" href="assets/site.css">
<style>body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.demo-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1a2b;color:#fff;text-align:center;padding:2rem}
.card{max-width:560px}.badge{display:inline-flex;align-items:center;gap:.4rem;border:1px solid rgba(136,214,160,.4);background:rgba(136,214,160,.12);color:#88d6a0;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:.4rem .8rem;border-radius:999px}
h1{font-size:32px;margin:1.2rem 0 .6rem;letter-spacing:-.02em}p{color:rgba(255,255,255,.65);font-size:14.5px;line-height:1.7;margin:0 0 1.6rem}
a.btn{display:inline-flex;align-items:center;gap:.5rem;background:#88d6a0;color:#0d1a2b;font-weight:700;font-size:14px;padding:.8rem 1.4rem;border-radius:14px;text-decoration:none}
a.back{display:block;margin-top:1.2rem;color:rgba(255,255,255,.5);font-size:12.5px;text-decoration:none}a.back:hover{color:#88d6a0}</style></head>
<body><div class="demo-wrap"><div class="card">
<span class="badge">Product demo</span>
<h1>Watch Sensiblee work on live reviews.</h1>
<p>This screen is a placeholder in the static marketing build — the guided product demo (15-minute sensing, AI drafts, guest review requests, one health score) runs inside the app.</p>
<a class="btn" href="signup.html">Try for Free</a>
<a class="back" href="index.html">&larr; Back to the website</a>
</div></div></body></html>"""
    open(f"{OUT}/demo.html", "w").write(demo)

    # 4b. signin / signup placeholder screens (the app itself is not part of the static build)
    for fname, badge, title, sub in (
        ("signin.html", "Workspace sign in", "Sign in to your workspace.", "The live product lives at app.sensiblee.in — this static build is the marketing site companion."),
        ("signup.html", "Try for free", "Start your 7-day free trial.", "Full platform, no card required. The live product lives at app.sensiblee.in — this static build is the marketing site companion."),
    ):
        auth = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Sensiblee</title>
<link rel="stylesheet" href="assets/site.css">
<style>body{{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
.auth-wrap{{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f5ef;padding:2rem}}
.card{{max-width:460px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:2.4rem;box-shadow:0 24px 60px -24px rgba(16,24,40,.25);text-align:center}}
.logo{{display:inline-flex;background:#0d1a2b;border-radius:14px;padding:.55rem .9rem;margin-bottom:1.4rem}}
.logo img{{height:34px;width:auto;display:block}}
.badge{{display:inline-flex;border:1px solid #b9e8cd;background:#ecfdf3;color:#1c5b38;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:.35rem .7rem;border-radius:999px}}
h1{{font-size:24px;color:#0d1a2b;margin:1rem 0 .5rem;letter-spacing:-.02em}}p{{color:#6b7280;font-size:13.5px;line-height:1.7;margin:0 0 1.4rem}}
a.btn{{display:inline-flex;align-items:center;gap:.5rem;background:#0d1a2b;color:#fff;font-weight:700;font-size:13.5px;padding:.8rem 1.5rem;border-radius:14px;text-decoration:none}}
a.btn:hover{{background:#88d6a0;color:#0d1a2b}}
a.back{{display:block;margin-top:1.1rem;color:#9ca3af;font-size:12.5px;text-decoration:none}}a.back:hover{{color:#0d1a2b}}</style></head>
<body><div class="auth-wrap"><div class="card">
<span class="logo"><img src="assets/brand/logo-footer.png" alt="Sensiblee"></span>
<span class="badge">{badge}</span>
<h1>{title}</h1>
<p>{sub}</p>
<a class="btn" href="index.html">Back to the website</a>
<a class="back" href="index.html">&larr; Home</a>
</div></div></body></html>"""
        open(f"{OUT}/{fname}", "w").write(auth)
        print(f"placeholder {fname} written")

    # 5. robots + sitemap
    robots_disk = os.path.join(PUB, "robots.txt")
    if os.path.isfile(robots_disk):
        shutil.copy2(robots_disk, f"{OUT}/robots.txt")
    else:
        open(f"{OUT}/robots.txt", "w").write("User-agent: *\nAllow: /\n")
    domain = "https://sensiblee.in"
    urls = [(p if p != "/" else "") for p, f in PAGES if not f.startswith("signin") and not f.startswith("signup")]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for p in urls:
        sm.append(f"<url><loc>{domain}{p}</loc></url>")
    sm.append("</urlset>")
    open(f"{OUT}/sitemap.xml", "w").write("\n".join(sm))

    # 6. README
    readme = """SENSIBLEE — STATIC MARKETING WEBSITE (editable HTML build)
==========================================================

Purpose: public marketing website for the Google Business Profile API
access application (and general hosting). All CTAs navigate to the next
screen as placeholders — no backend actions are required or performed.

UPLOAD
------
Any static hosting works:
- cPanel / FTP: upload the contents of this folder into public_html
- Netlify / Vercel / Cloudflare Pages: drag-and-drop this folder
- Nginx/Apache: point the site root at this folder
index.html is the entry point. No server-side runtime, database or
environment variables are needed. robots.txt and sitemap.xml included.

STRUCTURE
---------
index.html               Home
features.html            Features
how-it-works.html        How it works
pricing.html             Pricing (999 / 2,499 / 4,999 plans + full comparison)
customer-stories.html    Customer Stories
about-us.html            About Us
contact-us.html          Contact Us (inquiry form is a placeholder)
blog.html                Blog — 10 articles
blog/<article>.html      Individual articles
faqs.html                FAQs / knowledgebase
security-trust.html      Security & Trust
sitemap.html             Human-readable sitemap
privacy-policy.html      Privacy Policy
terms-of-service.html    Terms of Service
submit-a-ticket.html     Support ticket form (placeholder)
signin.html / signup.html / demo.html   Placeholder CTA destinations
assets/site.css          Compiled stylesheet (edit colours/text styles here)
assets/site.js           Light interactivity (accordions, form notes, copy link)
assets/...               Images (brand, blog, team, demo)

EDITING
-------
Pages are plain, readable HTML. Edit text directly in any editor.
Global styles live in assets/site.css (Tailwind-compiled utility classes);
site colours: brand navy #0d1a2b family + mint #88d6a0 accents.

GOOGLE BUSINESS PROFILE API NOTE
--------------------------------
This build demonstrates the product surface that uses the GBP API:
- Google Business Profile monitoring/sync (15-minute cadence)
- Review management with AI-drafted, human-approved replies
- Review request campaigns (email + QR — WhatsApp is a future phase)
- Location-level reporting and analytics
CTA destinations (sign in / sign up / demo) are intentional placeholders.
"""
    open(f"{OUT}/README.txt", "w").write(readme)

    print("\n--- REPORT ---")
    print("\n".join(report) if report else "no issues")
    print("OUT:", OUT)

if __name__ == "__main__":
    main()
