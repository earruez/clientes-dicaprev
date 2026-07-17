"use server";

import { evaluarDocumentosPendientesPorEvento } from "@/actions/trabajadores/documentos";
import { evaluarCapacitacionesPorEvento } from "@/lib/capacitacion/evaluar-capacitaciones";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import { z } from "zod";

type CargoInput = {
  nombre: string;
  areaId?: string;
  tipo?: string;
  descripcion?: string;
  perfilSST?: string;
  perfilSstRequerido?: string;
  riesgosClave?: string[];
  documentosBase?: string[];
  capacitacionesBase?: string[];
  documentoTipoIds?: string[];
  capacitacionIds?: string[];
  estado?: string;
  esCritico?: boolean;
};

type CatalogoDocumentoItem = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  requiereVencimiento: boolean;
  vigenciaDias: number | null;
  requiereArchivo: boolean;
  origen: "base" | "especifica";
};

type CatalogoCapacitacionItem = {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  modalidad: string;
  duracionHoras: number | null;
  vigenciaMeses: number | null;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  origen: "base" | "especifica";
};

type SugerenciaRequisito = {
  id: string;
  nombre: string;
  motivo: string;
  confianza: number;
  fuente: "reglas" | "ia";
};

export type CargoCatalogosFormData = {
  documentosCatalogo: CatalogoDocumentoItem[];
  capacitacionesCatalogo: CatalogoCapacitacionItem[];
  documentosSeleccionadosIds: string[];
  capacitacionesSeleccionadasIds: string[];
  documentosSugeridos: SugerenciaRequisito[];
  capacitacionesSugeridas: SugerenciaRequisito[];
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
  tipo: string | null;
  descripcion: string | null;
  riesgosClave: string[];
  documentosBase: string[];
  capacitacionesBase: string[];
};

const CARGO_TIPOS = [
  "Operativo",
  "Supervisión",
  "Administración",
  "Prevención",
  "Técnico",
] as const;

type CargoTipo = (typeof CARGO_TIPOS)[number];

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

function normalizeCargoTipo(value?: string | null): CargoTipo {
  const normalized = normalizeText(value ?? undefined);
  return (CARGO_TIPOS as readonly string[]).includes(normalized)
    ? (normalized as CargoTipo)
    : "Operativo";
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCodigo(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

async function ensureUniqueDocumentoCodigo(empresaId: string, codigoBase: string): Promise<string> {
  const base = normalizeCodigo(codigoBase) || "DOC_PERSONALIZADO";
  let candidato = base;
  let intento = 1;

  while (true) {
    const existe = await prisma.documentoTipoTrabajador.findFirst({
      where: { empresaId, codigo: candidato },
      select: { id: true },
    });
    if (!existe) return candidato;
    intento += 1;
    candidato = `${base}_${intento}`;
  }
}

async function ensureUniqueCapacitacionCodigo(empresaId: string, codigoBase: string): Promise<string> {
  const base = normalizeCodigo(codigoBase) || "CAP_PERSONALIZADA";
  let candidato = base;
  let intento = 1;

  while (true) {
    const existe = await prisma.capacitacion.findFirst({
      where: { empresaId, codigo: candidato },
      select: { id: true },
    });
    if (!existe) return candidato;
    intento += 1;
    candidato = `${base}_${intento}`;
  }
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
      tipo: null,
      descripcion: null,
      riesgosClave: [],
      documentosBase: [],
      capacitacionesBase: [],
    };
  }

  if (!value.startsWith(CARGO_META_PREFIX)) {
    return {
      tipo: null,
      descripcion: value,
      riesgosClave: [],
      documentosBase: [],
      capacitacionesBase: [],
    };
  }

  try {
    const parsed = JSON.parse(value.slice(CARGO_META_PREFIX.length)) as Partial<CargoCompatMeta>;
    return {
      tipo: typeof parsed.tipo === "string" ? normalizeCargoTipo(parsed.tipo) : null,
      descripcion: typeof parsed.descripcion === "string" ? parsed.descripcion : null,
      riesgosClave: Array.isArray(parsed.riesgosClave) ? normalizeStringList(parsed.riesgosClave) : [],
      documentosBase: Array.isArray(parsed.documentosBase) ? normalizeStringList(parsed.documentosBase) : [],
      capacitacionesBase: Array.isArray(parsed.capacitacionesBase) ? normalizeStringList(parsed.capacitacionesBase) : [],
    };
  } catch {
    return {
      tipo: null,
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
    tipo: normalizeCargoTipo(meta.tipo),
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
  tipo: z.enum(CARGO_TIPOS).optional(),
  descripcion: z.string().optional(),
  perfilSST: z.string().optional(),
  perfilSstRequerido: z.string().optional(),
  riesgosClave: z.array(z.string()).optional(),
  documentosBase: z.array(z.string()).optional(),
  capacitacionesBase: z.array(z.string()).optional(),
  documentoTipoIds: z.array(z.string()).optional(),
  capacitacionIds: z.array(z.string()).optional(),
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
  const documentoTipoIds = normalizeStringList(parsed.documentoTipoIds ?? []);
  const capacitacionIds = normalizeStringList(parsed.capacitacionIds ?? []);

  return {
    nombre: parsed.nombre,
    areaId,
    tipo: normalizeCargoTipo(parsed.tipo),
    descripcion: descripcion || null,
    perfilSST: perfilSST || null,
    riesgosClave,
    documentosBase,
    capacitacionesBase,
    documentoTipoIds,
    capacitacionIds,
    estado,
    esCritico: Boolean(parsed.esCritico),
  };
}

function inferOrigenPorCodigo(codigo: string): "base" | "especifica" {
  const upper = normalizeCodigo(codigo);
  if (upper.startsWith("SST_") || upper.startsWith("DOC_") || upper.startsWith("CAP_")) {
    return "base";
  }
  return "especifica";
}

function buildSuggestionMotivo(keyword: string): string {
  return `Coincidencia por regla interna: ${keyword}.`;
}

function sugerirRequisitosCargo(input: {
  cargoNombre: string;
  perfilSST?: string | null;
  descripcion?: string | null;
  areaNombre?: string | null;
  riesgosClave?: string[];
  requiereDS44?: boolean;
  documentosCatalogo: CatalogoDocumentoItem[];
  capacitacionesCatalogo: CatalogoCapacitacionItem[];
}): { documentosSugeridos: SugerenciaRequisito[]; capacitacionesSugeridas: SugerenciaRequisito[] } {
  const blob = normalizeKey(
    [
      input.cargoNombre,
      input.perfilSST ?? "",
      input.descripcion ?? "",
      input.areaNombre ?? "",
      ...(input.riesgosClave ?? []),
    ].join(" "),
  );

  const reglas = [
    {
      keyword: "altura",
      docs: ["ALTURA", "TRABAJO_ALTURA"],
      caps: ["ALTURA"],
      confianza: 0.9,
    },
    {
      keyword: "electric",
      docs: ["ELECTRIC"],
      caps: ["ELECTRIC"],
      confianza: 0.85,
    },
    {
      keyword: "conductor",
      docs: ["LICENCIA", "CONDUCCION"],
      caps: ["MANEJO", "CONDUCCION"],
      confianza: 0.88,
    },
    {
      keyword: "soldad",
      docs: ["SOLDAD"],
      caps: ["SOLDAD"],
      confianza: 0.8,
    },
    {
      keyword: "espacio confinado",
      docs: ["ESPACIO_CONFINADO", "CONFINADO"],
      caps: ["CONFINADO"],
      confianza: 0.9,
    },
    {
      keyword: "aseo",
      docs: ["QUIMIC", "EPP", "PROCEDIMIENTO"],
      caps: ["QUIMIC", "MANEJO MANUAL", "EPP"],
      confianza: 0.86,
    },
    {
      keyword: "administrativ",
      docs: ["ERGONOM", "PSICOSOCIAL", "EMERGENCIA"],
      caps: ["ERGONOM", "PSICOSOCIAL", "EMERGEN"],
      confianza: 0.84,
    },
    {
      keyword: "operativ",
      docs: ["IRL", "EPP", "EMERGEN"],
      caps: ["IRL", "EPP", "HERRAMIENTAS", "EMERGEN"],
      confianza: 0.83,
    },
    {
      keyword: "prevencion",
      docs: ["DS44", "MATRIZ", "INCIDENT"],
      caps: ["DS44", "INVESTIG", "MATRIZ"],
      confianza: 0.92,
    },
    {
      keyword: "altura",
      docs: ["PTS", "ALTURA", "ARNES"],
      caps: ["ALTURA", "ARNES", "PTS"],
      confianza: 0.92,
    },
  ] as const;

  const docs: SugerenciaRequisito[] = [];
  const caps: SugerenciaRequisito[] = [];

  const pushDoc = (item: CatalogoDocumentoItem, motivo: string, confianza: number) => {
    if (docs.some((d) => d.id === item.id)) return;
    docs.push({
      id: item.id,
      nombre: item.nombre,
      motivo,
      confianza,
      fuente: "reglas",
    });
  };

  const pushCap = (item: CatalogoCapacitacionItem, motivo: string, confianza: number) => {
    if (caps.some((c) => c.id === item.id)) return;
    caps.push({
      id: item.id,
      nombre: item.nombre,
      motivo,
      confianza,
      fuente: "reglas",
    });
  };

  for (const regla of reglas) {
    if (!blob.includes(regla.keyword)) continue;

    const motivo = buildSuggestionMotivo(regla.keyword);

    for (const doc of input.documentosCatalogo) {
      const key = `${normalizeKey(doc.nombre)} ${normalizeKey(doc.codigo)} ${normalizeKey(doc.descripcion ?? "")}`;
      if (regla.docs.some((token) => key.includes(normalizeKey(token)))) {
        pushDoc(doc, motivo, regla.confianza);
      }
    }

    for (const cap of input.capacitacionesCatalogo) {
      const key = `${normalizeKey(cap.nombre)} ${normalizeKey(cap.codigo)} ${normalizeKey(cap.categoria)} ${normalizeKey(cap.modalidad)}`;
      if (regla.caps.some((token) => key.includes(normalizeKey(token)))) {
        pushCap(cap, motivo, regla.confianza);
      }
    }
  }

  if (input.requiereDS44) {
    const dsDocs = input.documentosCatalogo.filter((doc) => {
      const key = `${normalizeKey(doc.nombre)} ${normalizeKey(doc.codigo)}`;
      return key.includes("ds44") || key.includes("decreto 44") || key.includes("riesgo");
    });
    for (const doc of dsDocs) {
      pushDoc(doc, "Cargo marcado con DS44.", 0.78);
    }
  }

  return {
    documentosSugeridos: docs.sort((a, b) => b.confianza - a.confianza).slice(0, 8),
    capacitacionesSugeridas: caps.sort((a, b) => b.confianza - a.confianza).slice(0, 8),
  };
}

async function syncReglasCargo(input: {
  empresaId: string;
  cargoId: string;
  documentoTipoIds: string[];
  capacitacionIds: string[];
}) {
  const prismaAny = prisma as unknown as {
    reglaDocumentoTrabajador?: {
      findMany?: typeof prisma.reglaDocumentoTrabajador.findMany;
      updateMany?: typeof prisma.reglaDocumentoTrabajador.updateMany;
      create?: typeof prisma.reglaDocumentoTrabajador.create;
    };
    reglaCapacitacionCargo?: {
      findMany?: typeof prisma.reglaCapacitacionCargo.findMany;
      updateMany?: typeof prisma.reglaCapacitacionCargo.updateMany;
      create?: typeof prisma.reglaCapacitacionCargo.create;
    };
  };

  if (
    !prismaAny.reglaDocumentoTrabajador?.findMany ||
    !prismaAny.reglaDocumentoTrabajador?.updateMany ||
    !prismaAny.reglaDocumentoTrabajador?.create ||
    !prismaAny.reglaCapacitacionCargo?.findMany ||
    !prismaAny.reglaCapacitacionCargo?.updateMany ||
    !prismaAny.reglaCapacitacionCargo?.create
  ) {
    return;
  }

  const [documentosExistentes, capacitacionesExistentes] = await Promise.all([
    prismaAny.reglaDocumentoTrabajador.findMany({
      where: { empresaId: input.empresaId, cargoId: input.cargoId },
      select: { id: true, tipoDocumentoId: true },
    }),
    prismaAny.reglaCapacitacionCargo.findMany({
      where: { empresaId: input.empresaId, cargoId: input.cargoId },
      select: { id: true, capacitacionId: true },
    }),
  ]);

  const selectedDocSet = new Set(input.documentoTipoIds);
  const selectedCapSet = new Set(input.capacitacionIds);

  const docIdsToDisable = documentosExistentes
    .filter((row) => !selectedDocSet.has(row.tipoDocumentoId))
    .map((row) => row.id);
  const capIdsToDisable = capacitacionesExistentes
    .filter((row) => !selectedCapSet.has(row.capacitacionId))
    .map((row) => row.id);

  if (docIdsToDisable.length > 0) {
    await prismaAny.reglaDocumentoTrabajador.updateMany({
      where: { id: { in: docIdsToDisable }, empresaId: input.empresaId },
      data: { activo: false },
    });
  }

  if (capIdsToDisable.length > 0) {
    await prismaAny.reglaCapacitacionCargo.updateMany({
      where: { id: { in: capIdsToDisable }, empresaId: input.empresaId },
      data: { activo: false },
    });
  }

  for (const tipoDocumentoId of selectedDocSet) {
    const existing = documentosExistentes.find((row) => row.tipoDocumentoId === tipoDocumentoId);
    if (!existing) {
      await prismaAny.reglaDocumentoTrabajador.create({
        data: {
          empresaId: input.empresaId,
          tipoDocumentoId,
          cargoId: input.cargoId,
          obligatorio: true,
          activo: true,
        },
      });
      continue;
    }

    await prismaAny.reglaDocumentoTrabajador.updateMany({
      where: { id: existing.id, empresaId: input.empresaId },
      data: { activo: true, obligatorio: true },
    });
  }

  for (const capacitacionId of selectedCapSet) {
    const existing = capacitacionesExistentes.find((row) => row.capacitacionId === capacitacionId);
    if (!existing) {
      await prismaAny.reglaCapacitacionCargo.create({
        data: {
          empresaId: input.empresaId,
          capacitacionId,
          cargoId: input.cargoId,
          obligatorio: true,
          periodicidad: "anual",
          activo: true,
        },
      });
      continue;
    }

    await prismaAny.reglaCapacitacionCargo.updateMany({
      where: { id: existing.id, empresaId: input.empresaId },
      data: { activo: true, obligatorio: true },
    });
  }

  await evaluarDocumentosPendientesPorEvento({
    evento: "reglas_documentales_actualizadas",
    empresaId: input.empresaId,
  });
}

async function backfillCapacitacionesCargo(input: { empresaId: string; cargoId: string }) {
  const trabajadores = await prisma.trabajador.findMany({
    where: {
      empresaId: input.empresaId,
      cargoId: input.cargoId,
      estado: {
        notIn: ["inactivo", "Inactivo"],
      },
    },
    select: {
      id: true,
      cargoId: true,
      areaId: true,
      centroTrabajoId: true,
    },
  });

  if (trabajadores.length === 0) return;

  const CHUNK_SIZE = 20;
  for (let i = 0; i < trabajadores.length; i += CHUNK_SIZE) {
    const chunk = trabajadores.slice(i, i + CHUNK_SIZE);
    await Promise.allSettled(
      chunk.map((trabajador) =>
        evaluarCapacitacionesPorEvento({
          trabajadorId: trabajador.id,
          empresaId: input.empresaId,
          cargoId: trabajador.cargoId,
          areaId: trabajador.areaId,
          centroTrabajoId: trabajador.centroTrabajoId,
        }),
      ),
    );
  }
}

async function resolveLegacyRequisitos(input: {
  empresaId: string;
  documentosBase: string[];
  capacitacionesBase: string[];
}): Promise<{ documentoTipoIds: string[]; capacitacionIds: string[] }> {
  const prismaAny = prisma as unknown as {
    documentoTipoTrabajador?: {
      findMany?: typeof prisma.documentoTipoTrabajador.findMany;
    };
    capacitacion?: {
      findMany?: typeof prisma.capacitacion.findMany;
    };
  };

  if (!prismaAny.documentoTipoTrabajador?.findMany || !prismaAny.capacitacion?.findMany) {
    return {
      documentoTipoIds: [],
      capacitacionIds: [],
    };
  }

  const [tiposDocumento, capacitaciones] = await Promise.all([
    prismaAny.documentoTipoTrabajador.findMany({
      where: { empresaId: input.empresaId, activo: true },
      select: { id: true, nombre: true, codigo: true, descripcion: true },
    }),
    prismaAny.capacitacion.findMany({
      where: { empresaId: input.empresaId, activa: true },
      select: { id: true, nombre: true, codigo: true, descripcion: true },
    }),
  ]);

  const docIds = new Set<string>();
  const capIds = new Set<string>();

  const docsByKey = new Map<string, { id: string; nombre: string; codigo: string }>();
  for (const item of tiposDocumento) {
    docsByKey.set(normalizeKey(item.nombre), item);
    docsByKey.set(normalizeKey(item.codigo), item);
  }

  const capsByKey = new Map<string, { id: string; nombre: string; codigo: string }>();
  for (const item of capacitaciones) {
    capsByKey.set(normalizeKey(item.nombre), item);
    capsByKey.set(normalizeKey(item.codigo), item);
  }

  for (const legacy of input.documentosBase) {
    const cleaned = normalizeText(legacy);
    if (!cleaned) continue;
    const key = normalizeKey(cleaned);
    const existing = docsByKey.get(key);
    if (existing) {
      docIds.add(existing.id);
      continue;
    }

    const codigo = await ensureUniqueDocumentoCodigo(input.empresaId, normalizeCodigo(cleaned));
    const created = await prisma.documentoTipoTrabajador.create({
      data: {
        empresaId: input.empresaId,
        nombre: cleaned,
        codigo,
        descripcion: "Creado automáticamente desde documentosBase legado del cargo.",
        requiereVencimiento: false,
        requiereArchivo: true,
        activo: true,
      },
      select: { id: true, nombre: true, codigo: true },
    });
    docsByKey.set(normalizeKey(created.nombre), created);
    docsByKey.set(normalizeKey(created.codigo), created);
    docIds.add(created.id);
  }

  for (const legacy of input.capacitacionesBase) {
    const cleaned = normalizeText(legacy);
    if (!cleaned) continue;
    const key = normalizeKey(cleaned);
    const existing = capsByKey.get(key);
    if (existing) {
      capIds.add(existing.id);
      continue;
    }

    const codigo = await ensureUniqueCapacitacionCodigo(input.empresaId, normalizeCodigo(cleaned));
    const created = await prisma.capacitacion.create({
      data: {
        empresaId: input.empresaId,
        nombre: cleaned,
        codigo,
        categoria: "Seguridad",
        modalidad: "presencial",
        duracionHoras: null,
        vigenciaMeses: 12,
        requiereEvaluacion: false,
        requiereFirma: false,
        generaCertificado: false,
        esObligatoria: true,
        activa: true,
        descripcion: "Creada automáticamente desde capacitacionesBase legado del cargo. estadoRevision: pendiente_revision.",
      },
      select: { id: true, nombre: true, codigo: true },
    });
    capsByKey.set(normalizeKey(created.nombre), created);
    capsByKey.set(normalizeKey(created.codigo), created);
    capIds.add(created.id);
  }

  return {
    documentoTipoIds: Array.from(docIds),
    capacitacionIds: Array.from(capIds),
  };
}

export async function getCargoCatalogosFormData(cargoId?: string): Promise<CargoCatalogosFormData> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const [documentos, capacitaciones] = await Promise.all([
    prisma.documentoTipoTrabajador.findMany({
      where: { empresaId, activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        descripcion: true,
        requiereVencimiento: true,
        vigenciaDias: true,
        requiereArchivo: true,
      },
      orderBy: [{ nombre: "asc" }],
    }),
    prisma.capacitacion.findMany({
      where: { empresaId, activa: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        categoria: true,
        modalidad: true,
        duracionHoras: true,
        vigenciaMeses: true,
        requiereEvaluacion: true,
        requiereFirma: true,
        generaCertificado: true,
      },
      orderBy: [{ nombre: "asc" }],
    }),
  ]);

  let documentosSeleccionadosIds: string[] = [];
  let capacitacionesSeleccionadasIds: string[] = [];
  let cargoNombre = "";
  let perfilSST: string | null = null;
  let descripcion: string | null = null;
  let requiereDS44 = false;
  let areaNombre: string | null = null;
  let riesgosClave: string[] = [];

  if (cargoId) {
    const [docsReglas, capsReglas, cargoRow] = await Promise.all([
      prisma.reglaDocumentoTrabajador.findMany({
        where: { empresaId, cargoId, activo: true },
        select: { tipoDocumentoId: true },
      }),
      prisma.reglaCapacitacionCargo.findMany({
        where: { empresaId, cargoId, activo: true },
        select: { capacitacionId: true },
      }),
      prisma.cargo.findFirst({
        where: { id: cargoId, empresaId },
        select: {
          nombre: true,
          perfilSST: true,
          descripcion: true,
          esCritico: true,
          area: { select: { nombre: true } },
        },
      }),
    ]);

    documentosSeleccionadosIds = docsReglas.map((row) => row.tipoDocumentoId);
    capacitacionesSeleccionadasIds = capsReglas.map((row) => row.capacitacionId);
    cargoNombre = cargoRow?.nombre ?? "";
    perfilSST = cargoRow?.perfilSST ?? null;
    descripcion = cargoRow?.descripcion ?? null;
    requiereDS44 = Boolean(cargoRow?.esCritico);
    areaNombre = cargoRow?.area?.nombre ?? null;
    const decoded = decodeCargoCompatMeta(cargoRow?.descripcion ?? null);
    riesgosClave = decoded.riesgosClave;
  }

  const documentosCatalogo = documentos.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    codigo: item.codigo,
    descripcion: item.descripcion,
    requiereVencimiento: item.requiereVencimiento,
    vigenciaDias: item.vigenciaDias,
    requiereArchivo: item.requiereArchivo,
    origen: inferOrigenPorCodigo(item.codigo),
  }));

  const capacitacionesCatalogo = capacitaciones.map((item) => ({
    id: item.id,
    nombre: item.nombre,
    codigo: item.codigo,
    categoria: item.categoria,
    modalidad: item.modalidad,
    duracionHoras: item.duracionHoras,
    vigenciaMeses: item.vigenciaMeses,
    requiereEvaluacion: item.requiereEvaluacion,
    requiereFirma: item.requiereFirma,
    generaCertificado: item.generaCertificado,
    origen: inferOrigenPorCodigo(item.codigo),
  }));

  const sugerencias = sugerirRequisitosCargo({
    cargoNombre,
    perfilSST,
    descripcion,
    areaNombre,
    riesgosClave,
    requiereDS44,
    documentosCatalogo,
    capacitacionesCatalogo,
  });

  return {
    documentosCatalogo,
    capacitacionesCatalogo,
    documentosSeleccionadosIds,
    capacitacionesSeleccionadasIds,
    documentosSugeridos: sugerencias.documentosSugeridos,
    capacitacionesSugeridas: sugerencias.capacitacionesSugeridas,
  };
}

export async function crearDocumentoEspecificoCargo(input: {
  nombre: string;
  codigo?: string;
  descripcion?: string;
  requiereVencimiento?: boolean;
  vigenciaDias?: number | null;
  requiereArchivo?: boolean;
  observacion?: string;
  cargoId?: string;
  allowSimilarDuplicate?: boolean;
}): Promise<CatalogoDocumentoItem> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const nombre = normalizeText(input.nombre);
  if (!nombre) throw new Error("El nombre del documento es obligatorio");

  const codigo = normalizeCodigo(input.codigo || nombre);
  if (!codigo) throw new Error("No se pudo generar el codigo del documento");

  const existentes = await prisma.documentoTipoTrabajador.findMany({
    where: { empresaId, activo: true },
    select: { id: true, nombre: true, codigo: true },
  });

  const keyNombre = normalizeKey(nombre);
  const keyCodigo = normalizeKey(codigo);
  const duplicado = existentes.find(
    (item) => normalizeKey(item.nombre) === keyNombre || normalizeKey(item.codigo) === keyCodigo,
  );

  if (duplicado && !input.allowSimilarDuplicate) {
    throw new Error(`Ya existe un documento similar: ${duplicado.nombre} (${duplicado.codigo}). Usa el existente.`);
  }

  const codigoUnico = await ensureUniqueDocumentoCodigo(empresaId, codigo);
  const observacion = normalizeText(input.observacion);
  const descripcion = normalizeText(input.descripcion);
  const trazabilidad = "Origen: cargo/manual/personalizado. estadoRevision: pendiente_revision.";
  const descripcionFinal = [descripcion, observacion, trazabilidad].filter(Boolean).join(" ");

  const created = await prisma.documentoTipoTrabajador.create({
    data: {
      empresaId,
      nombre,
      codigo: codigoUnico,
      descripcion: descripcionFinal || null,
      vigenciaDias: input.vigenciaDias ?? null,
      requiereVencimiento: Boolean(input.requiereVencimiento),
      requiereArchivo: input.requiereArchivo ?? true,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      descripcion: true,
      requiereVencimiento: true,
      vigenciaDias: true,
      requiereArchivo: true,
    },
  });

  if (input.cargoId) {
    const existing = await prisma.reglaDocumentoTrabajador.findFirst({
      where: {
        empresaId,
        cargoId: input.cargoId,
        tipoDocumentoId: created.id,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.reglaDocumentoTrabajador.updateMany({
        where: { id: existing.id, empresaId },
        data: { obligatorio: true, activo: true },
      });
    } else {
      await prisma.reglaDocumentoTrabajador.create({
        data: {
          empresaId,
          cargoId: input.cargoId,
          tipoDocumentoId: created.id,
          obligatorio: true,
          activo: true,
        },
      });
    }

    await evaluarDocumentosPendientesPorEvento({
      evento: "reglas_documentales_actualizadas",
      empresaId,
    });
  }

  return {
    id: created.id,
    nombre: created.nombre,
    codigo: created.codigo,
    descripcion: created.descripcion,
    requiereVencimiento: created.requiereVencimiento,
    vigenciaDias: created.vigenciaDias,
    requiereArchivo: created.requiereArchivo,
    origen: "especifica",
  };
}

export async function crearCapacitacionEspecificaCargo(input: {
  nombre: string;
  codigo?: string;
  categoria?: string;
  modalidad?: string;
  duracionHoras?: number | null;
  vigenciaMeses?: number | null;
  requiereEvaluacion?: boolean;
  requiereFirma?: boolean;
  generaCertificado?: boolean;
  descripcion?: string;
  observacion?: string;
  cargoId?: string;
  allowSimilarDuplicate?: boolean;
}): Promise<CatalogoCapacitacionItem> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const nombre = normalizeText(input.nombre);
  if (!nombre) throw new Error("El nombre de la capacitacion es obligatorio");

  const codigo = normalizeCodigo(input.codigo || nombre);
  if (!codigo) throw new Error("No se pudo generar el codigo de la capacitacion");

  const categoria = normalizeText(input.categoria) || "Seguridad";

  const existentes = await prisma.capacitacion.findMany({
    where: { empresaId, activa: true },
    select: { id: true, nombre: true, codigo: true },
  });

  const keyNombre = normalizeKey(nombre);
  const keyCodigo = normalizeKey(codigo);
  const duplicado = existentes.find(
    (item) => normalizeKey(item.nombre) === keyNombre || normalizeKey(item.codigo) === keyCodigo,
  );

  if (duplicado && !input.allowSimilarDuplicate) {
    throw new Error(`Ya existe una capacitacion similar: ${duplicado.nombre} (${duplicado.codigo}). Usa la existente.`);
  }

  const codigoUnico = await ensureUniqueCapacitacionCodigo(empresaId, codigo);
  const descripcion = normalizeText(input.descripcion);
  const observacion = normalizeText(input.observacion);
  const trazabilidad = "Origen: cargo/manual/personalizado. estadoRevision: pendiente_revision.";
  const descripcionFinal = [descripcion, observacion, trazabilidad].filter(Boolean).join(" ");

  const created = await prisma.capacitacion.create({
    data: {
      empresaId,
      nombre,
      codigo: codigoUnico,
      categoria,
      descripcion: descripcionFinal || null,
      modalidad: normalizeText(input.modalidad) || "presencial",
      duracionHoras: input.duracionHoras ?? null,
      vigenciaMeses: input.vigenciaMeses ?? 12,
      requiereEvaluacion: Boolean(input.requiereEvaluacion),
      requiereFirma: Boolean(input.requiereFirma),
      generaCertificado: Boolean(input.generaCertificado),
      esObligatoria: true,
      activa: true,
    },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      categoria: true,
      modalidad: true,
      duracionHoras: true,
      vigenciaMeses: true,
      requiereEvaluacion: true,
      requiereFirma: true,
      generaCertificado: true,
    },
  });

  if (input.cargoId) {
    const existing = await prisma.reglaCapacitacionCargo.findFirst({
      where: {
        empresaId,
        cargoId: input.cargoId,
        capacitacionId: created.id,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.reglaCapacitacionCargo.updateMany({
        where: { id: existing.id, empresaId },
        data: { obligatorio: true, activo: true },
      });
    } else {
      await prisma.reglaCapacitacionCargo.create({
        data: {
          empresaId,
          cargoId: input.cargoId,
          capacitacionId: created.id,
          obligatorio: true,
          periodicidad: "anual",
          activo: true,
        },
      });
    }
  }

  return {
    id: created.id,
    nombre: created.nombre,
    codigo: created.codigo,
    categoria: created.categoria,
    modalidad: created.modalidad,
    duracionHoras: created.duracionHoras,
    vigenciaMeses: created.vigenciaMeses,
    requiereEvaluacion: created.requiereEvaluacion,
    requiereFirma: created.requiereFirma,
    generaCertificado: created.generaCertificado,
    origen: "especifica",
  };
}

export async function getCargos() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const trabajadoresActivosPromise =
    typeof prisma.trabajador?.findMany === "function"
      ? prisma.trabajador.findMany({
          where: {
            empresaId,
            cargoId: { not: null },
            estado: {
              equals: "activo",
              mode: "insensitive",
            },
          },
          select: {
            cargoId: true,
            centroTrabajo: {
              select: {
                nombre: true,
              },
            },
          },
        })
      : Promise.resolve([]);

  const [rows, trabajadoresActivos] = await Promise.all([
    prisma.cargo.findMany({
      where: { empresaId },
      select: cargoReadSelect,
      orderBy: { createdAt: "desc" },
    }),
    trabajadoresActivosPromise,
  ]);

  const resumenPorCargo = new Map<string, { trabajadores: number; centros: Set<string> }>();
  for (const trabajador of trabajadoresActivos) {
    if (!trabajador.cargoId) continue;
    const current = resumenPorCargo.get(trabajador.cargoId) ?? { trabajadores: 0, centros: new Set<string>() };
    current.trabajadores += 1;
    if (trabajador.centroTrabajo?.nombre) {
      current.centros.add(trabajador.centroTrabajo.nombre);
    }
    resumenPorCargo.set(trabajador.cargoId, current);
  }

  return rows.map((row) => {
    const base = hydrateCargo(row as CargoRow);
    const resumen = resumenPorCargo.get(row.id);
    return {
      ...base,
      trabajadores: resumen?.trabajadores ?? 0,
      centros: resumen ? Array.from(resumen.centros) : [],
    };
  });
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
        tipo: payload.tipo,
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

  let docIds = payload.documentoTipoIds;
  let capIds = payload.capacitacionIds;

  if (docIds.length === 0 || capIds.length === 0) {
    const legacyResolved = await resolveLegacyRequisitos({
      empresaId,
      documentosBase: payload.documentosBase,
      capacitacionesBase: payload.capacitacionesBase,
    });
    if (docIds.length === 0) docIds = legacyResolved.documentoTipoIds;
    if (capIds.length === 0) capIds = legacyResolved.capacitacionIds;
  }

  await syncReglasCargo({
    empresaId,
    cargoId: created.id,
    documentoTipoIds: docIds,
    capacitacionIds: capIds,
  });

  if (capIds.length > 0) {
    await backfillCapacitacionesCargo({ empresaId, cargoId: created.id });
  }

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
        tipo: payload.tipo,
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

  let docIds = payload.documentoTipoIds;
  let capIds = payload.capacitacionIds;

  if (docIds.length === 0 || capIds.length === 0) {
    const legacyResolved = await resolveLegacyRequisitos({
      empresaId,
      documentosBase: payload.documentosBase,
      capacitacionesBase: payload.capacitacionesBase,
    });
    if (docIds.length === 0) docIds = legacyResolved.documentoTipoIds;
    if (capIds.length === 0) capIds = legacyResolved.capacitacionIds;
  }

  await syncReglasCargo({
    empresaId,
    cargoId: id,
    documentoTipoIds: docIds,
    capacitacionIds: capIds,
  });

  if (capIds.length > 0) {
    await backfillCapacitacionesCargo({ empresaId, cargoId: id });
  }

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
