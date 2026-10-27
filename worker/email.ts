import type { Env } from "./env";

// Without RESEND_API_KEY (local dev), the email is printed in the Worker log instead of sent.
// Each one is counted for the day (one row a day), against Resend's free 100 a day.
export async function sendEmail(env: Env, to: string, subject: string, text: string) {
  await env.DB.prepare("INSERT INTO email_count (day, n) VALUES (date('now'), 1) ON CONFLICT (day) DO UPDATE SET n = n + 1").run();
  if (!env.RESEND_API_KEY) {
    console.log(`[email stub] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
}
