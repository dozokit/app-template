# Dozokit app template

A starting point for a real app on your own free Cloudflare account: React + Vite, a D1 database, and email + password logins with [Better Auth](https://www.better-auth.com). Each user only sees their own data.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dozokit/app-template)

The button copies this repo into your GitHub, creates the database and puts the app online. It asks for `BETTER_AUTH_SECRET` (any random string of 32+ characters, for example from `openssl rand -base64 32`) and `OWNER_EMAIL` (your email: that account becomes the app's owner once you confirm the email).

## Run it on your computer

```
cp .dev.vars.example .dev.vars   # set BETTER_AUTH_SECRET
npm install
npm run dev                      # http://localhost:8787
```

## Safety check

`npm run build` fails if an API route reads or writes the database without a logged-in user, unless the route is listed in `public-routes.json`. Rules for Claude and for you are in [CLAUDE.md](CLAUDE.md).

Part of [Dozokit](https://dozokit.com): free tools you host yourself.
