import { betterAuth } from "better-auth";
import { createHash } from "node:crypto";
import previewOwner from "../preview-owner.json";
import { sendEmail } from "./email";
import type { Env } from "./env";

// baseURL: the address the request came to, so links in emails point back to this app.
export const createAuth = (env: Env, req: Request) =>
  betterAuth({
    baseURL: new URL(req.url).origin,
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      // Whoever signed up first with someone else's email is logged out when its owner resets the password.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        sendEmail(env, user.email, "Reset your password", `Open this link to choose a new password: ${url}`),
    },
    // The builder's preview owner (below) starts confirmed: no "check your email" in owner previews.
    databaseHooks: {
      user: { create: { before: async (user) => ({ data: { ...user, emailVerified: user.emailVerified || isPreviewOwner(user.email, env) } }) } },
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
  const session = await createAuth(env, req).api.getSession({ headers: req.headers });
  if (!session) throw Response.json({ error: "Not logged in" }, { status: 401 });
  return session.user;
}

// The app's owner (admin views): the account with OWNER_EMAIL, once that email is confirmed, so
// nobody else can claim the address by signing up with it first.
// On a draft preview only (PREVIEW is never set live), the Dozokit Apps builder's throwaway owner
// counts too: its email is random, and only its hash is in preview-owner.json.
const isPreviewOwner = (email: string, env: Env) =>
  Boolean(env.PREVIEW === "1" && previewOwner.sha256 && createHash("sha256").update(email).digest("hex") === previewOwner.sha256);

export const isOwner = (user: { email: string; emailVerified: boolean }, env: Env) =>
  Boolean(env.OWNER_EMAIL && user.emailVerified && user.email.toLowerCase() === env.OWNER_EMAIL.trim().toLowerCase()) || isPreviewOwner(user.email, env);
