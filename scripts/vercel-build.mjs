import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  if (res.error) throw res.error;
  if (typeof res.status === "number" && res.status !== 0) process.exit(res.status);
}

// Best-effort command runner: never fails the build (used for one-off mitigations).
function tryRun(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  // Ignore failures; downstream steps will still fail loudly if the issue persists.
  return res;
}

// Ensure the Prisma client exists (Vercel also runs `postinstall`, but this is harmless).
run("npm", ["run", "prisma:generate"]);

// Apply migrations only when a DB is configured.
// Note: `prisma migrate deploy` requires committed migration files in `prisma/migrations`.
const hasMigrations =
  existsSync("prisma/migrations") && readdirSync("prisma/migrations").length > 0;

if (process.env.DATABASE_URL && hasMigrations && !process.env.SKIP_MIGRATIONS) {
  // Vercel/Neon: if a migration previously failed (e.g. due to a UTF-8 BOM in SQL),
  // Prisma will block new deploys with P3009 until it's resolved. This attempts to
  // mark that specific failed migration as rolled back so it can be applied again.
  //
  // Safe to remove after the migration successfully applies in production.
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
  if (isVercel) {
    tryRun("npm", [
      "exec",
      "--",
      "prisma",
      "migrate",
      "resolve",
      "--rolled-back",
      "20260209000000_ally_contracts_and_property_onboarding",
    ]);
  }
  run("npm", ["run", "prisma:deploy"]);
}

// Optional one-time seed (use with care): set RUN_SEED=1 in Vercel env vars temporarily.
if (process.env.RUN_SEED === "1") {
  run("npm", ["run", "db:seed"]);
}

run("npm", ["run", "build"]);
