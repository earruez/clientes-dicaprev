"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type CapacitacionCatalogo = {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  descripcion: string;
  modalidad: string;
  duracionHoras: number;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  vigenciaMeses: number;
  aplicaCargos: string[];
  aplicaAreas: string[];
  aplicaCentros: string[];
  esObligatoria: boolean;
  materialUrl?: string;
  videoUrl?: string;
  documentoUrl?: string;
  activa: boolean;
  createdAt: string;
};

export type CreateCapacitacionInput = {
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  modalidad: string;
  duracionHoras?: number | null;
  vigenciaMeses?: number | null;
  requiereEvaluacion?: boolean;
  requiereFirma?: boolean;
  generaCertificado?: boolean;
  esObligatoria?: boolean;
  activa?: boolean;
};

export type UpdateCapacitacionInput = Partial<CreateCapacitacionInput>;

function normalizeCodigo(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeText(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function toCatalogoShape(row: {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  descripcion: string | null;
  modalidad: string;
  duracionHoras: number | null;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  vigenciaMeses: number | null;
  esObligatoria: boolean;
  activa: boolean;
  createdAt: Date;
}): CapacitacionCatalogo {
  return {
    id: row.id,
    nombre: row.nombre,
    codigo: row.codigo,
    categoria: row.categoria,
    descripcion: row.descripcion ?? "",
    modalidad: row.modalidad,
    duracionHoras: row.duracionHoras ?? 0,
    requiereEvaluacion: row.requiereEvaluacion,
    requiereFirma: row.requiereFirma,
    generaCertificado: row.generaCertificado,
    vigenciaMeses: row.vigenciaMeses ?? 0,
    aplicaCargos: [],
    aplicaAreas: [],
    aplicaCentros: [],
    esObligatoria: row.esObligatoria,
    materialUrl: undefined,
    videoUrl: undefined,
    documentoUrl: undefined,
    activa: row.activa,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export async function getCapacitaciones(): Promise<CapacitacionCatalogo[]> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const rows = await prisma.capacitacion.findMany({
    where: { empresaId },
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      codigo: true,
      categoria: true,
      descripcion: true,
      modalidad: true,
      duracionHoras: true,
      requiereEvaluacion: true,
      requiereFirma: true,
      generaCertificado: true,
      vigenciaMeses: true,
      esObligatoria: true,
      activa: true,
      createdAt: true,
    },
  });

  return rows.map(toCatalogoShape);
}

export async function getCapacitacionById(id: string): Promise<CapacitacionCatalogo | null> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const row = await prisma.capacitacion.findFirst({
    where: { id, empresaId },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      categoria: true,
      descripcion: true,
      modalidad: true,
      duracionHoras: true,
      requiereEvaluacion: true,
      requiereFirma: true,
      generaCertificado: true,
      vigenciaMeses: true,
      esObligatoria: true,
      activa: true,
      createdAt: true,
    },
  });

  return row ? toCatalogoShape(row) : null;
}

export async function createCapacitacion(input: CreateCapacitacionInput): Promise<CapacitacionCatalogo> {
  const { empresaId } = await requirePermission("canManageCapacitaciones");

  const codigo = normalizeCodigo(input.codigo);
  const nombre = normalizeText(input.nombre);
  const categoria = normalizeText(input.categoria);
  const modalidad = normalizeText(input.modalidad);

  if (!codigo) throw new Error("codigo es requerido");
  if (!nombre) throw new Error("nombre es requerido");
  if (!categoria) throw new Error("categoria es requerida");
  if (!modalidad) throw new Error("modalidad es requerida");

  const upserted = await prisma.capacitacion.upsert({
    where: {
      empresaId_codigo: {
        empresaId,
        codigo,
      },
    },
    create: {
      empresaId,
      codigo,
      nombre,
      categoria,
      descripcion: normalizeText(input.descripcion) || null,
      modalidad,
      duracionHoras: input.duracionHoras ?? null,
      vigenciaMeses: input.vigenciaMeses ?? null,
      requiereEvaluacion: input.requiereEvaluacion ?? false,
      requiereFirma: input.requiereFirma ?? false,
      generaCertificado: input.generaCertificado ?? false,
      esObligatoria: input.esObligatoria ?? false,
      activa: input.activa ?? true,
    },
    update: {
      nombre,
      categoria,
      descripcion: normalizeText(input.descripcion) || null,
      modalidad,
      duracionHoras: input.duracionHoras ?? null,
      vigenciaMeses: input.vigenciaMeses ?? null,
      requiereEvaluacion: input.requiereEvaluacion ?? false,
      requiereFirma: input.requiereFirma ?? false,
      generaCertificado: input.generaCertificado ?? false,
      esObligatoria: input.esObligatoria ?? false,
      activa: input.activa ?? true,
    },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      categoria: true,
      descripcion: true,
      modalidad: true,
      duracionHoras: true,
      requiereEvaluacion: true,
      requiereFirma: true,
      generaCertificado: true,
      vigenciaMeses: true,
      esObligatoria: true,
      activa: true,
      createdAt: true,
    },
  });

  return toCatalogoShape(upserted);
}

export async function updateCapacitacion(
  id: string,
  input: UpdateCapacitacionInput,
): Promise<CapacitacionCatalogo> {
  const { empresaId } = await requirePermission("canManageCapacitaciones");

  const existing = await prisma.capacitacion.findFirst({
    where: { id, empresaId },
    select: { id: true, codigo: true },
  });

  if (!existing) {
    throw new Error("Capacitacion no encontrada");
  }

  const nextCodigo = input.codigo ? normalizeCodigo(input.codigo) : existing.codigo;

  if (input.codigo) {
    const duplicated = await prisma.capacitacion.findFirst({
      where: {
        empresaId,
        codigo: nextCodigo,
        id: { not: id },
      },
      select: { id: true },
    });

    if (duplicated) {
      throw new Error("Ya existe una capacitacion con ese codigo");
    }
  }

  await prisma.capacitacion.updateMany({
    where: { id, empresaId },
    data: {
      codigo: nextCodigo,
      nombre: input.nombre !== undefined ? normalizeText(input.nombre) : undefined,
      categoria: input.categoria !== undefined ? normalizeText(input.categoria) : undefined,
      descripcion:
        input.descripcion !== undefined ? normalizeText(input.descripcion) || null : undefined,
      modalidad: input.modalidad !== undefined ? normalizeText(input.modalidad) : undefined,
      duracionHoras: input.duracionHoras,
      vigenciaMeses: input.vigenciaMeses,
      requiereEvaluacion: input.requiereEvaluacion,
      requiereFirma: input.requiereFirma,
      generaCertificado: input.generaCertificado,
      esObligatoria: input.esObligatoria,
      activa: input.activa,
    },
  });

  const updated = await prisma.capacitacion.findFirstOrThrow({
    where: { id, empresaId },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      categoria: true,
      descripcion: true,
      modalidad: true,
      duracionHoras: true,
      requiereEvaluacion: true,
      requiereFirma: true,
      generaCertificado: true,
      vigenciaMeses: true,
      esObligatoria: true,
      activa: true,
      createdAt: true,
    },
  });

  return toCatalogoShape(updated);
}

export async function deleteCapacitacion(id: string): Promise<CapacitacionCatalogo> {
  const { empresaId } = await requirePermission("canManageCapacitaciones");

  const existing = await prisma.capacitacion.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Capacitacion no encontrada");
  }

  await prisma.capacitacion.updateMany({
    where: { id, empresaId },
    data: { activa: false },
  });

  const deleted = await prisma.capacitacion.findFirstOrThrow({
    where: { id, empresaId },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      categoria: true,
      descripcion: true,
      modalidad: true,
      duracionHoras: true,
      requiereEvaluacion: true,
      requiereFirma: true,
      generaCertificado: true,
      vigenciaMeses: true,
      esObligatoria: true,
      activa: true,
      createdAt: true,
    },
  });

  return toCatalogoShape(deleted);
}

export type EstadoCapacitacionAsignacion =
  | "pendiente"
  | "enviada"
  | "en_progreso"
  | "completada"
  | "vencida"
  | "cancelada";

export type AsignacionCapacitacion = {
  id: string;
  trabajadorId: string;
  trabajadorNombre: string;
  capacitacionId: string;
  capacitacionNombre: string;
  categoria: string;
  modalidad?: string;
  generaCertificado: boolean;
  sesionId?: string;
  origen: string;
  estado: EstadoCapacitacionAsignacion;
  fechaAsignacion: string;
  fechaEnvio?: string;
  fechaInicio?: string;
  fechaCompletada?: string;
  fechaRespuesta?: string;
  fechaVencimiento?: string;
  fechaCancelacion?: string;
  token?: string;
  observacion?: string;
  nota?: number;
  aprobado?: boolean;
  evidenciaDocumentoId?: string;
  certificadoDocumentoId?: string;
  evidenciaId?: string;
  certificadoId?: string;
  documentoId?: string;
  createdAt: string;
  updatedAt: string;
};

export type GetCapacitacionAsignacionesFilters = {
  trabajadorId?: string;
  capacitacionId?: string;
  estado?: EstadoCapacitacionAsignacion;
  includeCanceladas?: boolean;
};

export type CreateCapacitacionAsignacionInput = {
  trabajadorId: string;
  capacitacionId: string;
  sesionId?: string | null;
  origen?: string;
  estado?: EstadoCapacitacionAsignacion;
  fechaAsignacion?: string | Date;
  fechaEnvio?: string | Date | null;
  fechaInicio?: string | Date | null;
  fechaCompletada?: string | Date | null;
  fechaVencimiento?: string | Date | null;
  fechaCancelacion?: string | Date | null;
  token?: string | null;
  observacion?: string | null;
  nota?: number | null;
  aprobado?: boolean | null;
  evidenciaDocumentoId?: string | null;
  certificadoDocumentoId?: string | null;
  forceReasignar?: boolean;
};

export type UpdateCapacitacionAsignacionInput = {
  trabajadorId?: string;
  capacitacionId?: string;
  sesionId?: string | null;
  origen?: string;
  estado?: EstadoCapacitacionAsignacion;
  fechaAsignacion?: string | Date;
  fechaEnvio?: string | Date | null;
  fechaInicio?: string | Date | null;
  fechaCompletada?: string | Date | null;
  fechaVencimiento?: string | Date | null;
  fechaCancelacion?: string | Date | null;
  token?: string | null;
  observacion?: string | null;
  nota?: number | null;
  aprobado?: boolean | null;
  evidenciaDocumentoId?: string | null;
  certificadoDocumentoId?: string | null;
};

export type CambiarEstadoCapacitacionAsignacionInput = {
  estado: EstadoCapacitacionAsignacion;
  observacion?: string | null;
  nota?: number | null;
  aprobado?: boolean | null;
  fechaEvento?: string | Date;
};

const ESTADOS_ASIGNACION_VALIDOS: readonly EstadoCapacitacionAsignacion[] = [
  "pendiente",
  "enviada",
  "en_progreso",
  "completada",
  "vencida",
  "cancelada",
] as const;

const ESTADOS_TERMINALES = new Set<EstadoCapacitacionAsignacion>([
  "completada",
  "vencida",
  "cancelada",
]);

function parseOptionalDate(value: string | Date | null | undefined, fieldName: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha invalida para ${fieldName}`);
  }
  return parsed;
}

function parseOptionalTime(value: string | null | undefined, fieldName: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const normalized = value.trim();
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    throw new Error(`Hora invalida para ${fieldName}`);
  }

  const parsed = new Date(`1970-01-01T${normalized}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Hora invalida para ${fieldName}`);
  }

  return parsed;
}

function formatDateOnly(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function assertEstadoValido(value: string): EstadoCapacitacionAsignacion {
  if (!ESTADOS_ASIGNACION_VALIDOS.includes(value as EstadoCapacitacionAsignacion)) {
    throw new Error("Estado de asignacion invalido");
  }
  return value as EstadoCapacitacionAsignacion;
}

function isActiveAssignmentStatus(estado: EstadoCapacitacionAsignacion): boolean {
  return !ESTADOS_TERMINALES.has(estado);
}

function buildToken(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (!email) return null;
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return valid ? email : null;
}

function resolvePublicBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function sendCapacitacionEmail(input: {
  to: string;
  trabajadorNombre: string;
  capacitacionNombre: string;
  capacitacionCodigo?: string;
  modalidad?: string;
  url: string;
}): Promise<"resend" | "dev-log"> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.CAPACITACION_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    "onboarding@resend.dev";

  const subject = `Capacitación asignada: ${input.capacitacionNombre}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Nueva capacitación asignada</h2>
      <p>Hola <strong>${input.trabajadorNombre}</strong>,</p>
      <p>Se te ha asignado la capacitación <strong>${input.capacitacionNombre}</strong>${
        input.capacitacionCodigo ? ` (${input.capacitacionCodigo})` : ""
      }.</p>
      <p>Modalidad: <strong>${input.modalidad || "No definida"}</strong></p>
      <p>Para iniciar, abre el siguiente enlace:</p>
      <p><a href="${input.url}">${input.url}</a></p>
      <p style="margin-top: 18px; font-size: 12px; color: #64748b;">Correo enviado por NEXTPREV.</p>
    </div>
  `;

  if (!resendApiKey) {
    console.info("[capacitacion-email][dev-log]", {
      to: input.to,
      subject,
      url: input.url,
      modalidad: input.modalidad,
    });
    return "dev-log";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`No fue posible enviar correo de capacitación: ${payload}`);
  }

  return "resend";
}

async function createHistorialCapacitacion(
  tx: Prisma.TransactionClient,
  input: {
    empresaId: string;
    usuarioId?: string | null;
    trabajadorId: string;
    capacitacionId: string;
    asignacionId: string;
    sesionId?: string | null;
    tipoEvento: string;
    detalle?: string | null;
    estado?: string | null;
    vigenciaHasta?: Date | null;
    fechaEvento?: Date;
  },
): Promise<void> {
  await tx.capacitacionHistorial.create({
    data: {
      empresaId: input.empresaId,
      usuarioId: input.usuarioId,
      trabajadorId: input.trabajadorId,
      capacitacionId: input.capacitacionId,
      asignacionId: input.asignacionId,
      sesionId: input.sesionId ?? null,
      tipoEvento: input.tipoEvento,
      detalle: input.detalle ?? null,
      estado: input.estado ?? null,
      vigenciaHasta: input.vigenciaHasta ?? null,
      fechaEvento: input.fechaEvento,
    },
  });
}

function toAsignacionShape(row: {
  id: string;
  trabajadorId: string;
  capacitacionId: string;
  sesionId: string | null;
  origen: string;
  estado: string;
  fechaAsignacion: Date;
  fechaEnvio: Date | null;
  fechaInicio: Date | null;
  fechaCompletada: Date | null;
  fechaVencimiento: Date | null;
  fechaCancelacion: Date | null;
  token: string | null;
  observacion: string | null;
  nota: number | null;
  aprobado: boolean | null;
  evidenciaDocumentoId: string | null;
  certificadoDocumentoId: string | null;
  createdAt: Date;
  updatedAt: Date;
  trabajador: { nombres: string; apellidos: string };
  capacitacion: { nombre: string; categoria: string; modalidad: string; generaCertificado: boolean };
}): AsignacionCapacitacion {
  return {
    id: row.id,
    trabajadorId: row.trabajadorId,
    trabajadorNombre: `${row.trabajador.nombres} ${row.trabajador.apellidos}`.trim(),
    capacitacionId: row.capacitacionId,
    capacitacionNombre: row.capacitacion.nombre,
    categoria: row.capacitacion.categoria,
    modalidad: row.capacitacion.modalidad,
    generaCertificado: row.capacitacion.generaCertificado,
    sesionId: row.sesionId ?? undefined,
    origen: row.origen === "automatico" ? "automatica" : row.origen,
    estado: assertEstadoValido(row.estado),
    fechaAsignacion: formatDateOnly(row.fechaAsignacion) ?? "",
    fechaEnvio: formatDateOnly(row.fechaEnvio),
    fechaInicio: formatDateOnly(row.fechaInicio),
    fechaCompletada: formatDateOnly(row.fechaCompletada),
    fechaRespuesta: formatDateOnly(row.fechaCompletada),
    fechaVencimiento: formatDateOnly(row.fechaVencimiento),
    fechaCancelacion: formatDateOnly(row.fechaCancelacion),
    token: row.token ?? undefined,
    observacion: row.observacion ?? undefined,
    nota: row.nota ?? undefined,
    aprobado: row.aprobado ?? undefined,
    evidenciaDocumentoId: row.evidenciaDocumentoId ?? undefined,
    certificadoDocumentoId: row.certificadoDocumentoId ?? undefined,
    evidenciaId: row.evidenciaDocumentoId ?? undefined,
    certificadoId: row.certificadoDocumentoId ?? undefined,
    documentoId: row.certificadoDocumentoId ?? row.evidenciaDocumentoId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getAsignacionByIdOrThrow(id: string, empresaId: string) {
  return prisma.capacitacionAsignacion.findFirstOrThrow({
    where: { id, empresaId },
    include: {
      trabajador: { select: { nombres: true, apellidos: true } },
      capacitacion: { select: { nombre: true, categoria: true, modalidad: true, generaCertificado: true } },
    },
  });
}

export async function getCapacitacionAsignaciones(
  filters?: GetCapacitacionAsignacionesFilters,
): Promise<AsignacionCapacitacion[]> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const where: Prisma.CapacitacionAsignacionWhereInput = {
    empresaId,
    trabajadorId: filters?.trabajadorId,
    capacitacionId: filters?.capacitacionId,
    estado: filters?.estado,
  };

  if (!filters?.includeCanceladas && !filters?.estado) {
    where.estado = { not: "cancelada" };
  }

  const rows = await prisma.capacitacionAsignacion.findMany({
    where,
    include: {
      trabajador: { select: { nombres: true, apellidos: true } },
      capacitacion: { select: { nombre: true, categoria: true, modalidad: true, generaCertificado: true } },
    },
    orderBy: [{ fechaAsignacion: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(toAsignacionShape);
}

export async function createCapacitacionAsignacion(
  input: CreateCapacitacionAsignacionInput,
): Promise<AsignacionCapacitacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const estado = input.estado ?? "pendiente";
  const estadoValidado = assertEstadoValido(estado);
  const fechaAsignacion = parseOptionalDate(input.fechaAsignacion ?? new Date(), "fechaAsignacion");

  const result = await prisma.$transaction(async (tx) => {
    const trabajador = await tx.trabajador.findFirst({
      where: { id: input.trabajadorId, empresaId },
      select: { id: true },
    });
    if (!trabajador) {
      throw new Error("Trabajador no encontrado en la empresa");
    }

    const capacitacion = await tx.capacitacion.findFirst({
      where: { id: input.capacitacionId, empresaId },
      select: { id: true },
    });
    if (!capacitacion) {
      throw new Error("Capacitacion no encontrada en la empresa");
    }

    const duplicated = await tx.capacitacionAsignacion.findFirst({
      where: {
        empresaId,
        trabajadorId: input.trabajadorId,
        capacitacionId: input.capacitacionId,
        estado: { in: ["pendiente", "enviada", "en_progreso"] },
      },
      select: {
        id: true,
        estado: true,
        trabajadorId: true,
        capacitacionId: true,
        sesionId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (duplicated) {
      if (!input.forceReasignar) {
        throw new Error("Ya existe una asignacion activa para este trabajador y capacitacion");
      }

      await tx.capacitacionAsignacion.update({
        where: { id: duplicated.id },
        data: {
          estado: "cancelada",
          fechaCancelacion: new Date(),
        },
      });

      await createHistorialCapacitacion(tx, {
        empresaId,
        usuarioId,
        trabajadorId: duplicated.trabajadorId,
        capacitacionId: duplicated.capacitacionId,
        asignacionId: duplicated.id,
        sesionId: duplicated.sesionId,
        tipoEvento: "asignacion_cancelada",
        detalle: "Asignacion cancelada por reasignacion forzada",
        estado: "cancelada",
      });
    }

    const created = await tx.capacitacionAsignacion.create({
      data: {
        empresaId,
        trabajadorId: input.trabajadorId,
        capacitacionId: input.capacitacionId,
        sesionId: input.sesionId ?? null,
        origen: normalizeText(input.origen) || "manual",
        estado: estadoValidado,
        fechaAsignacion: fechaAsignacion ?? new Date(),
        fechaEnvio: parseOptionalDate(input.fechaEnvio, "fechaEnvio") ?? null,
        fechaInicio: parseOptionalDate(input.fechaInicio, "fechaInicio") ?? null,
        fechaCompletada: parseOptionalDate(input.fechaCompletada, "fechaCompletada") ?? null,
        fechaVencimiento: parseOptionalDate(input.fechaVencimiento, "fechaVencimiento") ?? null,
        fechaCancelacion:
          estadoValidado === "cancelada"
            ? parseOptionalDate(input.fechaCancelacion, "fechaCancelacion") ?? new Date()
            : parseOptionalDate(input.fechaCancelacion, "fechaCancelacion") ?? null,
        token: input.token === null ? null : input.token?.trim() || buildToken(),
        observacion: normalizeNullableText(input.observacion) ?? null,
        nota: input.nota ?? null,
        aprobado: input.aprobado ?? null,
        evidenciaDocumentoId: input.evidenciaDocumentoId ?? null,
        certificadoDocumentoId: input.certificadoDocumentoId ?? null,
      },
      include: {
        trabajador: { select: { nombres: true, apellidos: true } },
        capacitacion: { select: { nombre: true, categoria: true, modalidad: true, generaCertificado: true } },
      },
    });

    await createHistorialCapacitacion(tx, {
      empresaId,
      usuarioId,
      trabajadorId: created.trabajadorId,
      capacitacionId: created.capacitacionId,
      asignacionId: created.id,
      sesionId: created.sesionId,
      tipoEvento: "asignacion_creada",
      detalle: "Asignacion de capacitacion creada",
      estado: created.estado,
      vigenciaHasta: created.fechaVencimiento,
    });

    return created;
  });

  return toAsignacionShape(result);
}

export async function updateCapacitacionAsignacion(
  id: string,
  input: UpdateCapacitacionAsignacionInput,
): Promise<AsignacionCapacitacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.capacitacionAsignacion.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        trabajadorId: true,
        capacitacionId: true,
        sesionId: true,
        estado: true,
        fechaEnvio: true,
        fechaInicio: true,
        fechaCompletada: true,
        fechaVencimiento: true,
        fechaCancelacion: true,
      },
    });

    if (!existing) {
      throw new Error("Asignacion no encontrada");
    }

    const nextEstado = input.estado ? assertEstadoValido(input.estado) : assertEstadoValido(existing.estado);
    const nextTrabajadorId = input.trabajadorId ?? existing.trabajadorId;
    const nextCapacitacionId = input.capacitacionId ?? existing.capacitacionId;

    if (input.trabajadorId || input.capacitacionId) {
      const duplicated = await tx.capacitacionAsignacion.findFirst({
        where: {
          empresaId,
          trabajadorId: nextTrabajadorId,
          capacitacionId: nextCapacitacionId,
          id: { not: id },
          estado: { in: ["pendiente", "enviada", "en_progreso"] },
        },
        select: { id: true },
      });

      if (duplicated && isActiveAssignmentStatus(nextEstado)) {
        throw new Error("Ya existe una asignacion activa para este trabajador y capacitacion");
      }
    }

    const fechaAsignacion = parseOptionalDate(input.fechaAsignacion, "fechaAsignacion");

    await tx.capacitacionAsignacion.update({
      where: { id },
      data: {
        trabajadorId: input.trabajadorId,
        capacitacionId: input.capacitacionId,
        sesionId: input.sesionId,
        origen: input.origen !== undefined ? normalizeText(input.origen) : undefined,
        estado: input.estado ? assertEstadoValido(input.estado) : undefined,
        fechaAsignacion: fechaAsignacion === null ? undefined : fechaAsignacion,
        fechaEnvio: parseOptionalDate(input.fechaEnvio, "fechaEnvio"),
        fechaInicio: parseOptionalDate(input.fechaInicio, "fechaInicio"),
        fechaCompletada: parseOptionalDate(input.fechaCompletada, "fechaCompletada"),
        fechaVencimiento: parseOptionalDate(input.fechaVencimiento, "fechaVencimiento"),
        fechaCancelacion: parseOptionalDate(input.fechaCancelacion, "fechaCancelacion"),
        token: input.token === undefined ? undefined : input.token?.trim() || null,
        observacion: normalizeNullableText(input.observacion),
        nota: input.nota,
        aprobado: input.aprobado,
        evidenciaDocumentoId: input.evidenciaDocumentoId,
        certificadoDocumentoId: input.certificadoDocumentoId,
      },
    });

    const updated = await tx.capacitacionAsignacion.findFirstOrThrow({
      where: { id, empresaId },
      include: {
        trabajador: { select: { nombres: true, apellidos: true } },
        capacitacion: { select: { nombre: true, categoria: true, modalidad: true, generaCertificado: true } },
      },
    });

    if (existing.estado !== updated.estado) {
      await createHistorialCapacitacion(tx, {
        empresaId,
        usuarioId,
        trabajadorId: updated.trabajadorId,
        capacitacionId: updated.capacitacionId,
        asignacionId: updated.id,
        sesionId: updated.sesionId,
        tipoEvento: "asignacion_estado_actualizado",
        detalle: `Estado actualizado de ${existing.estado} a ${updated.estado}`,
        estado: updated.estado,
        vigenciaHasta: updated.fechaVencimiento,
      });
    }

    const changedDateFields: string[] = [];
    if (existing.fechaEnvio?.getTime() !== updated.fechaEnvio?.getTime()) changedDateFields.push("fechaEnvio");
    if (existing.fechaInicio?.getTime() !== updated.fechaInicio?.getTime()) changedDateFields.push("fechaInicio");
    if (existing.fechaCompletada?.getTime() !== updated.fechaCompletada?.getTime()) {
      changedDateFields.push("fechaCompletada");
    }
    if (existing.fechaVencimiento?.getTime() !== updated.fechaVencimiento?.getTime()) {
      changedDateFields.push("fechaVencimiento");
    }
    if (existing.fechaCancelacion?.getTime() !== updated.fechaCancelacion?.getTime()) {
      changedDateFields.push("fechaCancelacion");
    }

    if (changedDateFields.length > 0) {
      await createHistorialCapacitacion(tx, {
        empresaId,
        usuarioId,
        trabajadorId: updated.trabajadorId,
        capacitacionId: updated.capacitacionId,
        asignacionId: updated.id,
        sesionId: updated.sesionId,
        tipoEvento: "asignacion_fechas_actualizadas",
        detalle: `Fechas actualizadas: ${changedDateFields.join(", ")}`,
        estado: updated.estado,
        vigenciaHasta: updated.fechaVencimiento,
      });
    }

    return updated;
  });

  return toAsignacionShape(result);
}

export async function cambiarEstadoCapacitacionAsignacion(
  id: string,
  input: CambiarEstadoCapacitacionAsignacionInput,
): Promise<AsignacionCapacitacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");
  const nextEstado = assertEstadoValido(input.estado);
  const fechaEvento = parseOptionalDate(input.fechaEvento ?? new Date(), "fechaEvento") ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.capacitacionAsignacion.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        trabajadorId: true,
        capacitacionId: true,
        sesionId: true,
        estado: true,
        fechaEnvio: true,
        fechaInicio: true,
        fechaCompletada: true,
        fechaVencimiento: true,
        fechaCancelacion: true,
      },
    });

    if (!existing) {
      throw new Error("Asignacion no encontrada");
    }

    const datePatch: Prisma.CapacitacionAsignacionUpdateInput = {};
    if (nextEstado === "enviada" && !existing.fechaEnvio) {
      datePatch.fechaEnvio = fechaEvento;
    }
    if (nextEstado === "en_progreso" && !existing.fechaInicio) {
      datePatch.fechaInicio = fechaEvento;
    }
    if (nextEstado === "completada" && !existing.fechaCompletada) {
      datePatch.fechaCompletada = fechaEvento;
    }
    if (nextEstado === "vencida" && !existing.fechaVencimiento) {
      datePatch.fechaVencimiento = fechaEvento;
    }
    if (nextEstado === "cancelada" && !existing.fechaCancelacion) {
      datePatch.fechaCancelacion = fechaEvento;
    }

    await tx.capacitacionAsignacion.update({
      where: { id },
      data: {
        estado: nextEstado,
        observacion: normalizeNullableText(input.observacion),
        nota: input.nota,
        aprobado: input.aprobado,
        ...datePatch,
      },
    });

    const updated = await tx.capacitacionAsignacion.findFirstOrThrow({
      where: { id, empresaId },
      include: {
        trabajador: { select: { nombres: true, apellidos: true } },
        capacitacion: { select: { nombre: true, categoria: true, modalidad: true, generaCertificado: true } },
      },
    });

    await createHistorialCapacitacion(tx, {
      empresaId,
      usuarioId,
      trabajadorId: updated.trabajadorId,
      capacitacionId: updated.capacitacionId,
      asignacionId: updated.id,
      sesionId: updated.sesionId,
      tipoEvento: "asignacion_estado_actualizado",
      detalle: `Estado actualizado de ${existing.estado} a ${updated.estado}`,
      estado: updated.estado,
      vigenciaHasta: updated.fechaVencimiento,
      fechaEvento,
    });

    return updated;
  });

  return toAsignacionShape(result);
}

export async function deleteCapacitacionAsignacion(id: string): Promise<AsignacionCapacitacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  await prisma.capacitacionAsignacion.updateMany({
    where: { id, empresaId },
    data: {
      estado: "cancelada",
      fechaCancelacion: new Date(),
    },
  });

  const updated = await getAsignacionByIdOrThrow(id, empresaId);

  await prisma.capacitacionHistorial.create({
    data: {
      empresaId,
      usuarioId,
      trabajadorId: updated.trabajadorId,
      capacitacionId: updated.capacitacionId,
      asignacionId: updated.id,
      sesionId: updated.sesionId,
      tipoEvento: "asignacion_cancelada",
      detalle: "Asignacion cancelada manualmente",
      estado: "cancelada",
      vigenciaHasta: updated.fechaVencimiento,
    },
  });

  return toAsignacionShape(updated);
}

export async function enviarCapacitacionAsignacion(
  id: string,
  input?: { reenviar?: boolean },
): Promise<AsignacionCapacitacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.capacitacionAsignacion.findFirst({
      where: { id, empresaId },
      include: {
        trabajador: { select: { nombres: true, apellidos: true, email: true } },
        capacitacion: {
          select: {
            nombre: true,
            codigo: true,
            modalidad: true,
            categoria: true,
            generaCertificado: true,
          },
        },
      },
    });

    if (!existing) throw new Error("Asignacion no encontrada");
    if (existing.estado === "cancelada") {
      throw new Error("No se puede enviar una asignación cancelada");
    }

    const email = normalizeEmail(existing.trabajador.email);
    if (!email) {
      throw new Error("El trabajador no tiene correo válido para recibir la capacitación");
    }

    const token = existing.token || buildToken();
    if (!existing.token) {
      await tx.capacitacionAsignacion.update({
        where: { id: existing.id },
        data: { token },
      });
    }

    const url = `${resolvePublicBaseUrl()}/capacitacion/externa/${token}`;
    const provider = await sendCapacitacionEmail({
      to: email,
      trabajadorNombre: `${existing.trabajador.nombres} ${existing.trabajador.apellidos}`.trim(),
      capacitacionNombre: existing.capacitacion.nombre,
      capacitacionCodigo: existing.capacitacion.codigo,
      modalidad: existing.capacitacion.modalidad,
      url,
    });

    const now = new Date();
    const updated = await tx.capacitacionAsignacion.update({
      where: { id: existing.id },
      data: {
        estado: "enviada",
        fechaEnvio: now,
        token,
      },
      include: {
        trabajador: { select: { nombres: true, apellidos: true } },
        capacitacion: { select: { nombre: true, categoria: true, modalidad: true, generaCertificado: true } },
      },
    });

    await createHistorialCapacitacion(tx, {
      empresaId,
      usuarioId,
      trabajadorId: updated.trabajadorId,
      capacitacionId: updated.capacitacionId,
      asignacionId: updated.id,
      sesionId: updated.sesionId,
      tipoEvento: input?.reenviar ? "asignacion_reenviada_email" : "asignacion_enviada_email",
      detalle: `Correo ${input?.reenviar ? "reenviado" : "enviado"} vía ${provider}`,
      estado: updated.estado,
      vigenciaHasta: updated.fechaVencimiento,
      fechaEvento: now,
    });

    return updated;
  });

  return toAsignacionShape(result);
}

// ─── Flujo público por token ───────────────────────────────────────────────

export async function getCapacitacionAsignacionPublica(token: string): Promise<{
  asignacion: AsignacionCapacitacion;
  capacitacion: CapacitacionCatalogo;
  sesion: {
    id: string;
    titulo: string;
    modalidad: string;
    videoUrl?: string;
    videoDuracionSegundos?: number;
    minimoVisualizacionPct: number;
    evaluacionPreguntas: CapacitacionSesionPregunta[];
    evaluacionMinimoAprobacion: number;
  } | null;
} | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  const row = await prisma.capacitacionAsignacion.findFirst({
    where: {
      token: cleanToken,
      estado: { not: "cancelada" },
    },
    include: {
      trabajador: { select: { nombres: true, apellidos: true } },
      capacitacion: true,
      sesion: {
        select: {
          id: true,
          titulo: true,
          modalidad: true,
          videoUrl: true,
          videoDuracionSegundos: true,
          minimoVisualizacionPct: true,
          evaluacionPreguntas: true,
          evaluacionMinimoAprobacion: true,
        },
      },
    },
  });

  if (!row) return null;

  return {
    asignacion: toAsignacionShape(row),
    capacitacion: toCatalogoShape(row.capacitacion),
    sesion: row.sesion
      ? {
          id: row.sesion.id,
          titulo: row.sesion.titulo,
          modalidad: row.sesion.modalidad,
          videoUrl: row.sesion.videoUrl ?? undefined,
          videoDuracionSegundos: row.sesion.videoDuracionSegundos ?? undefined,
          minimoVisualizacionPct: clampPercentage(row.sesion.minimoVisualizacionPct, 85),
          evaluacionPreguntas: normalizePreguntasSesion(row.sesion.evaluacionPreguntas),
          evaluacionMinimoAprobacion: clampPercentage(row.sesion.evaluacionMinimoAprobacion, 70),
        }
      : null,
  };
}

export async function avanzarCapacitacionAsignacionPublica(
  token: string,
  input: {
    estado: "en_progreso" | "completada";
    nota?: number | null;
    aprobado?: boolean | null;
    videoWatchPercent?: number | null;
    observacion?: string | null;
  },
): Promise<AsignacionCapacitacion> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error("Token de asignacion invalido");
  }

  const nextEstado = input.estado;
  const fechaEvento = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.capacitacionAsignacion.findFirst({
      where: {
        token: cleanToken,
        estado: { not: "cancelada" },
      },
      select: {
        id: true,
        empresaId: true,
        trabajadorId: true,
        capacitacionId: true,
        sesionId: true,
        estado: true,
        fechaInicio: true,
        fechaCompletada: true,
        fechaVencimiento: true,
        sesion: {
          select: {
            videoUrl: true,
            minimoVisualizacionPct: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("Asignacion no encontrada");
    }

    const patch: Prisma.CapacitacionAsignacionUpdateInput = {
      estado: nextEstado,
      observacion: normalizeNullableText(input.observacion),
    };

    if (nextEstado === "en_progreso" && !existing.fechaInicio) {
      patch.fechaInicio = fechaEvento;
    }

    if (nextEstado === "completada") {
      if (existing.sesion?.videoUrl) {
        const watchPercent = clampPercentage(input.videoWatchPercent ?? 0, 0);
        const minPct = clampPercentage(existing.sesion.minimoVisualizacionPct, 85);
        if (watchPercent < minPct) {
          throw new Error("Debes completar la visualizacion minima del video antes de finalizar.");
        }
      }

      if (!existing.fechaCompletada) {
        patch.fechaCompletada = fechaEvento;
      }
      if (input.nota !== undefined) {
        patch.nota = input.nota;
      }
      if (input.aprobado !== undefined) {
        patch.aprobado = input.aprobado;
      }
    }

    await tx.capacitacionAsignacion.update({
      where: { id: existing.id },
      data: patch,
    });

    const updated = await tx.capacitacionAsignacion.findFirstOrThrow({
      where: { id: existing.id },
      include: {
        trabajador: { select: { nombres: true, apellidos: true } },
        capacitacion: { select: { nombre: true, categoria: true, modalidad: true, generaCertificado: true } },
      },
    });

    await createHistorialCapacitacion(tx, {
      empresaId: existing.empresaId,
      usuarioId: null,
      trabajadorId: existing.trabajadorId,
      capacitacionId: existing.capacitacionId,
      asignacionId: existing.id,
      sesionId: existing.sesionId,
      tipoEvento: nextEstado === "en_progreso" ? "asignacion_iniciada_publica" : "asignacion_completada_publica",
      detalle:
        nextEstado === "en_progreso"
          ? "Trabajador inició la capacitación mediante enlace externo"
          : `Trabajador completó la capacitación mediante enlace externo${input.nota != null ? ` · Nota ${input.nota}` : ""}${input.aprobado != null ? ` · ${input.aprobado ? "Aprobado" : "Reprobado"}` : ""}`,
      estado: updated.estado,
      vigenciaHasta: updated.fechaVencimiento,
      fechaEvento,
    });

    return updated;
  });

  return toAsignacionShape(result);
}
/* ─────────────────────────────────────────────────────────────────────────
  TIPOS DE SESIÓN Y ASISTENCIA
───────────────────────────────────────────────────────────────────────────── */

export type EstadoCapacitacionSesion =
  | "programada"
  | "en_curso"
  | "finalizada"
  | "cancelada";

export type EstadoAsistencia =
  | "presente"
  | "ausente"
  | "justificado"
  | "parcial";

export type CapacitacionSesionPregunta = {
  id: string;
  texto: string;
  opciones: string[];
  correcta: number;
};

export type CapacitacionSesion = {
  id: string;
  empresaId: string;
  capacitacionId: string;
  capacitacionNombre: string;
  titulo: string;
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  modalidad: string;
  ubicacion?: string;
  relator?: string;
  cupos?: number;
  videoUrl?: string;
  videoDuracionSegundos?: number;
  minimoVisualizacionPct: number;
  evaluacionPreguntas: CapacitacionSesionPregunta[];
  evaluacionMinimoAprobacion: number;
  asistentesConfirmados?: number;
  estado: EstadoCapacitacionSesion;
  createdAt: string;
  updatedAt: string;
};

export type AsistenciaCapacitacion = {
  id: string;
  empresaId: string;
  sesionId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  estadoAsistencia: EstadoAsistencia;
  observacion?: string;
  registradoEn: string;
};

export type CreateCapacitacionSesionInput = {
  capacitacionId: string;
  titulo: string;
  fecha: string | Date;
  horaInicio?: string | null;
  horaFin?: string | null;
  modalidad: string;
  ubicacion?: string | null;
  relator?: string | null;
  cupos?: number | null;
  videoUrl?: string | null;
  videoDuracionSegundos?: number | null;
  minimoVisualizacionPct?: number | null;
  evaluacionPreguntas?: CapacitacionSesionPregunta[] | null;
  evaluacionMinimoAprobacion?: number | null;
};

export type UpdateCapacitacionSesionInput = {
  titulo?: string;
  fecha?: string | Date;
  horaInicio?: string | null;
  horaFin?: string | null;
  modalidad?: string;
  ubicacion?: string | null;
  relator?: string | null;
  cupos?: number | null;
  videoUrl?: string | null;
  videoDuracionSegundos?: number | null;
  minimoVisualizacionPct?: number | null;
  evaluacionPreguntas?: CapacitacionSesionPregunta[] | null;
  evaluacionMinimoAprobacion?: number | null;
};

export type CambiarEstadoCapacitacionSesionInput = {
  estado: EstadoCapacitacionSesion;
  observacion?: string | null;
  fechaEvento?: string | Date;
};

export type CreateAsistenciaInput = {
  sesionId: string;
  trabajadorId: string;
  estadoAsistencia: EstadoAsistencia;
  observacion?: string | null;
};

/* ─────────────────────────────────────────────────────────────────────────
   VALIDADORES Y HELPERS PARA SESIONES
───────────────────────────────────────────────────────────────────────────── */

const ESTADOS_SESION_VALIDOS: readonly EstadoCapacitacionSesion[] = [
  "programada",
  "en_curso",
  "finalizada",
  "cancelada",
] as const;

const ESTADOS_ASISTENCIA_VALIDOS: readonly EstadoAsistencia[] = [
  "presente",
  "ausente",
  "justificado",
  "parcial",
] as const;

function assertEstadoSesionValido(value: string): EstadoCapacitacionSesion {
  if (!ESTADOS_SESION_VALIDOS.includes(value as EstadoCapacitacionSesion)) {
    throw new Error("Estado de sesion invalido");
  }
  return value as EstadoCapacitacionSesion;
}

function assertEstadoAsistenciaValido(value: string): EstadoAsistencia {
  if (!ESTADOS_ASISTENCIA_VALIDOS.includes(value as EstadoAsistencia)) {
    throw new Error("Estado de asistencia invalido");
  }
  return value as EstadoAsistencia;
}

function formatTimeFromDate(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString().slice(11, 16) : undefined;
}

function clampPercentage(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizePreguntasSesion(
  value: CapacitacionSesionPregunta[] | Prisma.JsonValue | null | undefined,
): CapacitacionSesionPregunta[] {
  if (!Array.isArray(value)) return [];

  const parsed: CapacitacionSesionPregunta[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const item = value[i] as unknown as Record<string, unknown>;
    const texto = typeof item?.texto === "string" ? item.texto.trim() : "";
    const opcionesRaw = Array.isArray(item?.opciones) ? item.opciones : [];
    const opciones = opcionesRaw
      .map((op) => (typeof op === "string" ? op.trim() : ""))
      .filter((op) => op.length > 0)
      .slice(0, 4);
    const correctaRaw = Number(item?.correcta);
    const correcta = Number.isInteger(correctaRaw) ? correctaRaw : -1;

    if (!texto || opciones.length < 2 || correcta < 0 || correcta >= opciones.length) {
      continue;
    }

    parsed.push({
      id: typeof item?.id === "string" && item.id.trim() ? item.id.trim() : `p${i + 1}`,
      texto,
      opciones,
      correcta,
    });
  }

  return parsed;
}

function toSesionShape(row: {
  id: string;
  empresaId: string;
  capacitacionId: string;
  titulo: string;
  fecha: Date;
  horaInicio: Date | null;
  horaFin: Date | null;
  modalidad: string;
  ubicacion: string | null;
  relator: string | null;
  cupos: number | null;
  videoUrl: string | null;
  videoDuracionSegundos: number | null;
  minimoVisualizacionPct: number;
  evaluacionPreguntas: Prisma.JsonValue | null;
  evaluacionMinimoAprobacion: number;
  estado: string;
  createdAt: Date;
  updatedAt: Date;
  capacitacion: { nombre: string };
  asistencias: { id: string }[];
}): CapacitacionSesion {
  const preguntas = normalizePreguntasSesion(row.evaluacionPreguntas);
  return {
    id: row.id,
    empresaId: row.empresaId,
    capacitacionId: row.capacitacionId,
    capacitacionNombre: row.capacitacion.nombre,
    titulo: row.titulo,
    fecha: formatDateOnly(row.fecha) ?? "",
    horaInicio: formatTimeFromDate(row.horaInicio),
    horaFin: formatTimeFromDate(row.horaFin),
    modalidad: row.modalidad,
    ubicacion: row.ubicacion ?? undefined,
    relator: row.relator ?? undefined,
    cupos: row.cupos ?? undefined,
    videoUrl: row.videoUrl ?? undefined,
    videoDuracionSegundos: row.videoDuracionSegundos ?? undefined,
    minimoVisualizacionPct: clampPercentage(row.minimoVisualizacionPct, 85),
    evaluacionPreguntas: preguntas,
    evaluacionMinimoAprobacion: clampPercentage(row.evaluacionMinimoAprobacion, 70),
    asistentesConfirmados: row.asistencias?.length ?? 0,
    estado: assertEstadoSesionValido(row.estado),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAsistenciaShape(row: {
  id: string;
  empresaId: string;
  sesionId: string;
  trabajadorId: string;
  estadoAsistencia: string;
  observacion: string | null;
  createdAt: Date;
  trabajador: { nombres: string; apellidos: string };
}): AsistenciaCapacitacion {
  return {
    id: row.id,
    empresaId: row.empresaId,
    sesionId: row.sesionId,
    trabajadorId: row.trabajadorId,
    trabajadorNombre: `${row.trabajador.nombres} ${row.trabajador.apellidos}`.trim(),
    estadoAsistencia: assertEstadoAsistenciaValido(row.estadoAsistencia),
    observacion: row.observacion ?? undefined,
    registradoEn: row.createdAt.toISOString(),
  };
}

async function createHistorialSesionTrabajador(
  tx: Prisma.TransactionClient,
  input: {
    empresaId: string;
    usuarioId: string;
    trabajadorId: string;
    capacitacionId: string;
    sesionId: string;
    tipoEvento: string;
    detalle?: string | null;
    estado?: string | null;
    fechaEvento?: Date;
  },
): Promise<void> {
  await tx.capacitacionHistorial.create({
    data: {
      empresaId: input.empresaId,
      usuarioId: input.usuarioId,
      trabajadorId: input.trabajadorId,
      capacitacionId: input.capacitacionId,
      asignacionId: null,
      sesionId: input.sesionId,
      tipoEvento: input.tipoEvento,
      detalle: input.detalle ?? null,
      estado: input.estado ?? null,
      vigenciaHasta: null,
      fechaEvento: input.fechaEvento,
    },
  });
}

async function resolveTrabajadoresSesionParaHistorial(
  tx: Prisma.TransactionClient,
  input: {
    empresaId: string;
    sesionId: string;
    capacitacionId: string;
  },
): Promise<string[]> {
  const [asistencias, asignacionesSesion, asignacionesCapacitacion] = await Promise.all([
    tx.capacitacionAsistencia.findMany({
      where: {
        empresaId: input.empresaId,
        sesionId: input.sesionId,
      },
      select: { trabajadorId: true },
    }),
    tx.capacitacionAsignacion.findMany({
      where: {
        empresaId: input.empresaId,
        sesionId: input.sesionId,
      },
      select: { trabajadorId: true },
    }),
    tx.capacitacionAsignacion.findMany({
      where: {
        empresaId: input.empresaId,
        capacitacionId: input.capacitacionId,
        estado: { not: "cancelada" },
      },
      select: { trabajadorId: true },
    }),
  ]);

  const workerIds = new Set<string>();
  for (const row of asistencias) workerIds.add(row.trabajadorId);
  for (const row of asignacionesSesion) workerIds.add(row.trabajadorId);
  for (const row of asignacionesCapacitacion) workerIds.add(row.trabajadorId);

  return Array.from(workerIds);
}

async function createHistorialEventoSesionMasivo(
  tx: Prisma.TransactionClient,
  input: {
    empresaId: string;
    usuarioId: string;
    sesionId: string;
    capacitacionId: string;
    tipoEvento: string;
    detalle: string;
    estado: string;
    fechaEvento: Date;
  },
): Promise<void> {
  const workerIds = await resolveTrabajadoresSesionParaHistorial(tx, {
    empresaId: input.empresaId,
    sesionId: input.sesionId,
    capacitacionId: input.capacitacionId,
  });

  if (workerIds.length === 0) return;

  await Promise.all(
    workerIds.map((trabajadorId) =>
      createHistorialSesionTrabajador(tx, {
        empresaId: input.empresaId,
        usuarioId: input.usuarioId,
        trabajadorId,
        capacitacionId: input.capacitacionId,
        sesionId: input.sesionId,
        tipoEvento: input.tipoEvento,
        detalle: input.detalle,
        estado: input.estado,
        fechaEvento: input.fechaEvento,
      }),
    ),
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ACCIONES DE SESIÓN
───────────────────────────────────────────────────────────────────────────── */

export async function getCapacitacionSesiones(): Promise<CapacitacionSesion[]> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const rows = await prisma.capacitacionSesion.findMany({
    where: { empresaId },
    include: {
      capacitacion: { select: { nombre: true } },
      asistencias: { select: { id: true } },
    },
    orderBy: [{ fecha: "desc" }, { horaInicio: "desc" }],
  });

  return rows.map(toSesionShape);
}

export async function getCapacitacionSesionById(id: string): Promise<CapacitacionSesion | null> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const row = await prisma.capacitacionSesion.findFirst({
    where: { id, empresaId },
    include: {
      capacitacion: { select: { nombre: true } },
      asistencias: { select: { id: true } },
    },
  });

  return row ? toSesionShape(row) : null;
}

export async function createCapacitacionSesion(
  input: CreateCapacitacionSesionInput,
): Promise<CapacitacionSesion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const capacitacionId = input.capacitacionId.trim();
  const titulo = normalizeText(input.titulo);
  const modalidad = normalizeText(input.modalidad);
  const fecha = parseOptionalDate(input.fecha, "fecha");
  const preguntas = normalizePreguntasSesion(input.evaluacionPreguntas ?? []);

  if (!capacitacionId) throw new Error("capacitacionId es requerido");
  if (!titulo) throw new Error("titulo es requerido");
  if (!modalidad) throw new Error("modalidad es requerida");
  if (!fecha) throw new Error("fecha es requerida");

  const result = await prisma.$transaction(async (tx) => {
    const capacitacion = await tx.capacitacion.findFirst({
      where: { id: capacitacionId, empresaId },
      select: { id: true },
    });

    if (!capacitacion) {
      throw new Error("Capacitacion no encontrada en la empresa");
    }

    const created = await tx.capacitacionSesion.create({
      data: {
        empresaId,
        capacitacionId: capacitacionId,
        titulo,
        fecha: fecha,
        horaInicio: parseOptionalTime(input.horaInicio, "horaInicio") ?? null,
        horaFin: parseOptionalTime(input.horaFin, "horaFin") ?? null,
        modalidad,
        ubicacion: normalizeNullableText(input.ubicacion) ?? null,
        relator: normalizeNullableText(input.relator) ?? null,
        cupos: input.cupos ?? null,
        videoUrl: normalizeNullableText(input.videoUrl) ?? null,
        videoDuracionSegundos: input.videoDuracionSegundos ?? null,
        minimoVisualizacionPct: clampPercentage(input.minimoVisualizacionPct ?? 85, 85),
        evaluacionPreguntas: preguntas as unknown as Prisma.InputJsonValue,
        evaluacionMinimoAprobacion: clampPercentage(input.evaluacionMinimoAprobacion ?? 70, 70),
        estado: "programada",
        creadoPorId: undefined,
      },
      include: {
        capacitacion: { select: { nombre: true } },
        asistencias: { select: { id: true } },
      },
    });

    await createHistorialEventoSesionMasivo(tx, {
      empresaId,
      usuarioId,
      sesionId: created.id,
      capacitacionId: created.capacitacionId,
      tipoEvento: "sesion_creada",
      detalle: `Sesion creada: ${created.titulo}`,
      estado: created.estado,
      fechaEvento: new Date(),
    });

    return created;
  });

  return toSesionShape(result);
}

export async function updateCapacitacionSesion(
  id: string,
  input: UpdateCapacitacionSesionInput,
): Promise<CapacitacionSesion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.capacitacionSesion.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        capacitacionId: true,
        titulo: true,
        fecha: true,
        horaInicio: true,
        horaFin: true,
        modalidad: true,
        ubicacion: true,
        relator: true,
        cupos: true,
        videoUrl: true,
        videoDuracionSegundos: true,
        minimoVisualizacionPct: true,
        evaluacionPreguntas: true,
        evaluacionMinimoAprobacion: true,
        estado: true,
      },
    });

    if (!existing) {
      throw new Error("Sesion no encontrada");
    }

    const updates: string[] = [];
    if (input.titulo && input.titulo !== existing.titulo) updates.push("titulo");
    if (input.fecha) {
      const parsedFecha = parseOptionalDate(input.fecha, "fecha");
      if (parsedFecha && formatDateOnly(parsedFecha) !== formatDateOnly(existing.fecha)) {
        updates.push("fecha");
      }
    }
    if (input.horaInicio !== undefined) updates.push("horaInicio");
    if (input.horaFin !== undefined) updates.push("horaFin");
    if (input.modalidad && input.modalidad !== existing.modalidad) updates.push("modalidad");
    if (input.ubicacion !== undefined && input.ubicacion !== existing.ubicacion) updates.push("ubicacion");
    if (input.relator !== undefined && input.relator !== existing.relator) updates.push("relator");
    if (input.cupos !== undefined && input.cupos !== existing.cupos) updates.push("cupos");
    if (input.videoUrl !== undefined && (normalizeNullableText(input.videoUrl) ?? null) !== existing.videoUrl) {
      updates.push("videoUrl");
    }
    if (input.videoDuracionSegundos !== undefined && input.videoDuracionSegundos !== existing.videoDuracionSegundos) {
      updates.push("videoDuracionSegundos");
    }
    if (
      input.minimoVisualizacionPct !== undefined &&
      clampPercentage(input.minimoVisualizacionPct ?? 85, 85) !== existing.minimoVisualizacionPct
    ) {
      updates.push("minimoVisualizacionPct");
    }
    if (
      input.evaluacionMinimoAprobacion !== undefined &&
      clampPercentage(input.evaluacionMinimoAprobacion ?? 70, 70) !== existing.evaluacionMinimoAprobacion
    ) {
      updates.push("evaluacionMinimoAprobacion");
    }
    if (input.evaluacionPreguntas !== undefined) updates.push("evaluacionPreguntas");

    const updateData: Prisma.CapacitacionSesionUpdateInput = {};
    if (input.titulo !== undefined) updateData.titulo = normalizeText(input.titulo);
    if (input.fecha !== undefined) {
      const parsed = parseOptionalDate(input.fecha, "fecha");
      if (parsed !== null) updateData.fecha = parsed;
    }
    if (input.horaInicio !== undefined) {
      updateData.horaInicio = parseOptionalTime(input.horaInicio, "horaInicio") ?? null;
    }
    if (input.horaFin !== undefined) {
      updateData.horaFin = parseOptionalTime(input.horaFin, "horaFin") ?? null;
    }
    if (input.modalidad !== undefined) updateData.modalidad = normalizeText(input.modalidad);
    if (input.ubicacion !== undefined) updateData.ubicacion = normalizeNullableText(input.ubicacion) ?? null;
    if (input.relator !== undefined) updateData.relator = normalizeNullableText(input.relator) ?? null;
    if (input.cupos !== undefined) updateData.cupos = input.cupos;
    if (input.videoUrl !== undefined) updateData.videoUrl = normalizeNullableText(input.videoUrl) ?? null;
    if (input.videoDuracionSegundos !== undefined) {
      updateData.videoDuracionSegundos = input.videoDuracionSegundos ?? null;
    }
    if (input.minimoVisualizacionPct !== undefined) {
      updateData.minimoVisualizacionPct = clampPercentage(input.minimoVisualizacionPct ?? 85, 85);
    }
    if (input.evaluacionPreguntas !== undefined) {
      const preguntas = normalizePreguntasSesion(input.evaluacionPreguntas);
      updateData.evaluacionPreguntas = preguntas as unknown as Prisma.InputJsonValue;
    }
    if (input.evaluacionMinimoAprobacion !== undefined) {
      updateData.evaluacionMinimoAprobacion = clampPercentage(input.evaluacionMinimoAprobacion ?? 70, 70);
    }

    await tx.capacitacionSesion.update({
      where: { id },
      data: updateData,
    });

    if (updates.length > 0) {
      await createHistorialEventoSesionMasivo(tx, {
        empresaId,
        usuarioId,
        sesionId: existing.id,
        capacitacionId: existing.capacitacionId,
        tipoEvento: "sesion_actualizada",
        detalle: `Sesion actualizada: ${updates.join(", ")}`,
        estado: existing.estado,
        fechaEvento: new Date(),
      });
    }

    const updated = await tx.capacitacionSesion.findFirstOrThrow({
      where: { id, empresaId },
      include: {
        capacitacion: { select: { nombre: true } },
        asistencias: { select: { id: true } },
      },
    });

    return updated;
  });

  return toSesionShape(result);
}

export async function cambiarEstadoCapacitacionSesion(
  id: string,
  input: CambiarEstadoCapacitacionSesionInput,
): Promise<CapacitacionSesion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");
  const nextEstado = assertEstadoSesionValido(input.estado);
  const fechaEvento = parseOptionalDate(input.fechaEvento ?? new Date(), "fechaEvento") ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.capacitacionSesion.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        capacitacionId: true,
        titulo: true,
        estado: true,
      },
    });

    if (!existing) {
      throw new Error("Sesion no encontrada");
    }

    if (existing.estado === nextEstado) {
      throw new Error(`Sesion ya esta en estado ${nextEstado}`);
    }

    await tx.capacitacionSesion.update({
      where: { id },
      data: {
        estado: nextEstado,
      },
    });

    await createHistorialEventoSesionMasivo(tx, {
      empresaId,
      usuarioId,
      sesionId: existing.id,
      capacitacionId: existing.capacitacionId,
      tipoEvento: "sesion_estado_actualizado",
      detalle: `Estado de sesion actualizado de ${existing.estado} a ${nextEstado}`,
      estado: nextEstado,
      fechaEvento,
    });

    const updated = await tx.capacitacionSesion.findFirstOrThrow({
      where: { id, empresaId },
      include: {
        capacitacion: { select: { nombre: true } },
        asistencias: { select: { id: true } },
      },
    });

    return updated;
  });

  return toSesionShape(result);
}

export async function deleteCapacitacionSesion(id: string): Promise<CapacitacionSesion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.capacitacionSesion.findFirst({
      where: { id, empresaId },
      select: { id: true, capacitacionId: true, titulo: true, estado: true },
    });

    if (!existing) {
      throw new Error("Sesion no encontrada");
    }

    await tx.capacitacionSesion.update({
      where: { id },
      data: { estado: "cancelada" },
    });

    await createHistorialEventoSesionMasivo(tx, {
      empresaId,
      usuarioId,
      sesionId: existing.id,
      capacitacionId: existing.capacitacionId,
      tipoEvento: "sesion_cancelada",
      detalle: `Sesion cancelada: ${existing.titulo}`,
      estado: "cancelada",
      fechaEvento: new Date(),
    });

    const updated = await tx.capacitacionSesion.findFirstOrThrow({
      where: { id, empresaId },
      include: {
        capacitacion: { select: { nombre: true } },
        asistencias: { select: { id: true } },
      },
    });

    return updated;
  });

  return toSesionShape(result);
}

/* ─────────────────────────────────────────────────────────────────────────
   ACCIONES DE ASISTENCIA
───────────────────────────────────────────────────────────────────────────── */

export async function getAsistenciasSesion(sesionId: string): Promise<AsistenciaCapacitacion[]> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const rows = await prisma.capacitacionAsistencia.findMany({
    where: { sesionId, empresaId },
    include: {
      trabajador: { select: { nombres: true, apellidos: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return rows.map(toAsistenciaShape);
}

export async function bootstrapAsistenciasSesion(
  sesionId: string,
): Promise<{ created: number; total: number }> {
  const { empresaId } = await requirePermission("canManageCapacitaciones");

  const cleanSesionId = sesionId.trim();
  if (!cleanSesionId) {
    throw new Error("sesionId es requerido");
  }

  return prisma.$transaction(async (tx) => {
    const sesion = await tx.capacitacionSesion.findFirst({
      where: { id: cleanSesionId, empresaId },
      select: { id: true, capacitacionId: true },
    });

    if (!sesion) {
      throw new Error("Sesion no encontrada en la empresa");
    }

    const [existingRows, asignacionesSesion, asignacionesCapacitacion] = await Promise.all([
      tx.capacitacionAsistencia.findMany({
        where: { empresaId, sesionId: cleanSesionId },
        select: { trabajadorId: true },
      }),
      tx.capacitacionAsignacion.findMany({
        where: {
          empresaId,
          sesionId: cleanSesionId,
          estado: { not: "cancelada" },
        },
        select: { trabajadorId: true },
      }),
      tx.capacitacionAsignacion.findMany({
        where: {
          empresaId,
          capacitacionId: sesion.capacitacionId,
          estado: { not: "cancelada" },
        },
        select: { trabajadorId: true },
      }),
    ]);

    const existing = new Set(existingRows.map((r) => r.trabajadorId));
    const candidates = new Set<string>();
    for (const row of asignacionesSesion) candidates.add(row.trabajadorId);
    for (const row of asignacionesCapacitacion) candidates.add(row.trabajadorId);

    const missing = Array.from(candidates).filter((id) => !existing.has(id));

    if (missing.length > 0) {
      await tx.capacitacionAsistencia.createMany({
        data: missing.map((trabajadorId) => ({
          empresaId,
          sesionId: cleanSesionId,
          trabajadorId,
          capacitacionId: sesion.capacitacionId,
          estadoAsistencia: "ausente",
          fecha: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    const total = await tx.capacitacionAsistencia.count({
      where: { empresaId, sesionId: cleanSesionId },
    });

    return {
      created: missing.length,
      total,
    };
  });
}

export async function registrarAsistenciaCapacitacion(
  input: CreateAsistenciaInput,
): Promise<AsistenciaCapacitacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const estadoAsistencia = assertEstadoAsistenciaValido(input.estadoAsistencia);
  const trabajadorId = input.trabajadorId.trim();
  const sesionId = input.sesionId.trim();

  if (!trabajadorId) throw new Error("trabajadorId es requerido");
  if (!sesionId) throw new Error("sesionId es requerido");

  const result = await prisma.$transaction(async (tx) => {
    const sesion = await tx.capacitacionSesion.findFirst({
      where: { id: sesionId, empresaId },
      select: { id: true, capacitacionId: true },
    });

    if (!sesion) {
      throw new Error("Sesion no encontrada en la empresa");
    }

    const trabajador = await tx.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: { id: true },
    });

    if (!trabajador) {
      throw new Error("Trabajador no encontrado en la empresa");
    }

    const existing = await tx.capacitacionAsistencia.findFirst({
      where: {
        sesionId: sesionId,
        trabajadorId: trabajadorId,
        empresaId,
      },
      select: { id: true, estadoAsistencia: true },
    });

    let result_row;

    if (existing) {
      const previousEstado = existing.estadoAsistencia;
      await tx.capacitacionAsistencia.update({
        where: { id: existing.id },
        data: {
          estadoAsistencia,
          observacion: normalizeNullableText(input.observacion) ?? null,
        },
      });

      result_row = await tx.capacitacionAsistencia.findFirstOrThrow({
        where: { id: existing.id },
        include: {
          trabajador: { select: { nombres: true, apellidos: true } },
        },
      });

      if (previousEstado !== estadoAsistencia) {
        await createHistorialSesionTrabajador(tx, {
          empresaId,
          usuarioId,
          trabajadorId: trabajadorId,
          capacitacionId: sesion.capacitacionId,
          sesionId: sesionId,
          tipoEvento: "asistencia_registrada",
          detalle: `Asistencia actualizada de ${previousEstado} a ${estadoAsistencia}`,
          estado: estadoAsistencia,
        });
      }
    } else {
      result_row = await tx.capacitacionAsistencia.create({
        data: {
          empresaId,
          sesionId: sesionId,
          trabajadorId: trabajadorId,
          capacitacionId: sesion.capacitacionId,
          estadoAsistencia,
          observacion: normalizeNullableText(input.observacion) ?? null,
          fecha: new Date(),
        },
        include: {
          trabajador: { select: { nombres: true, apellidos: true } },
        },
      });

      await createHistorialSesionTrabajador(tx, {
        empresaId,
        usuarioId,
        trabajadorId: trabajadorId,
        capacitacionId: sesion.capacitacionId,
        sesionId: sesionId,
        tipoEvento: "asistencia_registrada",
        detalle: `Asistencia registrada: ${estadoAsistencia}`,
        estado: estadoAsistencia,
      });
    }

    return result_row;
  });

  return toAsistenciaShape(result);
}

/* ─────────────────────────────────────────────────────────────────────────
   TIPOS DE EVALUACIÓN
───────────────────────────────────────────────────────────────────────────── */

export type CapacitacionEvaluacion = {
  id: string;
  empresaId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  capacitacionId: string;
  capacitacionNombre: string;
  asignacionId: string | null;
  sesionId: string | null;
  estado: string;
  asistencia: boolean | null;
  nota: number | null;
  aprobado: boolean | null;
  fechaEvaluacion: string;
  observacion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCapacitacionEvaluacionInput = {
  trabajadorId: string;
  capacitacionId: string;
  asignacionId?: string | null;
  sesionId?: string | null;
  asistencia?: boolean | null;
  nota?: number | null;
  aprobado?: boolean | null;
  fechaEvaluacion: string | Date;
  observacion?: string | null;
};

export type UpdateCapacitacionEvaluacionInput = {
  asistencia?: boolean | null;
  nota?: number | null;
  aprobado?: boolean | null;
  fechaEvaluacion?: string | Date;
  observacion?: string | null;
};

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS DE EVALUACIÓN
───────────────────────────────────────────────────────────────────────────── */

function toEvaluacionShape(row: {
  id: string;
  empresaId: string;
  trabajadorId: string;
  capacitacionId: string;
  asignacionId: string | null;
  sesionId: string | null;
  estado: string;
  asistencia: boolean | null;
  nota: number | null;
  aprobado: boolean | null;
  fechaEvaluacion: Date;
  observacion: string | null;
  createdAt: Date;
  updatedAt: Date;
  trabajador: { nombres: string; apellidos: string };
  capacitacion: { nombre: string };
}): CapacitacionEvaluacion {
  return {
    id: row.id,
    empresaId: row.empresaId,
    trabajadorId: row.trabajadorId,
    trabajadorNombre: `${row.trabajador.nombres} ${row.trabajador.apellidos}`.trim(),
    capacitacionId: row.capacitacionId,
    capacitacionNombre: row.capacitacion.nombre,
    asignacionId: row.asignacionId,
    sesionId: row.sesionId,
    estado: row.estado,
    asistencia: row.asistencia,
    nota: row.nota,
    aprobado: row.aprobado,
    fechaEvaluacion: row.fechaEvaluacion.toISOString().slice(0, 10),
    observacion: row.observacion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const EVALUACION_INCLUDE = {
  trabajador: { select: { nombres: true, apellidos: true } },
  capacitacion: { select: { nombre: true } },
} as const;

async function createHistorialEvaluacion(
  tx: Prisma.TransactionClient,
  input: {
    empresaId: string;
    usuarioId: string;
    trabajadorId: string;
    capacitacionId: string;
    evaluacionId: string;
    asignacionId?: string | null;
    sesionId?: string | null;
    tipoEvento: string;
    detalle?: string | null;
    estado?: string | null;
  },
): Promise<void> {
  await tx.capacitacionHistorial.create({
    data: {
      empresaId: input.empresaId,
      usuarioId: input.usuarioId,
      trabajadorId: input.trabajadorId,
      capacitacionId: input.capacitacionId,
      evaluacionId: input.evaluacionId,
      asignacionId: input.asignacionId ?? null,
      sesionId: input.sesionId ?? null,
      tipoEvento: input.tipoEvento,
      detalle: input.detalle ?? null,
      estado: input.estado ?? null,
      vigenciaHasta: null,
      fechaEvento: new Date(),
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   ACCIONES DE EVALUACIÓN
───────────────────────────────────────────────────────────────────────────── */

export async function getCapacitacionEvaluaciones(filters?: {
  capacitacionId?: string;
  trabajadorId?: string;
  sesionId?: string;
}): Promise<CapacitacionEvaluacion[]> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const rows = await prisma.capacitacionEvaluacion.findMany({
    where: {
      empresaId,
      ...(filters?.capacitacionId ? { capacitacionId: filters.capacitacionId } : {}),
      ...(filters?.trabajadorId ? { trabajadorId: filters.trabajadorId } : {}),
      ...(filters?.sesionId ? { sesionId: filters.sesionId } : {}),
    },
    include: EVALUACION_INCLUDE,
    orderBy: { fechaEvaluacion: "desc" },
  });

  return rows.map(toEvaluacionShape);
}

export async function createCapacitacionEvaluacion(
  input: CreateCapacitacionEvaluacionInput,
): Promise<CapacitacionEvaluacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const trabajadorId = input.trabajadorId?.trim();
  const capacitacionId = input.capacitacionId?.trim();
  if (!trabajadorId) throw new Error("trabajadorId es requerido");
  if (!capacitacionId) throw new Error("capacitacionId es requerido");

  const [trabajador, capacitacion] = await Promise.all([
    prisma.trabajador.findFirst({ where: { id: trabajadorId, empresaId }, select: { id: true } }),
    prisma.capacitacion.findFirst({ where: { id: capacitacionId, empresaId }, select: { id: true } }),
  ]);
  if (!trabajador) throw new Error("Trabajador no encontrado en la empresa");
  if (!capacitacion) throw new Error("Capacitación no encontrada en la empresa");

  const fechaDate = typeof input.fechaEvaluacion === "string"
    ? new Date(input.fechaEvaluacion)
    : input.fechaEvaluacion;
  if (isNaN(fechaDate.getTime())) throw new Error("Fecha de evaluación inválida");

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.capacitacionEvaluacion.create({
      data: {
        empresaId,
        trabajadorId,
        capacitacionId,
        asignacionId: input.asignacionId ?? null,
        sesionId: input.sesionId ?? null,
        estado: "registrada",
        asistencia: input.asistencia ?? null,
        nota: input.nota ?? null,
        aprobado: input.aprobado ?? null,
        fechaEvaluacion: fechaDate,
        observacion: normalizeNullableText(input.observacion) ?? null,
      },
      include: EVALUACION_INCLUDE,
    });

    await createHistorialEvaluacion(tx, {
      empresaId,
      usuarioId,
      trabajadorId,
      capacitacionId,
      evaluacionId: row.id,
      asignacionId: row.asignacionId,
      sesionId: row.sesionId,
      tipoEvento: "evaluacion_creada",
      detalle: `Evaluación creada${row.nota != null ? ` · Nota: ${row.nota}` : ""}${row.aprobado != null ? ` · ${row.aprobado ? "Aprobado" : "Reprobado"}` : ""}`,
      estado: row.aprobado != null ? (row.aprobado ? "aprobado" : "reprobado") : "registrada",
    });

    return row;
  });

  return toEvaluacionShape(result);
}

export async function updateCapacitacionEvaluacion(
  id: string,
  input: UpdateCapacitacionEvaluacionInput,
): Promise<CapacitacionEvaluacion> {
  const { empresaId, usuarioId } = await requirePermission("canManageCapacitaciones");

  const existing = await prisma.capacitacionEvaluacion.findFirst({
    where: { id, empresaId },
    select: { id: true, trabajadorId: true, capacitacionId: true, asignacionId: true, sesionId: true, nota: true, aprobado: true },
  });
  if (!existing) throw new Error("Evaluación no encontrada");

  const fechaDate = input.fechaEvaluacion
    ? (typeof input.fechaEvaluacion === "string" ? new Date(input.fechaEvaluacion) : input.fechaEvaluacion)
    : undefined;
  if (fechaDate && isNaN(fechaDate.getTime())) throw new Error("Fecha de evaluación inválida");

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.capacitacionEvaluacion.update({
      where: { id },
      data: {
        ...(input.asistencia !== undefined ? { asistencia: input.asistencia } : {}),
        ...(input.nota !== undefined ? { nota: input.nota } : {}),
        ...(input.aprobado !== undefined ? { aprobado: input.aprobado } : {}),
        ...(fechaDate ? { fechaEvaluacion: fechaDate } : {}),
        ...(input.observacion !== undefined ? { observacion: normalizeNullableText(input.observacion) ?? null } : {}),
        ...(input.aprobado !== undefined ? { estado: input.aprobado ? "aprobada" : "reprobada" } : {}),
      },
      include: EVALUACION_INCLUDE,
    });

    const notaCambio = input.nota !== undefined && input.nota !== existing.nota;
    const aprobadoCambio = input.aprobado !== undefined && input.aprobado !== existing.aprobado;

    if (notaCambio || aprobadoCambio) {
      await createHistorialEvaluacion(tx, {
        empresaId,
        usuarioId,
        trabajadorId: existing.trabajadorId,
        capacitacionId: existing.capacitacionId,
        evaluacionId: id,
        asignacionId: existing.asignacionId,
        sesionId: existing.sesionId,
        tipoEvento: "evaluacion_actualizada",
        detalle: [
          notaCambio ? `Nota actualizada a ${input.nota}` : null,
          aprobadoCambio ? (input.aprobado ? "Marcado como aprobado" : "Marcado como reprobado") : null,
        ].filter(Boolean).join(" · "),
        estado: updated.aprobado != null ? (updated.aprobado ? "aprobado" : "reprobado") : "registrada",
      });
    }

    return updated;
  });

  return toEvaluacionShape(result);
}

export async function registrarResultadoEvaluacion(
  id: string,
  resultado: { nota: number; aprobado: boolean; observacion?: string | null },
): Promise<CapacitacionEvaluacion> {
  return updateCapacitacionEvaluacion(id, {
    nota: resultado.nota,
    aprobado: resultado.aprobado,
    observacion: resultado.observacion,
  });
}

// ─── Historial ────────────────────────────────────────────────────────────────

export type CapacitacionHistorialEvento = {
  id: string;
  empresaId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  trabajadorCargo: string;
  capacitacionId: string;
  capacitacionNombre: string;
  asignacionId: string | null;
  sesionId: string | null;
  evaluacionId: string | null;
  tipoEvento: string;
  detalle: string | null;
  estado: string | null;
  fechaEvento: string;
  vigenciaHasta: string | null;
};

const HISTORIAL_INCLUDE = {
  trabajador: { select: { id: true, nombres: true, apellidos: true, rut: true, cargo: { select: { nombre: true } } } },
  capacitacion: { select: { id: true, nombre: true } },
} as const;

function toHistorialShape(row: {
  id: string;
  empresaId: string;
  trabajadorId: string;
  trabajador: { nombres: string; apellidos: string; rut: string | null; cargo: { nombre: string } | null };
  capacitacionId: string;
  capacitacion: { nombre: string };
  asignacionId: string | null;
  sesionId: string | null;
  evaluacionId: string | null;
  tipoEvento: string;
  detalle: string | null;
  estado: string | null;
  fechaEvento: Date;
  vigenciaHasta: Date | null;
}): CapacitacionHistorialEvento {
  return {
    id: row.id,
    empresaId: row.empresaId,
    trabajadorId: row.trabajadorId,
    trabajadorNombre: `${row.trabajador.nombres} ${row.trabajador.apellidos}`.trim(),
    trabajadorRut: row.trabajador.rut ?? "",
    trabajadorCargo: row.trabajador.cargo?.nombre ?? "",
    capacitacionId: row.capacitacionId,
    capacitacionNombre: row.capacitacion.nombre,
    asignacionId: row.asignacionId,
    sesionId: row.sesionId,
    evaluacionId: row.evaluacionId,
    tipoEvento: row.tipoEvento,
    detalle: row.detalle,
    estado: row.estado,
    fechaEvento: row.fechaEvento.toISOString().slice(0, 10),
    vigenciaHasta: row.vigenciaHasta ? row.vigenciaHasta.toISOString().slice(0, 10) : null,
  };
}

export async function getCapacitacionHistorial(filters?: {
  trabajadorId?: string;
  capacitacionId?: string;
  estado?: string;
  tipoEvento?: string;
}): Promise<CapacitacionHistorialEvento[]> {
  const { empresaId } = await requirePermission("canReadCapacitaciones");

  const rows = await prisma.capacitacionHistorial.findMany({
    where: {
      empresaId,
      ...(filters?.trabajadorId ? { trabajadorId: filters.trabajadorId } : {}),
      ...(filters?.capacitacionId ? { capacitacionId: filters.capacitacionId } : {}),
      ...(filters?.estado ? { estado: filters.estado } : {}),
      ...(filters?.tipoEvento ? { tipoEvento: filters.tipoEvento } : {}),
    },
    orderBy: { fechaEvento: "desc" },
    include: HISTORIAL_INCLUDE,
  });

  return rows.map(toHistorialShape);
}
