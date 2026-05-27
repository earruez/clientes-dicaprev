import type { Rol } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AppRole = Rol;

export type AppContext = {
  empresaId: string;
  usuarioId: string;
  rol: AppRole;
  email: string;
};

export const EMPRESA_ACTIVA_COOKIE = "dicaprev_empresa_activa";

async function getEmpresaActivaCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(EMPRESA_ACTIVA_COOKIE)?.value?.trim();
    return value ? value : null;
  } catch {
    return null;
  }
}

async function resolveEmpresaActivaId(input: {
  usuarioId: string;
  rol: Rol;
  empresaId: string | null;
}): Promise<string> {
  const cookieEmpresaId = await getEmpresaActivaCookie();

  if (input.rol === "SUPERADMIN") {
    if (cookieEmpresaId) {
      const empresaCookie = await prisma.empresa.findUnique({
        where: { id: cookieEmpresaId },
        select: { id: true },
      });
      if (empresaCookie) {
        return empresaCookie.id;
      }
    }

    if (input.empresaId) {
      return input.empresaId;
    }

    const primeraEmpresa = await prisma.empresa.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!primeraEmpresa) {
      throw new Error("No hay empresas registradas en el sistema");
    }

    return primeraEmpresa.id;
  }

  if (input.empresaId) {
    return input.empresaId;
  }

  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
    take: 2,
  });

  const allowSingleEmpresaFallback = process.env.NODE_ENV !== "production";

  if (allowSingleEmpresaFallback && empresas.length === 1) {
    await prisma.usuario.update({
      where: { id: input.usuarioId },
      data: { empresaId: empresas[0].id },
    });

    return empresas[0].id;
  }

  throw new Error("El usuario autenticado no tiene empresa asignada");
}

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

  const empresaId = await resolveEmpresaActivaId({
    usuarioId: usuario.id,
    rol: usuario.rol,
    empresaId: usuario.empresaId,
  });

  return {
    empresaId,
    usuarioId: usuario.id,
    rol: usuario.rol,
    email: usuario.email,
  };
}