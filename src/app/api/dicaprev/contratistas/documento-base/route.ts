import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { descargarArchivoContratista, subirArchivoContratista } from "@/lib/contratistas/archivos";

function fecha(d: FormDataEntryValue | null): Date | null {
  if (!d || typeof d !== "string") return null;
  const parsed = new Date(d + "T12:00:00.000Z");
  if (Number.isNaN(parsed.valueOf())) throw new Error("Fecha inválida");
  return parsed;
}

export async function POST(request: Request) {
  let empresaId: string;
  try {
    ({ empresaId } = await requirePermission("canManageDocumentacion"));
  } catch {
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const documentoId = form.get("documentoId");
    const file = form.get("file");
    if (typeof documentoId !== "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "Selecciona un documento y un archivo" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Máximo 4 MB por archivo" }, { status: 400 });
    const doc = await prisma.contratistaDocumento.findFirst({
      where: { id: documentoId, empresaId },
      select: { id: true, version: true },
    });
    if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    const emision = fecha(form.get("fechaEmision"));
    const vencimiento = fecha(form.get("fechaVencimiento"));
    if (emision && vencimiento && vencimiento < emision) throw new Error("El vencimiento no puede anteceder a la emisión");
    const data = await subirArchivoContratista(empresaId, file);
    await prisma.$transaction(async (tx) => {
      const changed = await tx.contratistaDocumento.updateMany({
        where: { id: doc.id, empresaId, version: doc.version },
        data: {
          archivoNombre: data.archivoNombre, archivoOriginal: data.archivoOriginal,
          archivoTipo: data.archivoTipo, archivoPeso: data.archivoPeso, archivoUrl: null,
          fechaEmision: emision, fechaVencimiento: vencimiento, estado: "en_revision",
          version: { increment: 1 }, revisadoAt: null, revisadoPorId: null,
        },
      });
      if (!changed.count) throw new Error("El documento cambió; vuelve a intentarlo");
      await tx.contratistaDocumentoBaseVersion.create({
        data: { documentoId: doc.id, version: doc.version + 1, ...data, fechaEmision: emision, fechaVencimiento: vencimiento },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el archivo" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  let empresaId: string;
  try {
    ({ empresaId } = await requirePermission("canReadDocumentacion"));
  } catch {
    return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
  }
  const u = new URL(request.url);
  const documentoId = u.searchParams.get("documentoId");
  const versionId = u.searchParams.get("versionId");
  if (!documentoId) return NextResponse.json({ error: "Documento requerido" }, { status: 400 });
  const doc = await prisma.contratistaDocumento.findFirst({
    where: { id: documentoId, empresaId }, select: { archivoNombre: true },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  let file = doc.archivoNombre;
  if (versionId) {
    const version = await prisma.contratistaDocumentoBaseVersion.findFirst({
      where: { id: versionId, documentoId, documento: { empresaId } }, select: { archivoNombre: true },
    });
    file = version?.archivoNombre || null;
  }
  if (!file) return NextResponse.json({ error: "No hay archivo disponible" }, { status: 404 });
  try {
    return await descargarArchivoContratista(empresaId, file);
  } catch {
    return NextResponse.json({ error: "No se pudo abrir el archivo" }, { status: 500 });
  }
}
