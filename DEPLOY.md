# Deployment guide — Render + Vercel (+ MySQL)

This app is prepared for:
- **Backend:** Render Web Service
- **Frontend:** Vercel
- **Database:** MySQL (see critical note on InfinityFree below)

Do **not** commit real `.env` files. Use the dashboards to set secrets.

---

## Critical blockers before go-live

### 1. File uploads — Cloudinary (required)

Screenshots, avatars, and branding logos are uploaded to **Cloudinary**.
Set these on Render:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Folders used: `ef-matchday/screenshots`, `ef-matchday/avatars`, `ef-matchday/branding`.

### 2. InfinityFree MySQL + Render usually will not work

InfinityFree’s free MySQL is intended for apps **hosted on InfinityFree**. Connecting from an external host (Render) is typically **blocked**.

If your Render logs show MySQL connection timeouts, switch to a MySQL host that allows remote connections, for example:
- [FreeSQLDatabase](https://www.freesqldatabase.com/)
- Aiven / Railway / PlanetScale (or similar) free MySQL/Postgres plans
- A small paid managed MySQL

Use `database/schema.sql` in phpMyAdmin on whatever host you choose (select the DB first, then import).

---

## What was verified / changed in the codebase

| Area | Status |
|------|--------|
| Secrets | Read from `process.env` / `import.meta.env` — not hardcoded |
| CORS | `ALLOWED_ORIGINS` (or `FRONTEND_URL`) — not open `cors()` in production |
| DB | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, optional `DB_SSL` |
| Schema | Single file: `database/schema.sql` (create/select DB first, then import) |
| Frontend API | `VITE_API_URL` → axios base URL + `mediaUrl()` for `/uploads` assets |
| Backend start | `npm start` → `node server.js` (no nodemon) |
| Frontend build | `npm run build` (Vite) + `frontend/vercel.json` SPA rewrites |

---

## Step A — InfinityFree / MySQL (or alternative)

1. Create a MySQL database in the host panel.
2. Gather:
   - **Host** (e.g. `sqlXXX.infinityfree.com` — often **not** `localhost` for remote tools)
   - **Port** (usually `3306`)
   - **Username**
   - **Password**
   - **Database name**
3. In phpMyAdmin, select that database → Import → upload **`database/schema.sql`**.
4. Confirm tables exist: `users`, `verification_tokens`, `password_reset_tokens`, `tournaments`, `tournament_participants`, `matches`, `notifications`, `site_settings`.

---

## Step B — Render (backend)

1. New **Web Service** from this Git repo.
2. **Root Directory:** `backend`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Set environment variables (see table below).
6. Deploy → copy the public URL, e.g. `https://ef-matchday-api.onrender.com`
7. Hit `https://YOUR-RENDER-URL/api/health` — expect `{ "status": "ok", ... }`

### Render environment variables

| Key | Example / notes |
|-----|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | Leave unset on Render (they inject it) or `10000` |
| `DB_HOST` | From MySQL panel (external hostname) |
| `DB_PORT` | `3306` |
| `DB_USER` | From MySQL panel |
| `DB_PASSWORD` | From MySQL panel |
| `DB_NAME` | From MySQL panel |
| `DB_SSL` | `true` only if your MySQL provider requires TLS |
| `JWT_SECRET` | Long random string (`openssl rand -hex 32`) |
| `FRONTEND_URL` | `https://your-app.vercel.app` (set after Vercel deploy; update later) |
| `ALLOWED_ORIGINS` | Same as Vercel URL; add more with commas if needed |
| `RESEND_API_KEY` | `re_...` from Resend |
| `EMAIL_FROM` | `EF MatchDay <onboarding@resend.dev>` until you verify a domain |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional; omit if not using Vision OCR |

Update `FRONTEND_URL` / `ALLOWED_ORIGINS` again once you have the final Vercel URL (or custom domain).

---

## Step C — Vercel (frontend)

1. New project from the same repo.
2. **Root Directory:** `frontend`
3. **Framework:** Vite (auto)
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. Set environment variables (below) → Deploy.
7. Copy the Vercel URL → go back to Render and set `FRONTEND_URL` + `ALLOWED_ORIGINS` to that URL → redeploy backend (or restart).

### Vercel environment variables

| Key | Example / notes |
|-----|-----------------|
| `VITE_API_URL` | `https://your-api.onrender.com` (**no** trailing slash) |
| `VITE_FRONTEND_URL` | `https://your-app.vercel.app` |

`VITE_*` values are baked in at **build** time. If you change them, trigger a new Vercel deploy.

---

## Step D — Smoke test after deploy

1. Open Vercel URL → Signup
2. Check Render logs for `[DEV]` is **off** in production; verification email should arrive via Resend (or fail gracefully)
3. Login → complete profile → create tournament
4. Confirm `/api/health` and branding/logo load (logo may be empty until uploaded)
5. Remember: images are served from Cloudinary URLs stored in the DB

---

## Local vs production quick reference

| | Local | Production |
|--|-------|------------|
| Frontend API | Vite proxy → `:5000` (`VITE_API_URL` empty) | `VITE_API_URL=https://….onrender.com` |
| CORS | open if no origins set | must list Vercel origin in `ALLOWED_ORIGINS` |
| DB | XAMPP `localhost` | remote host + credentials |
| Start backend | `npm run dev` (nodemon) | `npm start` |
