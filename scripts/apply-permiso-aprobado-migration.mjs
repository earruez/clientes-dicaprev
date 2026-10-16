import { spawnSync } from "node:child_process";

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);

const migrationEnv = {
  DATABASE_URL: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
};

run("npx", ["prisma", "migrate", "resolve", "--applied", "20261008025000_vehiculo_responsable_alertas"], migrationEnv);
run("npx", ["prisma", "migrate", "deploy"], migrationEnv);

console.log("PERMISO_MIGRATION_COMPLETED");
