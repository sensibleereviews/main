#!/usr/bin/env python3
"""
Task 22b — Update Sensiblee contact details everywhere:

  phone / WhatsApp : +91 98450 12345  ->  +91 93547 60585
  email            : hello@sensiblee.com  ->  hello@sensiblee.in
  (role emails legal@ / security@ / support@ migrate .com -> .in for consistency)

Scope:
  1. Source files (*.ts/*.tsx under src/) in BOTH the main project and the
     static-export clone (sensiblee-static-build)
  2. SQLite DBs (both copies): Tenant.whatsappPhone (exact old number match)
     and CmsPage.content (contact + privacy pages rendered from CMS)

Deliberately NOT touched (fictional demo workspace data):
  - Spice Route Kitchen contactPhone +91 98450 11223, Location phones,
    demo User phones, anand@spiceroute.in and other demo emails
"""
import sqlite3
from pathlib import Path

ROOTS = [
    Path("/home/z/my-project"),
    Path("/home/z/my-project/sensiblee-static-build"),
]
DBS = [
    Path("/home/z/my-project/db/custom.db"),
    Path("/home/z/my-project/sensiblee-static-build/db/custom.db"),
]

REPLACEMENTS = [
    ("+91 98450 12345", "+91 93547 60585"),
    ("tel:+919845012345", "tel:+919354760585"),
    ("wa.me/919845012345", "wa.me/919354760585"),
    ("hello@sensiblee.com", "hello@sensiblee.in"),
    ("legal@sensiblee.com", "legal@sensiblee.in"),
    ("security@sensiblee.com", "security@sensiblee.in"),
    ("support@sensiblee.com", "support@sensiblee.in"),
]

OLD_MARKERS = [old for old, _ in REPLACEMENTS]


def update_sources():
    for root in ROOTS:
        src = root / "src"
        changed = []
        for f in sorted(src.rglob("*.ts*")):
            text = f.read_text(encoding="utf-8")
            orig = text
            for old, new in REPLACEMENTS:
                text = text.replace(old, new)
            if text != orig:
                f.write_text(text, encoding="utf-8")
                n = sum(orig.count(o) for o in OLD_MARKERS)
                changed.append((str(f.relative_to(root)), n))
        rel = root.name or "main-project"
        print(f"[{rel}] files updated: {changed if changed else 'none'}")


def update_dbs():
    for db in DBS:
        conn = sqlite3.connect(db)
        cur = conn.cursor()
        cur.execute(
            "UPDATE Tenant SET whatsappPhone = '+91 93547 60585' "
            "WHERE whatsappPhone LIKE '%98450 12345%'"
        )
        tenant_rows = cur.rowcount
        content_sql = "content"
        for old, new in REPLACEMENTS:
            content_sql = f"replace({content_sql}, '{old}', '{new}')"
        cur.execute(f"UPDATE CmsPage SET content = {content_sql}")
        cms_rows = cur.rowcount
        conn.commit()

        # verify no old markers remain anywhere
        leftover = []
        for table, in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall():
            cols = [c[1] for c in cur.execute(f"PRAGMA table_info({table})").fetchall()]
            for row in cur.execute(f"SELECT * FROM {table}").fetchall():
                blob = " | ".join(str(v) for v in row if v is not None)
                for old in OLD_MARKERS:
                    if old in blob:
                        leftover.append((table, old))
        conn.close()
        print(f"[{db}] tenant rows updated: {tenant_rows}, cms rows updated: {cms_rows}, "
              f"leftover old markers: {leftover if leftover else 'NONE'}")


if __name__ == "__main__":
    update_sources()
    update_dbs()
    print("done")
