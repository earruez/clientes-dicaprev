import { spawnSync } from "node:child_process";

function run(binary, args) {
  const result = spawnSync(binary, args, { stdio: "inherit", env: process.env });
  if (result.error) {
    console.error("[NextPrev build] No se pudo ejecutar", binary, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

const isVercelProduction = process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";

if (isVercelProduction) {
  if (!process.env.DATABASE_URL) {
    console.error("[NextPrev build] DATABASE_URL no está configurada en producción. Se cancela la publicación.");
    process.exit(1);
  }
  console.log("[NextPrev build] Ejecutando Prisma migrate deploy en base de producción.");
  run("npx", ["prisma", "migrate", "deploy"]);
  console.log("[NextPrev build] Migraciones aplicadas antes de publicar.");
}

run("npx", ["next", "build"]);
