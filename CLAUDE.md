# App template (Dozokit Apps)

A React + Vite app on Cloudflare Workers, with a D1 database and Better Auth logins. The owner's app runs on their own free Cloudflare account.

## Layout

- `src/`: the React app (served as static assets).
- `src/theme.css`: the whole look (colours, fonts, spacing, corners, shadows). `src/themes/`: the 4 built-in looks (clean, warm, bold, dark); to switch to one, copy its file over `src/theme.css`. `src/ui/`: the building blocks (Page, Card, Button, LinkButton, Field, Table, Empty, ErrorMessage, Hint, Note, Loading, Row).
- `worker/index.ts`: sends `/api/auth/*` to Better Auth and every other `/api/*` call to `worker/routes.ts`.
- `worker/routes.ts`: every API route, keyed `"METHOD /path"`, matched exactly: no path params (`/api/bookings/:id`); pass ids in `?query` or the JSON body.
- `worker/auth.ts`: Better Auth setup and `requireUser()`.
- `migrations/`: D1 migrations, applied in order. Leave `0002_items.sql` (the demo table) as it is: migrations only add.
- The app's name: `<title>` in `index.html` and `APP` in `src/App.tsx`.
- `preview-owner.json`: written by the Dozokit Apps builder for its owner previews; leave it.
- `public-routes.json`: the routes anyone may call without logging in.
- `scripts/check-routes.mjs`: the safety check, run by `npm run build` (and by the Dozokit Apps builder before Save).
- `scripts/preview-db.mjs`: in Cloudflare's build of the `draft` branch, gives the preview its own database.

## Run it

```
cp .dev.vars.example .dev.vars   # set BETTER_AUTH_SECRET
npm install
npm run dev                      # check + build + local migrations + wrangler dev on :8787
```

## Rules

1. **Free plans only.** Workers, D1, R2, Resend free tier. No paid plan, no new paid service, no new third-party service without asking the owner.
2. **Every data route checks the user.** A route that reads or writes the database calls `const user = await requireUser(req, env)` first, and returns or changes only what that user may see: their own rows (`WHERE user_id = ?`), or shared data cut down to what anyone logged in may know (e.g. which slots are taken, never by whom). Admin views check `isOwner(user, env)` and answer 403 otherwise; the owner is the account with `OWNER_EMAIL`, once that email is confirmed. `GET /api/me` tells the page who is logged in and whether they're the owner. The database is only used inside a route in `worker/routes.ts`, never in a helper. A route anyone may call goes in `public-routes.json`, and only when the owner asked for it. `npm run build` fails otherwise; fix the route, never the check.
3. **Migrations only add.** New file `migrations/NNNN_name.sql` with `CREATE TABLE`, `ALTER TABLE … ADD COLUMN` or `CREATE INDEX`. Never edit an applied migration, never `DROP` or rename a table or column, never delete rows in a migration.
4. **Secrets stay out of the repo.** Locally in `.dev.vars`; online as Worker secrets. A new secret gets a line in `.dev.vars.example`.
5. **Sign-in** is by a 6-digit code sent by email (the account is made on first use) or Google (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`); no passwords: hashing one costs more CPU than the free plan's 10 ms. Codes go through Resend when `RESEND_API_KEY` is set (free: 100 emails a day); without it they're printed in the Worker log, so locally the code is there.
6. **Trying the API on a running app** (the draft preview, or `npm run dev`): ask a code with `curl -H "Origin: <app address>" -H "content-type: application/json" -d '{"email":"a@example.test","type":"sign-in"}' <app address>/api/auth/email-otp/send-verification-otp`, read it in the log, then `curl -c jar … -d '{"email":"a@example.test","otp":"123456"}' <app address>/api/auth/sign-in/email-otp` and call routes with `curl -b jar …`. On a draft preview, an address ending in `@preview.test` needs no inbox: its code is the first 8 hex digits of SHA-256(`dozokit-preview:<address>`) as a number, modulo 1,000,000, on 6 digits. Keep `-H "Origin: <app address>"` on the `/api/auth/*` calls: Better Auth refuses them without it once they carry the cookie.
7. **Every screen is built from `src/ui`.** No inline `style=`, no colours or fonts outside `src/theme.css` (`npm run build` fails on `#abc`, `rgb(…)`, `hsl(…)` or `style=` anywhere else). A block that's missing is added to `src/ui` first (its layout in `src/ui/ui.css`, using the theme's variables), then used. "Change the look" means editing `src/theme.css` only.
8. **Stay inside the free plan** (a day: 100,000 requests, 10 ms of CPU each, D1 5 million rows read and 100,000 written; `npm run build` checks the first three points):
   - **An index for every filter and sort.** Each query's `WHERE` (or its `ORDER BY` when there's no `WHERE`) uses a column that leads an index, a primary key or `UNIQUE`; D1 counts every row it reads. Add `CREATE INDEX <table>_<column> ON <table>(<column>)` in a new migration.
   - **Lists are paged**: `LIMIT 100` at most, the next page with `?before=<last id>` (see `GET /api/items`).
   - **No native npm packages** (`sharp`, `puppeteer`, `playwright`, `canvas`, `bcrypt`, `argon2`, `better-sqlite3`…): they don't run on Workers.
   - **No heavy work in a request.** Anything long (many rows, several API calls, sending many emails) runs as a Workflow: each step gets its own 10 ms and is retried. Recipe, run locally with `npm run dev`:
     - `wrangler.jsonc`: `"workflows": [{ "name": "<worker name>-jobs", "binding": "JOBS", "class_name": "Jobs" }]`; `worker/env.ts`: `JOBS: Workflow<{ userId: string }>;`; `worker/index.ts`: `export { Jobs } from "./jobs";`
     - `worker/jobs.ts` (the one file besides routes that may use the database; a job only touches the rows of the user whose route started it): `export class Jobs extends WorkflowEntrypoint<Env, { userId: string }> { async run(event, step) { const n = await step.do("count", async () => …this.env.DB…); await step.do("save", async () => …); } }` with `import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";`
     - a route starts it: `const job = await env.JOBS.create({ params: { userId: user.id } });` and reads it: `(await env.JOBS.get(id)).status()`.
   - **AI calls**: Workers AI (`"ai": { "binding": "AI" }`, free: 10,000 Neurons a day for the whole account) or the owner's own provider key as a secret (`AI_API_KEY` in `.dev.vars.example`, never in the code). Every AI route caps each user per day: a table `ai_use (user_id, day, count)` with an index on `(user_id, day)`, read before the call, 429 "You've used today's AI allowance" past the cap.
9. **Prove changes by running the app** (`npm run dev`, then use it in a browser), not with unit tests.
