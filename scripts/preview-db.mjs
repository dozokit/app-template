// Draft previews get their own database. In Cloudflare's build of any branch but main, this creates
// that database the first time, writes its id into wrangler.jsonc for this build only (Previews need
// an id; the live database doesn't), and applies the migrations to it. Elsewhere it does nothing.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const branch = process.env.WORKERS_CI_BRANCH;
if (!branch || branch === "main") process.exit(0);

const run = (cmd) => execSync(`npx wrangler ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const config = readFileSync("wrangler.jsonc", "utf8");
// Named after the Worker, so two apps on one account never share it.
const placeholder = config.match(/"previews"[\s\S]*?"database_name":\s*"([^"]+)"/)[1];
const name = `${config.match(/"name":\s*"([^"]+)"/)[1]}-preview-db`;
const find = () => JSON.parse(run("d1 list --json")).find((d) => d.name === name);

let db = find();
if (!db) {
  run(`d1 create ${name} --config /dev/null`);
  db = find();
}
writeFileSync("wrangler.jsonc", config.replace(`"database_name": "${placeholder}"`, `"database_name": "${name}", "database_id": "${db.uuid}"`));
writeFileSync(
  ".preview-migrations.json",
  JSON.stringify({ name: "preview-migrations", d1_databases: [{ binding: "DB", database_name: name, database_id: db.uuid, migrations_dir: "migrations" }] }),
);
console.log(run("d1 migrations apply DB --remote --config .preview-migrations.json"));
// Sample rows (seed.sql), so previews aren't empty; drafts only.
console.log(run("d1 execute DB --remote --config .preview-migrations.json --file seed.sql"));
