import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolverPortalContratista } from "@/lib/contratistas/portal";
import { subirArchivoContratista, descargarArchivoContratista } from "@/lib/contratistas/archivos";
import { validarArchivoPortal } from "@/lib/contratistas/validacion-carga";
import { validarActividadFormativa, type ActividadFormativaEntrada } from "@/lib/contratistas/capacitaciones-ds44";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { token } = await params;
  const solicitud = await resolverPortalContratista(token);
  if (!solicitud) return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 403 });
  try {
    const form = await request.formData();
    const recursoId = String(form.get("recursoId") || "");
    if (!solicitud.recursos.some((r) => r.id === recursoId && r.tipo === "trabajador")) {
      return NextResponse.json({ error: "Selecciona un trabajador de este expediente." }, { status: 403 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Adjunta un certificado, lista de asistencia o registro de la actividad." }, { status: 400 });
    const errorFile = validarArchivoPortal(file);
    if (errorFile) return NextResponse.json({ error: errorFile }, { status: 400 });
    let contenidos: string[];
    try {
      const parsed: unknown = JSON.parse(String(form.get("contenidosDs44") || "[]"));
      if (!Array.isArray(parsed) || parsed.some((x) => typeof x !== "string") || parsed.length > 7) throw Error("Contenido inválido");
      contenidos = parsed as string[];
    } catch {
      return NextResponse.json({ error: "Los contenidos seleccionados no son válidos." }, { status: 400 });
    }
    const input: ActividadFormativaEntrada = {
      tipo: String(form.get("tipo") || ""),
      temaCodigo: String(form.get("temaCodigo") || ""),
      titulo: String(form.get("titulo") || ""),
      fecha: String(form.get("fecha") || ""),
      duracionMinutos: Number(form.get("duracionMinutos")),
      relator: String(form.get("relator") || ""),
      vinculadaCursoDs44: form.get("vinculadaCursoDs44") === "true",
      contenidosDs44: contenidos,
      evaluacion: String(form.get("evaluacion") || "no_informada"),
    };
    const error = validarActividadFormativa(input);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const archivo = await subirArchivoContratista(solicitud.empresaId, file);
    await prisma.contratistaActividadFormativa.create({
      data: {
        empresaId: solicitud.empresaId,
        solicitudId: solicitud.id,
        recursoId,
        tipo: input.tipo,
        temaCodigo: input.temaCodigo,
        titulo: input.titulo.trim(),
        fecha: new Date(input.fecha + "T12:00:00Z"),
        duracionMinutos: input.duracionMinutos,
        relator: input.relator.trim(),
        vinculadaCursoDs44: input.vinculadaCursoDs44,
        contenidosDs44: JSON.stringify(input.contenidosDs44),
        evaluacion: input.evaluacion,
        archivoNombre: archivo.archivoNombre,
        archivoOriginal: archivo.archivoOriginal,
        archivoTipo: archivo.archivoTipo,
        archivoPeso: archivo.archivoPeso,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const fallo = err instanceof Error && /almacenamiento privado|guardar el archivo/.test(err.message);
    console.error("[Contratistas] Registro formativo fallido", {
      clase: fallo ? "almacenamiento" : "datos",
      errorType: err instanceof Error ? err.name : "desconocido",
    });
    return NextResponse.json({
      error: fallo ? "No fue posible guardar el respaldo en almacenamiento privado." : "No se pudo registrar la actividad. Inténtalo nuevamente.",
    }, { status: fallo ? 503 : 400 });
  }
}

export async function GET(request: Request, { params }: Ctx) {
  const { token } = await params;
  const solicitud = await resolverPortalContratista(token);
  if (!solicitud) return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 403 });
  const registroId = new URL(request.url).searchParams.get("registroId");
  if (!registroId) return NextResponse.json({ error: "Registro requerido" }, { status: 400 });
  const registro = await prisma.contratistaActividadFormativa.findFirst({
    where: { id: registroId, empresaId: solicitud.empresaId, solicitudId: solicitud.id },
    select: { archivoNombre: true },
  });
  if (!registro) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  try {
    return await descargarArchivoContratista(solicitud.empresaId, registro.archivoNombre);
  } catch {
    return NextResponse.json({ error: "No se pudo abrir el respaldo" }, { status: 500 });
  }
}
