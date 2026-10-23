#!/usr/bin/env python3
"""Extract Section 2 (REFINED / IMPROVISED VERSION) from the design docx."""
import sys
from docx import Document

DOC = "upload/Product Design - final.docx"

doc = Document(DOC)
paras = doc.paragraphs
print(f"total paragraphs: {len(paras)}", file=sys.stderr)

# locate red-heading section boundaries
def find_heading(text_part):
    for i, p in enumerate(paras):
        if text_part.lower() in p.text.lower():
            return i
    return -1

s1 = find_heading("CURRENT VERSION WITH SOME CHANGES")
s2 = find_heading("REFINED / IMPROVISED VERSION")
print(f"section1 at para {s1}, section2 at para {s2}", file=sys.stderr)

print("=" * 70)
print("SECTION 2 FULL TEXT (paragraphs %d to end)" % s2)
print("=" * 70)
for i in range(s2, len(paras)):
    p = paras[i]
    t = p.text.strip()
    if not t:
        continue
    style = p.style.name if p.style else ""
    red = False
    try:
        for r in p.runs:
            c = r.font.color
            if c and c.rgb is not None and str(c.rgb) in ("FF0000", "C00000"):
                red = True
                break
    except Exception:
        pass
    tag = "[RED]" if red else f"[{style}]" if style and style != "Normal" else ""
    print(f"{i:3d} {tag} {t}")
