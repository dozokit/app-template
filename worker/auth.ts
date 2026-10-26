import { betterAuth } from "better-auth";
import { sendEmail } from "./email";
import type { Env } from "./env";

export const createAuth = (env: Env) =>
  betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      sendResetPassword: ({ user, url }) =>
        sendEmail(env, user.email, "Reset your password", `Open this link to choose a new password: ${url}`),
    },
  });

// Every route that touches the database calls this first (scripts/check-routes.mjs enforces it).
export async function requireUser(req: Request, env: Env) {
  const session = await createAuth(env).api.getSession({ headers: req.headers });
  if (!session) throw Response.json({ error: "Not logged in" }, { status: 401 });
  return session.user;
}
