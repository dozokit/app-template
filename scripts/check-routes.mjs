// Safety check: fails the build if an API route touches the database without a logged-in user.
// Rules:
//   1. The database (env.DB) is only used inside a route of worker/routes.ts (or by Better Auth in worker/auth.ts).
//   2. A route that uses it calls requireUser() before, unless the route is listed in public-routes.json.
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";

const ALLOWED_FILES = ["worker/auth.ts", "worker/env.ts"];
const ROUTE_KEY = /^(GET|POST|PUT|PATCH|DELETE) \//;
const publicRoutes = new Set(JSON.parse(readFileSync("public-routes.json", "utf8")));

const errors = [];
const routesSeen = new Set();

for (const file of readdirSync("worker", { recursive: true }).filter((f) => f.endsWith(".ts")).map((f) => `worker/${f}`)) {
  if (ALLOWED_FILES.includes(file)) continue;
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const where = (node) => `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && ROUTE_KEY.test(node.name.text)) {
      routesSeen.add(node.name.text);
    }
    const usesDb =
      (ts.isIdentifier(node) && node.text === "DB") ||
      (ts.isStringLiteral(node) && node.text === "DB" && ts.isElementAccessExpression(node.parent));
    if (usesDb) {
      let route = node.parent;
      while (route && !(ts.isPropertyAssignment(route) && ts.isStringLiteral(route.name) && ROUTE_KEY.test(route.name.text))) {
        route = route.parent;
      }
      if (!route) {
        errors.push(`${where(node)}: the database is used outside an API route. Move this into a route in worker/routes.ts.`);
      } else if (!publicRoutes.has(route.name.text)) {
        const callsRequireUserFirst = route.initializer.getText().slice(0, node.getStart() - route.initializer.getStart()).includes("requireUser(");
        if (!callsRequireUserFirst) {
          errors.push(`${where(node)}: "${route.name.text}" touches the database without a logged-in user. Call requireUser(req, env) first, or add the route to public-routes.json if anyone may call it.`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (errors.length) {
  console.error(`Safety check failed:\n${[...new Set(errors)].map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`Safety check passed: ${routesSeen.size} API routes, ${publicRoutes.size} public.`);
