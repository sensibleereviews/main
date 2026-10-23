// Extract readable text from the hand-rolled PDFs (uncompressed content streams)
import { readFileSync } from "node:fs";
const buf = readFileSync(process.argv[2]).toString("latin1");
const streams = [...buf.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => m[1]);
const texts = [];
for (const s of streams) {
  for (const m of s.matchAll(/\((?:[^()\\]|\\.)*\)\s*Tj/g)) {
    texts.push(m[0].slice(1, -4).replace(/\\(\)|\\|\()/g, "$1"));
  }
}
console.log(texts.join("\n"));
