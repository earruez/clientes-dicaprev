"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { Prisma } from "@prisma/client";
import { MESES_SHORT } from "@/lib/plandetrabajo/constants";

// ─────────────────────────────────────────────
// TIPOS EXPORTADOS
// ─────────────────────────────────────────────

export type EstadoPlan = "borrador" | "en_revision" | "aprobado" | "rechazado";

export type EstadoActividad = "realizada" | "pendiente" | "vencida" | "no_aplica";

export type MesShort =
  | "Ene"
  | "Feb"
  | "Mar"
  | "Abr"
  | "May"
  | "Jun"
  | "Jul"
  | "Ago"
  | "Sep"
  | "Oct"
  | "Nov"
  | "Dic";

export type ActividadPlanRow = {
  id: string;
  planId: string;
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: "Mensual" | "Trimestral" | "Semestral" | "Anual";
  responsable: string;
  centroContratista: string;
  requiereEvidencia: boolean;
  estado: EstadoActividad;
  critica: boolean;
  mesesEstados: Record<MesShort, EstadoActividad>;
  orden: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanTrabajoRow = {
  id: string;
  empresaId: string;
  anio: number;
  estadoPlan: EstadoPlan;
  version: number;
  aprobadoPor: string | null;
  aprobadoCargo: string | null;
  aprobadoEn: string | null;
  rechazadoPor: string | null;
  rechazadoCargo: string | null;
  rechazadoEn: string | null;
  motivoRechazo: string | null;
  enviadoRevisionEn: string | null;
};

export type EvidenciaRow = {
  id: string;
  actividadId: string;
  archivo: string;
  archivoUrl: string | null;
  fecha: string;
  estado: "cargada" | "rechazada";
  observacion: string | null;
};

export type HistorialRow = {
  id: string;
  planId: string;
  accion: string;
  usuario: string;
  archivo: string | null;
  actividadId: string | null;
  createdAt: string;
};

export type CrearActividadInput = {
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: "Mensual" | "Trimestral" | "Semestral" | "Anual";
  mes: MesShort;
  responsable: string;
  centroContratista: string;
  estadoInicial: EstadoActividad;
  requiereEvidencia: boolean;
  critica?: boolean;
};

export type ActualizarActividadInput = {
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: "Mensual" | "Trimestral" | "Semestral" | "Anual";
  mes: MesShort;
  responsable: string;
  centroContratista: string;
  estado: EstadoActividad;
  requiereEvidencia: boolean;
  critica?: boolean;
};

export type AprobacionInput = {
  usuario: string;
  cargo: string;
};

export type RechazoInput = {
  usuario: string;
  cargo: string;
  motivo: string;
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function toIsoDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function defaultMesesEstados(base: EstadoActividad = "no_aplica"): Record<MesShort, EstadoActividad> {
  const map = {} as Record<MesShort, EstadoActividad>;
  MESES_SHORT.forEach((m) => { map[m] = base; });
  return map;
}

function parseMesesEstados(raw: Prisma.JsonValue): Record<MesShort, EstadoActividad> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultMesesEstados();
  }
  const obj = raw as Record<string, unknown>;
  const result = defaultMesesEstados();
  MESES_SHORT.forEach((m) => {
    const val = obj[m];
    if (val === "realizada" || val === "pendiente" || val === "vencida" || val === "no_aplica") {
      result[m] = val as EstadoActividad;
    }
  });
  return result;
}

function mapActividad(row: {
  id: string;
  planId: string;
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: string;
  responsable: string;
  centroContratista: string;
  requiereEvidencia: boolean;
  estado: string;
  critica: boolean;
  mesesEstados: Prisma.JsonValue;
  orden: number;
  createdAt: Date;
  updatedAt: Date;
}): ActividadPlanRow {
  return {
    id: row.id,
    planId: row.planId,
    actividad: row.actividad,
    normativa: row.normativa,
    categoria: row.categoria,
    periodicidad: row.periodicidad as ActividadPlanRow["periodicidad"],
    responsable: row.responsable,
    centroContratista: row.centroContratista,
    requiereEvidencia: row.requiereEvidencia,
    estado: row.estado as EstadoActividad,
    critica: row.critica,
    mesesEstados: parseMesesEstados(row.mesesEstados),
    orden: row.orden,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPlan(row: {
  id: string;
  empresaId: string;
  anio: number;
  estadoPlan: string;
  version: number;
  aprobadoPor: string | null;
  aprobadoCargo: string | null;
  aprobadoEn: Date | null;
  rechazadoPor: string | null;
  rechazadoCargo: string | null;
  rechazadoEn: Date | null;
  motivoRechazo: string | null;
  enviadoRevisionEn: Date | null;
}): PlanTrabajoRow {
  return {
    id: row.id,
    empresaId: row.empresaId,
    anio: row.anio,
    estadoPlan: row.estadoPlan as EstadoPlan,
    version: row.version,
    aprobadoPor: row.aprobadoPor,
    aprobadoCargo: row.aprobadoCargo,
    aprobadoEn: toIsoDate(row.aprobadoEn),
    rechazadoPor: row.rechazadoPor,
    rechazadoCargo: row.rechazadoCargo,
    rechazadoEn: toIsoDate(row.rechazadoEn),
    motivoRechazo: row.motivoRechazo,
    enviadoRevisionEn: toIsoDate(row.enviadoRevisionEn),
  };
}

// ─────────────────────────────────────────────
// ACCIONES PRINCIPALES
// ─────────────────────────────────────────────

/**
 * Obtiene o crea el plan de trabajo del año indicado para la empresa del usuario autenticado.
 */
export async function getPlanTrabajo(anio?: number): Promise<PlanTrabajoRow> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  const targetAnio = anio ?? new Date().getFullYear();

  const plan = await prisma.planTrabajo.upsert({
    where: { empresaId_anio: { empresaId, anio: targetAnio } },
    update: {},
    create: {
      empresaId,
      anio: targetAnio,
      estadoPlan: "borrador",
      version: 1,
    },
  });

  return mapPlan(plan);
}

/**
 * Obtiene el nombre y logo de la empresa activa para un plan PDF.
 */
export async function getEmpresaActivaParaPlan(): Promise<{ empresaNombre: string; empresaLogoUrl: string | null }> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { nombre: true, logoUrl: true },
  });
  return {
    empresaNombre: empresa.nombre,
    empresaLogoUrl: empresa.logoUrl,
  };
}

/**
 * Lista todas las actividades de un plan.
 */
export async function getActividadesPlan(planId: string): Promise<ActividadPlanRow[]> {
  await requirePermission("canReadCumplimiento");

  const rows = await prisma.actividadPlanTrabajo.findMany({
    where: { planId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });

  return rows.map(mapActividad);
}

/**
 * Crea una nueva actividad y registra el evento en historial.
 */
export async function crearActividad(planId: string, input: CrearActividadInput): Promise<ActividadPlanRow> {
  const { email } = await requirePermission("canReadCumplimiento");

  const plan = await prisma.planTrabajo.findUniqueOrThrow({ where: { id: planId }, select: { estadoPlan: true } });
  if (plan.estadoPlan !== "borrador") {
    throw new Error("Solo se pueden crear actividades cuando el plan está en borrador.");
  }

  const mesesEstados = defaultMesesEstados("no_aplica");
  mesesEstados[input.mes] = input.estadoInicial;

  const lastOrder = await prisma.actividadPlanTrabajo.aggregate({
    where: { planId },
    _max: { orden: true },
  });
  const nextOrden = (lastOrder._max.orden ?? 0) + 1;

  const actividad = await prisma.actividadPlanTrabajo.create({
    data: {
      planId,
      actividad: input.actividad,
      normativa: input.normativa,
      categoria: input.categoria,
      periodicidad: input.periodicidad,
      responsable: input.responsable,
      centroContratista: input.centroContratista,
      requiereEvidencia: input.requiereEvidencia,
      estado: input.estadoInicial,
      critica: input.critica ?? false,
      mesesEstados: mesesEstados as unknown as Prisma.InputJsonValue,
      orden: nextOrden,
    },
  });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId,
      accion: "Creación de actividad",
      usuario: email,
      actividadId: actividad.id,
    },
  });

  return mapActividad(actividad);
}

/**
 * Actualiza una actividad existente y registra en historial.
 */
export async function actualizarActividad(
  actividadId: string,
  input: ActualizarActividadInput
): Promise<ActividadPlanRow> {
  const { email } = await requirePermission("canReadCumplimiento");

  const current = await prisma.actividadPlanTrabajo.findUniqueOrThrow({
    where: { id: actividadId },
    select: { planId: true, plan: { select: { estadoPlan: true } } },
  });

  if (current.plan.estadoPlan !== "borrador") {
    throw new Error("Solo se pueden editar actividades cuando el plan está en borrador.");
  }

  const mesesEstados = defaultMesesEstados("no_aplica");
  mesesEstados[input.mes] = input.estado;

  const updated = await prisma.actividadPlanTrabajo.update({
    where: { id: actividadId },
    data: {
      actividad: input.actividad,
      normativa: input.normativa,
      categoria: input.categoria,
      periodicidad: input.periodicidad,
      responsable: input.responsable,
      centroContratista: input.centroContratista,
      requiereEvidencia: input.requiereEvidencia,
      estado: input.estado,
      critica: input.critica ?? false,
      mesesEstados: mesesEstados as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId: current.planId,
      accion: "Edición de actividad",
      usuario: email,
      actividadId,
    },
  });

  return mapActividad(updated);
}

/**
 * Actualiza el estado de un mes específico para una actividad.
 */
export async function actualizarEstadoMes(
  actividadId: string,
  mes: MesShort,
  estado: EstadoActividad
): Promise<ActividadPlanRow> {
  await requirePermission("canReadCumplimiento");

  const current = await prisma.actividadPlanTrabajo.findUniqueOrThrow({
    where: { id: actividadId },
  });

  const mesesActuales = parseMesesEstados(current.mesesEstados);
  mesesActuales[mes] = estado;

  const updated = await prisma.actividadPlanTrabajo.update({
    where: { id: actividadId },
    data: {
      mesesEstados: mesesActuales as unknown as Prisma.InputJsonValue,
    },
  });

  return mapActividad(updated);
}

/**
 * Elimina una actividad del plan (solo en borrador).
 */
export async function eliminarActividad(actividadId: string): Promise<void> {
  const { email } = await requirePermission("canReadCumplimiento");

  const current = await prisma.actividadPlanTrabajo.findUniqueOrThrow({
    where: { id: actividadId },
    select: { planId: true, actividad: true, plan: { select: { estadoPlan: true } } },
  });

  if (current.plan.estadoPlan !== "borrador") {
    throw new Error("Solo se pueden eliminar actividades cuando el plan está en borrador.");
  }

  await prisma.actividadPlanTrabajo.delete({ where: { id: actividadId } });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId: current.planId,
      accion: `Actividad eliminada: ${current.actividad}`,
      usuario: email,
    },
  });
}

/**
 * Lista todas las evidencias de una actividad.
 */
export async function getEvidencias(actividadId: string): Promise<EvidenciaRow[]> {
  await requirePermission("canReadCumplimiento");

  const rows = await prisma.evidenciaActividadPlan.findMany({
    where: { actividadId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((e) => ({
    id: e.id,
    actividadId: e.actividadId,
    archivo: e.archivo,
    archivoUrl: e.archivoUrl,
    fecha: toIsoDate(e.fecha) ?? e.createdAt.toISOString().slice(0, 10),
    estado: e.estado as "cargada" | "rechazada",
    observacion: e.observacion,
  }));
}

/**
 * Añade una evidencia a una actividad.
 */
export async function crearEvidencia(
  actividadId: string,
  data: { archivo: string; archivoUrl?: string; observacion?: string }
): Promise<EvidenciaRow> {
  const { email } = await requirePermission("canReadCumplimiento");

  const actividad = await prisma.actividadPlanTrabajo.findUniqueOrThrow({
    where: { id: actividadId },
    select: { planId: true, plan: { select: { estadoPlan: true } } },
  });

  if (actividad.plan.estadoPlan === "aprobado") {
    throw new Error("El plan está aprobado y no admite nuevas cargas de evidencia.");
  }

  const evidencia = await prisma.evidenciaActividadPlan.create({
    data: {
      actividadId,
      archivo: data.archivo,
      archivoUrl: data.archivoUrl,
      observacion: data.observacion ?? "Archivo cargado correctamente",
      creadoPorId: email,
    },
  });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId: actividad.planId,
      accion: "Carga de evidencia",
      usuario: email,
      actividadId,
      archivo: data.archivo,
    },
  });

  return {
    id: evidencia.id,
    actividadId: evidencia.actividadId,
    archivo: evidencia.archivo,
    archivoUrl: evidencia.archivoUrl,
    fecha: toIsoDate(evidencia.fecha) ?? evidencia.createdAt.toISOString().slice(0, 10),
    estado: evidencia.estado as "cargada" | "rechazada",
    observacion: evidencia.observacion,
  };
}

/**
 * Obtiene el historial completo de un plan.
 */
export async function getHistorialPlan(planId: string): Promise<HistorialRow[]> {
  await requirePermission("canReadCumplimiento");

  const rows = await prisma.historialPlanTrabajo.findMany({
    where: { planId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((h) => ({
    id: h.id,
    planId: h.planId,
    accion: h.accion,
    usuario: h.usuario,
    archivo: h.archivo,
    actividadId: h.actividadId,
    createdAt: h.createdAt.toISOString(),
  }));
}

/**
 * Envía el plan a revisión (borrador → en_revision).
 */
export async function enviarPlanRevision(planId: string): Promise<PlanTrabajoRow> {
  const { email } = await requirePermission("canReadCumplimiento");

  const plan = await prisma.planTrabajo.findUniqueOrThrow({ where: { id: planId }, select: { estadoPlan: true, version: true } });
  if (plan.estadoPlan !== "borrador") {
    throw new Error("Solo se puede enviar a revisión un plan en estado borrador.");
  }

  const newVersion = plan.version + 1;

  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: {
      estadoPlan: "en_revision",
      enviadoRevisionEn: new Date(),
      version: newVersion,
      motivoRechazo: null,
      rechazadoPor: null,
      rechazadoCargo: null,
      rechazadoEn: null,
    },
  });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId,
      accion: `Plan enviado a revisión (v${newVersion})`,
      usuario: email,
    },
  });

  return mapPlan(updated);
}

/**
 * Aprueba el plan (en_revision → aprobado).
 */
export async function aprobarPlan(planId: string, input: AprobacionInput): Promise<PlanTrabajoRow> {
  const { email } = await requirePermission("canReadCumplimiento");

  const plan = await prisma.planTrabajo.findUniqueOrThrow({ where: { id: planId }, select: { estadoPlan: true } });
  if (plan.estadoPlan !== "en_revision") {
    throw new Error("Solo se puede aprobar un plan en revisión.");
  }

  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: {
      estadoPlan: "aprobado",
      aprobadoPor: input.usuario,
      aprobadoCargo: input.cargo,
      aprobadoEn: new Date(),
      motivoRechazo: null,
      rechazadoPor: null,
      rechazadoCargo: null,
      rechazadoEn: null,
    },
  });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId,
      accion: "Plan aprobado",
      usuario: `${input.usuario} · ${input.cargo}`,
    },
  });

  void email; // already used implicitly through requirePermission

  return mapPlan(updated);
}

/**
 * Rechaza el plan con motivo (en_revision → rechazado).
 */
export async function rechazarPlan(planId: string, input: RechazoInput): Promise<PlanTrabajoRow> {
  const { email } = await requirePermission("canReadCumplimiento");

  if (!input.motivo.trim()) {
    throw new Error("El motivo de rechazo es obligatorio.");
  }

  const plan = await prisma.planTrabajo.findUniqueOrThrow({ where: { id: planId }, select: { estadoPlan: true } });
  if (plan.estadoPlan !== "en_revision") {
    throw new Error("Solo se puede rechazar un plan en revisión.");
  }

  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: {
      estadoPlan: "rechazado",
      rechazadoPor: input.usuario,
      rechazadoCargo: input.cargo,
      rechazadoEn: new Date(),
      motivoRechazo: input.motivo.trim(),
      aprobadoPor: null,
      aprobadoCargo: null,
      aprobadoEn: null,
    },
  });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId,
      accion: `Plan rechazado: ${input.motivo.trim()}`,
      usuario: `${input.usuario} · ${input.cargo}`,
    },
  });

  void email;

  return mapPlan(updated);
}

/**
 * Devuelve el plan a estado borrador (rechazado → borrador).
 */
export async function volverBorrador(planId: string): Promise<PlanTrabajoRow> {
  const { email } = await requirePermission("canReadCumplimiento");

  const plan = await prisma.planTrabajo.findUniqueOrThrow({ where: { id: planId }, select: { estadoPlan: true } });
  if (plan.estadoPlan !== "rechazado") {
    throw new Error("Solo se puede devolver a borrador un plan rechazado.");
  }

  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: {
      estadoPlan: "borrador",
      motivoRechazo: null,
      rechazadoPor: null,
      rechazadoCargo: null,
      rechazadoEn: null,
    },
  });

  await prisma.historialPlanTrabajo.create({
    data: {
      planId,
      accion: "Plan devuelto a borrador",
      usuario: email,
    },
  });

  return mapPlan(updated);
}

/**
 * Carga de evidencia con archivo (como en uploadEvidencia del store anterior).
 */
export async function uploadEvidencia(
  actividadId: string,
  archivo: string
): Promise<EvidenciaRow> {
  return crearEvidencia(actividadId, { archivo });
}
