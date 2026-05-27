import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

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

        const devPassword = process.env.AUTH_DEV_PASSWORD ?? (process.env.NODE_ENV === "development" ? "dev1234" : undefined);
        if (!devPassword) {
          throw new Error("AUTH_DEV_PASSWORD no esta definida");
        }

        if (password !== devPassword) {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          select: { id: true, nombre: true, email: true, activo: true },
        });

        if (!usuario || !usuario.activo) {
          return null;
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