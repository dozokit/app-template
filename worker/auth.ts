import { betterAuth } from "better-auth";
import { sendEmail } from "./email";
import type { Env } from "./env";

export const createAuth = (env: Env) =>
  betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      // Whoever signed up first with someone else's email is logged out when its owner resets the password.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        sendEmail(env, user.email, "Reset your password", `Open this link to choose a new password: ${url}`),
    },
    // A confirmed email is what makes the owner the owner (isOwner below).
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) =>
        sendEmail(env, user.email, "Confirm your email", `Open this link to confirm your email: ${url}`),
    },
  });

// Every route that touches the database calls this first (scripts/check-routes.mjs enforces it).
export async function requireUser(req: Request, env: Env) {
  const session = await createAuth(env).api.getSession({ headers: req.headers });
  if (!session) throw Response.json({ error: "Not logged in" }, { status: 401 });
  return session.user;
}

// The app's owner (admin views): the account with OWNER_EMAIL, once that email is confirmed, so
// nobody else can claim the address by signing up with it first.
export const isOwner = (user: { email: string; emailVerified: boolean }, env: Env) =>
  Boolean(env.OWNER_EMAIL && user.emailVerified && user.email.toLowerCase() === env.OWNER_EMAIL.trim().toLowerCase());
