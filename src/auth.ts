import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password-hash";

const NO_PASSWORD_CONFIGURED_ERROR = "NO_PASSWORD_CONFIGURED";

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
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          select: { id: true, nombre: true, email: true, activo: true, passwordHash: true },
        });

        if (!usuario) {
          console.log(`[auth] Usuario no encontrado: ${email}`);
          return null;
        }

        if (!usuario.activo) {
          console.log(`[auth] Usuario inactivo: ${email}`);
          return null;
        }

        if (usuario.passwordHash) {
          // Usuario con hash de contraseña real (e.g. SUPERADMIN creado por bootstrap)
          if (!verifyPassword(password, usuario.passwordHash)) {
            console.log(`[auth] Contraseña incorrecta (hash) para: ${email}`);
            return null;
          }
        } else {
          // En producción nunca permitimos fallback de clave compartida.
          if (process.env.NODE_ENV === "production") {
            console.log(`[auth] Usuario sin passwordHash bloqueado en producción: ${email}`);
            throw new Error(NO_PASSWORD_CONFIGURED_ERROR);
          }

          // Solo en desarrollo/local: fallback temporal para usuarios legacy sin hash.
          const devPassword = process.env.AUTH_DEV_PASSWORD;
          if (!devPassword) {
            console.log(`[auth] AUTH_DEV_PASSWORD no definida, usuario sin hash: ${email}`);
            throw new Error(NO_PASSWORD_CONFIGURED_ERROR);
          }

          if (password !== devPassword) {
            console.log(`[auth] Contraseña devPassword incorrecta para: ${email}`);
            return null;
          }
        }

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
        };
      },
    }),
  ],
};