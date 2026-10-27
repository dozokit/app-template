import type { Env } from "./env";

// Cloudflare Turnstile ("are you human?"), on sign-in and on any public form: the page sends the
// widget's token in the x-turnstile-token header. Without TURNSTILE_SECRET_KEY it's off.
export async function humanCheck(req: Request, env: Env) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", req.headers.get("x-turnstile-token") ?? "");
  form.append("remoteip", req.headers.get("cf-connecting-ip") ?? "");
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  return ((await res.json()) as { success: boolean }).success;
}
