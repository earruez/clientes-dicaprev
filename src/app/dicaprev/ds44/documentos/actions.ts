"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { construirRegistroDocumentoGenerado } from "@/lib/documentacion/registro-documento-generado";
import { requirePermission } from "@/server/auth/permissions";
import { DS44_PLANTILLAS, getPlantillaDs44 } from "./catalogo";
import type {
  Ds44DocumentoGeneradoRow,
  Ds44DocumentoPdfSnapshot,
  Ds44DocumentosData,
  Ds44PlantillaCodigo,
  GenerarDs44DocumentoInput,
  GenerarDs44DocumentoResult,
} from "./types";

const ROUTES = ["/dicaprev/ds44", "/dicaprev/ds44/documentos", "/dicaprev/ds44/evidencias", "/dicaprev/cumplimiento/evidencias"];

function isPersistenceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const prismaError = error as Error & { code?: string };
  if (prismaError.code === "P2021" || prismaError.code === "P2022") return true;
  const message = error.message.toLowerCase();
  return message.includes("documentogeneradoregistro") && (message.includes("does not exist") || message.includes("column") || message.includes("relation"));
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item : String(item ?? "")]));
}

function metadataObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isPlantillaCodigo(value: unknown): value is Ds44PlantillaCodigo {
  return DS44_PLANTILLAS.some((plantilla) => plantilla.codigo === value);
}

function defaultFor(key: string, defaults: Record<string, string>): string {
  return defaults[key] ?? "";
}

export async function getDs44DocumentosData(): Promise<Ds44DocumentosData> {
  const { empresaId, usuarioId } = await requirePermission("canReadCumplimiento");
  try {
    const [empresa, usuario, documentos, acciones] = await Promise.all([
      prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true, representanteLegal: true } }),
      prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nombre: true } }),
      prisma.documentoGeneradoRegistro.findMany({ where: { empresaId, modulo: "ds44" }, select: { id: true, tipoDocumento: true, nombre: true, formato: true, metadata: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
      prisma.ds44PlanAccion.findMany({ where: { empresaId }, select: { id: true, accionSugerida: true, prioridad: true, responsableReal: true, evidenciaEsperada: true, responsableTrabajador: { select: { nombres: true, apellidos: true } } }, orderBy: { createdAt: "asc" } }),
    ]);

    const responsablePlan = acciones.find((accion) => accion.responsableTrabajador || accion.responsableReal);
    const responsableNombre = responsablePlan?.responsableTrabajador
      ? `${responsablePlan.responsableTrabajador.nombres} ${responsablePlan.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim()
      : responsablePlan?.responsableReal ?? usuario?.nombre ?? "";
    const hoy = new Date().toISOString().slice(0, 10);
    const actividades = acciones.map((accion) => `• ${accion.accionSugerida}${accion.evidenciaEsperada ? ` — Evidencia: ${accion.evidenciaEsperada}` : ""}`).join("\n");
    const defaults: Record<string, string> = {
      empresaNombre: empresa?.nombre ?? "",
      representanteLegal: empresa?.representanteLegal ?? "",
      compromisoEmpresa: "Proteger la seguridad y salud de las personas trabajadoras, promover su participación y mejorar continuamente el desempeño preventivo.",
      fechaEmision: hoy,
      responsableNombre,
      responsableCargo: "Responsable SST",
      funcionesAsignadas: "Coordinar la implementación, seguimiento y mejora del sistema de gestión SST.",
      fechaDesignacion: hoy,
      periodo: String(new Date().getFullYear()),
      objetivoGeneral: "Implementar y mantener las medidas preventivas definidas para el cumplimiento del DS44.",
      responsablePrograma: responsableNombre,
      actividadesPrincipales: actividades,
      tema: "Información y capacitación en seguridad y salud en el trabajo",
      relator: usuario?.nombre ?? responsableNombre,
      fechaActividad: hoy,
      participantesTexto: "",
      fechaRevision: hoy,
      asistentes: usuario?.nombre ?? "",
      temasTratados: actividades,
      acuerdos: "",
      responsableSeguimiento: responsableNombre,
    };

    const rows: Ds44DocumentoGeneradoRow[] = documentos.flatMap((documento) => {
      const metadata = metadataObject(documento.metadata);
      if (!isPlantillaCodigo(metadata.plantillaCodigo)) return [];
      return [{
        id: documento.id,
        tipoDocumento: documento.tipoDocumento,
        nombre: documento.nombre,
        plantillaCodigo: metadata.plantillaCodigo,
        createdAt: documento.createdAt.toISOString(),
        formato: documento.formato,
        estado: typeof metadata.estado === "string" ? metadata.estado : "registrado",
        evidenciaId: typeof metadata.evidenciaId === "string" ? metadata.evidenciaId : undefined,
      }];
    });
    const codigosGenerados = new Set(rows.map((row) => row.plantillaCodigo));
    return {
      empresaNombre: empresa?.nombre ?? "",
      plantillas: DS44_PLANTILLAS.map((plantilla) => ({
        codigo: plantilla.codigo,
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
        objetivo: plantilla.objetivo,
        categoria: plantilla.categoria,
        accionesDs44Relacionadas: plantilla.accionesDs44Relacionadas,
        campos: plantilla.campos.map((campo) => ({ ...campo, defaultValue: defaultFor(campo.key, defaults) })),
      })),
      documentosGenerados: rows,
      accionesPlan: acciones.map((accion) => ({
        id: accion.id,
        accionSugerida: accion.accionSugerida,
        prioridad: accion.prioridad,
        responsable: accion.responsableTrabajador ? `${accion.responsableTrabajador.nombres} ${accion.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim() : accion.responsableReal,
        evidenciaEsperada: accion.evidenciaEsperada,
      })),
      resumen: { totalPlantillas: DS44_PLANTILLAS.length, documentosGenerados: rows.length, documentosMinimosGenerados: codigosGenerados.size, porcentajeAvance: Math.round((codigosGenerados.size / DS44_PLANTILLAS.length) * 100) },
    };
  } catch (error) {
    if (!isPersistenceUnavailable(error)) throw error;
    return { empresaNombre: "", plantillas: [], documentosGenerados: [], accionesPlan: [], resumen: { totalPlantillas: 5, documentosGenerados: 0, documentosMinimosGenerados: 0, porcentajeAvance: 0 }, databaseUpdateRequired: true };
  }
}

export async function generarDs44Documento(input: GenerarDs44DocumentoInput): Promise<GenerarDs44DocumentoResult> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const plantilla = getPlantillaDs44(input.plantillaCodigo);
  if (!plantilla) throw new Error("Plantilla DS44 no válida.");
  const campos = Object.fromEntries(Object.entries(input.campos ?? {}).map(([key, value]) => [key, String(value ?? "").trim()]));
  for (const campo of plantilla.campos) if (campo.required && !campos[campo.key]) throw new Error(`El campo ${campo.label} es obligatorio.`);

  try {
    const [empresa, accion] = await Promise.all([
      prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } }),
      input.ds44PlanAccionId ? prisma.ds44PlanAccion.findFirst({ where: { id: input.ds44PlanAccionId, empresaId }, select: { id: true } }) : null,
    ]);
    if (input.ds44PlanAccionId && !accion) throw new Error("La acción DS44 seleccionada no pertenece a la empresa activa.");
    const generadoEn = new Date().toISOString();
    const contexto = { ...campos, empresaNombre: empresa?.nombre ?? "" };
    const contenidoHtml = plantilla.renderHtml(contexto);
    const contenidoTexto = plantilla.renderTexto(contexto);

    const result = await prisma.$transaction(async (tx) => {
      const metadataBase = {
        fuente: "ds44", fase: "4B", estado: "registrado", plantillaCodigo: plantilla.codigo, plantillaNombre: plantilla.nombre,
        empresaNombre: empresa?.nombre ?? "", campos, contenidoHtml, contenidoTexto, ds44PlanAccionId: accion?.id ?? null, generadoEn,
        historial: [{ fecha: generadoEn, evento: "documento_ds44_generado", detalle: "Documento DS44 generado desde plantilla", usuarioId }],
      } satisfies Prisma.InputJsonObject;
      const documento = await tx.documentoGeneradoRegistro.create({
        data: construirRegistroDocumentoGenerado({ empresaId, usuarioId, modulo: "ds44", tipoDocumento: plantilla.codigo, entidadTipo: "ds44_documento", entidadId: accion?.id ?? null, nombre: plantilla.nombre, formato: "html", metadata: metadataBase }),
        select: { id: true },
      });
      if (!accion) return { documentoId: documento.id };
      const evidencia = await tx.evidenciaCumplimiento.create({ data: { empresaId, titulo: plantilla.nombre, descripcion: `Documento DS44 generado desde plantilla: ${plantilla.nombre}`, origen: "ds44_documento_generado", tipo: "documento", estado: "pendiente", fechaEvidencia: new Date(), ds44PlanAccionId: accion.id, creadoPorId: usuarioId, archivoNombre: null, archivoUrl: null }, select: { id: true } });
      await tx.evidenciaCumplimientoHistorial.create({ data: { evidenciaId: evidencia.id, usuarioId, accion: "crear", detalle: "Evidencia creada desde documento DS44 generado", estadoNuevo: "pendiente" } });
      await tx.documentoGeneradoRegistro.update({ where: { id: documento.id }, data: { metadata: { ...metadataBase, evidenciaId: evidencia.id } } });
      return { documentoId: documento.id, evidenciaId: evidencia.id };
    });
    ROUTES.forEach((route) => revalidatePath(route));
    return result;
  } catch (error) {
    if (isPersistenceUnavailable(error)) throw new Error("Los documentos DS44 requieren actualizar la base de datos. Ejecuta prisma migrate deploy.");
    throw error;
  }
}

export async function getDs44DocumentoPdfSnapshot(documentoId: string): Promise<Ds44DocumentoPdfSnapshot> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  const id = documentoId.trim();
  if (!id) throw new Error("Documento DS44 no encontrado para la empresa activa.");

  const documento = await prisma.documentoGeneradoRegistro.findFirst({
    where: { id, empresaId, modulo: "ds44" },
    select: { id: true, nombre: true, metadata: true, createdAt: true, usuario: { select: { nombre: true } } },
  });
  if (!documento) throw new Error("Documento DS44 no encontrado para la empresa activa.");

  const metadata = metadataObject(documento.metadata);
  if (metadata.fuente !== "ds44" || !isPlantillaCodigo(metadata.plantillaCodigo)) {
    throw new Error("Documento DS44 no encontrado para la empresa activa.");
  }
  const contenidoTexto = typeof metadata.contenidoTexto === "string" ? metadata.contenidoTexto.trim() : "";
  if (!contenidoTexto) throw new Error("El documento DS44 no contiene texto disponible para exportar.");

  return {
    documentoId: documento.id,
    empresaNombre: typeof metadata.empresaNombre === "string" ? metadata.empresaNombre : "",
    plantillaCodigo: metadata.plantillaCodigo,
    plantillaNombre: typeof metadata.plantillaNombre === "string" ? metadata.plantillaNombre : documento.nombre,
    contenidoTexto,
    contenidoHtml: typeof metadata.contenidoHtml === "string" ? metadata.contenidoHtml : undefined,
    campos: stringRecord(metadata.campos),
    generadoEn: typeof metadata.generadoEn === "string" ? metadata.generadoEn : documento.createdAt.toISOString(),
    usuarioNombre: documento.usuario?.nombre ?? undefined,
    evidenciaId: typeof metadata.evidenciaId === "string" ? metadata.evidenciaId : undefined,
  };
}
