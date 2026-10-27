import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { createHash } from "node:crypto";
import previewOwner from "../preview-owner.json";
import { sendEmail } from "./email";
import type { Env } from "./env";

// baseURL: the address the request came to, so links in emails point back to this app. One
// instance per address, kept while the Worker stays warm: building it costs more CPU than the
// request itself.
const instances = new Map<string, ReturnType<typeof build>>();
export const createAuth = (env: Env, req: Request) => {
  const origin = new URL(req.url).origin;
  if (!instances.has(origin)) instances.set(origin, build(env, origin));
  return instances.get(origin)!;
};

const build = (env: Env, origin: string) =>
  betterAuth({
    baseURL: origin,
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    // No passwords: hashing one costs more CPU than the free plan's 10 ms a request. People sign in
    // with a code sent by email (the account is made on first use, its email confirmed), or Google.
    session: { expiresIn: 30 * DAY, updateAge: DAY },
    socialProviders: env.GOOGLE_CLIENT_ID ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET ?? "" } } : {},
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        generateOTP: ({ email }) => (env.PREVIEW === "1" && email.endsWith("@preview.test") ? previewCode(email) : undefined),
        sendVerificationOTP: ({ email, otp }) => sendEmail(env, email, "Your sign-in code", `Your code: ${otp}\nIt works for 5 minutes.`),
      }),
    ],
  });

const DAY = 24 * 3600;

// On a draft preview only (PREVIEW is never set live), users the Dozokit Apps builder makes
// (…@preview.test) sign in with a code derived from their address, so it can show logged-in pages
// without an inbox. Real addresses get a random code by email, as live.
const previewCode = (email: string) => String(parseInt(createHash("sha256").update(`dozokit-preview:${email}`).digest("hex").slice(0, 8), 16) % 1e6).padStart(6, "0");

// Every route that touches the database calls this first (scripts/check-routes.mjs enforces it).
export async function requireUser(req: Request, env: Env) {
  const session = await createAuth(env, req).api.getSession({ headers: req.headers });
  if (!session) throw Response.json({ error: "Not logged in" }, { status: 401 });
  return session.user;
}

// The app's owner (admin views): the account with OWNER_EMAIL. Signing in by code (or Google) proves
// the address, so nobody else can claim it.
// On a draft preview only (PREVIEW is never set live), the Dozokit Apps builder's throwaway owner
// counts too: its email is random, and only its hash is in preview-owner.json.
const isPreviewOwner = (email: string, env: Env) =>
  Boolean(env.PREVIEW === "1" && previewOwner.sha256 && createHash("sha256").update(email).digest("hex") === previewOwner.sha256);

export const isOwner = (user: { email: string; emailVerified: boolean }, env: Env) =>
  Boolean(env.OWNER_EMAIL && user.emailVerified && user.email.toLowerCase() === env.OWNER_EMAIL.trim().toLowerCase()) || isPreviewOwner(user.email, env);
