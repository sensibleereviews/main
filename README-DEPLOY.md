# Sensiblee — Production Deployment Guide

This is the real, deployable build: marketing website, client dashboard, platform
admin console and the guest QR flow — one Next.js 16 app backed by Prisma (SQLite
in this build), credential auth, a live AI reply worker and a REST API.

## Surfaces & URLs

| Surface | Production URL | Path routing |
|---|---|---|
| Marketing website | `https://www.sensiblee.in` | `/`, `/features`, `/pricing`, `/stories`, `/security`, `/about`, `/contact`, `/privacy`, `/terms` |
| Client dashboard | `https://app.sensiblee.in` | `/` (overview), `/reviews`, `/requests`, `/ai`, `/analytics`, `/locations`, `/settings` |
| Platform admin | `https://admin.sensiblee.in` | `/` (platform), `/tenants`, `/billing`, `/plans`, `/system` |
| Guest QR flow | `https://www.sensiblee.in/g/<code>` | public, no login (e.g. `/g/spk-kor`) |

`src/middleware.ts` rewrites `app.*` / `admin.*` hosts (and any deep path) onto the
single page route while preserving the URL, so all three subdomains serve from the
same deployment with real deep links. Auth is enforced server-side on every API
route (signed HMAC cookie, scrypt password hashes); middleware handles routing,
APIs handle security.

## Quick start (local / sandbox)

```bash
bun install
cp .env.example .env            # set SESSION_SECRET at minimum
bun run db:push                 # create schema
bun run db:seed                 # seed demo tenants, reviews, invoices
bun run dev                     # http://localhost:3000
```

Deep links work on localhost too: try `/pricing`, `/login`, `/app/reviews`,
`/admin`, `/g/spk-kor`.

## Demo credentials (change before launch)

| Role | Email | Password |
|---|---|---|
| Tenant owner (Spice Route Kitchen) | `anand@spiceroute.in` | `Demo@1234` |
| Platform admin | `admin@sensiblee.in` | `Demo@1234` |

Other tenant owners: `kavya@lumieredental.in`, `tenzin@cafemandala.in` (past-due),
`nandini@bloomflorists.in` (trial), etc. — same password.

## Deploying (Hostinger VPS / any Node host)

```bash
bun install
bun run build
bun run start            # serves on PORT (default 3000)
```

1. Point DNS: `www` / `app` / `admin` A-records → the VPS.
2. Reverse proxy (nginx/Caddy): all three hostnames → `localhost:3000`.
   Terminate TLS with certbot (wildcard `*.sensiblee.in` + `sensiblee.in`).
3. Env: `SESSION_SECRET=<random hex>`, `NEXT_PUBLIC_GUEST_URL=https://www.sensiblee.in`.
4. Persistence: SQLite file lives at `db/custom.db` — include it in backups
   (`0 2 * * * sqlite3 db/custom.db ".backup ..."`), or switch to Postgres:
   change `provider = "postgresql"` in `prisma/schema.prisma`, update
   `DATABASE_URL`, run `bun run db:push`.

Alternatively deploy to Vercel: the middleware runs as-is; move the DB to
Postgres/Turso (Vercel has no persistent disk).

## Connectors — simulation vs live

The platform is fully functional out of the box; external providers are
abstracted in `src/lib/connectors.ts`:

| Connector | Sim mode (default) | To go live |
|---|---|---|
| Google reviews | `Sync now` pulls from a simulated stream; new reviews are LLM-classified and auto-drafted | `GOOGLE_SYNC_MODE=live` + `GOOGLE_ACCESS_TOKEN`; store real `googlePlaceId` per location |
| WhatsApp sends | Campaign launches model a quality-throttled burst (sent/opened/clicked) | `WHATSAPP_MODE=live` + `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`; register HSM templates |
| AI replies | Live LLM via z-ai-web-dev-sdk (server-side) with a template fallback if unreachable | Already live |
| Payments | Invoices/dunning are managed in the admin console (remind, mark-paid) | Add Razorpay: create subscriptions, verify webhook signatures into `Invoice.status` |

The System page (`/admin/system`) shows which mode each connector is in.

## Architecture map

```
src/
  middleware.ts               # subdomain + deep-path rewriter
  app/page.tsx                # single page route → reads x-ss-* headers
  app/api/…                   # REST API (auth, reviews, drafts, locations,
                              #  campaigns, guest, analytics, settings, team,
                              #  billing, admin/*, demo-requests, qr)
  lib/
    auth.ts                   # scrypt hashes + HMAC session tokens (httpOnly)
    ai.ts                     # reply drafting + review classification (LLM)
    connectors.ts             # Google / WhatsApp provider abstraction
    analytics.ts              # trend/sentiment/keywords/funnel computations
    viewmodels.ts             # DB → UI mappers
    router.tsx / route-shared # URL-aware client router
    session.tsx / client.ts   # session context + fetch hooks
  components/sensiblee/       # marketing, client, admin, guest surfaces
prisma/schema.prisma          # 14-model multi-tenant schema
prisma/seed.ts                # deterministic demo dataset (bun prisma/seed.ts)
```

## Operations notes

- **Roles**: `owner`/`manager`/`observer` (tenant) and `platform_admin`.
  Admins can impersonate a tenant (30-min time-boxed session, restore cookie,
  audit-logged) — banner shown, exit returns to the console.
- **Audit trail**: logins, replies, campaigns, plan changes, dunning actions and
  impersonation are written to `ActivityLog`; platform events to `SystemEvent`.
- **Plans**: editing prices in `/admin/plans` updates the public pricing page
  instantly (single source of truth in the `Plan` table).
- **Guest QR**: every location has a `code`; `/api/qr?code=…` returns a real,
  scannable PNG encoding `${NEXT_PUBLIC_GUEST_URL}/g/<code>`. Frowns land in the
  tenant's activity feed as private feedback.
- **Rate/abuse**: the guest feedback endpoint is public — put a turnstile/rate
  limit in front of `/api/guest/*` at the proxy before launch.
