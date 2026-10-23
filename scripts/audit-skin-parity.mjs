#!/usr/bin/env node
// Static skin-parity audit (Task 47).
// The dashboards are class-remapped skins: admin is dark-native (light produced
// by `html:not(.dark) .skin-admin …` rules), client is light-native (dark
// produced by `.dark .skin-client …` rules) — see src/app/globals.css.
// This script diffs the utility tokens each skin's components actually use
// against the explicit remap selectors, so unmapped classes (the known bug
// class from Tasks 42/43, e.g. text-white/90) surface before the browser run.
import { readFileSync, writeFileSync } from "fs";

const ROOT = "/home/z/my-project";
const DIR = `${ROOT}/src/components/sensiblee`;
const CSS = readFileSync(`${ROOT}/src/app/globals.css`, "utf8");

// palette families that NEED an explicit remap (semantic shadcn tokens flip by
// themselves via CSS vars and are deliberately excluded)
const COLORS = [
  "white", "black", "brand", "brand-deep", "brand-soft", "cream", "surface",
  "mint", "mint-deep", "mint-soft", "amber", "amber-soft", "amber-deep",
  "red", "neutral", "slate", "gray", "zinc", "stone", "orange", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet",
  "purple", "fuchsia", "rose",
];
const UTILS = ["bg", "text", "border", "ring", "divide", "fill", "stroke", "outline", "from", "via", "to", "accent", "caret", "shadow"];
const C = COLORS.join("|");
const SHADE = "(?:-\\d+)?";
const ALPHA = "(?:\\/(?:\\d+|\\[\\d*\\.?\\d+\\]))?";
const FAM = new RegExp(`^(?:[a-z0-9-]+:)*(${UTILS.join("|")})-(${C})${SHADE}${ALPHA}$`);
const ARB = new RegExp(`^(?:[a-z0-9-]+:)*(${UTILS.join("|")})-\\[[^\\]]+\\]$`);

const stripPseudo = (s) =>
  s.replace(/::[a-z-]+$/i, "").replace(/:(hover|focus|focus-visible|focus-within|active|disabled)$/i, "");
const unesc = (s) => s.replace(/\\(.)/g, "$1");

function mappedFor(skin) {
  const prefix = skin === "admin" ? "html:not(.dark) .skin-admin" : ".dark .skin-client";
  const set = new Set();
  for (const raw of CSS.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith(prefix)) continue;
    let sel = line.slice(prefix.length).split("{")[0].trim();
    if (!sel.startsWith(".")) continue;
    sel = unesc(stripPseudo(sel.slice(1)));
    if (sel) set.add(sel);
  }
  return set;
}

const TOKEN = /[A-Za-z][A-Za-z0-9:\-_\/\[\]\\.]*/g;

function usedIn(files) {
  const counts = new Map(); // token -> { n, files: Map(file->n) }
  for (const f of files) {
    const src = readFileSync(`${DIR}/${f}`, "utf8");
    for (const t of src.match(TOKEN) || []) {
      if (!FAM.test(t) && !ARB.test(t)) continue;
      const e = counts.get(t) || { n: 0, files: new Map() };
      e.n += 1;
      e.files.set(f, (e.files.get(f) || 0) + 1);
      counts.set(t, e);
    }
  }
  return counts;
}

const ADMIN_FILES = ["admin-console.tsx", "admin-cms.tsx", "team-roles.tsx"];
const CLIENT_FILES = ["client-dashboard.tsx", "client-views2.tsx", "client-extras.tsx", "auth-pages.tsx", "guest-view.tsx", "app-shell.tsx"];
const SHARED = ["brand.tsx", "widgets.tsx", "theme-toggle.tsx", "deps.ts"];

const out = [];
const say = (s = "") => out.push(s);

for (const skin of ["admin", "client"]) {
  const files = skin === "admin" ? [...ADMIN_FILES, ...SHARED] : [...CLIENT_FILES, ...SHARED];
  const used = usedIn(files);
  const mapped = mappedFor(skin);

  const unmapped = [];
  const arbitrary = [];
  for (const [tok, e] of [...used.entries()].sort((a, b) => b[1].n - a[1].n)) {
    const where = [...e.files.entries()].map(([f, n]) => `${f}×${n}`).join(" ");
    if (ARB.test(tok)) arbitrary.push(`${tok.padEnd(34)} ${where}`);
    else if (!mapped.has(tok)) unmapped.push(`${tok.padEnd(34)} ${where}`);
  }

  const dead = [...mapped].filter((k) => !used.has(k) && FAM.test(k)).sort();

  say(`================ skin-${skin} (${skin === "admin" ? "light remap of dark-native" : "dark remap of light-native"}) ================`);
  say(`-- UNMAPPED (${unmapped.length}) --`);
  say(unmapped.join("\n"));
  say(`-- ARBITRARY VALUES (${arbitrary.length}) --`);
  say(arbitrary.join("\n"));
  say(`-- mapped-but-unused (dead CSS, ${dead.length}) --`);
  say(dead.join("\n"));
  say();
}

const report = out.join("\n");
console.log(report);
writeFileSync(`${ROOT}/scripts/audit-skin-parity.out.txt`, report + "\n");
