import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RateLimitConfig = {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

type RateLimitRow = {
  key: string;
  count: number;
  windowStart: Date;
  blockedUntil: Date | null;
};

export function authRateLimitKey(scope: string, identifier: string): string {
  return createHash("sha256")
    .update(`${scope}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

export async function consumeAuthRateLimit(key: string, config: RateLimitConfig): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<RateLimitRow[]>(Prisma.sql`
      SELECT "key", "count", "windowStart", "blockedUntil"
      FROM "AuthRateLimit"
      WHERE "key" = ${key}
      FOR UPDATE
    `);

    const current = rows[0];
    if (current?.blockedUntil && current.blockedUntil.getTime() > now.getTime()) {
      return {
        limited: true,
        retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil.getTime() - now.getTime()) / 1000)),
      };
    }

    const windowExpired = !current || now.getTime() - current.windowStart.getTime() >= config.windowMs;
    if (windowExpired) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "AuthRateLimit" ("key", "count", "windowStart", "blockedUntil", "updatedAt")
        VALUES (${key}, 1, ${now}, NULL, ${now})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = 1,
          "windowStart" = ${now},
          "blockedUntil" = NULL,
          "updatedAt" = ${now}
      `);
      return { limited: false, retryAfterSeconds: 0 };
    }

    const nextCount = current.count + 1;
    if (nextCount > config.maxAttempts) {
      const blockedUntil = new Date(now.getTime() + config.blockMs);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "AuthRateLimit"
        SET "count" = ${nextCount}, "blockedUntil" = ${blockedUntil}, "updatedAt" = ${now}
        WHERE "key" = ${key}
      `);
      return { limited: true, retryAfterSeconds: Math.ceil(config.blockMs / 1000) };
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE "AuthRateLimit"
      SET "count" = ${nextCount}, "updatedAt" = ${now}
      WHERE "key" = ${key}
    `);

    return { limited: false, retryAfterSeconds: 0 };
  });
}

export async function clearAuthRateLimit(key: string): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "AuthRateLimit" WHERE "key" = ${key}`);
}
