import type { Rol } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AppRole = Rol;

export type AppContext = {
  empresaId: string;
  usuarioId: string;
  rol: AppRole;
  email: string;
};

export async function getCurrentAppContext(): Promise<AppContext> {
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (!sessionEmail) {
    throw new Error("No hay sesion activa");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: sessionEmail },
    select: {
      id: true,
      email: true,
      rol: true,
      empresaId: true,
    },
  });

  if (!usuario) {
    throw new Error("El usuario autenticado no existe en NextPrev");
  }

  if (!usuario.empresaId) {
    throw new Error("El usuario autenticado no tiene empresa asignada");
  }

  return {
    empresaId: usuario.empresaId,
    usuarioId: usuario.id,
    rol: usuario.rol,
    email: usuario.email,
  };
}