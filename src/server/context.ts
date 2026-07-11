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
      // Validate that the stored empresaId actually exists in the DB
      const empresaExists = await prisma.empresa.findUnique({
        where: { id: input.empresaId },
        select: { id: true },
      });
      if (empresaExists) {
        return input.empresaId;
      }
      // If not found, fall through to find any empresa
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

  const asignaciones = await prisma.usuarioEmpresa.findMany({
    where: {
      usuarioId: input.usuarioId,
      activo: true,
      empresa: { activa: true },
    },
    orderBy: { createdAt: "asc" },
    select: { empresaId: true },
  });

  if (cookieEmpresaId) {
    const found = asignaciones.find((row) => row.empresaId === cookieEmpresaId);
    if (found) {
      return found.empresaId;
    }
  }

  if (input.empresaId) {
    const found = asignaciones.find((row) => row.empresaId === input.empresaId);
    if (found) {
      return found.empresaId;
    }

    // Fallback compatible con datos legacy: usuario con empresaId persistido
    // pero sin fila en usuarioEmpresa. Si la empresa existe y está activa,
    // se permite y se sanea creando la relación faltante.
    const empresaDirecta = await prisma.empresa.findFirst({
      where: {
        id: input.empresaId,
        activa: true,
      },
      select: { id: true },
    });

    if (empresaDirecta) {
      await prisma.usuarioEmpresa.upsert({
        where: {
          usuarioId_empresaId: {
            usuarioId: input.usuarioId,
            empresaId: empresaDirecta.id,
          },
        },
        update: {
          activo: true,
        },
        create: {
          usuarioId: input.usuarioId,
          empresaId: empresaDirecta.id,
          rol: input.rol,
          activo: true,
        },
      });

      return empresaDirecta.id;
    }
  }

  if (asignaciones.length > 0) {
    return asignaciones[0].empresaId;
  }

  const empresasActivas = await prisma.empresa.findMany({
    where: { activa: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
    take: 2,
  });

  const allowSingleEmpresaFallback = process.env.NODE_ENV !== "production";

  if (allowSingleEmpresaFallback && empresasActivas.length === 1) {
    await prisma.usuario.update({
      where: { id: input.usuarioId },
      data: { empresaId: empresasActivas[0].id },
    });

    await prisma.usuarioEmpresa.upsert({
      where: {
        usuarioId_empresaId: {
          usuarioId: input.usuarioId,
          empresaId: empresasActivas[0].id,
        },
      },
      update: { activo: true },
      create: {
        usuarioId: input.usuarioId,
        empresaId: empresasActivas[0].id,
        rol: input.rol,
        activo: true,
      },
    });

    return empresasActivas[0].id;
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
      activo: true,
      empresaId: true,
    },
  });

  if (!usuario) {
    throw new Error("El usuario autenticado no existe en NextPrev");
  }

  if (!usuario.activo) {
    throw new Error("El usuario autenticado esta inactivo");
  }

  const empresaId = await resolveEmpresaActivaId({
    usuarioId: usuario.id,
    rol: usuario.rol,
    empresaId: usuario.empresaId,
  });

  let rol = usuario.rol;
  if (usuario.rol !== "SUPERADMIN") {
    const asignacion = await prisma.usuarioEmpresa.findFirst({
      where: {
        usuarioId: usuario.id,
        empresaId,
        activo: true,
      },
      select: { rol: true },
    });
    if (asignacion) {
      rol = asignacion.rol;
    }
  }

  return {
    empresaId,
    usuarioId: usuario.id,
    rol,
    email: usuario.email,
  };
}