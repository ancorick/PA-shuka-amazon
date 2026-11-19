# Shuka — Amazon-style marketplace for Armenia

Anyone can register, open a store, list products with photos and buy from several sellers in one cart.
Prices are in AMD (֏), delivery is inside Armenia, payment is **cash on delivery**.

Full requirements: [PRD.md](PRD.md) (contains the original project brief word for word).

```
shuka/
├─ frontend/   React + Vite (browser only)       → deployed on Netlify
├─ backend/    Express + SQLite (API, data, auth) → deployed on Render
└─ scripts/    dev.mjs — runs both locally with one command
```

The browser only ever calls `/api/...`. Netlify (production) and Vite (development) proxy `/api/*` to the backend
with the `/api` prefix removed, so the session cookie stays first-party and no CORS is needed in production.

## Run locally — one command

Requires Node.js 20+.

```bash
npm run dev
```

This installs dependencies (first run only), creates `backend/data/shuka.db`, applies the migrations, seeds demo
data, and starts:

- backend → http://localhost:3000
- frontend → **http://localhost:5173** ← open this

Other commands (from the repository root):

| Command | What it does |
|---|---|
| `npm run reset` | delete the local database + uploads and seed again |
| `npm start` | start only the backend |
| `npm run build` | build the frontend into `frontend/dist` |
| `npm run test:breakit` | run the 9 break-it tests against http://localhost:3000 (server must be running) |

### Demo accounts (password `shuka123`)

| Role | Email |
|---|---|
| Seller — Yerevan Electronics | seller1@shuka.am |
| Seller — Ararat Home & Style | seller2@shuka.am |
| Seller — Gyumri Crafts & Food | seller3@shuka.am |
| Buyer | buyer1@shuka.am |
| Buyer | buyer2@shuka.am |

Registration needs no real email: any address like `anna@test.am` works, nothing is ever sent.

## Deploy

### 1. Backend → Render (Web Service)

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Environment variables:

| Key | Value |
|---|---|
| `NODE_VERSION` | `20` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | a long random string (Render: "Generate") |
| `DATA_DIR` | `./data` (or the mount path of a persistent disk, e.g. `/var/data`) |

`PORT` is set by Render automatically. Alternatively use the included `render.yaml` blueprint.

After the deploy, open `https://<your-service>.onrender.com/health` — it should return `{"ok":true,...}`.

### 2. Frontend → Netlify

1. Edit `frontend/netlify.toml` and replace `<RENDER_URL>` with your Render host, e.g. `shuka-api.onrender.com`. Commit and push.
2. Netlify → Add new site → Import from GitHub → this repository.

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `frontend/dist` (Netlify shows it relative to the base: `dist`) |

No environment variables are needed on Netlify — the frontend holds no secrets.

### Render free tier — read this

- The free plan has **no persistent disk**: the SQLite file and uploaded photos are reset when the service
  redeploys or restarts. On every start the server migrates and, if the database is empty, seeds the demo data, so
  the shop is never empty — but products/orders created by users disappear after a restart. With a paid plan, add a
  disk and set `DATA_DIR` to its mount path; no code changes are needed.
- Free services sleep after ~15 minutes without traffic; the first request then takes ~30–60 s (the site shows
  "Waking up the server…"). Keep it awake with a free monitor such as cron-job.org calling
  `https://<your-service>.onrender.com/health` every 10 minutes.

## How the hard parts are solved

| Problem | Where |
|---|---|
| Overselling | `backend/src/routes/orders.js` — one `BEGIN IMMEDIATE` transaction, `UPDATE … SET stock = stock - ? WHERE id = ? AND stock >= ?`, changed rows checked, whole order rolled back with 409 |
| "Database is locked" | `backend/src/db.js` — WAL mode, `busy_timeout = 5000`, short transactions (images are processed outside) |
| Prices change after purchase | title/price copied into `order_items`, address into `orders`; price change since add-to-cart → 409 `PRICE_CHANGED` with the new prices |
| One cart, many sellers | one `orders` row → one `seller_orders` row per seller, each with its own status and history |
| Disallowed status changes | `backend/src/lifecycle.js` — the only table of allowed moves; everything else → 409; every move inserts into `status_history` (insert-only, enforced by triggers) |
| Other people's data | every query is scoped: `WHERE id = ? AND seller_id = ?` / `AND buyer_id = ?` → 404 |
| Double checkout | random `requestKey` per checkout + `UNIQUE(request_key)` → the existing order is returned |
| Broken references | `PRAGMA foreign_keys = ON` on every connection; products are unpublished, never deleted |
| Images | multer (5 MB limit) + sharp: real content check (not the extension), thumbnail 400 px + large 1200 px WebP in `data/uploads`, only the file name in SQLite |

Backups: the server writes `VACUUM INTO data/backups/shuka-<date>.db` once a day (keeps 7); `npm --prefix backend run backup` does it on demand.

## Break-it tests

```bash
npm run dev                # in one terminal
npm run test:breakit       # in another
```

Against production (the foreign-key test needs the local DB file and is skipped):

```bash
npm --prefix backend run test:breakit -- --base=https://<your-site>.netlify.app/api
```

Test products created by the scripts are unpublished at the end, so the storefront stays clean.
