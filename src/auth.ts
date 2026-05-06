import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/dicaprev/login",
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

        const devPassword = process.env.AUTH_DEV_PASSWORD;
        if (!devPassword) {
          throw new Error("AUTH_DEV_PASSWORD no esta definida");
        }

        if (password !== devPassword) {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          select: { id: true, nombre: true, email: true },
        });

        if (!usuario) {
          return null;
        }

        const authUser = await prisma.user.upsert({
          where: { email },
          update: {
            name: usuario.nombre,
          },
          create: {
            email,
            name: usuario.nombre,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        return {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
        };
      },
    }),
  ],
};