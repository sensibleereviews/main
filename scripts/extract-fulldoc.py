#!/usr/bin/env python3
"""Extract FULL document (both sections, paragraphs + tables, in order) from the design docx.
Outputs plain text with structural tags for audit use."""
import sys
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

DOC = "upload/final-product-design.docx"
OUT = "scripts/fulldoc.txt"

doc = Document(DOC)

def iter_block_items(parent):
    """Yield paragraphs and tables from document body in document order."""
    from docx.oxml.ns import qn
    body = parent.element.body
    for child in body.iterchildren():
        if child.tag == qn('w:p'):
            yield Paragraph(child, parent)
        elif child.tag == qn('w:tbl'):
            yield Table(child, parent)

lines = []
tbl_n = 0
for block in iter_block_items(doc):
    if isinstance(block, Paragraph):
        t = block.text.strip()
        if not t:
            continue
        style = block.style.name if block.style else ""
        red = False
        try:
            for r in block.runs:
                c = r.font.color
                if c and c.rgb is not None and str(c.rgb) in ("FF0000", "C00000"):
                    red = True
                    break
        except Exception:
            pass
        tag = "[RED]" if red else f"[{style}]" if style and style != "Normal" else ""
        lines.append(f"{tag} {t}" if tag else t)
    else:
        tbl_n += 1
        lines.append(f"<<<TABLE {tbl_n}>>>")
        for row in block.rows:
            cells = [c.text.strip().replace("\n", " / ") for c in row.cells]
            lines.append(" | ".join(cells))
        lines.append(f"<<<END TABLE {tbl_n}>>>")

text = "\n".join(lines)
with open(OUT, "w") as f:
    f.write(text)
print(f"paragraph+table lines: {len(lines)}, tables: {tbl_n}")
print(f"written to {OUT}")
