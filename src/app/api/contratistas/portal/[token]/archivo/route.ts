import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { descargarArchivoContratista, subirArchivoContratista } from "@/lib/contratistas/archivos";
import { resolverPortalContratista } from "@/lib/contratistas/portal";

type Context = { params: Promise<{ token: string }> };

function fecha(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value + "T12:00:00.000Z");
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  const s = await resolverPortalContratista(token);
  if (!s) return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 403 });
  try {
    const data = await request.formData();
    const requisitoId = data.get("requisitoId");
    const archivo = data.get("file");
    if (typeof requisitoId !== "string" || !(archivo instanceof File)) {
      return NextResponse.json({ error: "Selecciona un documento y su archivo" }, { status: 400 });
    }
    if (archivo.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no debe superar 4 MB" }, { status: 400 });
    }
    const requisito = await prisma.contratistaRequisito.findFirst({
      where: { id: requisitoId, solicitudId: s.id, empresaId: s.empresaId },
      select: { id: true, version: true },
    });
    if (!requisito) return NextResponse.json({ error: "Requisito no encontrado" }, { status: 404 });
    const emision = fecha(data.get("fechaEmision"));
    const vencimiento = fecha(data.get("fechaVencimiento"));
    if (emision && vencimiento && emision > vencimiento) {
      return NextResponse.json({ error: "La fecha de vencimiento debe ser posterior a la emisión" }, { status: 400 });
    }
    const file = await subirArchivoContratista(s.empresaId, archivo);
    await prisma.$transaction(async (tx) => {
      const nuevo = await tx.contratistaRequisito.updateMany({
        where: { id: requisito.id, version: requisito.version },
        data: {
          ...file, version: { increment: 1 }, estado: "pendiente",
          observacionRevision: null, revisadoAt: null, revisadoPorId: null,
          fechaEmision: emision, fechaVencimiento: vencimiento,
          aviso30At: null, aviso15At: null, aviso5At: null,
        },
      });
      if (nuevo.count !== 1) throw new Error("El documento cambió mientras lo guardabas; recarga la carpeta");
      await tx.contratistaDocumentoVersion.create({
        data: { requisitoId: requisito.id, version: requisito.version + 1, ...file, fechaEmision: emision, fechaVencimiento: vencimiento },
      });
      await tx.contratistaSolicitud.update({ where: { id: s.id }, data: { estado: "enviada" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el documento" }, { status: 400 });
  }
}

export async function GET(request: Request, { params }: Context) {
  const { token } = await params;
  const s = await resolverPortalContratista(token);
  if (!s) return NextResponse.json({ error: "Enlace inválido" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("requisitoId");
  const req = s.requisitos.find((r) => r.id === id);
  if (!req?.archivoNombre) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  try {
    return await descargarArchivoContratista(s.empresaId, req.archivoNombre);
  } catch {
    return NextResponse.json({ error: "No se pudo abrir el documento" }, { status: 500 });
  }
}
