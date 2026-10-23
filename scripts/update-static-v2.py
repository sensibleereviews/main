#!/usr/bin/env python3
"""
update-static-v2.py — second-round refinements to the static HTML export.

Run AFTER scripts/build-static-site.py and scripts/make-contact-functional.py.
Idempotent. Changes:

1. signin.html / signup.html  — replaced by the REAL app screens (captured
   post-hydration from the dev server into scripts/static-export/dev/*.captured.html),
   Next.js scripts stripped, styles localised to assets/site.css, cross-links
   converted to anchors. Submission is inert (site.js global guard).
2. Header + footer logo link home (index.html) on every page.
3. Blog mid-article images copied into assets/blog/ (were missing → broken).
4. Watch Demo everywhere → index.html#demo-video (the home demo section with the
   real <video>, exactly like the app's scroll-to-demo behaviour); demo.html
   placeholder removed; demo poster copied + poster path localised.
5. Full link/asset sanity audit printed at the end.
6. "Demo account — tap to fill" card REMOVED from the sign-in screen (the app
   keeps it; the public HTML version must not expose demo credentials).
"""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "static-export" / "site"
DEV = ROOT / "static-export" / "dev"
PUBLIC = ROOT.parent / "public"

changes: list[str] = []


# ---------------------------------------------------------------------------
# 1. Real app auth screens (sign in / sign up)
# ---------------------------------------------------------------------------
def build_auth_pages() -> None:
    for src, out, cross in (("login", "signin.html", ("signup.html", "Start your free trial")),
                            ("signup", "signup.html", ("signin.html", "Sign in"))):
        raw = (DEV / f"{src}.captured.html").read_text(encoding="utf-8")
        try:
            html = __import__("json").loads(raw)  # eval output is a JSON string
        except Exception:
            html = raw  # already decoded (captured via python API)

        # strip Next.js runtime: scripts, preloads, prefetch, announcer, dev tools
        html = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", html)
        html = re.sub(r"<script\b[^>]*/>", "", html)
        html = re.sub(r'<link rel="preload"[^>]*/?>', "", html)
        html = re.sub(r'<link rel="prefetch"[^>]*/?>', "", html)
        html = re.sub(r"<next-route-announcer[^>]*>[\s\S]*?</next-route-announcer>", "", html)
        html = re.sub(r"<nextjs-portal[^>]*>[\s\S]*?</nextjs-portal>", "", html)
        html = html.replace("<!--$-->", "").replace("<!--/$-->", "")

        # localise stylesheet + icons + brand assets
        html = re.sub(r'<link rel="stylesheet" href="/_next[^"]*"[^>]*/?>',
                      '<link rel="stylesheet" href="assets/site.css">', html)
        html = re.sub(r'href="/favicon\.ico[^"]*"', 'href="favicon.ico"', html)
        html = re.sub(r'href="/icon\.png[^"]*"', 'href="icon.png"', html)
        html = re.sub(r'href="/apple-icon\.png[^"]*"', 'href="apple-icon.png"', html)
        html = html.replace('src="/brand/', 'src="assets/brand/')

        # convert the app's cross-navigation buttons into real anchors
        label = re.escape(cross[1])
        html, n = re.subn(
            rf'<button class="font-semibold text-mint-deep hover:underline">({label})</button>',
            rf'<a href="{cross[0]}" class="font-semibold text-mint-deep hover:underline">\1</a>',
            html)
        if n:
            changes.append(f"{out}: cross-link button -> <a href={cross[0]}>")

        (SITE / out).write_text(html, encoding="utf-8")
        changes.append(f"{out}: replaced with real app screen from /{src} capture")


# ---------------------------------------------------------------------------
# 1b. Hide the "Demo account — tap to fill" card on the sign-in screen
# ---------------------------------------------------------------------------
OPEN_DIV = re.compile(r"<div[\s>]")


def _cut_balanced_div(html: str, start: int) -> int:
    """start = index just after a card's opening <div …> tag;
    return index just after its matching closing </div>."""
    depth = 1
    i = start
    while depth:
        o = OPEN_DIV.search(html, i)
        c = html.find("</div>", i)
        if c == -1:
            raise ValueError("unbalanced div while cutting demo card")
        if o and o.start() < c:
            depth += 1
            i = o.end()
        else:
            depth -= 1
            i = c + len("</div>")
    return i


def hide_demo_card() -> None:
    n = 0
    for name in ("signin.html", "signup.html"):
        page = SITE / name
        if not page.exists() or "Demo account" not in page.read_text(encoding="utf-8"):
            continue
        html = page.read_text(encoding="utf-8")
        tpos = html.index("Demo account")
        dstart = html.rfind("<div", 0, tpos)  # the card div directly wraps the label
        dend = _cut_balanced_div(html, html.index(">", dstart) + 1)
        page.write_text(html[:dstart] + html[dend:], encoding="utf-8")
        n += 1
    if n:
        changes.append(f"demo account card hidden on {n} auth screen(s)")


# ---------------------------------------------------------------------------
# 2. Header + footer logo → home
# ---------------------------------------------------------------------------
HEADER_LOGO = re.compile(r'<button aria-label="Sensiblee home"([^>]*)>(<img[^>]*logo-header[^>]*/>)</button>')
FOOTER_LOGO = re.compile(r'<div class="inline-flex items-center rounded-2xl bg-white px-3.5 py-2.5">(<img[^>]*logo-footer[^>]*/>)</div>')


def fix_logos() -> None:
    count = 0
    for page in list(SITE.glob("*.html")) + list((SITE / "blog").glob("*.html")):
        prefix = "../" if page.parent.name == "blog" else ""
        html = page.read_text(encoding="utf-8")
        orig = html
        html = HEADER_LOGO.sub(
            rf'<a href="{prefix}index.html" aria-label="Sensiblee home"\1>\2</a>', html)
        html = FOOTER_LOGO.sub(
            rf'<a href="{prefix}index.html" aria-label="Sensiblee home" '
            rf'class="inline-flex items-center rounded-2xl bg-white px-3.5 py-2.5">\1</a>', html)
        if html != orig:
            page.write_text(html, encoding="utf-8")
            count += 1
    changes.append(f"logos linked home on {count} pages")


# ---------------------------------------------------------------------------
# 3. Blog mid-article images
# ---------------------------------------------------------------------------
def copy_mid_images() -> None:
    (SITE / "assets" / "blog").mkdir(parents=True, exist_ok=True)
    n = 0
    for img in sorted(PUBLIC.glob("blog/*-mid.jpg")):
        shutil.copy2(img, SITE / "assets" / "blog" / img.name)
        n += 1
    changes.append(f"copied {n} blog mid images")


# ---------------------------------------------------------------------------
# 4. Watch Demo → home demo section (real video), demo.html removed
# ---------------------------------------------------------------------------
def fix_watch_demo() -> None:
    n = 0
    for page in list(SITE.glob("*.html")) + list((SITE / "blog").glob("*.html")):
        prefix = "../" if page.parent.name == "blog" else ""
        html = page.read_text(encoding="utf-8")
        orig = html
        html = html.replace(f'href="{prefix}demo.html"', f'href="{prefix}index.html#demo-video"')
        html = html.replace('href="demo.html"', f'href="{prefix}index.html#demo-video"')
        # video poster: root-relative → local
        html = html.replace('poster="/demo/demo-poster.png"', 'poster="assets/demo/demo-poster.png"')
        if html != orig:
            page.write_text(html, encoding="utf-8")
            n += 1
    demo = SITE / "demo.html"
    if demo.exists():
        demo.unlink()
    changes.append(f"Watch Demo -> index.html#demo-video on {n} pages; demo.html removed")
    poster = SITE / "assets" / "demo" / "demo-poster.png"
    if not poster.exists():
        shutil.copy2(PUBLIC / "demo" / "demo-poster.png", poster)
        changes.append("copied demo poster")


def main() -> None:
    build_auth_pages()
    hide_demo_card()
    fix_logos()
    copy_mid_images()
    fix_watch_demo()

    print(f"Applied {len(changes)} changes:")
    for c in changes:
        print("  -", c)

    # ---- sanity audit: every local href/src must resolve to a real file ----
    print("\nSanity audit (local hrefs/srcs):")
    missing = []
    pages = list(SITE.glob("*.html")) + list((SITE / "blog").glob("*.html"))
    for page in pages:
        rel_dir = page.parent
        html = page.read_text(encoding="utf-8")
        for attr, val in re.findall(r'((?:href|src|poster))="([^"]+)"', html):
            if val.startswith(("http", "mailto:", "tel:", "#", "data:")):
                continue
            target = (rel_dir / val.split("#")[0]).resolve()
            if val.split("#")[0] and not target.exists():
                missing.append(f"{page.name}: {val}")
    if missing:
        print(f"  {len(missing)} BROKEN references:")
        for m in missing[:20]:
            print("   !", m)
        sys.exit(1)
    print(f"  all local references resolve across {len(pages)} pages ✓")


if __name__ == "__main__":
    main()
