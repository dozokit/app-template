import { createAuth } from "./auth";
import type { Env } from "./env";
import publicRoutes from "../public-routes.json";
import { routes } from "./routes";
import { humanCheck } from "./turnstile";

const tooMany = () => Response.json({ error: "Too many tries. Wait a minute, then try again." }, { status: 429 });

export default {
  async fetch(req, env) {
    const { pathname, host } = new URL(req.url);
    // Counted per visitor and per app (two apps on one account never share a counter).
    const key = `${host}:${req.headers.get("cf-connecting-ip") ?? "local"}`;
    if (pathname.startsWith("/api/auth/")) {
      if (req.method === "POST" && env.AUTH_LIMIT && !(await env.AUTH_LIMIT.limit({ key })).success) return tooMany();
      if (pathname === "/api/auth/email-otp/send-verification-otp" && !(await humanCheck(req, env))) {
        return Response.json({ error: "Confirm you're not a robot, then try again." }, { status: 403 });
      }
      return createAuth(env, req).handler(req);
    }
    if ((publicRoutes as string[]).includes(`${req.method} ${pathname}`) && env.PUBLIC_LIMIT && !(await env.PUBLIC_LIMIT.limit({ key })).success) return tooMany();
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
