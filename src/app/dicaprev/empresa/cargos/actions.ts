"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { z } from "zod";

type CargoInput = {
  nombre: string;
  areaId?: string;
  descripcion?: string;
  perfilSST?: string;
  perfilSstRequerido?: string;
  riesgosClave?: string[];
  documentosBase?: string[];
  capacitacionesBase?: string[];
  estado?: string;
  esCritico?: boolean;
};

export type CargoRelacionUso = {
  trabajadores: number;
  dotacion: number;
  documentos: number;
  actividades: number;
  registros: number;
};

export type EvaluacionEliminacionCargo = {
  puedeEliminarDefinitivo: boolean;
  uso: CargoRelacionUso;
  bloqueos: string[];
};

const CARGO_META_PREFIX = "__NEXTPREV_CARGO_META__";

type CargoCompatMeta = {
  descripcion: string | null;
  riesgosClave: string[];
  documentosBase: string[];
  capacitacionesBase: string[];
};

type CargoRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  perfilSST: string | null;
  estado: string;
  esCritico: boolean;
  createdAt: Date;
  area: {
    id: string;
    nombre: string;
  } | null;
};

const cargoReadSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  perfilSST: true,
  estado: true,
  esCritico: true,
  createdAt: true,
  area: {
    select: {
      id: true,
      nombre: true,
    },
  },
} as const;

function normalizeText(value?: string) {
  return (value ?? "").trim();
}

function normalizeStringList(values: string[]) {
  const cleaned = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(cleaned));
}

function encodeCargoCompatMeta(meta: CargoCompatMeta): string {
  return `${CARGO_META_PREFIX}${JSON.stringify(meta)}`;
}

function decodeCargoCompatMeta(value: string | null): CargoCompatMeta {
  if (!value) {
    return {
      descripcion: null,
      riesgosClave: [],
      documentosBase: [],
      capacitacionesBase: [],
    };
  }

  if (!value.startsWith(CARGO_META_PREFIX)) {
    return {
      descripcion: value,
      riesgosClave: [],
      documentosBase: [],
      capacitacionesBase: [],
    };
  }

  try {
    const parsed = JSON.parse(value.slice(CARGO_META_PREFIX.length)) as Partial<CargoCompatMeta>;
    return {
      descripcion: typeof parsed.descripcion === "string" ? parsed.descripcion : null,
      riesgosClave: Array.isArray(parsed.riesgosClave) ? normalizeStringList(parsed.riesgosClave) : [],
      documentosBase: Array.isArray(parsed.documentosBase) ? normalizeStringList(parsed.documentosBase) : [],
      capacitacionesBase: Array.isArray(parsed.capacitacionesBase) ? normalizeStringList(parsed.capacitacionesBase) : [],
    };
  } catch {
    return {
      descripcion: value,
      riesgosClave: [],
      documentosBase: [],
      capacitacionesBase: [],
    };
  }
}

function hydrateCargo(row: CargoRow) {
  const meta = decodeCargoCompatMeta(row.descripcion);

  return {
    ...row,
    descripcion: meta.descripcion,
    perfilSstRequerido: row.perfilSST,
    riesgosClave: meta.riesgosClave,
    documentosBase: meta.documentosBase,
    capacitacionesBase: meta.capacitacionesBase,
  };
}

const cargoInputSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del cargo es obligatorio"),
  areaId: z.string().optional(),
  descripcion: z.string().optional(),
  perfilSST: z.string().optional(),
  perfilSstRequerido: z.string().optional(),
  riesgosClave: z.array(z.string()).optional(),
  documentosBase: z.array(z.string()).optional(),
  capacitacionesBase: z.array(z.string()).optional(),
  estado: z.string().optional(),
  esCritico: z.boolean().optional(),
});

async function validateAreaId(areaId: string | undefined, empresaId: string) {
  const normalized = normalizeText(areaId);
  if (!normalized) {
    return null;
  }

  const area = await prisma.area.findFirst({
    where: {
      id: normalized,
      empresaId,
    },
    select: { id: true },
  });

  if (!area) {
    throw new Error("El área seleccionada no existe para la empresa configurada");
  }

  return normalized;
}

async function validateCargo(data: CargoInput) {
  const parsed = cargoInputSchema.parse(data);
  const descripcion = normalizeText(parsed.descripcion);
  const perfilSST = normalizeText(parsed.perfilSstRequerido ?? parsed.perfilSST);
  const estado = normalizeText(parsed.estado) || "activo";
  const { empresaId } = await requirePermission("canManageEmpresa");
  const areaId = await validateAreaId(parsed.areaId, empresaId);

  const riesgosClave = normalizeStringList(parsed.riesgosClave ?? []);
  const documentosBase = normalizeStringList(parsed.documentosBase ?? []);
  const capacitacionesBase = normalizeStringList(parsed.capacitacionesBase ?? []);

  return {
    nombre: parsed.nombre,
    areaId,
    descripcion: descripcion || null,
    perfilSST: perfilSST || null,
    riesgosClave,
    documentosBase,
    capacitacionesBase,
    estado,
    esCritico: Boolean(parsed.esCritico),
  };
}

export async function getCargos() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const rows = await prisma.cargo.findMany({
    where: { empresaId },
    select: cargoReadSelect,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => hydrateCargo(row as CargoRow));
}

export async function getCargoById(id: string) {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const row = await prisma.cargo.findFirst({
    where: { id, empresaId },
    select: cargoReadSelect,
  });

  return row ? hydrateCargo(row as CargoRow) : null;
}

async function calcularUsoCargo(empresaId: string, cargoId: string): Promise<CargoRelacionUso> {
  const [trabajadores, dotacion, documentos, actividades, registros] = await Promise.all([
    prisma.trabajador.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
    prisma.posicionDotacion.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
    prisma.reglaDocumentoTrabajador.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
    prisma.planCapacitacionItem.count({
      where: {
        cargoId,
        plan: {
          empresaId,
        },
      },
    }),
    prisma.reglaCapacitacionCargo.count({
      where: {
        empresaId,
        cargoId,
      },
    }),
  ]);

  return {
    trabajadores,
    dotacion,
    documentos,
    actividades,
    registros,
  };
}

function construirBloqueosCargo(uso: CargoRelacionUso): string[] {
  const bloqueos: string[] = [];
  if (uso.trabajadores > 0) bloqueos.push(`${uso.trabajadores} trabajador(es) asociado(s)`);
  if (uso.dotacion > 0) bloqueos.push(`${uso.dotacion} registro(s) de dotación`);
  if (uso.documentos > 0) bloqueos.push(`${uso.documentos} regla(s) documental(es)`);
  if (uso.actividades > 0) bloqueos.push(`${uso.actividades} actividad(es) asociada(s)`);
  if (uso.registros > 0) bloqueos.push(`${uso.registros} registro(s) asociado(s)`);
  return bloqueos;
}

export async function evaluarEliminacionCargo(id: string): Promise<EvaluacionEliminacionCargo> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const cargo = await prisma.cargo.findFirst({
    where: { id, empresaId },
    select: { id: true },
  });

  if (!cargo) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  const uso = await calcularUsoCargo(empresaId, id);
  const bloqueos = construirBloqueosCargo(uso);

  return {
    puedeEliminarDefinitivo: bloqueos.length === 0,
    uso,
    bloqueos,
  };
}

export async function crearCargo(data: CargoInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = await validateCargo(data);

  const created = await prisma.cargo.create({
    data: {
      empresaId,
      nombre: payload.nombre,
      areaId: payload.areaId,
      descripcion: encodeCargoCompatMeta({
        descripcion: payload.descripcion,
        riesgosClave: payload.riesgosClave,
        documentosBase: payload.documentosBase,
        capacitacionesBase: payload.capacitacionesBase,
      }),
      perfilSST: payload.perfilSST,
      estado: payload.estado,
      esCritico: payload.esCritico,
    },
    select: cargoReadSelect,
  });

  return hydrateCargo(created as CargoRow);
}

export async function actualizarCargo(id: string, data: CargoInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = await validateCargo(data);

  const updated = await prisma.cargo.updateMany({
    where: { id, empresaId },
    data: {
      nombre: payload.nombre,
      areaId: payload.areaId,
      descripcion: encodeCargoCompatMeta({
        descripcion: payload.descripcion,
        riesgosClave: payload.riesgosClave,
        documentosBase: payload.documentosBase,
        capacitacionesBase: payload.capacitacionesBase,
      }),
      perfilSST: payload.perfilSST,
      estado: payload.estado,
      esCritico: payload.esCritico,
    },
  });

  if (updated.count === 0) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  const row = await prisma.cargo.findFirstOrThrow({
    where: { id, empresaId },
    select: cargoReadSelect,
  });

  return hydrateCargo(row as CargoRow);
}

export async function desactivarCargo(id: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const updated = await prisma.cargo.updateMany({
    where: { id, empresaId },
    data: {
      estado: "inactivo",
    },
  });

  if (updated.count === 0) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  const row = await prisma.cargo.findFirstOrThrow({
    where: { id, empresaId },
    select: cargoReadSelect,
  });

  return hydrateCargo(row as CargoRow);
}

export async function eliminarCargoDefinitivo(id: string) {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const evaluacion = await evaluarEliminacionCargo(id);
  if (!evaluacion.puedeEliminarDefinitivo) {
    throw new Error("No se puede eliminar definitivamente el cargo porque tiene relaciones activas.");
  }

  const deleted = await prisma.cargo.deleteMany({
    where: {
      id,
      empresaId,
    },
  });

  if (deleted.count === 0) {
    throw new Error("Cargo no encontrado en la empresa activa");
  }

  return { ok: true };
}
