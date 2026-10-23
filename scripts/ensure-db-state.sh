#!/usr/bin/env bash
# ensure-db-state.sh — one-command recovery after workspace/checkpoint rollbacks.
#
# WHY THIS EXISTS: db/custom.db is tracked in git, so platform checkpoint
# restores roll it back to an old state (this happened after Task 52: Plan
# pricing reverted to ₹999, legal/legal-adjacent CMS rows lost their Task
# 50/51/52 content). Every patch below is idempotent — re-running is always
# safe. After ANY workspace rollback or db revert, run:
#
#   bash scripts/ensure-db-state.sh
#
# Then restart the dev server (Turbopack caches aggressively):
#   rm -rf .next && (nohup bun run dev > /dev/null 2>&1 &) && sleep 12
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 1/5 Task 49 — six core pillars (CMS rows + SEO) =="
bun scripts/cms-six-modules.ts

echo "== 2/5 Task 50 — refined six-module renames (CMS rows + SEO ₹1,499) =="
bun scripts/cms-part2-renames.ts

echo "== 3/5 Task 50 — Plan pricing (₹1,499 / ₹3,499 / ₹5,999 · Scale · seats) =="
bun scripts/patch-plans-part2.ts

echo "== 4/5 Task 51 — feature flags, tenant opt-ins, starter contact book =="
bun scripts/patch-features-t51.ts

echo "== 5/5 Task 52 — DPDP legal pages (privacy / terms / security / blog CTA) =="
bun scripts/patch-legal-cms.ts

echo ""
echo "DB state ensured. Quick checks:"
bun -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const plans = await p.plan.findMany({ orderBy: { monthlyInr: 'asc' } });
console.log('plans:', plans.map(x => x.id + '=₹' + x.monthlyInr).join(' · '));
const bad = plans.find(x => x.id === 'starter' && x.monthlyInr !== 1499);
if (bad) { console.error('FAIL: starter price not 1499'); process.exit(1); }
const legal = await p.cmsPage.findMany({ where: { slug: { in: ['privacy','terms','security'] } } });
for (const l of legal) console.log(l.slug + ':', l.content.length, 'chars');
const ok = legal.find(l => l.slug === 'privacy' && l.content.length < 9000);
if (ok) { console.error('FAIL: privacy content looks stale (<9000 chars)'); process.exit(1); }
// zero stale "four"-module references across every CmsPage field
const pages = await p.cmsPage.findMany();
let stale = 0;
for (const r of pages) {
  if (/four/i.test(r.content || '')) { console.error('FAIL: stale four in ' + r.slug + ' content'); stale++; }
  if (/four/i.test(r.seoTitle || '')) { console.error('FAIL: stale four in ' + r.slug + ' seoTitle'); stale++; }
  if (/four/i.test(r.seoDescription || '')) { console.error('FAIL: stale four in ' + r.slug + ' seoDescription'); stale++; }
}
if (stale) process.exit(1);
console.log('OK');
await p.\$disconnect();
"
echo "All DB invariants hold."
