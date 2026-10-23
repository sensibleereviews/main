// Regenerate Sensiblee blog + team imagery via z-ai SDK.
// 10 blog thumbnails (1344x768) + 10 mid-article illustrations (1344x768)
// + 4 team portraits (864x1152) → public/blog/*.jpg + public/team/*.jpg
import ZAI from "z-ai-web-dev-sdk";
import { writeFileSync, mkdirSync } from "fs";

const BLOG_KEYS = [
  ["response-rate-lever", "the mathematics of replying to every Google review, a calm restaurant owner reviewing responses on a tablet, warm Indian café interior, soft mint green and cream palette, editorial illustration style, no text"],
  ["whatsapp-review-requests", "a cheerful WhatsApp review request moment on a smartphone, Indian restaurant guest smiling after a meal, soft mint green and warm cream tones, modern editorial illustration, no text"],
  ["qr-table-tent-playbook", "a table tent QR code on a restaurant table being scanned, Indian diner holding phone, mood feedback flow concept, mint green and cream palette, editorial illustration style, no text"],
  ["ai-learns-your-restaurants-voice", "an AI assistant studying handwritten recipes and reply notes in a warm restaurant office, brand voice concept, deep slate and mint palette, modern editorial illustration, no text"],
  ["reputation-health-score-explained", "a glowing circular health score gauge floating above a calm restaurant counter, analytics dashboard concept, deep slate background with mint green accents, editorial illustration, no text"],
  ["one-star-recovery-playbook", "a caring restaurant manager phoning a guest to recover a bad experience, warm reconciliation mood, Indian restaurant evening light, mint and amber palette, editorial illustration, no text"],
  ["google-business-profile-monthly-checklist", "a checklist clipboard beside a phone showing a business profile, tidy Indian café counter, monthly maintenance ritual concept, mint green cream palette, editorial illustration, no text"],
  ["naming-names-in-review-replies", "a proud restaurant staff member being celebrated by teammates, recognition moment in a warm Indian restaurant, mint green and warm amber tones, editorial illustration, no text"],
  ["weekly-feedback-loop-monday-morning", "a calm Monday morning team huddle around a phone with a weekly digest, organized Indian restaurant before opening, mint and cream palette, editorial illustration, no text"],
  ["review-reply-format-plays", "short and long handwritten reply notes beside a laptop, format and tone comparison concept, elegant flat lay, deep slate and mint palette, editorial illustration, no text"],
];

const TEAM = [
  ["aarav-sharma", "professional corporate portrait of a confident Indian man in his late 30s, short dark hair, neat beard, charcoal blazer over white shirt, warm studio lighting, soft cream background, photorealistic headshot"],
  ["priya-nair", "professional corporate portrait of a confident Indian woman in her mid 30s, shoulder-length dark hair, elegant teal blouse, warm studio lighting, soft cream background, photorealistic headshot"],
  ["rohan-mehta", "professional corporate portrait of a friendly Indian man in his early 30s, glasses, light blue shirt, warm studio lighting, soft cream background, photorealistic headshot"],
  ["ananya-iyer", "professional corporate portrait of a poised Indian woman in her early 30s, long dark hair, subtle smile, deep green kurta, warm studio lighting, soft cream background, photorealistic headshot"],
];

async function genImage(zai, prompt, size) {
  const res = await zai.images.generations.create({ prompt, size });
  const b64 = res?.data?.[0]?.base64 || res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image data returned");
  return Buffer.from(b64, "base64");
}

async function main() {
  const phase = process.argv[2] || "all"; // thumbs | mids | team | all
  const zai = await ZAI.create();
  mkdirSync("public/blog", { recursive: true });
  mkdirSync("public/team", { recursive: true });
  let done = 0, fail = 0;

  for (const [key, prompt] of BLOG_KEYS) {
    for (const [suffix, size, tweak] of [
      ["thumb", "1344x768", ", wide composition, subject centered"],
      ["mid", "1344x768", ", alternate angle, slightly different scene"],
    ]) {
      if (phase === "thumbs" && suffix !== "thumb") continue;
      if (phase === "mids" && suffix !== "mid") continue;
      const file = `public/blog/${key}-${suffix}.jpg`;
      try {
        const buf = await genImage(zai, prompt + tweak, size);
        writeFileSync(file, buf);
        done++; console.log(`ok ${file}`);
      } catch (e) {
        fail++; console.error(`FAIL ${file}: ${e.message}`);
        await new Promise(r => setTimeout(r, 3000));
        try {
          const buf = await genImage(zai, prompt + tweak, size);
          writeFileSync(file, buf);
          done++; fail--; console.log(`ok(retry) ${file}`);
        } catch (e2) { console.error(`FAIL2 ${file}: ${e2.message}`); }
      }
    }
  }

  for (const [name, prompt] of TEAM) {
    if (phase === "thumbs" || phase === "mids") break;
    const file = `public/team/${name}.jpg`;
    try {
      const buf = await genImage(zai, prompt, "864x1152");
      writeFileSync(file, buf);
      done++; console.log(`ok ${file}`);
    } catch (e) {
      fail++; console.error(`FAIL ${file}: ${e.message}`);
    }
  }

  console.log(`DONE ok=${done} fail=${fail}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
