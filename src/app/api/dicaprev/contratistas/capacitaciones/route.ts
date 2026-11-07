import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { descargarArchivoContratista } from "@/lib/contratistas/archivos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let empresaId: string;
  try { empresaId = (await requirePermission("canReadDocumentacion")).empresaId; }
  catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); }
  const actividadId = new URL(request.url).searchParams.get("actividadId");
  if (!actividadId) return NextResponse.json({ error: "Actividad requerida" }, { status: 400 });
  const actividad = await prisma.contratistaActividadFormativa.findFirst({
    where: { id: actividadId, empresaId }, select: { archivoNombre: true },
  });
  if (!actividad) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  try { return await descargarArchivoContratista(empresaId, actividad.archivoNombre); }
  catch { return NextResponse.json({ error: "No se pudo abrir la evidencia" }, { status: 500 }); }
}
