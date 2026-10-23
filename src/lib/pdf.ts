// Minimal dependency-free PDF writer (PDF 1.4 · A4 · Helvetica core fonts).
// No external libs — content streams are hand-assembled with a correct xref table.
// Note: core-font WinAnsi encoding has no ₹ glyph, so PDF documents format rupees as "Rs.".

export const A4 = { w: 595.28, h: 841.89 };

type RGB = [number, number, number];
export const INK: RGB = [0.06, 0.09, 0.16]; // near-black brand ink
export const MUTED: RGB = [0.45, 0.47, 0.5];
export const BRAND: RGB = [0.05, 0.29, 0.25]; // deep green (brand-deep)
export const MINT: RGB = [0.6, 0.93, 0.78];
export const LINE: RGB = [0.85, 0.87, 0.88];

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function latin1(s: string): string {
  // transliterate common non-Latin-1 glyphs, then strip the rest so the PDF stays
  // valid with core fonts (★ – — ▲ … etc. have no slot in WinAnsi/Latin-1)
  return s
    .replace(/[★☆]/g, "*")
    .replace(/[–—―]/g, "-")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[▲↑]/g, "+")
    .replace(/[▼↓]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

// Approximate Helvetica advance widths (fraction of font size) for wrapping/metrics
function charW(ch: string): number {
  if ("iljt.,:;'!|()[]f".includes(ch)) return 0.3;
  if ("mwMW@".includes(ch)) return 0.87;
  if (ch >= "A" && ch <= "Z") return 0.68;
  if (ch >= "0" && ch <= "9") return 0.556;
  if (ch === " ") return 0.28;
  if (ch >= "a" && ch <= "z") return 0.53;
  return 0.55;
}

export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) w += charW(ch);
  return w * size * (bold ? 1.06 : 1);
}

export function wrapText(s: string, size: number, maxWidth: number, bold = false): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (textWidth(cand, size, bold) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cand;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

type TextOpts = { size?: number; bold?: boolean; color?: RGB };
type RectOpts = { fill?: RGB; stroke?: RGB; strokeWidth?: number };

export class PdfDoc {
  private pages: string[] = [];
  private cur: string[] = [];

  constructor() {
    this.addPage();
  }

  addPage(): void {
    if (this.cur.length) this.pages.push(this.cur.join("\n"));
    this.cur = [];
  }

  text(x: number, y: number, s: string, o: TextOpts = {}): void {
    const size = o.size ?? 10;
    const font = o.bold ? "/F2" : "/F1";
    const [r, g, b] = o.color ?? INK;
    this.cur.push(
      `BT ${r} ${g} ${b} rg ${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${latin1(esc(s))}) Tj ET`,
    );
  }

  textRight(xRight: number, y: number, s: string, o: TextOpts = {}): void {
    const w = textWidth(s, o.size ?? 10, o.bold);
    this.text(xRight - w, y, s, o);
  }

  textCenter(cx: number, y: number, s: string, o: TextOpts = {}): void {
    const w = textWidth(s, o.size ?? 10, o.bold);
    this.text(cx - w / 2, y, s, o);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = LINE, width = 0.75): void {
    const [r, g, b] = color;
    this.cur.push(`${r} ${g} ${b} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  rect(x: number, y: number, w: number, h: number, o: RectOpts = {}): void {
    const parts: string[] = [];
    if (o.fill) parts.push(`${o.fill[0]} ${o.fill[1]} ${o.fill[2]} rg`);
    if (o.stroke) parts.push(`${o.stroke[0]} ${o.stroke[1]} ${o.stroke[2]} RG ${o.strokeWidth ?? 0.75} w`);
    parts.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (o.fill && o.stroke) parts.push("B");
    else if (o.fill) parts.push("f");
    else parts.push("S");
    this.cur.push(parts.join(" "));
  }

  // Draw a wrapped paragraph; returns the y BELOW the last line
  paragraph(x: number, y: number, maxWidth: number, s: string, o: TextOpts & { leading?: number } = {}): number {
    const size = o.size ?? 10;
    const leading = o.leading ?? size * 1.42;
    for (const ln of wrapText(s, size, maxWidth, o.bold)) {
      this.text(x, y, ln, o);
      y -= leading;
    }
    return y;
  }

  build(): Uint8Array {
    if (this.cur.length) this.pages.push(this.cur.join("\n"));
    this.cur = [];
    const objs: string[] = [];
    const nPages = this.pages.length;
    // 1 catalog · 2 pages · 3 F1 · 4 F2 · then page/content pairs from 5
    const pageObjIds = this.pages.map((_, i) => 5 + i * 2);

    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objs[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${nPages} >>`;
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    this.pages.forEach((content, i) => {
      const pid = pageObjIds[i];
      const cid = pid + 1;
      objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w.toFixed(2)} ${A4.h.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`;
      objs[cid] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
    });

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let i = 1; i < objs.length; i++) {
      offsets[i] = Buffer.byteLength(out, "latin1");
      out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xrefAt = Buffer.byteLength(out, "latin1");
    const total = objs.length; // objects 0..n
    out += `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
    return new Uint8Array(Buffer.from(out, "latin1"));
  }
}

// PDFs format rupees as "Rs." — core Helvetica lacks the ₹ glyph
export function inrPdf(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

export function inrPdf2(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
