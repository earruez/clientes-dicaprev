"use server";

import { evaluarDocumentosPendientesPorEvento } from "@/actions/trabajadores/documentos";
import { generarDocumentosInduccionDesdePlantillasTx } from "@/actions/inducciones/documentos-generados";
import { evaluarCapacitacionesPorEvento } from "@/lib/capacitacion/evaluar-capacitaciones";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { Worker, WorkerContrato, WorkerEstado } from "@/components/trabajadores-v2/types";

export type { Worker, WorkerContrato, WorkerEstado };

type DbTrabajador = Awaited<ReturnType<typeof fetchTrabajadorById>>;

async function fetchTrabajadorById(id: string, empresaId: string) {
  return prisma.trabajador.findFirstOrThrow({
    where: { id, empresaId },
    include: {
      centroTrabajo: { select: { id: true, nombre: true } },
      area: { select: { id: true, nombre: true } },
      cargo: { select: { id: true, nombre: true, esCritico: true } },
      posicionDotacion: { select: { id: true } },
      documentos: { select: { estado: true } },
    },
  });
}

function mapDbEstadoToUi(estado: string): WorkerEstado {
  if (estado === "inactivo" || estado === "Inactivo") return "Inactivo";
  if (estado === "licencia" || estado === "Licencia") return "Licencia";
  if (estado === "vacaciones" || estado === "Vacaciones") return "Vacaciones";
  return "Activo";
}

function mapUiEstadoToDb(estado: WorkerEstado): string {
  if (estado === "Inactivo") return "inactivo";
  if (estado === "Licencia") return "licencia";
  if (estado === "Vacaciones") return "vacaciones";
  return "activo";
}

function mapDbContratoToUi(tipoContrato: string | null | undefined): WorkerContrato {
  if (tipoContrato === "Plazo Fijo") return "Plazo Fijo";
  if (tipoContrato === "Por Obra") return "Por Obra";
  if (tipoContrato === "Part Time") return "Part Time";
  return "Indefinido";
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeRutComparable(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
}

async function assertRutDisponible(input: { empresaId: string; rut: string | null; excludeTrabajadorId?: string }) {
  const rutComparable = normalizeRutComparable(input.rut);
  if (!rutComparable) return;

  const rows = await prisma.trabajador.findMany({
    where: {
      empresaId: input.empresaId,
      rut: { not: null },
      ...(input.excludeTrabajadorId ? { id: { not: input.excludeTrabajadorId } } : {}),
    },
    select: { id: true, rut: true },
  });

  const duplicated = rows.some((row) => normalizeRutComparable(row.rut) === rutComparable);
  if (duplicated) {
    throw new Error("Ya existe un trabajador con ese RUT en la empresa.");
  }
}

function normalizeWorker(row: NonNullable<DbTrabajador>): Worker {
  const documentosPendientes = row.documentos.filter((d) => d.estado !== "completo").length;

  return {
    id: row.id,
    nombre: row.nombres,
    apellido: row.apellidos,
    rut: row.rut ?? "",
    cargo: row.cargo?.nombre ?? "Sin cargo",
    area: row.area?.nombre ?? "Sin área",
    centroTrabajo: row.centroTrabajo?.nombre ?? "Sin centro",
    email: row.email ?? "",
    telefono: row.telefono ?? "",
    estado: mapDbEstadoToUi(row.estado),
    fechaIngreso: row.fechaIngreso ? row.fechaIngreso.toISOString().slice(0, 10) : "",
    fechaNacimiento: row.fechaNacimiento ? row.fechaNacimiento.toISOString().slice(0, 10) : "",
    tipoContrato: mapDbContratoToUi(row.tipoContrato),
    documentosPendientes,
    capacitacionesPendientes: 0,
    cargoEsCritico: Boolean(row.cargo?.esCritico),
    dotacionId: row.posicionDotacion?.id,
  };
}

async function findCentroTrabajoId(empresaId: string, nombre: string): Promise<string | null> {
  const value = nombre.trim();
  if (!value) return null;
  const centro = await prisma.centroTrabajo.findFirst({
    where: { empresaId, nombre: value },
    select: { id: true },
  });
  return centro?.id ?? null;
}

async function findAreaId(empresaId: string, nombre: string): Promise<string | null> {
  const value = nombre.trim();
  if (!value) return null;
  const area = await prisma.area.findFirst({
    where: { empresaId, nombre: value },
    select: { id: true },
  });
  return area?.id ?? null;
}

async function findCargo(empresaId: string, nombre: string) {
  const value = nombre.trim();
  if (!value) return null;
  return prisma.cargo.findFirst({
    where: { empresaId, nombre: value },
    select: { id: true, areaId: true },
  });
}

async function findPosicionDotacionId(
  empresaId: string,
  centroTrabajoId: string | null,
  cargoId: string | null,
): Promise<string | null> {
  if (!centroTrabajoId || !cargoId) return null;
  const posicion = await prisma.posicionDotacion.findFirst({
    where: { empresaId, centroTrabajoId, cargoId, estado: "activa" },
    select: { id: true },
  });
  return posicion?.id ?? null;
}

async function toDbPayload(worker: Worker, empresaId: string) {
  const cargo = await findCargo(empresaId, worker.cargo);
  const areaId = (await findAreaId(empresaId, worker.area)) ?? cargo?.areaId ?? null;
  const centroTrabajoId = await findCentroTrabajoId(empresaId, worker.centroTrabajo);
  const cargoId = cargo?.id ?? null;
  const posicionDotacionId = worker.dotacionId ?? (await findPosicionDotacionId(empresaId, centroTrabajoId, cargoId));

  return {
    nombres: worker.nombre.trim(),
    apellidos: worker.apellido.trim(),
    rut: worker.rut.trim() || null,
    email: worker.email.trim() || null,
    telefono: worker.telefono.trim() || null,
    estado: mapUiEstadoToDb(worker.estado),
    fechaIngreso: parseDateOnly(worker.fechaIngreso),
    fechaNacimiento: parseDateOnly(worker.fechaNacimiento),
    tipoContrato: worker.tipoContrato,
    centroTrabajoId,
    areaId,
    cargoId,
    posicionDotacionId,
  };
}

async function crearInduccionAutomaticaSiCorresponde(input: {
  empresaId: string;
  trabajadorId: string;
  usuarioId: string;
}): Promise<void> {
  const induccionExistente = await prisma.induccionTrabajador.count({
    where: {
      empresaId: input.empresaId,
      trabajadorId: input.trabajadorId,
      estado: {
        in: ["pendiente", "en_progreso"],
      },
    },
  });

  if (induccionExistente > 0) {
    return;
  }

  const token = generarTokenFirma();

  await prisma.$transaction(async (tx) => {
    const induccion = await tx.induccionTrabajador.create({
      data: {
        empresaId: input.empresaId,
        trabajadorId: input.trabajadorId,
        token,
        estado: "pendiente",
        creadoPorId: input.usuarioId,
        observaciones: "Generada automáticamente al crear trabajador.",
      },
      select: { id: true },
    });

    await generarDocumentosInduccionDesdePlantillasTx(tx, {
      empresaId: input.empresaId,
      trabajadorId: input.trabajadorId,
      induccionId: induccion.id,
      generadoPor: input.usuarioId,
    });
  });
}

export async function getTrabajadores(): Promise<Worker[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.trabajador.findMany({
    where: {
      empresaId,
      estado: {
        not: "inactivo",
      },
    },
    include: {
      centroTrabajo: { select: { id: true, nombre: true } },
      area: { select: { id: true, nombre: true } },
      cargo: { select: { id: true, nombre: true, esCritico: true } },
      posicionDotacion: { select: { id: true } },
      documentos: { select: { estado: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(normalizeWorker);
}

export async function createTrabajador(worker: Worker): Promise<Worker> {
  const { empresaId, usuarioId, email } = await requirePermission("canCreateTrabajador");
  const payload = await toDbPayload(worker, empresaId);
  await assertRutDisponible({ empresaId, rut: payload.rut });

  const created = await prisma.trabajador.create({
    data: {
      empresaId,
      ...payload,
    },
    select: { id: true },
  });

  const row = await fetchTrabajadorById(created.id, empresaId);

  await evaluarDocumentosPendientesPorEvento({
    empresaId,
    evento: "trabajador_creado",
    trabajadorId: created.id,
    usuarioId,
    email,
  });

  evaluarCapacitacionesPorEvento({
    trabajadorId: created.id,
    empresaId,
    cargoId: payload.cargoId ?? null,
    areaId: payload.areaId ?? null,
    centroTrabajoId: payload.centroTrabajoId ?? null,
  }).catch(() => {});

  await crearInduccionAutomaticaSiCorresponde({
    empresaId,
    trabajadorId: created.id,
    usuarioId,
  });

  return normalizeWorker(row);
}

export async function updateTrabajador(worker: Worker): Promise<Worker> {
  const { empresaId, usuarioId, email } = await requirePermission("canUpdateTrabajador");
  const payload = await toDbPayload(worker, empresaId);
  await assertRutDisponible({ empresaId, rut: payload.rut, excludeTrabajadorId: worker.id });

  await prisma.trabajador.updateMany({
    where: { id: worker.id, empresaId },
    data: payload,
  });

  const row = await fetchTrabajadorById(worker.id, empresaId);

  await evaluarDocumentosPendientesPorEvento({
    empresaId,
    evento: "trabajador_actualizado",
    trabajadorId: worker.id,
    usuarioId,
    email,
  });

  evaluarCapacitacionesPorEvento({
    trabajadorId: worker.id,
    empresaId,
    cargoId: payload.cargoId ?? null,
    areaId: payload.areaId ?? null,
    centroTrabajoId: payload.centroTrabajoId ?? null,
  }).catch(() => {});

  return normalizeWorker(row);
}

export async function deleteTrabajador(id: string): Promise<Worker> {
  const { empresaId } = await requirePermission("canDeactivateTrabajador");

  await prisma.trabajador.updateMany({
    where: { id, empresaId },
    data: { estado: "inactivo" },
  });

  const row = await fetchTrabajadorById(id, empresaId);
  return normalizeWorker(row);
}

export async function generarInduccionTrabajador(id: string): Promise<{ creada: boolean }> {
  const { empresaId, usuarioId } = await requirePermission("canCreateTrabajador");

  const trabajador = await prisma.trabajador.findFirst({
    where: {
      id,
      empresaId,
      estado: {
        notIn: ["inactivo", "Inactivo"],
      },
    },
    select: { id: true },
  });

  if (!trabajador) {
    throw new Error("Trabajador no encontrado o inactivo");
  }

  const prevCount = await prisma.induccionTrabajador.count({
    where: {
      empresaId,
      trabajadorId: id,
      estado: {
        in: ["pendiente", "en_progreso"],
      },
    },
  });

  await crearInduccionAutomaticaSiCorresponde({
    empresaId,
    trabajadorId: id,
    usuarioId,
  });

  const nextCount = await prisma.induccionTrabajador.count({
    where: {
      empresaId,
      trabajadorId: id,
      estado: {
        in: ["pendiente", "en_progreso"],
      },
    },
  });

  return { creada: nextCount > prevCount };
}

export type OpcionesTrabajador = {
  cargos: { id: string; nombre: string; areaNombre: string | null }[];
  areas: { id: string; nombre: string }[];
  centros: { id: string; nombre: string }[];
};

export async function getOpcionesTrabajador(): Promise<OpcionesTrabajador> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const [cargos, areas, centros] = await Promise.all([
    prisma.cargo.findMany({
      where: { empresaId, estado: "activo" },
      select: { id: true, nombre: true, areaId: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.area.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.centroTrabajo.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return {
    cargos: cargos.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      areaNombre: areas.find((a) => a.id === c.areaId)?.nombre ?? null,
    })),
    areas:  areas.map((a) => ({ id: a.id, nombre: a.nombre })),
    centros: centros.map((c) => ({ id: c.id, nombre: c.nombre })),
  };
}
