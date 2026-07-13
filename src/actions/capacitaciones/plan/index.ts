"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

type PlanCapacitacionEstado =
  | "borrador"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "cerrado";

type PlanCapacitacionItemEstado =
  | "pendiente"
  | "programado"
  | "ejecutado"
  | "vencido"
  | "cancelado";

const PLAN_ESTADOS_VALIDOS: readonly PlanCapacitacionEstado[] = [
  "borrador",
  "en_revision",
  "aprobado",
  "rechazado",
  "cerrado",
] as const;

const PLAN_ITEM_ESTADOS_VALIDOS: readonly PlanCapacitacionItemEstado[] = [
  "pendiente",
  "programado",
  "ejecutado",
  "vencido",
  "cancelado",
] as const;

type PlanCapacitacionItemView = {
  id: string;
  planId: string;
  capacitacionId: string;
  capacitacionNombre: string;
  cargoId: string | null;
  cargoNombre: string | null;
  areaId: string | null;
  areaNombre: string | null;
  centroTrabajoId: string | null;
  centroTrabajoNombre: string | null;
  periodicidad: string;
  mesProgramado: number | null;
  obligatorio: boolean;
  estado: PlanCapacitacionItemEstado;
  responsableId: string | null;
  responsableNombre: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
};

type PlanCapacitacionView = {
  id: string;
  empresaId: string;
  nombre: string;
  periodo: string | null;
  anio: number;
  estado: PlanCapacitacionEstado;
  version: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  aprobadoPorId: string | null;
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  items: PlanCapacitacionItemView[];
};

type CreatePlanCapacitacionInput = {
  nombre: string;
  periodo?: string | null;
  anio: number;
  estado?: PlanCapacitacionEstado;
  version?: string;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  observaciones?: string | null;
};

type UpdatePlanCapacitacionInput = {
  nombre?: string;
  periodo?: string | null;
  anio?: number;
  estado?: PlanCapacitacionEstado;
  version?: string;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  aprobadoPorId?: string | null;
  aprobadoEn?: string | Date | null;
  observaciones?: string | null;
};

type CreatePlanDesdePlantillaInput = CreatePlanCapacitacionInput;

type GenerarItemsPlanDesdeReglasResult = {
  planId: string;
  creados: number;
  omitidos: number;
  totalReglasActivas: number;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseDate(value: string | Date | null | undefined, fieldName: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha invalida para ${fieldName}`);
  }
  return parsed;
}

function dateToIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function dateToIsoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function assertPlanEstado(value: string): PlanCapacitacionEstado {
  if (!PLAN_ESTADOS_VALIDOS.includes(value as PlanCapacitacionEstado)) {
    throw new Error("Estado de plan invalido");
  }
  return value as PlanCapacitacionEstado;
}

function assertPlanItemEstado(value: string): PlanCapacitacionItemEstado {
  if (!PLAN_ITEM_ESTADOS_VALIDOS.includes(value as PlanCapacitacionItemEstado)) {
    throw new Error("Estado de item invalido");
  }
  return value as PlanCapacitacionItemEstado;
}

async function getEmpresaIdFor(permission: "canReadCapacitaciones" | "canManageCapacitaciones"): Promise<string> {
  const context = await requirePermission(permission);
  if (!context.empresaId) {
    throw new Error("No hay empresa activa en el contexto de usuario");
  }
  return context.empresaId;
}

function makePlanItemKey(input: {
  capacitacionId: string;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
  periodicidad: string;
  mesProgramado: number | null;
  obligatorio: boolean;
}): string {
  return [
    input.capacitacionId,
    input.cargoId ?? "*",
    input.areaId ?? "*",
    input.centroTrabajoId ?? "*",
    normalizeText(input.periodicidad).toLowerCase(),
    String(input.mesProgramado ?? "*"),
    input.obligatorio ? "1" : "0",
  ].join("|");
}

function toPlanItemView(row: {
  id: string;
  planId: string;
  capacitacionId: string;
  periodicidad: string;
  mesProgramado: number | null;
  obligatorio: boolean;
  estado: string;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
  responsableId: string | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
  capacitacion: { nombre: string };
  cargo: { nombre: string } | null;
  area: { nombre: string } | null;
  centroTrabajo: { nombre: string } | null;
  responsable: { nombre: string } | null;
}): PlanCapacitacionItemView {
  return {
    id: row.id,
    planId: row.planId,
    capacitacionId: row.capacitacionId,
    capacitacionNombre: row.capacitacion.nombre,
    cargoId: row.cargoId,
    cargoNombre: row.cargo?.nombre ?? null,
    areaId: row.areaId,
    areaNombre: row.area?.nombre ?? null,
    centroTrabajoId: row.centroTrabajoId,
    centroTrabajoNombre: row.centroTrabajo?.nombre ?? null,
    periodicidad: row.periodicidad,
    mesProgramado: row.mesProgramado,
    obligatorio: row.obligatorio,
    estado: assertPlanItemEstado(row.estado),
    responsableId: row.responsableId,
    responsableNombre: row.responsable?.nombre ?? null,
    observaciones: row.observaciones,
    createdAt: dateToIso(row.createdAt) ?? "",
    updatedAt: dateToIso(row.updatedAt) ?? "",
  };
}

function toPlanView(row: {
  id: string;
  empresaId: string;
  nombre: string;
  periodo: string | null;
  anio: number;
  estado: string;
  version: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  aprobadoPorId: string | null;
  aprobadoEn: Date | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
  aprobadoPor: { nombre: string } | null;
  items: Array<{
    id: string;
    planId: string;
    capacitacionId: string;
    periodicidad: string;
    mesProgramado: number | null;
    obligatorio: boolean;
    estado: string;
    cargoId: string | null;
    areaId: string | null;
    centroTrabajoId: string | null;
    responsableId: string | null;
    observaciones: string | null;
    createdAt: Date;
    updatedAt: Date;
    capacitacion: { nombre: string };
    cargo: { nombre: string } | null;
    area: { nombre: string } | null;
    centroTrabajo: { nombre: string } | null;
    responsable: { nombre: string } | null;
  }>;
}): PlanCapacitacionView {
  return {
    id: row.id,
    empresaId: row.empresaId,
    nombre: row.nombre,
    periodo: row.periodo,
    anio: row.anio,
    estado: assertPlanEstado(row.estado),
    version: row.version,
    fechaInicio: dateToIsoDate(row.fechaInicio),
    fechaFin: dateToIsoDate(row.fechaFin),
    aprobadoPorId: row.aprobadoPorId,
    aprobadoPorNombre: row.aprobadoPor?.nombre ?? null,
    aprobadoEn: dateToIso(row.aprobadoEn),
    observaciones: row.observaciones,
    createdAt: dateToIso(row.createdAt) ?? "",
    updatedAt: dateToIso(row.updatedAt) ?? "",
    items: row.items.map(toPlanItemView),
  };
}

const planInclude = {
  aprobadoPor: { select: { nombre: true } },
  items: {
    include: {
      capacitacion: { select: { nombre: true } },
      cargo: { select: { nombre: true } },
      area: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
      responsable: { select: { nombre: true } },
    },
    orderBy: [{ mesProgramado: "asc" }, { capacitacion: { nombre: "asc" } }],
  },
} satisfies Prisma.PlanCapacitacionInclude;

export async function getPlanesCapacitacion(filters?: {
  anio?: number;
  estado?: PlanCapacitacionEstado;
  incluirCerrados?: boolean;
}): Promise<PlanCapacitacionView[]> {
  const empresaId = await getEmpresaIdFor("canReadCapacitaciones");

  const where: Prisma.PlanCapacitacionWhereInput = {
    empresaId,
    ...(filters?.anio ? { anio: filters.anio } : {}),
    ...(filters?.estado ? { estado: filters.estado } : {}),
  };

  if (!filters?.incluirCerrados && !filters?.estado) {
    where.estado = { not: "cerrado" };
  }

  const rows = await prisma.planCapacitacion.findMany({
    where,
    include: planInclude,
    orderBy: [{ anio: "desc" }, { updatedAt: "desc" }],
  });

  return rows.map(toPlanView);
}

export async function getPlanCapacitacionById(id: string): Promise<PlanCapacitacionView | null> {
  const empresaId = await getEmpresaIdFor("canReadCapacitaciones");

  const row = await prisma.planCapacitacion.findFirst({
    where: { id, empresaId },
    include: planInclude,
  });

  return row ? toPlanView(row) : null;
}

export async function createPlanCapacitacion(input: CreatePlanCapacitacionInput): Promise<PlanCapacitacionView> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  const nombre = normalizeText(input.nombre);
  if (!nombre) throw new Error("nombre es requerido");

  if (!Number.isInteger(input.anio) || input.anio < 2000 || input.anio > 2100) {
    throw new Error("anio invalido");
  }

  const estado = input.estado ?? "borrador";
  assertPlanEstado(estado);

  const version = normalizeText(input.version) || "1.0";

  const duplicated = await prisma.planCapacitacion.findFirst({
    where: {
      empresaId,
      anio: input.anio,
      nombre,
      version,
      estado: { not: "cerrado" },
    },
    select: { id: true },
  });

  if (duplicated) {
    throw new Error("Ya existe un plan activo con el mismo nombre, anio y version");
  }

  const created = await prisma.planCapacitacion.create({
    data: {
      empresaId,
      nombre,
      periodo: normalizeNullableText(input.periodo) ?? null,
      anio: input.anio,
      estado,
      version,
      fechaInicio: parseDate(input.fechaInicio, "fechaInicio") ?? null,
      fechaFin: parseDate(input.fechaFin, "fechaFin") ?? null,
      observaciones: normalizeNullableText(input.observaciones) ?? null,
    },
    include: planInclude,
  });

  return toPlanView(created);
}

export async function updatePlanCapacitacion(
  id: string,
  input: UpdatePlanCapacitacionInput,
): Promise<PlanCapacitacionView> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  const existing = await prisma.planCapacitacion.findFirst({
    where: { id, empresaId },
    select: { id: true, anio: true, nombre: true, version: true },
  });

  if (!existing) {
    throw new Error("Plan no encontrado");
  }

  if (input.estado) assertPlanEstado(input.estado);

  if (input.anio !== undefined && (!Number.isInteger(input.anio) || input.anio < 2000 || input.anio > 2100)) {
    throw new Error("anio invalido");
  }

  const nextNombre = input.nombre !== undefined ? normalizeText(input.nombre) : existing.nombre;
  const nextAnio = input.anio ?? existing.anio;
  const nextVersion = input.version !== undefined ? normalizeText(input.version) || "1.0" : existing.version;

  const duplicated = await prisma.planCapacitacion.findFirst({
    where: {
      id: { not: id },
      empresaId,
      anio: nextAnio,
      nombre: nextNombre,
      version: nextVersion,
      estado: { not: "cerrado" },
    },
    select: { id: true },
  });

  if (duplicated) {
    throw new Error("Ya existe otro plan activo con el mismo nombre, anio y version");
  }

  const aprobadoPorId = input.aprobadoPorId === undefined ? undefined : input.aprobadoPorId;

  if (aprobadoPorId) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: aprobadoPorId, empresaId },
      select: { id: true },
    });
    if (!usuario) {
      throw new Error("aprobadoPorId no pertenece a la empresa activa");
    }
  }

  const updated = await prisma.planCapacitacion.update({
    where: { id },
    data: {
      nombre: input.nombre !== undefined ? nextNombre : undefined,
      periodo: normalizeNullableText(input.periodo),
      anio: input.anio,
      estado: input.estado,
      version: input.version !== undefined ? nextVersion : undefined,
      fechaInicio: parseDate(input.fechaInicio, "fechaInicio"),
      fechaFin: parseDate(input.fechaFin, "fechaFin"),
      aprobadoPorId,
      aprobadoEn: parseDate(input.aprobadoEn, "aprobadoEn"),
      observaciones: normalizeNullableText(input.observaciones),
    },
    include: planInclude,
  });

  return toPlanView(updated);
}

export async function deletePlanCapacitacion(
  id: string,
  motivo?: string,
): Promise<PlanCapacitacionView> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  const existing = await prisma.planCapacitacion.findFirst({
    where: { id, empresaId },
    select: { id: true, observaciones: true },
  });

  if (!existing) {
    throw new Error("Plan no encontrado");
  }

  const cierreMensaje = normalizeText(motivo);
  const updated = await prisma.planCapacitacion.update({
    where: { id },
    data: {
      estado: "cerrado",
      observaciones: cierreMensaje
        ? [existing.observaciones, `Cierre logico: ${cierreMensaje}`].filter(Boolean).join(" | ")
        : existing.observaciones,
    },
    include: planInclude,
  });

  return toPlanView(updated);
}

export async function getPlantillasPlanCapacitacion(filters?: {
  activa?: boolean;
}): Promise<
  Array<{
    id: string;
    empresaId: string;
    nombre: string;
    descripcion: string | null;
    tipoEmpresa: string | null;
    activa: boolean;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      capacitacionId: string;
      capacitacionNombre: string;
      cargoId: string | null;
      areaId: string | null;
      centroTrabajoId: string | null;
      periodicidad: string;
      mesProgramado: number | null;
      obligatorio: boolean;
      activo: boolean;
      observaciones: string | null;
    }>;
  }>
> {
  const empresaId = await getEmpresaIdFor("canReadCapacitaciones");

  const rows = await prisma.plantillaPlanCapacitacion.findMany({
    where: {
      empresaId,
      ...(filters?.activa !== undefined ? { activa: filters.activa } : {}),
    },
    include: {
      items: {
        include: {
          capacitacion: { select: { nombre: true } },
        },
        orderBy: [{ mesProgramado: "asc" }, { capacitacion: { nombre: "asc" } }],
      },
    },
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    empresaId: row.empresaId,
    nombre: row.nombre,
    descripcion: row.descripcion,
    tipoEmpresa: row.tipoEmpresa,
    activa: row.activa,
    createdAt: dateToIso(row.createdAt) ?? "",
    updatedAt: dateToIso(row.updatedAt) ?? "",
    items: row.items.map((item) => ({
      id: item.id,
      capacitacionId: item.capacitacionId,
      capacitacionNombre: item.capacitacion.nombre,
      cargoId: item.cargoId,
      areaId: item.areaId,
      centroTrabajoId: item.centroTrabajoId,
      periodicidad: item.periodicidad,
      mesProgramado: item.mesProgramado,
      obligatorio: item.obligatorio,
      activo: item.activo,
      observaciones: item.observaciones,
    })),
  }));
}

export async function createPlanDesdePlantilla(
  plantillaId: string,
  datosPlan: CreatePlanDesdePlantillaInput,
): Promise<PlanCapacitacionView> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  const result = await prisma.$transaction(async (tx) => {
    const plantilla = await tx.plantillaPlanCapacitacion.findFirst({
      where: {
        id: plantillaId,
        empresaId,
      },
      include: {
        items: {
          where: { activo: true, capacitacion: { activa: true, empresaId } },
          select: {
            capacitacionId: true,
            cargoId: true,
            areaId: true,
            centroTrabajoId: true,
            periodicidad: true,
            mesProgramado: true,
            obligatorio: true,
            observaciones: true,
          },
        },
      },
    });

    if (!plantilla) {
      throw new Error("Plantilla no encontrada en la empresa activa");
    }

    if (!plantilla.activa) {
      throw new Error("La plantilla esta inactiva");
    }

    const plan = await tx.planCapacitacion.create({
      data: {
        empresaId,
        nombre: normalizeText(datosPlan.nombre),
        periodo: normalizeNullableText(datosPlan.periodo) ?? null,
        anio: datosPlan.anio,
        estado: datosPlan.estado ?? "borrador",
        version: normalizeText(datosPlan.version) || "1.0",
        fechaInicio: parseDate(datosPlan.fechaInicio, "fechaInicio") ?? null,
        fechaFin: parseDate(datosPlan.fechaFin, "fechaFin") ?? null,
        observaciones: normalizeNullableText(datosPlan.observaciones) ?? null,
      },
      select: { id: true },
    });

    const seenKeys = new Set<string>();
    const itemsToCreate: Prisma.PlanCapacitacionItemCreateManyInput[] = [];

    for (const tplItem of plantilla.items) {
      const key = makePlanItemKey({
        capacitacionId: tplItem.capacitacionId,
        cargoId: tplItem.cargoId,
        areaId: tplItem.areaId,
        centroTrabajoId: tplItem.centroTrabajoId,
        periodicidad: tplItem.periodicidad,
        mesProgramado: tplItem.mesProgramado,
        obligatorio: tplItem.obligatorio,
      });

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      itemsToCreate.push({
        planId: plan.id,
        capacitacionId: tplItem.capacitacionId,
        cargoId: tplItem.cargoId,
        areaId: tplItem.areaId,
        centroTrabajoId: tplItem.centroTrabajoId,
        periodicidad: tplItem.periodicidad,
        mesProgramado: tplItem.mesProgramado,
        obligatorio: tplItem.obligatorio,
        estado: tplItem.mesProgramado ? "programado" : "pendiente",
        observaciones: tplItem.observaciones,
      });
    }

    if (itemsToCreate.length > 0) {
      await tx.planCapacitacionItem.createMany({ data: itemsToCreate });
    }

    const created = await tx.planCapacitacion.findFirstOrThrow({
      where: { id: plan.id, empresaId },
      include: planInclude,
    });

    return created;
  });

  return toPlanView(result);
}

export async function generarItemsPlanDesdeReglas(
  planId: string,
): Promise<GenerarItemsPlanDesdeReglasResult> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  return prisma.$transaction(async (tx) => {
    const plan = await tx.planCapacitacion.findFirst({
      where: { id: planId, empresaId },
      select: { id: true },
    });

    if (!plan) {
      throw new Error("Plan no encontrado en la empresa activa");
    }

    const [reglas, existingItems] = await Promise.all([
      tx.reglaCapacitacionCargo.findMany({
        where: {
          empresaId,
          activo: true,
          capacitacion: { activa: true },
        },
        select: {
          capacitacionId: true,
          cargoId: true,
          areaId: true,
          centroTrabajoId: true,
          periodicidad: true,
          obligatorio: true,
        },
        orderBy: [{ periodicidad: "asc" }, { createdAt: "asc" }],
      }),
      tx.planCapacitacionItem.findMany({
        where: { planId: plan.id },
        select: {
          capacitacionId: true,
          cargoId: true,
          areaId: true,
          centroTrabajoId: true,
          periodicidad: true,
          mesProgramado: true,
          obligatorio: true,
        },
      }),
    ]);

    const existingKeys = new Set(
      existingItems.map((item) =>
        makePlanItemKey({
          capacitacionId: item.capacitacionId,
          cargoId: item.cargoId,
          areaId: item.areaId,
          centroTrabajoId: item.centroTrabajoId,
          periodicidad: item.periodicidad,
          mesProgramado: item.mesProgramado,
          obligatorio: item.obligatorio,
        }),
      ),
    );

    const newRows: Prisma.PlanCapacitacionItemCreateManyInput[] = [];
    const seenIncoming = new Set<string>();

    for (const regla of reglas) {
      const key = makePlanItemKey({
        capacitacionId: regla.capacitacionId,
        cargoId: regla.cargoId,
        areaId: regla.areaId,
        centroTrabajoId: regla.centroTrabajoId,
        periodicidad: regla.periodicidad,
        mesProgramado: null,
        obligatorio: regla.obligatorio,
      });

      if (existingKeys.has(key) || seenIncoming.has(key)) continue;
      seenIncoming.add(key);

      newRows.push({
        planId: plan.id,
        capacitacionId: regla.capacitacionId,
        cargoId: regla.cargoId,
        areaId: regla.areaId,
        centroTrabajoId: regla.centroTrabajoId,
        periodicidad: regla.periodicidad,
        mesProgramado: null,
        obligatorio: regla.obligatorio,
        estado: "pendiente",
      });
    }

    if (newRows.length > 0) {
      await tx.planCapacitacionItem.createMany({ data: newRows });
    }

    return {
      planId: plan.id,
      creados: newRows.length,
      omitidos: reglas.length - newRows.length,
      totalReglasActivas: reglas.length,
    };
  });
}

// ─── Tipos para edición de ítems ─────────────────────────────────────────────

type UpdatePlanCapacitacionItemInput = {
  periodicidad?: string;
  mesProgramado?: number | null;
  obligatorio?: boolean;
  estado?: PlanCapacitacionItemEstado;
  responsableId?: string | null;
  observaciones?: string | null;
};

// ─── Constantes de planes editables ──────────────────────────────────────────

const PLAN_ESTADOS_EDITABLES: ReadonlySet<PlanCapacitacionEstado> = new Set([
  "borrador",
  "rechazado",
]);

// ─── updatePlanCapacitacionItem ───────────────────────────────────────────────

export async function updatePlanCapacitacionItem(
  itemId: string,
  input: UpdatePlanCapacitacionItemInput,
): Promise<PlanCapacitacionItemView> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  // Verificar que el ítem existe y pertenece a un plan de esta empresa
  const existing = await prisma.planCapacitacionItem.findFirst({
    where: { id: itemId },
    select: {
      id: true,
      planId: true,
      plan: {
        select: { empresaId: true, estado: true },
      },
    },
  });

  if (!existing || existing.plan.empresaId !== empresaId) {
    throw new Error("Ítem no encontrado en la empresa activa");
  }

  // Solo se permite editar ítems con plan en estado editable
  if (!PLAN_ESTADOS_EDITABLES.has(existing.plan.estado as PlanCapacitacionEstado)) {
    // TODO: definir regla de negocio más granular para planes aprobados/en revisión
    throw new Error(
      `No se puede editar un ítem de un plan en estado "${existing.plan.estado}". Solo se permite en borrador o rechazado.`,
    );
  }

  if (input.estado !== undefined) assertPlanItemEstado(input.estado);

  if (
    input.mesProgramado !== undefined &&
    input.mesProgramado !== null &&
    (input.mesProgramado < 1 || input.mesProgramado > 12)
  ) {
    throw new Error("mesProgramado debe estar entre 1 y 12");
  }

  if (input.periodicidad !== undefined) {
    const p = normalizeText(input.periodicidad);
    if (!p) throw new Error("periodicidad no puede estar vacía");
  }

  if (input.responsableId !== null && input.responsableId !== undefined) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: input.responsableId, empresaId },
      select: { id: true },
    });
    if (!usuario) {
      throw new Error("responsableId no pertenece a la empresa activa");
    }
  }

  const updated = await prisma.planCapacitacionItem.update({
    where: { id: itemId },
    data: {
      periodicidad: input.periodicidad !== undefined ? normalizeText(input.periodicidad) : undefined,
      mesProgramado: input.mesProgramado,
      obligatorio: input.obligatorio,
      estado: input.estado,
      responsableId: input.responsableId,
      observaciones: input.observaciones !== undefined ? normalizeNullableText(input.observaciones) ?? null : undefined,
    },
    include: {
      capacitacion: { select: { nombre: true } },
      cargo: { select: { nombre: true } },
      area: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
      responsable: { select: { nombre: true } },
    },
  });

  return toPlanItemView(updated);
}

// ─── deletePlanCapacitacionItem (lógico) ─────────────────────────────────────

export async function deletePlanCapacitacionItem(itemId: string): Promise<PlanCapacitacionItemView> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  const existing = await prisma.planCapacitacionItem.findFirst({
    where: { id: itemId },
    select: {
      id: true,
      plan: { select: { empresaId: true, estado: true } },
    },
  });

  if (!existing || existing.plan.empresaId !== empresaId) {
    throw new Error("Ítem no encontrado en la empresa activa");
  }

  if (!PLAN_ESTADOS_EDITABLES.has(existing.plan.estado as PlanCapacitacionEstado)) {
    throw new Error(
      `No se puede eliminar un ítem de un plan en estado "${existing.plan.estado}".`,
    );
  }

  const updated = await prisma.planCapacitacionItem.update({
    where: { id: itemId },
    data: { estado: "cancelado" },
    include: {
      capacitacion: { select: { nombre: true } },
      cargo: { select: { nombre: true } },
      area: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
      responsable: { select: { nombre: true } },
    },
  });

  return toPlanItemView(updated);
}

// ─── mergePlantillaEnPlan ─────────────────────────────────────────────────────

type MergePlantillaEnPlanResult = {
  itemsCreados: number;
  itemsOmitidos: number;
  totalPlantillaItems: number;
};

export async function mergePlantillaEnPlan(
  planId: string,
  plantillaId: string,
): Promise<MergePlantillaEnPlanResult> {
  const empresaId = await getEmpresaIdFor("canManageCapacitaciones");

  // Validate plan belongs to empresa and is in editable state
  const plan = await prisma.planCapacitacion.findFirst({
    where: { id: planId },
    select: { id: true, empresaId: true, estado: true },
  });

  if (!plan || plan.empresaId !== empresaId) {
    throw new Error("Plan no encontrado en la empresa activa");
  }

  if (!PLAN_ESTADOS_EDITABLES.has(plan.estado as PlanCapacitacionEstado)) {
    throw new Error(
      `No se puede modificar un plan en estado "${plan.estado}". Solo se permite en borrador o rechazado.`,
    );
  }

  // Validate plantilla belongs to empresa
  const plantilla = await prisma.plantillaPlanCapacitacion.findFirst({
    where: { id: plantillaId, empresaId },
    include: {
      items: {
        where: { activo: true, capacitacion: { activa: true, empresaId } },
        select: {
          capacitacionId: true,
          cargoId: true,
          areaId: true,
          centroTrabajoId: true,
          periodicidad: true,
          mesProgramado: true,
          obligatorio: true,
        },
      },
    },
  });

  if (!plantilla) {
    throw new Error("Plantilla no encontrada en la empresa activa");
  }

  // Load active plantilla items
  const plantillaItems = plantilla.items;

  const totalPlantillaItems = plantillaItems.length;

  // Load existing plan items (non-cancelled) to build dedup key set
  const existingItems = await prisma.planCapacitacionItem.findMany({
    where: {
      planId,
      estado: { not: "cancelado" },
    },
    select: {
      capacitacionId: true,
      cargoId: true,
      areaId: true,
      centroTrabajoId: true,
      periodicidad: true,
      mesProgramado: true,
      obligatorio: true,
    },
  });

  const existingKeys = new Set(existingItems.map((item) => makePlanItemKey(item)));

  // Determine which plantilla items are new
  const toCreate = plantillaItems.filter(
    (item) => !existingKeys.has(makePlanItemKey(item)),
  );

  const itemsOmitidos = totalPlantillaItems - toCreate.length;

  if (toCreate.length > 0) {
    await prisma.planCapacitacionItem.createMany({
      data: toCreate.map((item) => ({
        planId,
        empresaId,
        capacitacionId: item.capacitacionId,
        cargoId: item.cargoId,
        areaId: item.areaId,
        centroTrabajoId: item.centroTrabajoId,
        periodicidad: item.periodicidad,
        mesProgramado: item.mesProgramado,
        obligatorio: item.obligatorio,
        estado: "pendiente",
      })),
    });
  }

  return {
    itemsCreados: toCreate.length,
    itemsOmitidos,
    totalPlantillaItems,
  };
}
