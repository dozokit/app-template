import { isOwner, requireUser } from "./auth";
import type { Env } from "./env";

type Handler = (req: Request, env: Env) => Promise<Response>;

// Every API route is a key here: "METHOD /path". Public ones are listed in public-routes.json.
export const routes: Record<string, Handler> = {
  // What the login screen offers (no database: anyone may ask).
  "GET /api/login-options": async (_req, env) => Response.json({ google: Boolean(env.GOOGLE_CLIENT_ID) }),

  "GET /api/me": async (req, env) => {
    const user = await requireUser(req, env);
    return Response.json({ email: user.email, owner: isOwner(user, env) });
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
