import { isOwner, requireUser } from "./auth";
import type { Env } from "./env";

type Handler = (req: Request, env: Env) => Promise<Response>;

// Every API route is a key here: "METHOD /path". Public ones are listed in public-routes.json.
export const routes: Record<string, Handler> = {
  // The Dozokit Apps builder checks that a custom domain reaches this app (no database).
  "GET /api/dozokit-check": async (req) => new Response(null, { headers: { "x-dozokit-app": new URL(req.url).searchParams.get("n") ?? "" } }),

  // What the login screen offers (no database: anyone may ask).
  "GET /api/login-options": async (_req, env) => Response.json({ google: Boolean(env.GOOGLE_CLIENT_ID), turnstile: env.TURNSTILE_SITE_KEY ?? null }),

  "GET /api/me": async (req, env) => {
    const user = await requireUser(req, env);
    return Response.json({ email: user.email, owner: isOwner(user, env) });
  },

  // Account page: everything this user has here, as JSON (add each new table that has a user_id).
  "GET /api/account/export": async (req, env) => {
    const user = await requireUser(req, env);
    const { results: items } = await env.DB.prepare("SELECT id, text, created_at FROM item WHERE user_id = ? LIMIT 10000").bind(user.id).all();
    return Response.json({ user: { email: user.email, name: user.name, created: user.createdAt }, items }, { headers: { "content-disposition": 'attachment; filename="my-data.json"' } });
  },

  // Deletes the account and, through ON DELETE CASCADE, every row that has its user_id.
  "POST /api/account/delete": async (req, env) => {
    const user = await requireUser(req, env);
    const { email } = await req.json<{ email?: string }>();
    if (email?.trim().toLowerCase() !== user.email.toLowerCase()) return Response.json({ error: "Type your email exactly to delete your account." }, { status: 400 });
    await env.DB.prepare("DELETE FROM user WHERE id = ?").bind(user.id).run();
    return Response.json({ ok: true });
  },

  // 50 at a time, newest first; ?before=<id> for the next page.
  "GET /api/items": async (req, env) => {
    const user = await requireUser(req, env);
    const before = Number(new URL(req.url).searchParams.get("before")) || Number.MAX_SAFE_INTEGER;
    const { results } = await env.DB.prepare(
      "SELECT id, text, created_at FROM item WHERE user_id = ? AND id < ? ORDER BY id DESC LIMIT 50",
    ).bind(user.id, before).all();
    return Response.json(results);
  },

  "POST /api/items": async (req, env) => {
    const user = await requireUser(req, env);
    const { text } = await req.json<{ text?: string }>();
    if (!text?.trim()) return Response.json({ error: "Text is required" }, { status: 400 });
    const item = await env.DB.prepare(
      "INSERT INTO item (user_id, text) VALUES (?, ?) RETURNING id, text, created_at",
    ).bind(user.id, text.trim()).first();
    return Response.json(item, { status: 201 });
  },
};
