import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }

  if (record.count >= MAX_ATTEMPTS) return true;

  record.count++;
  return false;
}

const AUTH_PATHS = ["/api/auth/callback/credentials", "/api/auth/signin"];

const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      if (req.nextUrl.pathname.startsWith("/login")) {
        return true;
      }
      return Boolean(token);
    },
  },
});

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." },
        { status: 429 }
      );
    }
  }

  return (authMiddleware as (req: NextRequest) => ReturnType<typeof NextResponse.next>)(req);
}

export const config = {
  matcher: ["/", "/login", "/dicaprev/:path*", "/api/auth/:path*"],
};
