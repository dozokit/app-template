# App template (Dozokit Apps)

A React + Vite app on Cloudflare Workers, with a D1 database and Better Auth logins. The owner's app runs on their own free Cloudflare account.

## Layout

- `src/`: the React app (served as static assets).
- `worker/index.ts`: sends `/api/auth/*` to Better Auth and every other `/api/*` call to `worker/routes.ts`.
- `worker/routes.ts`: every API route, keyed `"METHOD /path"`.
- `worker/auth.ts`: Better Auth setup and `requireUser()`.
- `migrations/`: D1 migrations, applied in order.
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
2. **Every data route checks the user.** A route that reads or writes the database calls `const user = await requireUser(req, env)` first and only touches rows of `user.id` (`WHERE user_id = ?`). The database is only used inside a route in `worker/routes.ts`, never in a helper. A route anyone may call goes in `public-routes.json`, and only when the owner asked for it. `npm run build` fails otherwise; fix the route, never the check.
3. **Migrations only add.** New file `migrations/NNNN_name.sql` with `CREATE TABLE`, `ALTER TABLE … ADD COLUMN` or `CREATE INDEX`. Never edit an applied migration, never `DROP` or rename a table or column, never delete rows in a migration.
4. **Secrets stay out of the repo.** Locally in `.dev.vars`; online as Worker secrets. A new secret gets a line in `.dev.vars.example`.
5. **Prove changes by running the app** (`npm run dev`, then use it in a browser), not with unit tests.
