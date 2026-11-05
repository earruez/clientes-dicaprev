import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { descargarArchivoContratista, subirArchivoContratista } from "@/lib/contratistas/archivos";
import { resolverPortalContratista } from "@/lib/contratistas/portal";
import { vencimientoMaximoPorMeses, vigenciaMesesRequisito } from "@/lib/contratistas/requisitos";
import { validarArchivoPortal, validarFechasPortal } from "@/lib/contratistas/validacion-carga";

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
    const errorArchivo = validarArchivoPortal(archivo);
    if (errorArchivo) return NextResponse.json({ error: errorArchivo }, { status: 400 });
    const requisito = await prisma.contratistaRequisito.findFirst({
      where: { id: requisitoId, solicitudId: s.id, empresaId: s.empresaId },
      select: { id: true, version: true, vigenciaMeses: true, nombre: true, categoria: true },
    });
    if (!requisito) return NextResponse.json({ error: "Requisito no encontrado" }, { status: 404 });
    const vigenciaMeses = vigenciaMesesRequisito(requisito);
    const fechaEmision = typeof data.get("fechaEmision") === "string" ? String(data.get("fechaEmision")) : "";
    const fechaVencimiento = typeof data.get("fechaVencimiento") === "string" ? String(data.get("fechaVencimiento")) : "";
    const errorFechas = validarFechasPortal({ emision: fechaEmision, vencimiento: fechaVencimiento, vigenciaMeses });
    if (errorFechas) return NextResponse.json({ error: errorFechas }, { status: 400 });
    const emision = fecha(fechaEmision);
    let vencimiento = fecha(fechaVencimiento);
    const maximo = vencimientoMaximoPorMeses(emision, vigenciaMeses);
    if (maximo && (!vencimiento || vencimiento > maximo)) vencimiento = maximo;
    if (emision && vencimiento && emision > vencimiento) {
      return NextResponse.json({ error: "La fecha de vencimiento debe ser posterior a la emisión" }, { status: 400 });
    }
    const file = await subirArchivoContratista(s.empresaId, archivo);
    await prisma.$transaction(async (tx) => {
      const nuevo = await tx.contratistaRequisito.updateMany({
        where: { id: requisito.id, version: requisito.version },
        data: {
          ...file, documentoBaseId: null, version: { increment: 1 }, estado: "en_revision",
          observacionRevision: null, revisadoAt: null, revisadoPorId: null,
          fechaEmision: emision, fechaVencimiento: vencimiento,
          aviso30At: null, aviso15At: null, aviso5At: null,
        },
      });
      if (nuevo.count !== 1) throw new Error("El documento cambió mientras lo guardabas; recarga la carpeta");
      await tx.contratistaDocumentoVersion.create({
        data: { requisitoId: requisito.id, version: requisito.version + 1, ...file, fechaEmision: emision, fechaVencimiento: vencimiento },
      });
      await tx.contratistaSolicitud.update({ where: { id: s.id }, data: { estado: "en_revision" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // No registrar aquí el token público, el archivo, el RUT ni el cuerpo del formulario.
    const message = error instanceof Error ? error.message : "No se pudo guardar el documento";
    const falloAlmacenamiento = /almacenamiento privado|guardar el archivo/.test(message);
    console.error("[Contratistas] Error en carga documental", {
      clase: falloAlmacenamiento ? "almacenamiento" : "validacion_o_base",
      tipo: error instanceof Error ? error.name : "desconocido",
    });
    return NextResponse.json({ error: message }, { status: falloAlmacenamiento ? 503 : 400 });
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
