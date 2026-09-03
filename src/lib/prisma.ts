import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const sslmode = url.searchParams.get("sslmode");
    // pg-connection-string advierte que require/prefer/verify-ca cambiarán de semántica.
    // verify-full conserva explícitamente el comportamiento seguro que hoy aplica el driver.
    if (sslmode === "require" || sslmode === "prefer" || sslmode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient() {
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error("DATABASE_URL no está definida");
  }

  const adapter = new PrismaPg({
    connectionString: normalizeDatabaseUrl(rawConnectionString),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
