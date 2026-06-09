# ⚽ Office World Cup 2026 — Prediction Game

A tiny internal prediction game for the 2026 World Cup. Employees predict match
scorelines and earn points. **No real money or betting** — leaderboard bragging
rights only.

- **3 points** for an exact scoreline
- **1 point** for the correct outcome (win / draw / loss)
- Predictions lock automatically at kickoff

## Stack

- **Cloudflare Pages** — hosts the static frontend (`public/`, no build step)
- **Pages Functions** — the API (`functions/api/`)
- **Cloudflare D1** — SQLite database (`schema.sql`)

Everything fits comfortably in Cloudflare's free tier for an office-sized group.

## Project layout

```
public/            Static frontend (index.html = game, admin.html = results entry)
functions/api/     Serverless API endpoints
lib/api.js         Shared helpers + scoring rule
data/fixtures.json Fixture list to seed into D1 (edit this!)
schema.sql         Database schema
wrangler.toml      Cloudflare config
```

## Local development

```bash
npm install
npx wrangler login                # one-time

# Create the local D1 DB and tables
npm run db:init

# Run the app + API locally at http://localhost:8788
npm run dev
```

Then open the local URL. To load fixtures and enter results, visit `/admin.html`
and use the admin key from `wrangler.toml` (`change-me-in-production` by default).
Click **Seed fixtures** to populate matches.

## Deploying to Cloudflare Pages

1. **Create the D1 database** and paste the returned id into `wrangler.toml`:
   ```bash
   npx wrangler d1 create wc-results
   ```
2. **Create the tables in production:**
   ```bash
   npm run db:init:remote
   ```
3. **Deploy** (or connect this Git repo in the Pages dashboard for auto-deploys):
   ```bash
   npm run deploy
   ```
4. In the **Pages → Settings → Variables and Secrets** dashboard, set:
   - `JOIN_CODE` — the code you give employees
   - `ADMIN_KEY` — secret for entering results (keep this private)

   Set these as **encrypted secrets** in production rather than relying on the
   plaintext defaults in `wrangler.toml`.
5. Bind the D1 database to the Pages project (**Settings → Functions → D1 bindings**):
   binding name `DB` → database `wc-results`.
6. Visit `/admin.html`, enter your admin key, and click **Seed fixtures**.

## Running the game

1. Share the site URL + the `JOIN_CODE` with employees.
2. Players enter a display name + the join code, then submit score predictions.
3. After each match, an admin opens `/admin.html` and records the final score.
4. The leaderboard updates automatically.

## Customising the fixtures

`data/fixtures.json` ships with **placeholder** group-stage matches. Replace the
team names and kickoff times (ISO 8601, UTC) with the official 2026 schedule, then
re-run **Seed fixtures** in the admin page (existing rows are left untouched, so
it's safe to re-run after adding new matches). Add knockout fixtures the same way
as the bracket fills in.

## Notes & possible next steps

- Auth is intentionally light: a shared join code + a unique display name, with a
  token stored in the browser. Good enough for a low-stakes office game. For
  stronger access control, put the site behind **Cloudflare Access** (SSO).
- Possible additions: bonus points for knockout-round picks, group/department
  sub-leaderboards, auto-fetching results from a football API, or an "everyone's
  picks" view once a match locks.
