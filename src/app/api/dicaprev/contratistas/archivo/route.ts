import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { descargarArchivoContratista } from "@/lib/contratistas/archivos";

export async function GET(request: Request) {
  let empresaId: string;
  try {
    const context = await requirePermission("canReadDocumentacion");
    empresaId = context.empresaId;
  } catch {
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
  }
  const url = new URL(request.url);
  const requisitoId = url.searchParams.get("requisitoId");
  const versionId = url.searchParams.get("versionId");
  if (!requisitoId) return NextResponse.json({ error: "Requisito requerido" }, { status: 400 });
  const requisito = await prisma.contratistaRequisito.findFirst({
    where: { id: requisitoId, empresaId },
    select: { archivoNombre: true },
  });
  if (!requisito) return NextResponse.json({ error: "Requisito no encontrado" }, { status: 404 });
  let archivoNombre = requisito.archivoNombre;
  if (versionId) {
    const version = await prisma.contratistaDocumentoVersion.findFirst({
      where: { id: versionId, requisitoId, requisito: { empresaId } },
      select: { archivoNombre: true },
    });
    archivoNombre = version?.archivoNombre || null;
  }
  if (!archivoNombre) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  try {
    return await descargarArchivoContratista(empresaId, archivoNombre);
  } catch {
    return NextResponse.json({ error: "No se pudo abrir el documento" }, { status: 500 });
  }
}
