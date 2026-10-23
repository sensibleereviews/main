#!/usr/bin/env python3
"""Repack download/sensiblee-marketing-static.zip from scripts/static-export/site
and assert key content markers (incl. demo-card removal)."""
import zipfile
from pathlib import Path

ROOT = Path("/home/z/my-project")
SITE = ROOT / "scripts" / "static-export" / "site"
OUT = ROOT / "download" / "sensiblee-marketing-static.zip"

files = sorted(p for p in SITE.rglob("*") if p.is_file())
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        z.write(p, p.relative_to(SITE).as_posix())

print(f"packed {len(files)} files, {OUT.stat().st_size/1024/1024:.1f} MB")

# ---- content assertions ------------------------------------------------
signin = zipfile.ZipFile(OUT).read("signin.html").decode("utf-8")
signup = zipfile.ZipFile(OUT).read("signup.html").decode("utf-8")
contact = zipfile.ZipFile(OUT).read("contact-us.html").decode("utf-8")
ticket = zipfile.ZipFile(OUT).read("submit-a-ticket.html").decode("utf-8")
js = zipfile.ZipFile(OUT).read("assets/site.js").decode("utf-8")
names = zipfile.ZipFile(OUT).namelist()

checks = {
    "signin: no demo card": "Demo account" not in signin,
    "signin: no demo password": "Demo@1234" not in signin,
    "signin: no demo email": "anand@spiceroute.in" not in signin,
    "signin: form present": "<form" in signin and 'type="email"' in signin,
    "signin: cross-link to signup": 'href="signup.html"' in signin,
    "signup: no demo card": "Demo account" not in signup,
    "contact: formsubmit endpoint": "formsubmit.co/ajax/" in js and "sensibleereviews@gmail.com" in js,
    "ticket: inert (no gateway)": "formsubmit" not in ticket.lower(),
    "video assets bundled": "assets/demo/sensiblee-demo.mp4" in names,
    "mid images bundled": sum(1 for n in names if "-mid.jpg" in n) == 10,
}
bad = [k for k, ok in checks.items() if not ok]
for k, ok in checks.items():
    print(("PASS" if ok else "FAIL"), k)
if bad:
    raise SystemExit(f"{len(bad)} zip content checks failed")
print(f"\n{OUT} — {len(names)} files, all content checks passed")
