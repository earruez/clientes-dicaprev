import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EMPRESA_ACTIVA_COOKIE, getCurrentAppContext } from "@/server/context";

type EmpresaActivaPayload = {
  empresaId?: unknown;
};

export async function POST(request: Request) {
  try {
    const context = await getCurrentAppContext();
    const body = (await request.json()) as EmpresaActivaPayload;
    const empresaId = typeof body.empresaId === "string" ? body.empresaId.trim() : "";

    if (!empresaId) {
      return NextResponse.json({ error: "empresaId es requerido" }, { status: 400 });
    }

    if (context.rol !== "SUPERADMIN") {
      const asignacion = await prisma.usuarioEmpresa.findFirst({
        where: {
          usuarioId: context.usuarioId,
          empresaId,
          activo: true,
        },
        select: { id: true },
      });

      if (!asignacion) {
        return NextResponse.json({ error: "No autorizado para seleccionar esta empresa" }, { status: 403 });
      }
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true, nombre: true, activa: true },
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    if (!empresa.activa) {
      return NextResponse.json({ error: "Empresa inactiva" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true, empresaId: empresa.id, nombre: empresa.nombre });
    response.cookies.set(EMPRESA_ACTIVA_COOKIE, empresa.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No autenticado";
    const status = message === "No hay sesion activa" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(EMPRESA_ACTIVA_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
