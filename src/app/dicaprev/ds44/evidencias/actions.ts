"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type {
  CrearEvidenciaDs44Input,
  Ds44EvidenciaAccion,
  Ds44EvidenciaEstado,
  Ds44EvidenciasData,
  RevisarEvidenciaDs44Input,
} from "./types";

const ROUTES = [
  "/dicaprev/ds44",
  "/dicaprev/ds44/plan-implementacion",
  "/dicaprev/ds44/evidencias",
  "/dicaprev/cumplimiento/evidencias",
];

function revalidateEvidencias(): void {
  ROUTES.forEach((route) => revalidatePath(route));
}

function isPersistenceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const prismaError = error as Error & { code?: string };
  if (prismaError.code === "P2021" || prismaError.code === "P2022") return true;
  const message = error.message.toLowerCase();
  return message.includes("ds44planaccionid") && (message.includes("column") || message.includes("relation") || message.includes("does not exist"));
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function resolveEstado(planificada: boolean, estados: string[]): Ds44EvidenciaEstado {
  if (!planificada) return "sin_planificar";
  if (estados.length === 0) return "pendiente_evidencia";
  if (estados.includes("valida")) return "valida";
  if (estados.includes("pendiente")) return "en_revision";
  if (estados.includes("vencida")) return "vencida";
  return "rechazada";
}

function buildData(acciones: Ds44EvidenciaAccion[], databaseUpdateRequired = false): Ds44EvidenciasData {
  const planificadas = acciones.filter((accion) => accion.planificada);
  const conEvidenciaValida = planificadas.filter((accion) => accion.estadoEvidencia === "valida").length;
  return {
    acciones,
    resumen: {
      totalAcciones: acciones.length,
      planificadas: planificadas.length,
      conEvidenciaValida,
      pendientesEvidencia: planificadas.filter((accion) => accion.estadoEvidencia === "pendiente_evidencia").length,
      enRevision: planificadas.filter((accion) => accion.estadoEvidencia === "en_revision").length,
      rechazadasOVencidas: planificadas.filter((accion) => accion.estadoEvidencia === "rechazada" || accion.estadoEvidencia === "vencida").length,
      coberturaPorcentaje: planificadas.length ? Math.round((conEvidenciaValida / planificadas.length) * 100) : 0,
    },
    databaseUpdateRequired,
  };
}

export async function getDs44EvidenciasData(): Promise<Ds44EvidenciasData> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  try {
    const rows = await prisma.ds44PlanAccion.findMany({
      where: { empresaId },
      include: {
        responsableTrabajador: { select: { nombres: true, apellidos: true, cargo: { select: { nombre: true } } } },
        evidenciasCumplimiento: { orderBy: { fechaEvidencia: "desc" } },
      },
    });
    const peso: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
    rows.sort((a, b) => (peso[a.prioridad] ?? 4) - (peso[b.prioridad] ?? 4) || (a.fechaCompromiso?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.fechaCompromiso?.getTime() ?? Number.MAX_SAFE_INTEGER));
    const acciones: Ds44EvidenciaAccion[] = rows.map((row) => {
      const nombre = row.responsableTrabajador ? `${row.responsableTrabajador.nombres} ${row.responsableTrabajador.apellidos}`.replace(/\s+/g, " ").trim() : null;
      const planificada = Boolean((nombre || row.responsableReal) && row.fechaCompromiso);
      return {
        id: row.id,
        preguntaClave: row.preguntaClave,
        bloque: row.bloque,
        prioridad: row.prioridad,
        accionSugerida: row.accionSugerida,
        recomendacion: row.recomendacion,
        evidenciaEsperada: row.evidenciaEsperada,
        rutaSugerida: row.rutaSugerida,
        responsableReal: row.responsableReal,
        responsableTrabajadorNombre: nombre,
        responsableTrabajadorCargo: row.responsableTrabajador?.cargo?.nombre ?? null,
        fechaCompromiso: iso(row.fechaCompromiso),
        estadoPlan: row.estado,
        planificada,
        estadoEvidencia: resolveEstado(planificada, row.evidenciasCumplimiento.map((item) => item.estado)),
        evidencias: row.evidenciasCumplimiento.map((item) => ({
          id: item.id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          estado: item.estado,
          origen: item.origen,
          archivoUrl: item.archivoUrl,
          archivoNombre: item.archivoNombre,
          fechaEvidencia: item.fechaEvidencia.toISOString(),
          fechaValidacion: iso(item.validadoAt),
          observacionRevision: item.observacionRevision,
        })),
      };
    });
    return buildData(acciones);
  } catch (error) {
    if (isPersistenceUnavailable(error)) return buildData([], true);
    throw error;
  }
}

export async function crearEvidenciaDs44(input: CrearEvidenciaDs44Input): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  const titulo = input.titulo.trim();
  const descripcion = input.descripcion.trim();
  if (!titulo) throw new Error("El titulo es obligatorio.");
  if (!descripcion) throw new Error("La descripcion es obligatoria.");
  try {
    const accion = await prisma.ds44PlanAccion.findFirst({ where: { id: input.ds44PlanAccionId, empresaId }, select: { id: true, responsableReal: true, responsableTrabajadorId: true, fechaCompromiso: true } });
    if (!accion) throw new Error("Accion DS44 no encontrada para la empresa activa.");
    if ((!accion.responsableReal && !accion.responsableTrabajadorId) || !accion.fechaCompromiso) throw new Error("Primero define responsable y fecha compromiso en el Plan DS44.");
    const created = await prisma.evidenciaCumplimiento.create({ data: { empresaId, titulo, descripcion, origen: "ds44_plan", tipo: "registro", estado: "pendiente", fechaEvidencia: new Date(), ds44PlanAccionId: accion.id, archivoUrl: input.archivoUrl?.trim() || null, archivoNombre: input.archivoNombre?.trim() || null, creadoPorId: usuarioId }, select: { id: true } });
    await prisma.evidenciaCumplimientoHistorial.create({ data: { evidenciaId: created.id, usuarioId, accion: "crear", detalle: "Evidencia DS44 creada desde plan de implementación", estadoNuevo: "pendiente" } });
    revalidateEvidencias();
    return created;
  } catch (error) {
    if (isPersistenceUnavailable(error)) throw new Error("Las evidencias DS44 requieren actualizar la base de datos. Ejecuta prisma migrate deploy.");
    throw error;
  }
}

export async function revisarEvidenciaDs44(input: RevisarEvidenciaDs44Input): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");
  if (input.estado !== "valida" && input.estado !== "rechazada") throw new Error("Estado de revisión inválido.");
  try {
    const evidencia = await prisma.evidenciaCumplimiento.findFirst({ where: { id: input.evidenciaId, empresaId }, select: { id: true, estado: true, ds44PlanAccionId: true } });
    if (!evidencia) throw new Error("Evidencia no encontrada para la empresa activa.");
    if (!evidencia.ds44PlanAccionId) throw new Error("La evidencia no está vinculada a una acción DS44.");
    const observacionRevision = input.observacionRevision?.trim() || null;
    await prisma.evidenciaCumplimiento.update({ where: { id: evidencia.id }, data: { estado: input.estado, validadoPorId: usuarioId, validadoAt: new Date(), observacionRevision } });
    await prisma.evidenciaCumplimientoHistorial.create({ data: { evidenciaId: evidencia.id, usuarioId, accion: input.estado === "valida" ? "validar" : "rechazar", detalle: observacionRevision || `Evidencia DS44 ${input.estado === "valida" ? "validada" : "rechazada"}`, estadoAnterior: evidencia.estado, estadoNuevo: input.estado } });
    revalidateEvidencias();
  } catch (error) {
    if (isPersistenceUnavailable(error)) throw new Error("Las evidencias DS44 requieren actualizar la base de datos. Ejecuta prisma migrate deploy.");
    throw error;
  }
}
