import { sendEmail } from "./email";
import type { Env } from "./env";

// The app's one cron (Cloudflare's free plan allows 5 per account), every hour once it's turned on
// in the Dozokit Apps builder: tells the owner by email about new errors and about emails passing 80
// of Resend's 100 a day; on Sundays at 03:00 UTC, copies the database to R2 and keeps 4 copies
// (without sessions and sign-in codes: they're short-lived and secret).
// Recent changes can also be undone with D1 Time Travel (7 days), from the builder.

const BIG = 200_000; // rows: a bigger database isn't copied (each copy reads every row)

export async function scheduled(event: ScheduledController, env: Env) {
  const now = new Date(event.scheduledTime);
  const notes: string[] = [];
  const state = async (key: string) => (await env.DB.prepare("SELECT value FROM alert_state WHERE key = ?").bind(key).first<{ value: string }>())?.value;
  const remember = (key: string, value: string) => env.DB.prepare("INSERT INTO alert_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(key, value).run();

  const { results: errors } = await env.DB.prepare("SELECT id, at, route, message FROM error_log WHERE id > ? ORDER BY id LIMIT 20")
    .bind(Number(await state("last_error")) || 0).all<{ id: number; at: string; route: string; message: string }>();
  if (errors.length) {
    notes.push(`${errors.length} new error(s):\n${errors.map((e) => `- ${e.at} ${e.route}: ${e.message.split("\n")[0]}`).join("\n")}`);
    await remember("last_error", String(errors[errors.length - 1].id));
  }
  const day = now.toISOString().slice(0, 10);
  const emails = (await env.DB.prepare("SELECT n FROM email_count WHERE day = ?").bind(day).first<{ n: number }>())?.n ?? 0;
  if (emails >= 80 && (await state("emails_alert")) !== day) {
    notes.push(`${emails} emails sent today: Resend's free plan stops at 100 a day (sign-in codes included).`);
    await remember("emails_alert", day);
  }

  if (env.BACKUPS && now.getUTCDay() === 0 && now.getUTCHours() === 3) {
    const { results: tables } = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT IN ('session', 'verification') LIMIT 500").all<{ name: string }>();
    const counts = await Promise.all(tables.map(async (t) => (await env.DB.prepare(`SELECT count(*) AS n FROM "${t.name}"`).first<{ n: number }>())!.n));
    const rows = counts.reduce((a, b) => a + b, 0);
    if (rows > BIG) {
      notes.push(`This week's backup was skipped: ${rows.toLocaleString()} rows is too many to copy on the free plan (each copy reads every row). D1 Time Travel still lets you undo the last 7 days.`);
    } else {
      const copy = Object.fromEntries(await Promise.all(tables.map(async (t) => [t.name, (await env.DB.prepare(`SELECT * FROM "${t.name}" LIMIT ${BIG}`).all()).results])));
      await env.BACKUPS.put(`backups/${day}.json`, JSON.stringify(copy));
      const { objects } = await env.BACKUPS.list({ prefix: "backups/" });
      const old = objects.map((o) => o.key).sort().reverse().slice(4);
      if (old.length) await env.BACKUPS.delete(old);
    }
  }

  if (notes.length && env.OWNER_EMAIL) await sendEmail(env, env.OWNER_EMAIL, "Your app needs a look", notes.join("\n\n"));
}
