import { createAuth } from "./auth";
import type { Env } from "./env";
import { routes } from "./routes";

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith("/api/auth/")) return createAuth(env).handler(req);
    const handler = routes[`${req.method} ${pathname}`];
    if (!handler) return Response.json({ error: "Not found" }, { status: 404 });
    try {
      return await handler(req, env);
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }
  },
} satisfies ExportedHandler<Env>;
