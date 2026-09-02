import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password-hash";
import { authRateLimitKey, clearAuthRateLimit, consumeAuthRateLimit } from "@/server/auth/rate-limit";

const NO_PASSWORD_CONFIGURED_ERROR = "NO_PASSWORD_CONFIGURED";
const LOGIN_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        const rateKey = authRateLimitKey("login", email);
        const rate = await consumeAuthRateLimit(rateKey, LOGIN_RATE_LIMIT);
        if (rate.limited) {
          console.warn(`[auth] Intentos limitados temporalmente para identificador ${rateKey.slice(0, 10)}`);
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          select: { id: true, nombre: true, email: true, activo: true, passwordHash: true },
        });

        if (!usuario || !usuario.activo) return null;

        if (usuario.passwordHash) {
          if (!verifyPassword(password, usuario.passwordHash)) return null;
        } else {
          if (process.env.NODE_ENV === "production") {
            throw new Error(NO_PASSWORD_CONFIGURED_ERROR);
          }

          const devPassword = process.env.AUTH_DEV_PASSWORD;
          if (!devPassword) throw new Error(NO_PASSWORD_CONFIGURED_ERROR);
          if (password !== devPassword) return null;
        }

        await clearAuthRateLimit(rateKey).catch(() => undefined);

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
        };
      },
    }),
  ],
};
