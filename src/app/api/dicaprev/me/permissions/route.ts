import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppContext } from "@/server/context";

export async function GET() {
  try {
    const context = await getCurrentAppContext();
    const empresas =
      context.rol === "SUPERADMIN"
        ? await prisma.empresa.findMany({
            orderBy: { nombre: "asc" },
            select: { id: true, nombre: true },
          })
        : await prisma.empresa.findMany({
            where: { id: context.empresaId },
            select: { id: true, nombre: true },
          });

    return NextResponse.json({
      role: context.rol,
      email: context.email,
      empresaId: context.empresaId,
      empresas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No autenticado";
    const status = message === "No hay sesion activa" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}