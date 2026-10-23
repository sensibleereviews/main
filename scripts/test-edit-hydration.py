#!/usr/bin/env python3
"""
Test harness for diagnosing the "edits disappear after reload" issue on the
hosted static Sensiblee site.

Hypothesis: the static export embeds the Next.js RSC flight payload in every
page. When someone edits only the visible HTML text, the page paints the edit
first (pre-hydration), then React hydrates from the untouched flight payload
and re-renders the original content — the edit "appears for a while then
disappears".

Modes:
  dom-only : replace hero text ONLY in visible DOM span (simulates naive edit)
  both     : replace hero text in DOM + flight payload (safe DIY edit)
  restore  : put the original text back
"""
import sys

PATH = "/home/z/my-project/sensiblee-static/index.html"
ORIGINAL = "sensed sensibly"
EDITED = "sensed BRILLIANTLY"
DOM_TARGET = f'<span class="text-mint-deep">{ORIGINAL}</span>'


def main():
    mode = sys.argv[1]
    with open(PATH, encoding="utf-8") as f:
        html = f.read()

    if mode == "dom-only":
        assert DOM_TARGET in html, "DOM target not found"
        html = html.replace(DOM_TARGET, f'<span class="text-mint-deep">{EDITED}</span>')
    elif mode == "both":
        n = html.count(ORIGINAL)
        assert n == 2, f"expected 2 occurrences (DOM + payload), got {n}"
        html = html.replace(ORIGINAL, EDITED)
    elif mode == "restore":
        html = html.replace(EDITED, ORIGINAL)
    else:
        raise SystemExit(f"unknown mode: {mode}")

    with open(PATH, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[{mode}] done. ORIGINAL count={html.count(ORIGINAL)} EDITED count={html.count(EDITED)}")


if __name__ == "__main__":
    main()
