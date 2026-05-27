import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppContext } from "@/server/context";
import { COMPANY_MODULES, type CompanyModuleKey } from "@/lib/company-modules";

export async function GET() {
  try {
    const context = await getCurrentAppContext();
    const empresas =
      context.rol === "SUPERADMIN"
        ? await prisma.empresa.findMany({
            where: { activa: true },
            orderBy: { nombre: "asc" },
            select: { id: true, nombre: true },
          })
        : await prisma.usuarioEmpresa
            .findMany({
              where: {
                usuarioId: context.usuarioId,
                activo: true,
                empresa: { activa: true },
              },
              orderBy: { empresa: { nombre: "asc" } },
              select: {
                empresaId: true,
                empresa: { select: { nombre: true } },
              },
              distinct: ["empresaId"],
            })
            .then((rows) => rows.map((row) => ({ id: row.empresaId, nombre: row.empresa.nombre })));

    const modulosRows = await prisma.empresaModulo.findMany({
      where: { empresaId: context.empresaId },
      select: { modulo: true, activo: true },
    });

    const modulos: Partial<Record<CompanyModuleKey, boolean>> = {};
    COMPANY_MODULES.forEach((module) => {
      modulos[module] = true;
    });
    modulosRows.forEach((row) => {
      if (COMPANY_MODULES.includes(row.modulo as CompanyModuleKey)) {
        modulos[row.modulo as CompanyModuleKey] = row.activo;
      }
    });

    return NextResponse.json({
      role: context.rol,
      email: context.email,
      empresaId: context.empresaId,
      empresas,
      modulos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No autenticado";
    const status = message === "No hay sesion activa" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}