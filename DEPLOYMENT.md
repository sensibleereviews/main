# Sensiblee — Production Deployment Guide

Deploy the full Sensiblee application (marketing website + tenant workspace + platform admin) to an Ubuntu VPS, and keep editing content afterwards — through the CMS with zero deploys, or through code with a fast rebuild path.

## Architecture at a glance

| Piece | What it is | Runs as |
|---|---|---|
| One Next.js 16 app | Serves **all three surfaces** from a single Node process | PM2-managed `node .next/standalone/server.js` on `127.0.0.1:3000` |
| `src/middleware.ts` | Reads the `Host` header and routes the right surface — no separate deployments | in-process |
| nginx | TLS termination + reverse proxy for all subdomains | systemd |
| SQLite + Prisma | Single-file DB at `db/custom.db` (content, CMS, demo workspace, users) | file on disk |
| Website CMS | Admin console → **Website** — every marketing page, blog, FAQs, testimonials, media, banner, contact details | part of the app |

### Domain routing (built in)

- `www.sensiblee.in` → marketing website (`/`, `/features`, `/pricing`, `/blog/…`)
- `app.sensiblee.in` → tenant workspace console (`/app/…`)
- `admin.sensiblee.in` → platform admin console (`/admin/…`)
- Deep links like `www.sensiblee.in/g/spk-kor` → guest feedback flow

All four hostnames hit the same nginx server block and the same Node process — the middleware picks the surface.

---

## Part 1 — DNS

At your registrar, create **A records** pointing to the VPS IP:

```
sensiblee.in        A     YOUR_VPS_IP
www.sensiblee.in    A     YOUR_VPS_IP
app.sensiblee.in    A     YOUR_VPS_IP
admin.sensiblee.in  A     YOUR_VPS_IP
```

Wait for propagation (`dig +short www.sensiblee.in` returns your IP).

> **Apex vs www:** `www.sensiblee.in` is the canonical marketing host. The shipped
> nginx config 301-redirects `sensiblee.in` → `www.sensiblee.in` automatically, so
> search engines index exactly one copy — the apex only needs the A record above.

## Part 2 — Server bootstrap

```bash
ssh root@YOUR_VPS_IP
apt update && apt install -y git rsync   # minimal base
```

Upload the release and run the setup script:

```bash
# on your machine: pack the release (includes code + current DB + deploy kit)
bash scripts/release-pack.sh
scp download/sensiblee-release.tar.gz root@YOUR_VPS_IP:/tmp/

# on the VPS
mkdir -p /var/www/sensiblee
tar -xzf /tmp/sensiblee-release.tar.gz -C /var/www/sensiblee
cd /var/www/sensiblee
bash deploy/setup-vps.sh          # nginx, Node 20, bun, PM2, nginx site
```

## Part 3 — Environment

```bash
cd /var/www/sensiblee
cp deploy/.env.production.example .env
nano .env
```

- `DATABASE_URL` — default matches `/var/www/sensiblee/db/custom.db`
- `SESSION_SECRET` — **generate a real one:**
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

## Part 4 — Install, database, build, start

```bash
cd /var/www/sensiblee
bun install                # project ships bun.lock (npm ci would fail without package-lock.json)
npx prisma generate
npx prisma db push         # creates/updates schema (no data loss on SQLite by default)
npm run build              # next build + copies static assets into standalone

set -a; source .env; set +a
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup                # run the command it prints — survives reboots
pm2 logs sensiblee         # watch it come up
```

> **Bringing your current DB:** the release tarball already carries `db/custom.db` (with all CMS content, demo workspace, users). Skip `db:seed`. For a **fresh** DB instead: pack with `--no-db`, run `npm run db:seed` (uses bun), and change the seeded logins before going live.

**Seeded logins** (change them before launch — Admin → Platform team / My account):

| Role | Email | Password |
|---|---|---|
| Platform super admin | `admin@sensiblee.in` | `Demo@1234` |
| Tenant owner (demo) | `anand@spiceroute.in` | `Demo@1234` |

## Part 5 — nginx + HTTPS

```bash
bash deploy/setup-vps.sh   # step 5 copies the nginx site (idempotent)
certbot --nginx -d sensiblee.in -d www.sensiblee.in -d app.sensiblee.in -d admin.sensiblee.in
```

Certbot rewrites the nginx config for TLS and auto-renewal; the apex block keeps
its 301 → `https://www.sensiblee.in` after TLS is installed. Done — open `https://www.sensiblee.in`.

---

## Part 6 — Making changes after go-live

### A. Content changes → Website CMS (no deploy, instant)

Sign in at `admin.sensiblee.in` → **Website**:

| Tab | What you can edit |
|---|---|
| **Pages** | Every word of all 13 marketing pages (home, features, pricing, stories, about, security, contact, privacy, terms, knowledge, blog hub, ticket, how) + per-page SEO title/description |
| **Blog** | Create/edit articles, authors, featured media, SEO |
| **FAQs** | Questions per surface (home / pricing / knowledge) |
| **Testimonials** | Quotes, names, star ratings, media |
| **Media** | Upload images; reference them in pages/posts/testimonials |
| **Banner** | Site-wide announcement bar (on/off, text, link) |
| **Contact** | Footer phone / WhatsApp / email — `tel:`/`wa.me:` links auto-derive; also updates the legal-page contact line |

Every save is **live on the visitor's next page load** — no rebuild, no cache purge. The app console data (clients, plans, billing, reviews demo) is likewise DB-driven via the admin console — nothing to redeploy.

### B. Code changes → fast rebuild path

```bash
# local machine — edit code, then:
bash scripts/release-pack.sh --no-db        # keep the server's DB!
scp download/sensiblee-release.tar.gz root@YOUR_VPS_IP:/tmp/

# VPS
cd /var/www/sensiblee
tar -xzf /tmp/sensiblee-release.tar.gz -C /var/www/sensiblee
cd /var/www/sensiblee
bun install && npx prisma generate && npm run build
set -a; source .env; set +a; pm2 restart sensiblee
```

Downtime ≈ the build time (usually 1–3 min). The DB is untouched by code releases.

> Prefer zero-downtime? Build in a second directory and switch the PM2 cwd, or add a systemd/CI pipeline later — the kit is deliberately simple first.

### Where things live (for code edits)

| You want to change… | Edit |
|---|---|
| Footer/nav structure, links, socials | `src/components/sensiblee/marketing-chrome.tsx` |
| Default page copy (fallback if CMS empty) | `src/lib/cms-defaults2.ts` |
| Page layout/sections | `src/components/sensiblee/marketing-pages*.tsx`, `marketing-home.tsx` |
| CMS bundle/types, contact fallback | `src/lib/cms.ts` |
| Admin CMS tabs | `src/components/sensiblee/admin-cms.tsx` |
| Domain/subdomain routing rules | `src/middleware.ts` |
| DB schema | `prisma/schema.prisma` → `npx prisma db push` |

## Part 7 — Operations cheat-sheet

```bash
pm2 status                  # is sensiblee online?
pm2 logs sensiblee --lines 100
tail -50 /var/log/sensiblee/error.log

# Database backup (do this regularly — it's one file)
sqlite3 /var/www/sensiblee/db/custom.db ".backup '/root/backups/custom-$(date +%F).db'"

# Restore a backup: stop app, copy file back, start app
pm2 restart sensiblee
```

**Common gotchas**

- **Port already in use (`EADDRINUSE`)** — Next renames its process to `next-server`; find it with `ss -tlnp | grep 3000` and `kill <pid>` before restarting.
- **Assets 404 after a manual build** — you skipped the copy steps; use `npm run build` (not bare `next build`).
- **Uploads rejected** — nginx `client_max_body_size` is set to 25m in the provided config; raise it if you upload large media.
- **Changes not visible** — the app sends no HTML caching headers; if you add a CDN later, exclude `/` and `/api/*` from caching.

---

*Kit files: `deploy/.env.production.example` · `deploy/ecosystem.config.js` · `deploy/nginx-sensiblee.conf` · `deploy/setup-vps.sh` · `scripts/release-pack.sh`*
