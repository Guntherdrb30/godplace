import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  if (res.error) throw res.error;
  if (typeof res.status === "number" && res.status !== 0) process.exit(res.status);
}

// Ensure the Prisma client exists (Vercel also runs `postinstall`, but this is harmless).
run("npm", ["run", "prisma:generate"]);

// Apply migrations only when a DB is configured.
// Note: `prisma migrate deploy` requires committed migration files in `prisma/migrations`.
const hasMigrations =
  existsSync("prisma/migrations") && readdirSync("prisma/migrations").length > 0;

if (process.env.DATABASE_URL && hasMigrations && !process.env.SKIP_MIGRATIONS) {
  run("npm", ["run", "prisma:deploy"]);
}

// Optional one-time seed (use with care): set RUN_SEED=1 in Vercel env vars temporarily.
if (process.env.RUN_SEED === "1") {
  run("npm", ["run", "db:seed"]);
}

run("npm", ["run", "build"]);
