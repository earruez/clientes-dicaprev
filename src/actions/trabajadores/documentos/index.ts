"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { Worker } from "@/components/trabajadores-v2/types";
import type {
  DocumentoTrabajador,
  DocEstado,
  ReglaDocumental,
  TipoDocumento,
} from "@/components/trabajadores-v2/documental/types";

export type TipoDocumentoTrabajadorInput = {
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  vigenciaDias?: number | null;
  requiereVencimiento: boolean;
  requiereArchivo: boolean;
  activo?: boolean;
};

export type ReglaDocumentoTrabajadorInput = {
  tipoDocumentoId: string;
  cargoId?: string | null;
  areaId?: string | null;
  centroTrabajoId?: string | null;
  tipoContrato?: string | null;
  obligatorio: boolean;
  activo?: boolean;
};

export type ControlDocumentalTrabajadoresPayload = {
  workers: Worker[];
  tipos: TipoDocumento[];
  reglas: ReglaDocumental[];
  documentos: DocumentoTrabajador[];
};

export type EstadoDocumentoTrabajadorInput =
  | "pendiente"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "vencido"
  | "no_aplica"
  | "completo";

export type CreateTrabajadorDocumentoInput = {
  trabajadorId: string;
  tipoDocumentoId: string;
  estado: EstadoDocumentoTrabajadorInput;
  fechaEmision?: string;
  fechaVencimiento?: string;
  observaciones?: string;
  cargadoPor?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
  archivoTipo?: string;
  archivoPeso?: number;
};

export type UpdateTrabajadorDocumentoInput = {
  documentoId: string;
  estado?: EstadoDocumentoTrabajadorInput;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  observaciones?: string | null;
  cargadoPor?: string | null;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
};

export type HistorialDocumentoTrabajadorInput = {
  accion: string;
  detalle?: string;
  version?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
  archivoUrl?: string;
  archivoTipo?: string;
  archivoPeso?: number;
};

export type EvaluacionReglasTrabajadorResult = {
  trabajadorId: string;
  reglasEvaluadas: number;
  reglasAplicables: number;
  pendientesGenerados: number;
  documentosGeneradosIds: string[];
};

export type EvaluacionReglasEmpresaResult = {
  trabajadoresEvaluados: number;
  trabajadoresConPendientesNuevos: number;
  pendientesGenerados: number;
  detalles: EvaluacionReglasTrabajadorResult[];
};

function mapDocEstado(estado: string): DocEstado {
  const normalized = estado.toLowerCase();
  if (normalized === "aprobado") return "completo";
  if (normalized === "completo" || normalized === "vigente") return "completo";
  if (normalized === "vencido") return "vencido";
  if (normalized === "no_aplica") return "no_aplica";
  if (normalized === "en_revision") return "en_revision";
  if (normalized === "rechazado") return "rechazado";
  return "pendiente";
}

function normalizeEstadoForStorage(estado: EstadoDocumentoTrabajadorInput): string {
  if (estado === "aprobado") return "completo";
  return estado;
}

function parseOptionalDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha invalida");
  return parsed;
}

function inferCategoria(nombre: string): TipoDocumento["categoria"] {
  const n = nombre.toLowerCase();
  if (n.includes("examen") || n.includes("medic")) return "Médico";
  if (n.includes("inducci") || n.includes("capacit")) return "Capacitación";
  if (n.includes("epp") || n.includes("odi") || n.includes("ds44") || n.includes("sst")) return "SST";
  if (n.includes("licencia") || n.includes("competencia") || n.includes("técn") || n.includes("tecn")) return "Técnico";
  return "Contratación";
}

function mapWorkerRow(row: {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  estado: string;
  fechaIngreso: Date | null;
  tipoContrato: string | null;
  cargo: { nombre: string } | null;
  area: { nombre: string } | null;
  centroTrabajo: { nombre: string } | null;
  posicionDotacionId: string | null;
  documentos: { estado: string }[];
}): Worker {
  const pendientes = row.documentos.filter((d) => mapDocEstado(d.estado) !== "completo").length;

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
    estado:
      row.estado === "inactivo"
        ? "Inactivo"
        : row.estado === "licencia"
          ? "Licencia"
          : row.estado === "vacaciones"
            ? "Vacaciones"
            : "Activo",
    fechaIngreso: row.fechaIngreso ? row.fechaIngreso.toISOString().slice(0, 10) : "",
    fechaNacimiento: "",
    tipoContrato:
      row.tipoContrato === "Plazo Fijo" || row.tipoContrato === "Por Obra" || row.tipoContrato === "Part Time"
        ? row.tipoContrato
        : "Indefinido",
    documentosPendientes: pendientes,
    capacitacionesPendientes: 0,
    dotacionId: row.posicionDotacionId ?? undefined,
  };
}

function buildReglaNombre(rule: {
  cargo?: { nombre: string } | null;
  area?: { nombre: string } | null;
  centroTrabajo?: { nombre: string } | null;
  tipoContrato?: string | null;
  obligatorio: boolean;
}) {
  const tags: string[] = [];
  if (rule.area?.nombre) tags.push(`Área ${rule.area.nombre}`);
  if (rule.cargo?.nombre) tags.push(`Cargo ${rule.cargo.nombre}`);
  if (rule.centroTrabajo?.nombre) tags.push(`Centro ${rule.centroTrabajo.nombre}`);
  if (rule.tipoContrato) tags.push(`Contrato ${rule.tipoContrato}`);
  if (tags.length === 0) return rule.obligatorio ? "Base universal" : "Base opcional";
  return tags.join(" · ");
}

type ReglaEvaluable = {
  id: string;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
  tipoContrato: string | null;
  tipoDocumento: {
    id: string;
    nombre: string;
    codigo: string;
    requiereVencimiento: boolean;
  };
};

type TrabajadorEvaluable = {
  id: string;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
  tipoContrato: string | null;
};

function reglaAplicaATrabajador(regla: ReglaEvaluable, trabajador: TrabajadorEvaluable): boolean {
  if (regla.cargoId && regla.cargoId !== trabajador.cargoId) return false;
  if (regla.areaId && regla.areaId !== trabajador.areaId) return false;
  if (regla.centroTrabajoId && regla.centroTrabajoId !== trabajador.centroTrabajoId) return false;
  if (regla.tipoContrato && regla.tipoContrato !== trabajador.tipoContrato) return false;
  return true;
}

async function evaluarReglasDocumentalesTrabajadorInternal(
  context: { empresaId: string; usuarioId: string; email: string },
  trabajador: TrabajadorEvaluable,
  reglas: ReglaEvaluable[],
): Promise<EvaluacionReglasTrabajadorResult> {
  const existentes = await prisma.trabajadorDocumento.findMany({
    where: { empresaId: context.empresaId, trabajadorId: trabajador.id },
    select: { tipo: true, nombre: true },
  });

  const existentesKeys = new Set<string>();
  existentes.forEach((doc) => {
    existentesKeys.add(doc.tipo.toLowerCase());
    existentesKeys.add(doc.nombre.toLowerCase());
  });

  const reglasAplicables = reglas.filter((regla) => reglaAplicaATrabajador(regla, trabajador));

  const tiposPendientes = new Map<
    string,
    {
      tipoDocumentoId: string;
      nombre: string;
      codigo: string;
      requiereVencimiento: boolean;
      reglas: string[];
    }
  >();

  for (const regla of reglasAplicables) {
    const codigoKey = regla.tipoDocumento.codigo.toLowerCase();
    const nombreKey = regla.tipoDocumento.nombre.toLowerCase();
    if (existentesKeys.has(codigoKey) || existentesKeys.has(nombreKey)) continue;

    const current = tiposPendientes.get(codigoKey);
    if (current) {
      current.reglas.push(regla.id);
      continue;
    }

    tiposPendientes.set(codigoKey, {
      tipoDocumentoId: regla.tipoDocumento.id,
      nombre: regla.tipoDocumento.nombre,
      codigo: regla.tipoDocumento.codigo,
      requiereVencimiento: regla.tipoDocumento.requiereVencimiento,
      reglas: [regla.id],
    });
  }

  const documentosGeneradosIds: string[] = [];

  for (const pendiente of tiposPendientes.values()) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const documento = await tx.trabajadorDocumento.create({
          data: {
            trabajadorId: trabajador.id,
            empresaId: context.empresaId,
            nombre: pendiente.nombre,
            tipo: pendiente.codigo,
            categoria: "trabajador",
            estado: "pendiente",
            version: "1.0",
            tieneVencimiento: pendiente.requiereVencimiento,
            observaciones: "Generado automáticamente por regla documental.",
            subidoPorId: context.usuarioId,
            creadoPorEmail: context.email,
          },
          select: { id: true, version: true },
        });

        await tx.trabajadorDocumentoHistorial.create({
          data: {
            documentoId: documento.id,
            usuarioId: context.usuarioId,
            accion: "DOCUMENTO_GENERADO_POR_REGLA",
            detalle: `Generado por evaluación automática de reglas documentales (${pendiente.reglas.join(", ")})`,
            version: documento.version,
          },
        });

        return documento;
      });

      documentosGeneradosIds.push(created.id);
      existentesKeys.add(pendiente.codigo.toLowerCase());
      existentesKeys.add(pendiente.nombre.toLowerCase());
    } catch {
      // Evita fallar toda la evaluación si otra ejecución creó el mismo documento en paralelo.
    }
  }

  return {
    trabajadorId: trabajador.id,
    reglasEvaluadas: reglas.length,
    reglasAplicables: reglasAplicables.length,
    pendientesGenerados: documentosGeneradosIds.length,
    documentosGeneradosIds,
  };
}

export async function getTiposDocumentoTrabajador(): Promise<TipoDocumento[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.documentoTipoTrabajador.findMany({
    where: { empresaId, activo: true },
    orderBy: [{ nombre: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categoria: inferCategoria(row.nombre),
    descripcion: row.descripcion ?? "Documento configurable por empresa.",
    requiereVencimiento: row.requiereVencimiento,
    vencimientoMeses: row.vigenciaDias ? Math.max(1, Math.round(row.vigenciaDias / 30)) : null,
    esCritico: row.requiereArchivo || row.requiereVencimiento,
  }));
}

export async function getReglasDocumentoTrabajador(): Promise<ReglaDocumental[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.reglaDocumentoTrabajador.findMany({
    where: { empresaId, activo: true },
    include: {
      tipoDocumento: { select: { id: true } },
      cargo: { select: { nombre: true } },
      area: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    nombre: buildReglaNombre(row),
    descripcion: row.obligatorio
      ? "Regla automática obligatoria"
      : "Regla automática opcional",
    condicion: {
      cargo: row.cargo?.nombre,
      area: row.area?.nombre,
      tipoContrato: row.tipoContrato ?? undefined,
      centroTrabajo: row.centroTrabajo?.nombre,
    },
    tiposDocumentoIds: [row.tipoDocumento.id],
    activa: row.activo,
  }));
}

export async function getControlDocumentalTrabajadores(): Promise<ControlDocumentalTrabajadoresPayload> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const [trabajadoresRows, tiposRows, reglasRows, docsRows] = await Promise.all([
    prisma.trabajador.findMany({
      where: { empresaId },
      include: {
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
        documentos: { select: { estado: true } },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.documentoTipoTrabajador.findMany({
      where: { empresaId, activo: true },
      orderBy: [{ nombre: "asc" }],
    }),
    prisma.reglaDocumentoTrabajador.findMany({
      where: { empresaId, activo: true },
      include: {
        tipoDocumento: { select: { id: true } },
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.trabajadorDocumento.findMany({
      where: { empresaId },
      select: {
        id: true,
        trabajadorId: true,
        tipo: true,
        estado: true,
        createdAt: true,
        fechaVencimiento: true,
        creadoPorEmail: true,
        observaciones: true,
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const tipos = tiposRows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categoria: inferCategoria(row.nombre),
    descripcion: row.descripcion ?? "Documento configurable por empresa.",
    requiereVencimiento: row.requiereVencimiento,
    vencimientoMeses: row.vigenciaDias ? Math.max(1, Math.round(row.vigenciaDias / 30)) : null,
    esCritico: row.requiereArchivo || row.requiereVencimiento,
  })) satisfies TipoDocumento[];

  const reglas = reglasRows.map((row) => ({
    id: row.id,
    nombre: buildReglaNombre(row),
    descripcion: row.obligatorio ? "Regla automática obligatoria" : "Regla automática opcional",
    condicion: {
      cargo: row.cargo?.nombre,
      area: row.area?.nombre,
      tipoContrato: row.tipoContrato ?? undefined,
      centroTrabajo: row.centroTrabajo?.nombre,
    },
    tiposDocumentoIds: [row.tipoDocumento.id],
    activa: row.activo,
  })) satisfies ReglaDocumental[];

  const tipoByCodigo = new Map(tiposRows.map((t) => [t.codigo.toLowerCase(), t.id]));
  const tipoByNombre = new Map(tiposRows.map((t) => [t.nombre.toLowerCase(), t.id]));

  const documentos = docsRows
    .map((row) => {
      const tipoRaw = row.tipo.toLowerCase();
      const tipoDocumentoId = tipoByCodigo.get(tipoRaw) ?? tipoByNombre.get(tipoRaw);
      if (!tipoDocumentoId) {
        // TODO(Fase 15.5): migrar catálogo legacy en TrabajadorDocumento.tipo para eliminar descartes por no mapeo.
        return null;
      }

      return {
        id: row.id,
        workerId: row.trabajadorId,
        tipoDocumentoId,
        estado: mapDocEstado(row.estado),
        fechaCarga: row.createdAt.toISOString().slice(0, 10),
        fechaVencimiento: row.fechaVencimiento ? row.fechaVencimiento.toISOString().slice(0, 10) : undefined,
        cargadoPor: row.creadoPorEmail ?? undefined,
        observacion: row.observaciones ?? undefined,
      } satisfies DocumentoTrabajador;
    })
    .filter(Boolean) as DocumentoTrabajador[];

  return {
    workers: trabajadoresRows.map(mapWorkerRow),
    tipos,
    reglas,
    documentos,
  };
}

export async function createTipoDocumentoTrabajador(
  data: TipoDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const created = await prisma.documentoTipoTrabajador.create({
    data: {
      empresaId,
      nombre: data.nombre.trim(),
      codigo: data.codigo.trim(),
      descripcion: data.descripcion?.trim() || null,
      vigenciaDias: data.vigenciaDias ?? null,
      requiereVencimiento: data.requiereVencimiento,
      requiereArchivo: data.requiereArchivo,
      activo: data.activo ?? true,
    },
    select: { id: true },
  });

  return created;
}

export async function updateTipoDocumentoTrabajador(
  id: string,
  data: Partial<TipoDocumentoTrabajadorInput>,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const updated = await prisma.documentoTipoTrabajador.updateMany({
    where: { id, empresaId },
    data: {
      nombre: data.nombre?.trim(),
      codigo: data.codigo?.trim(),
      descripcion: data.descripcion === undefined ? undefined : data.descripcion?.trim() || null,
      vigenciaDias: data.vigenciaDias,
      requiereVencimiento: data.requiereVencimiento,
      requiereArchivo: data.requiereArchivo,
      activo: data.activo,
    },
  });

  if (updated.count === 0) throw new Error("Tipo de documento no encontrado");
  return { id };
}

async function getTrabajadorDocumentoInEmpresa(empresaId: string, documentoId: string) {
  const documento = await prisma.trabajadorDocumento.findFirst({
    where: { id: documentoId, empresaId },
    select: {
      id: true,
      trabajadorId: true,
      empresaId: true,
      estado: true,
      version: true,
      tipo: true,
      nombre: true,
    },
  });

  if (!documento) {
    throw new Error("Documento de trabajador no encontrado");
  }

  return documento;
}

async function getTrabajadorAndTipoInEmpresa(empresaId: string, trabajadorId: string, tipoDocumentoId: string) {
  const [trabajador, tipoDocumento] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: { id: true },
    }),
    prisma.documentoTipoTrabajador.findFirst({
      where: { id: tipoDocumentoId, empresaId, activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        requiereVencimiento: true,
      },
    }),
  ]);

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (!tipoDocumento) {
    throw new Error("Tipo de documento no encontrado en la empresa actual");
  }

  return { trabajador, tipoDocumento };
}

async function validateDocumentoReferencesInEmpresa(
  empresaId: string,
  documento: { trabajadorId: string; tipo: string; nombre: string },
) {
  const [trabajador, tipoDocumento] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: documento.trabajadorId, empresaId },
      select: { id: true },
    }),
    prisma.documentoTipoTrabajador.findFirst({
      where: {
        empresaId,
        OR: [
          { codigo: documento.tipo },
          { nombre: documento.nombre },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (!tipoDocumento) {
    throw new Error("Tipo de documento no encontrado en la empresa actual");
  }
}

export async function registrarHistorialDocumentoTrabajador(
  documentoId: string,
  data: HistorialDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const historial = await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: documento.id,
      usuarioId,
      accion: data.accion,
      detalle: data.detalle?.trim() || null,
      version: data.version?.trim() || null,
      archivoNombre: data.archivoNombre?.trim() || null,
      archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
      archivoUrl: data.archivoUrl?.trim() || null,
      archivoTipo: data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso ?? null,
    },
    select: { id: true },
  });

  return historial;
}

export type HistorialEntryView = {
  id: string;
  accion: string;
  detalle: string | null;
  version: string | null;
  archivoNombre: string | null;
  archivoNombreOriginal: string | null;
  archivoUrl: string | null;
  archivoTipo: string | null;
  archivoPeso: number | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  createdAt: string;
};

export async function getHistorialDocumentoTrabajador(
  documentoId: string,
): Promise<HistorialEntryView[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);

  const entries = await prisma.trabajadorDocumentoHistorial.findMany({
    where: { documentoId: documento.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      accion: true,
      detalle: true,
      version: true,
      archivoNombre: true,
      archivoNombreOriginal: true,
      archivoUrl: true,
      archivoTipo: true,
      archivoPeso: true,
      createdAt: true,
      usuario: {
        select: { nombre: true, email: true },
      },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    accion: e.accion,
    detalle: e.detalle,
    version: e.version,
    archivoNombre: e.archivoNombre,
    archivoNombreOriginal: e.archivoNombreOriginal,
    archivoUrl: e.archivoUrl,
    archivoTipo: e.archivoTipo,
    archivoPeso: e.archivoPeso,
    usuarioNombre: e.usuario?.nombre ?? null,
    usuarioEmail: e.usuario?.email ?? null,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function createTrabajadorDocumento(
  data: CreateTrabajadorDocumentoInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const estado = normalizeEstadoForStorage(data.estado);
  const { tipoDocumento } = await getTrabajadorAndTipoInEmpresa(
    empresaId,
    data.trabajadorId,
    data.tipoDocumentoId,
  );

  const exists = await prisma.trabajadorDocumento.findUnique({
    where: {
      trabajadorId_tipo: {
        trabajadorId: data.trabajadorId,
        tipo: tipoDocumento.codigo,
      },
    },
    select: { id: true },
  });

  if (exists) {
    throw new Error("Ya existe un documento de este tipo para el trabajador");
  }

  const created = await prisma.trabajadorDocumento.create({
    data: {
      trabajadorId: data.trabajadorId,
      empresaId,
      nombre: tipoDocumento.nombre,
      tipo: tipoDocumento.codigo,
      categoria: "trabajador",
      estado,
      version: "1.0",
      archivoNombre: data.archivoNombre?.trim() || null,
      archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
      // TODO(Fase 15.8): persistir archivoUrl real cuando se implemente storage de archivos.
      archivoUrl: null,
      archivoTipo: data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso ?? null,
      tieneVencimiento: tipoDocumento.requiereVencimiento,
      fechaEmision: parseOptionalDate(data.fechaEmision) ?? null,
      fechaVencimiento: parseOptionalDate(data.fechaVencimiento) ?? null,
      observaciones: data.observaciones?.trim() || null,
      subidoPorId: usuarioId,
      creadoPorEmail: data.cargadoPor?.trim() || email,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: created.id,
      usuarioId,
      accion: "DOCUMENTO_CREADO",
      detalle: `Documento creado con estado ${estado}`,
      version: created.version,
      archivoNombre: data.archivoNombre?.trim() || null,
      archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
      archivoTipo: data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso ?? null,
    },
  });

  return { id: created.id };
}

export async function updateTrabajadorDocumento(
  data: UpdateTrabajadorDocumentoInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, data.documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const normalizedEstado = data.estado ? normalizeEstadoForStorage(data.estado) : undefined;
  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: normalizedEstado,
      fechaEmision: parseOptionalDate(data.fechaEmision),
      fechaVencimiento: parseOptionalDate(data.fechaVencimiento),
      observaciones: data.observaciones === undefined ? undefined : data.observaciones?.trim() || null,
      creadoPorEmail: data.cargadoPor === undefined ? undefined : data.cargadoPor?.trim() || email,
      archivoNombre: data.archivoNombre === undefined ? undefined : data.archivoNombre?.trim() || null,
      archivoNombreOriginal:
        data.archivoNombreOriginal === undefined
          ? undefined
          : data.archivoNombreOriginal?.trim() || null,
      // TODO(Fase 15.8): actualizar archivoUrl cuando exista integración de storage.
      archivoTipo: data.archivoTipo === undefined ? undefined : data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso,
      subidoPorId: usuarioId,
    },
    select: { id: true, estado: true, version: true },
  });

  if (normalizedEstado && normalizedEstado !== documento.estado) {
    await prisma.trabajadorDocumentoHistorial.create({
      data: {
        documentoId: updated.id,
        usuarioId,
        accion: "ESTADO_ACTUALIZADO",
        detalle: `Estado ${documento.estado} -> ${normalizedEstado}`,
        version: updated.version,
      },
    });
  }

  return { id: updated.id };
}

export async function cambiarEstadoTrabajadorDocumento(
  documentoId: string,
  estado: EstadoDocumentoTrabajadorInput,
  detalle?: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);
  const normalizedEstado = normalizeEstadoForStorage(estado);

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: normalizedEstado,
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "ESTADO_ACTUALIZADO",
      detalle: detalle?.trim() || `Estado ${documento.estado} -> ${normalizedEstado}`,
      version: updated.version,
    },
  });

  return { id: updated.id };
}

export async function evaluarReglasDocumentalesTrabajador(
  trabajadorId: string,
): Promise<EvaluacionReglasTrabajadorResult> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const [trabajador, reglas] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: {
        id: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
      },
    }),
    prisma.reglaDocumentoTrabajador.findMany({
      where: {
        empresaId,
        activo: true,
        obligatorio: true,
        tipoDocumento: { activo: true },
      },
      include: {
        tipoDocumento: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            requiereVencimiento: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  return evaluarReglasDocumentalesTrabajadorInternal(
    { empresaId, usuarioId, email },
    trabajador,
    reglas,
  );
}

export async function evaluarReglasDocumentalesEmpresa(): Promise<EvaluacionReglasEmpresaResult> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const [trabajadores, reglas] = await Promise.all([
    prisma.trabajador.findMany({
      where: { empresaId },
      select: {
        id: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.reglaDocumentoTrabajador.findMany({
      where: {
        empresaId,
        activo: true,
        obligatorio: true,
        tipoDocumento: { activo: true },
      },
      include: {
        tipoDocumento: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            requiereVencimiento: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  const detalles: EvaluacionReglasTrabajadorResult[] = [];

  for (const trabajador of trabajadores) {
    const result = await evaluarReglasDocumentalesTrabajadorInternal(
      { empresaId, usuarioId, email },
      trabajador,
      reglas,
    );
    detalles.push(result);
  }

  const pendientesGenerados = detalles.reduce((sum, item) => sum + item.pendientesGenerados, 0);

  return {
    trabajadoresEvaluados: detalles.length,
    trabajadoresConPendientesNuevos: detalles.filter((item) => item.pendientesGenerados > 0).length,
    pendientesGenerados,
    detalles,
  };
}

export async function createReglaDocumentoTrabajador(
  data: ReglaDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const created = await prisma.reglaDocumentoTrabajador.create({
    data: {
      empresaId,
      tipoDocumentoId: data.tipoDocumentoId,
      cargoId: data.cargoId ?? null,
      areaId: data.areaId ?? null,
      centroTrabajoId: data.centroTrabajoId ?? null,
      tipoContrato: data.tipoContrato ?? null,
      obligatorio: data.obligatorio,
      activo: data.activo ?? true,
    },
    select: { id: true },
  });

  return created;
}

export async function updateReglaDocumentoTrabajador(
  id: string,
  data: Partial<ReglaDocumentoTrabajadorInput>,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const updated = await prisma.reglaDocumentoTrabajador.updateMany({
    where: { id, empresaId },
    data: {
      tipoDocumentoId: data.tipoDocumentoId,
      cargoId: data.cargoId === undefined ? undefined : data.cargoId ?? null,
      areaId: data.areaId === undefined ? undefined : data.areaId ?? null,
      centroTrabajoId: data.centroTrabajoId === undefined ? undefined : data.centroTrabajoId ?? null,
      tipoContrato: data.tipoContrato === undefined ? undefined : data.tipoContrato ?? null,
      obligatorio: data.obligatorio,
      activo: data.activo,
    },
  });

  if (updated.count === 0) throw new Error("Regla documental no encontrada");
  return { id };
}
