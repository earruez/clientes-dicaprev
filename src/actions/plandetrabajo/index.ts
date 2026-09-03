"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { PermissionKey } from "@/lib/permissions-matrix";
import type { Prisma } from "@prisma/client";
import { MESES_SHORT } from "@/lib/plandetrabajo/constants";

export type EstadoPlan = "borrador" | "en_revision" | "aprobado" | "rechazado";
export type EstadoActividad = "realizada" | "pendiente" | "vencida" | "no_aplica";
export type MesShort = "Ene" | "Feb" | "Mar" | "Abr" | "May" | "Jun" | "Jul" | "Ago" | "Sep" | "Oct" | "Nov" | "Dic";

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

export type AprobacionInput = { usuario: string; cargo: string };
export type RechazoInput = { usuario: string; cargo: string; motivo: string };

function toIsoDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function defaultMesesEstados(base: EstadoActividad = "no_aplica"): Record<MesShort, EstadoActividad> {
  const map = {} as Record<MesShort, EstadoActividad>;
  MESES_SHORT.forEach((m) => { map[m] = base; });
  return map;
}

function parseMesesEstados(raw: Prisma.JsonValue): Record<MesShort, EstadoActividad> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultMesesEstados();
  const obj = raw as Record<string, unknown>;
  const result = defaultMesesEstados();
  MESES_SHORT.forEach((m) => {
    const val = obj[m];
    if (val === "realizada" || val === "pendiente" || val === "vencida" || val === "no_aplica") result[m] = val;
  });
  return result;
}

function mapActividad(row: {
  id: string; planId: string; actividad: string; normativa: string; categoria: string; periodicidad: string;
  responsable: string; centroContratista: string; requiereEvidencia: boolean; estado: string; critica: boolean;
  mesesEstados: Prisma.JsonValue; orden: number; createdAt: Date; updatedAt: Date;
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
  id: string; empresaId: string; anio: number; estadoPlan: string; version: number; aprobadoPor: string | null;
  aprobadoCargo: string | null; aprobadoEn: Date | null; rechazadoPor: string | null; rechazadoCargo: string | null;
  rechazadoEn: Date | null; motivoRechazo: string | null; enviadoRevisionEn: Date | null;
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

async function requirePlanEmpresa(planId: string, permission: PermissionKey) {
  const context = await requirePermission(permission);
  const plan = await prisma.planTrabajo.findFirst({
    where: { id: planId, empresaId: context.empresaId },
  });
  if (!plan) throw new Error("Plan de trabajo no encontrado para la empresa activa");
  return { context, plan };
}

async function requireActividadEmpresa(actividadId: string, permission: PermissionKey) {
  const context = await requirePermission(permission);
  const actividad = await prisma.actividadPlanTrabajo.findFirst({
    where: { id: actividadId, plan: { empresaId: context.empresaId } },
    include: { plan: true },
  });
  if (!actividad) throw new Error("Actividad no encontrada para la empresa activa");
  return { context, actividad };
}

export async function getPlanTrabajo(anio?: number): Promise<PlanTrabajoRow> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  const targetAnio = anio ?? new Date().getFullYear();
  const plan = await prisma.planTrabajo.upsert({
    where: { empresaId_anio: { empresaId, anio: targetAnio } },
    update: {},
    create: { empresaId, anio: targetAnio, estadoPlan: "borrador", version: 1 },
  });
  return mapPlan(plan);
}

export async function getEmpresaActivaParaPlan(): Promise<{ empresaNombre: string; empresaLogoUrl: string | null }> {
  const { empresaId } = await requirePermission("canReadCumplimiento");
  const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, activa: true }, select: { nombre: true, logoUrl: true } });
  if (!empresa) throw new Error("La empresa activa no está disponible");
  return { empresaNombre: empresa.nombre, empresaLogoUrl: empresa.logoUrl };
}

export async function getActividadesPlan(planId: string): Promise<ActividadPlanRow[]> {
  await requirePlanEmpresa(planId, "canReadCumplimiento");
  const rows = await prisma.actividadPlanTrabajo.findMany({ where: { planId }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }] });
  return rows.map(mapActividad);
}

export async function crearActividad(planId: string, input: CrearActividadInput): Promise<ActividadPlanRow> {
  const { context, plan } = await requirePlanEmpresa(planId, "canManageCumplimiento");
  if (plan.estadoPlan !== "borrador") throw new Error("Solo se pueden crear actividades cuando el plan está en borrador.");

  const mesesEstados = defaultMesesEstados();
  mesesEstados[input.mes] = input.estadoInicial;
  const lastOrder = await prisma.actividadPlanTrabajo.aggregate({ where: { planId }, _max: { orden: true } });
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
      orden: (lastOrder._max.orden ?? 0) + 1,
    },
  });
  await prisma.historialPlanTrabajo.create({ data: { planId, accion: "Creación de actividad", usuario: context.email, actividadId: actividad.id } });
  return mapActividad(actividad);
}

export async function actualizarActividad(actividadId: string, input: ActualizarActividadInput): Promise<ActividadPlanRow> {
  const { context, actividad: current } = await requireActividadEmpresa(actividadId, "canManageCumplimiento");
  if (current.plan.estadoPlan !== "borrador") throw new Error("Solo se pueden editar actividades cuando el plan está en borrador.");

  const mesesEstados = defaultMesesEstados();
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
  await prisma.historialPlanTrabajo.create({ data: { planId: current.planId, accion: "Edición de actividad", usuario: context.email, actividadId } });
  return mapActividad(updated);
}

export async function actualizarEstadoMes(actividadId: string, mes: MesShort, estado: EstadoActividad): Promise<ActividadPlanRow> {
  const { actividad: current } = await requireActividadEmpresa(actividadId, "canManageCumplimiento");
  if (current.plan.estadoPlan === "aprobado") throw new Error("El plan aprobado no admite modificaciones.");
  const mesesActuales = parseMesesEstados(current.mesesEstados);
  mesesActuales[mes] = estado;
  const updated = await prisma.actividadPlanTrabajo.update({ where: { id: actividadId }, data: { mesesEstados: mesesActuales as unknown as Prisma.InputJsonValue } });
  return mapActividad(updated);
}

export async function eliminarActividad(actividadId: string): Promise<void> {
  const { context, actividad: current } = await requireActividadEmpresa(actividadId, "canManageCumplimiento");
  if (current.plan.estadoPlan !== "borrador") throw new Error("Solo se pueden eliminar actividades cuando el plan está en borrador.");
  await prisma.actividadPlanTrabajo.delete({ where: { id: actividadId } });
  await prisma.historialPlanTrabajo.create({ data: { planId: current.planId, accion: `Actividad eliminada: ${current.actividad}`, usuario: context.email } });
}

export async function getEvidencias(actividadId: string): Promise<EvidenciaRow[]> {
  await requireActividadEmpresa(actividadId, "canReadCumplimiento");
  const rows = await prisma.evidenciaActividadPlan.findMany({ where: { actividadId }, orderBy: { createdAt: "desc" } });
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

export async function crearEvidencia(actividadId: string, data: { archivo: string; archivoUrl?: string; observacion?: string }): Promise<EvidenciaRow> {
  const { context, actividad } = await requireActividadEmpresa(actividadId, "canManageCumplimiento");
  if (actividad.plan.estadoPlan === "aprobado") throw new Error("El plan está aprobado y no admite nuevas cargas de evidencia.");

  const evidencia = await prisma.evidenciaActividadPlan.create({
    data: {
      actividadId,
      archivo: data.archivo,
      archivoUrl: data.archivoUrl,
      observacion: data.observacion ?? "Archivo cargado correctamente",
      creadoPorId: context.email,
    },
  });
  await prisma.historialPlanTrabajo.create({
    data: { planId: actividad.planId, accion: "Carga de evidencia", usuario: context.email, actividadId, archivo: data.archivo },
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

export async function getHistorialPlan(planId: string): Promise<HistorialRow[]> {
  await requirePlanEmpresa(planId, "canReadCumplimiento");
  const rows = await prisma.historialPlanTrabajo.findMany({ where: { planId }, orderBy: { createdAt: "desc" } });
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

export async function enviarPlanRevision(planId: string): Promise<PlanTrabajoRow> {
  const { context, plan } = await requirePlanEmpresa(planId, "canManageCumplimiento");
  if (plan.estadoPlan !== "borrador") throw new Error("Solo se puede enviar a revisión un plan en estado borrador.");
  const newVersion = plan.version + 1;
  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: { estadoPlan: "en_revision", enviadoRevisionEn: new Date(), version: newVersion, motivoRechazo: null, rechazadoPor: null, rechazadoCargo: null, rechazadoEn: null },
  });
  await prisma.historialPlanTrabajo.create({ data: { planId, accion: `Plan enviado a revisión (v${newVersion})`, usuario: context.email } });
  return mapPlan(updated);
}

export async function aprobarPlan(planId: string, input: AprobacionInput): Promise<PlanTrabajoRow> {
  const { plan } = await requirePlanEmpresa(planId, "canManageCumplimiento");
  if (plan.estadoPlan !== "en_revision") throw new Error("Solo se puede aprobar un plan en revisión.");
  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: { estadoPlan: "aprobado", aprobadoPor: input.usuario, aprobadoCargo: input.cargo, aprobadoEn: new Date(), motivoRechazo: null, rechazadoPor: null, rechazadoCargo: null, rechazadoEn: null },
  });
  await prisma.historialPlanTrabajo.create({ data: { planId, accion: "Plan aprobado", usuario: `${input.usuario} · ${input.cargo}` } });
  return mapPlan(updated);
}

export async function rechazarPlan(planId: string, input: RechazoInput): Promise<PlanTrabajoRow> {
  if (!input.motivo.trim()) throw new Error("El motivo de rechazo es obligatorio.");
  const { plan } = await requirePlanEmpresa(planId, "canManageCumplimiento");
  if (plan.estadoPlan !== "en_revision") throw new Error("Solo se puede rechazar un plan en revisión.");
  const motivo = input.motivo.trim();
  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: { estadoPlan: "rechazado", rechazadoPor: input.usuario, rechazadoCargo: input.cargo, rechazadoEn: new Date(), motivoRechazo: motivo, aprobadoPor: null, aprobadoCargo: null, aprobadoEn: null },
  });
  await prisma.historialPlanTrabajo.create({ data: { planId, accion: `Plan rechazado: ${motivo}`, usuario: `${input.usuario} · ${input.cargo}` } });
  return mapPlan(updated);
}

export async function volverBorrador(planId: string): Promise<PlanTrabajoRow> {
  const { context, plan } = await requirePlanEmpresa(planId, "canManageCumplimiento");
  if (plan.estadoPlan !== "rechazado") throw new Error("Solo se puede devolver a borrador un plan rechazado.");
  const updated = await prisma.planTrabajo.update({
    where: { id: planId },
    data: { estadoPlan: "borrador", motivoRechazo: null, rechazadoPor: null, rechazadoCargo: null, rechazadoEn: null },
  });
  await prisma.historialPlanTrabajo.create({ data: { planId, accion: "Plan devuelto a borrador", usuario: context.email } });
  return mapPlan(updated);
}

export async function uploadEvidencia(actividadId: string, archivo: string): Promise<EvidenciaRow> {
  return crearEvidencia(actividadId, { archivo });
}
