import type { Env } from "./env";

// An error no route handled: kept in error_log (200 a day at most, so a loop can't eat the free
// writes), where Claude reads it through the builder's app_errors tool.
export async function logError(env: Env, route: string, e: unknown) {
  console.error(route, e);
  const message = String((e as Error)?.stack ?? e).slice(0, 2000);
  await env.DB.prepare(
    "INSERT INTO error_log (route, message) SELECT ?, ? WHERE (SELECT count(*) FROM error_log WHERE at >= date('now')) < 200",
  ).bind(route, message).run().catch(() => {});
}
