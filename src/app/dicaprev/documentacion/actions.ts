"use server";

import { prisma } from "@/lib/prisma";
import type {
  CategoriaDocumento,
  DocumentoMatrizRow,
  EstadoDocumento,
  HistorialDocumento,
} from "./types";

const EMPRESA_ID = "1b3f9c7e-8c2a-4f6a-9d1e-123456789abc";
const USUARIO_ID = "9d9b1e2f-7b2c-4b8e-9a3e-123456789abc";

const ESTADOS_VALIDOS: EstadoDocumento[] = [
  "Vigente",
  "Por vencer",
  "Vencido",
  "Pendiente de carga",
  "En revisión",
  "No aplica",
  "Reemplazado",
];

type DocumentoEmpresaInput = {
  nombre: string;
  categoria: CategoriaDocumento;
  tipo?: string;
  estado: EstadoDocumento;
  version?: string;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoUrl?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
  tieneVencimiento: boolean;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  observaciones?: string;
  creadoPorEmail?: string;
  documentoRequeridoId?: string | null;
};

type DocumentoRequeridoSeed = {
  nombre: string;
  categoria: CategoriaDocumento;
  descripcion: string;
  obligatorio: boolean;
  requiereVencimiento: boolean;
  periodicidadMeses: number | null;
  orden: number;
};

const DOCUMENTOS_REQUERIDOS_BASE: DocumentoRequeridoSeed[] = [
  {
    nombre: "Reglamento Interno de Higiene y Seguridad",
    categoria: "sst",
    descripcion: "Reglamento interno de higiene y seguridad vigente.",
    obligatorio: true,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 1,
  },
  {
    nombre: "Reglamento Interno de Orden, Higiene y Seguridad",
    categoria: "sst",
    descripcion: "RIOHS actualizado y comunicado al personal.",
    obligatorio: true,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 2,
  },
  {
    nombre: "Certificado de afiliación a mutualidad / ISL",
    categoria: "mutualidad_ley_16744",
    descripcion: "Certificado vigente de afiliación a mutualidad o ISL.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 3,
  },
  {
    nombre: "Certificado F30",
    categoria: "laborales_previsionales",
    descripcion: "Certificado de cumplimiento laboral y previsional F30.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 4,
  },
  {
    nombre: "Certificado F30-1",
    categoria: "laborales_previsionales",
    descripcion: "Certificado F30-1 vigente.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 5,
  },
  {
    nombre: "Matriz IPER",
    categoria: "sst",
    descripcion: "Matriz de identificación de peligros y evaluación de riesgos.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 6,
  },
  {
    nombre: "Programa de trabajo preventivo / plan anual de prevención",
    categoria: "sst",
    descripcion: "Plan anual de actividades preventivas.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 7,
  },
  {
    nombre: "Plan de emergencia",
    categoria: "sst",
    descripcion: "Plan de emergencia actualizado por centro de trabajo.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 8,
  },
  {
    nombre: "Procedimiento de investigación de accidentes",
    categoria: "sst",
    descripcion: "Procedimiento formal para investigación de accidentes.",
    obligatorio: true,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 9,
  },
  {
    nombre: "Formato base de entrega de EPP",
    categoria: "plantillas_formatos",
    descripcion:
      "Plantilla corporativa para registrar entrega de elementos de protección personal. El registro firmado debe asociarse a cada trabajador en Control Documental.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 10,
  },
  {
    nombre: "Formato / matriz de capacitaciones obligatorias",
    categoria: "plantillas_formatos",
    descripcion:
      "Plantilla o matriz corporativa de control. Los certificados individuales deben asociarse a cada trabajador.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 11,
  },
  {
    nombre: "Constitución Comité Paritario, si aplica",
    categoria: "sst",
    descripcion: "Documento de constitución de Comité Paritario cuando corresponde.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 12,
  },
  {
    nombre: "Actas Comité Paritario, si aplica",
    categoria: "sst",
    descripcion: "Actas de sesiones del Comité Paritario cuando corresponde.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 13,
  },
  {
    nombre: "Designación encargado/experto en prevención, si aplica",
    categoria: "sst",
    descripcion: "Designación formal de encargado o experto en prevención.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 14,
  },
  {
    nombre: "Documentos de protocolos aplicables: psicosocial, TMERT, MMC, UV, PREXOR si corresponde",
    categoria: "protocolos",
    descripcion: "Protocolos aplicables según riesgo y rubro.",
    obligatorio: false,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 15,
  },
];

function toDateOnly(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function formatIso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function normalizarEstado(estado?: string | null): EstadoDocumento {
  if (estado && ESTADOS_VALIDOS.includes(estado as EstadoDocumento)) {
    return estado as EstadoDocumento;
  }
  return "Pendiente de carga";
}

function vigenciaLabel(tieneVencimiento: boolean, fechaVencimiento: Date | null) {
  if (!tieneVencimiento || !fechaVencimiento) return "Sin vencimiento";
  return fechaVencimiento.toLocaleDateString("es-CL");
}

function normalizarStringOpcional(value: string | null | undefined, trim = false) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = trim ? value.trim() : value;
  return normalized === "" ? null : normalized;
}

async function asegurarContextoBase() {
  await prisma.empresa.upsert({
    where: { id: EMPRESA_ID },
    update: {},
    create: {
      id: EMPRESA_ID,
      nombre: "DICAPREV Empresa Base",
      razonSocial: "DICAPREV SPA",
    },
  });

  await prisma.usuario.upsert({
    where: { id: USUARIO_ID },
    update: {
      empresaId: EMPRESA_ID,
      nombre: "Usuario Base",
      email: "usuario.base@nextprev.local",
    },
    create: {
      id: USUARIO_ID,
      nombre: "Usuario Base",
      email: "usuario.base@nextprev.local",
      rol: "ADMIN_EMPRESA",
      empresaId: EMPRESA_ID,
    },
  });
}

async function asegurarMatrizBase() {
  await normalizarRequerimientosPlantillas();

  const clavesBase: Array<{ nombre: string; categoria: string }> = [];

  for (const doc of DOCUMENTOS_REQUERIDOS_BASE) {
    clavesBase.push({ nombre: doc.nombre, categoria: doc.categoria });

    await prisma.documentoRequeridoEmpresa.upsert({
      where: {
        nombre_categoria: {
          nombre: doc.nombre,
          categoria: doc.categoria,
        },
      },
      update: {
        descripcion: doc.descripcion,
        obligatorio: doc.obligatorio,
        requiereVencimiento: doc.requiereVencimiento,
        periodicidadMeses: doc.periodicidadMeses,
        orden: doc.orden,
        activo: true,
      },
      create: {
        nombre: doc.nombre,
        categoria: doc.categoria,
        descripcion: doc.descripcion,
        obligatorio: doc.obligatorio,
        requiereVencimiento: doc.requiereVencimiento,
        periodicidadMeses: doc.periodicidadMeses,
        orden: doc.orden,
        activo: true,
      },
    });
  }

  await prisma.documentoRequeridoEmpresa.updateMany({
    where: {
      NOT: {
        OR: clavesBase,
      },
    },
    data: {
      activo: false,
    },
  });
}

async function normalizarRequerimientosPlantillas() {
  await migrarDocumentoRequerido({
    oldNombre: "Registro de entrega de EPP",
    oldCategoria: "sst",
    newNombre: "Formato base de entrega de EPP",
    newCategoria: "plantillas_formatos",
    newDescripcion:
      "Plantilla corporativa para registrar entrega de elementos de protección personal. El registro firmado debe asociarse a cada trabajador en Control Documental.",
    obligatorio: false,
    orden: 10,
  });

  await migrarDocumentoRequerido({
    oldNombre: "Registro de capacitaciones obligatorias",
    oldCategoria: "sst",
    newNombre: "Formato / matriz de capacitaciones obligatorias",
    newCategoria: "plantillas_formatos",
    newDescripcion:
      "Plantilla o matriz corporativa de control. Los certificados individuales deben asociarse a cada trabajador.",
    obligatorio: false,
    orden: 11,
  });
}

async function migrarDocumentoRequerido(params: {
  oldNombre: string;
  oldCategoria: string;
  newNombre: string;
  newCategoria: string;
  newDescripcion: string;
  obligatorio: boolean;
  orden: number;
}) {
  const [oldDoc, newDoc] = await Promise.all([
    prisma.documentoRequeridoEmpresa.findFirst({
      where: {
        nombre: params.oldNombre,
        categoria: params.oldCategoria,
      },
      select: { id: true },
    }),
    prisma.documentoRequeridoEmpresa.findFirst({
      where: {
        nombre: params.newNombre,
        categoria: params.newCategoria,
      },
      select: { id: true },
    }),
  ]);

  if (!oldDoc) return;

  if (!newDoc) {
    await prisma.documentoRequeridoEmpresa.update({
      where: { id: oldDoc.id },
      data: {
        nombre: params.newNombre,
        categoria: params.newCategoria,
        descripcion: params.newDescripcion,
        obligatorio: params.obligatorio,
        requiereVencimiento: false,
        periodicidadMeses: null,
        orden: params.orden,
        activo: true,
      },
    });
    return;
  }

  await prisma.documentoEmpresa.updateMany({
    where: { documentoRequeridoId: oldDoc.id },
    data: { documentoRequeridoId: newDoc.id },
  });

  await prisma.documentoRequeridoEmpresa.update({
    where: { id: oldDoc.id },
    data: { activo: false },
  });

  await prisma.documentoRequeridoEmpresa.update({
    where: { id: newDoc.id },
    data: {
      descripcion: params.newDescripcion,
      obligatorio: params.obligatorio,
      orden: params.orden,
      activo: true,
    },
  });
}

function mapHistorial(
  historial: Array<{
    id: string;
    accion: string;
    detalle: string | null;
    version: string | null;
    archivoNombre: string | null;
    archivoNombreOriginal: string | null;
    archivoUrl: string | null;
    archivoTipo: string | null;
    archivoPeso: number | null;
    createdAt: Date;
    usuario: { nombre: string; email: string } | null;
  }>
): HistorialDocumento[] {
  return historial
    .map((item) => ({
      id: item.id,
      fecha: item.createdAt.toISOString(),
      usuario: item.usuario?.nombre ?? "Sistema",
      usuarioEmail: item.usuario?.email ?? "sistema@nextprev.local",
      accion: item.accion,
      detalle: item.detalle ?? "",
      version: item.version,
      archivoNombre: item.archivoNombre,
      archivoNombreOriginal: item.archivoNombreOriginal,
      archivoUrl: item.archivoUrl,
      archivoTipo: item.archivoTipo,
      archivoPeso: item.archivoPeso,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function rowFromDocumentoRequerido(requerido: {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  obligatorio: boolean;
  requiereVencimiento: boolean;
  documentos: Array<{
    id: string;
    nombre: string;
    tipo: string | null;
    estado: string;
    version: string;
    archivoNombre: string | null;
    archivoNombreOriginal: string | null;
    archivoUrl: string | null;
    archivoTipo: string | null;
    archivoPeso: number | null;
    fechaEmision: Date | null;
    fechaVencimiento: Date | null;
    tieneVencimiento: boolean;
    observaciones: string | null;
    createdAt: Date;
    updatedAt: Date;
    subidoPor: { nombre: string; email: string };
    historial: Array<{
      id: string;
      accion: string;
      detalle: string | null;
      version: string | null;
      archivoNombre: string | null;
      archivoNombreOriginal: string | null;
      archivoUrl: string | null;
      archivoTipo: string | null;
      archivoPeso: number | null;
      createdAt: Date;
      usuario: { nombre: string; email: string } | null;
    }>;
  }>;
}): DocumentoMatrizRow {
  const doc = requerido.documentos[0];
  if (!doc) {
    return {
      id: `req-${requerido.id}`,
      documentoRequeridoId: requerido.id,
      documentoEmpresaId: null,
      nombre: requerido.nombre,
      categoria: requerido.categoria as CategoriaDocumento,
      descripcion: requerido.descripcion,
      obligatorio: requerido.obligatorio,
      estado: "Pendiente de carga",
      vigencia: "Pendiente",
      ultimoArchivo: null,
      version: null,
      subidoPor: null,
      subidoPorEmail: null,
      fechaSubida: null,
      fechaActualizacion: null,
      archivoNombre: null,
      archivoNombreOriginal: null,
      archivoUrl: null,
      archivoTipo: null,
      archivoPeso: null,
      tipo: "",
      fechaEmision: "",
      fechaVencimiento: null,
      tieneVencimiento: requerido.requiereVencimiento,
      observaciones: "",
      historial: [],
      esAdicional: false,
    };
  }

  return {
    id: `req-${requerido.id}`,
    documentoRequeridoId: requerido.id,
    documentoEmpresaId: doc.id,
    nombre: requerido.nombre,
    categoria: requerido.categoria as CategoriaDocumento,
    descripcion: requerido.descripcion,
    obligatorio: requerido.obligatorio,
    estado: normalizarEstado(doc.estado),
    vigencia: vigenciaLabel(doc.tieneVencimiento, doc.fechaVencimiento),
    ultimoArchivo: doc.archivoNombre,
    version: doc.version,
    subidoPor: doc.subidoPor.nombre,
    subidoPorEmail: doc.subidoPor.email,
    fechaSubida: formatIso(doc.createdAt),
    fechaActualizacion: formatIso(doc.updatedAt),
    archivoNombre: doc.archivoNombre,
    archivoNombreOriginal: doc.archivoNombreOriginal,
    archivoUrl: doc.archivoUrl,
    archivoTipo: doc.archivoTipo,
    archivoPeso: doc.archivoPeso,
    tipo: doc.tipo ?? "",
    fechaEmision: toDateOnly(doc.fechaEmision),
    fechaVencimiento: toDateOnly(doc.fechaVencimiento) || null,
    tieneVencimiento: doc.tieneVencimiento,
    observaciones: doc.observaciones ?? "",
    historial: mapHistorial(doc.historial),
    esAdicional: false,
  };
}

function rowFromDocumentoAdicional(doc: {
  id: string;
  nombre: string;
  categoria: string;
  tipo: string | null;
  estado: string;
  version: string;
  archivoNombre: string | null;
  archivoNombreOriginal: string | null;
  archivoUrl: string | null;
  archivoTipo: string | null;
  archivoPeso: number | null;
  fechaEmision: Date | null;
  fechaVencimiento: Date | null;
  tieneVencimiento: boolean;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
  subidoPor: { nombre: string; email: string };
  historial: Array<{
    id: string;
    accion: string;
    detalle: string | null;
    version: string | null;
    archivoNombre: string | null;
    archivoNombreOriginal: string | null;
    archivoUrl: string | null;
    archivoTipo: string | null;
    archivoPeso: number | null;
    createdAt: Date;
    usuario: { nombre: string; email: string } | null;
  }>;
}): DocumentoMatrizRow {
  return {
    id: `doc-${doc.id}`,
    documentoRequeridoId: null,
    documentoEmpresaId: doc.id,
    nombre: doc.nombre,
    categoria: doc.categoria as CategoriaDocumento,
    descripcion: "Documento adicional fuera de la matriz base",
    obligatorio: false,
    estado: normalizarEstado(doc.estado),
    vigencia: vigenciaLabel(doc.tieneVencimiento, doc.fechaVencimiento),
    ultimoArchivo: doc.archivoNombre,
    version: doc.version,
    subidoPor: doc.subidoPor.nombre,
    subidoPorEmail: doc.subidoPor.email,
    fechaSubida: formatIso(doc.createdAt),
    fechaActualizacion: formatIso(doc.updatedAt),
    archivoNombre: doc.archivoNombre,
    archivoNombreOriginal: doc.archivoNombreOriginal,
    archivoUrl: doc.archivoUrl,
    archivoTipo: doc.archivoTipo,
    archivoPeso: doc.archivoPeso,
    tipo: doc.tipo ?? "",
    fechaEmision: toDateOnly(doc.fechaEmision),
    fechaVencimiento: toDateOnly(doc.fechaVencimiento) || null,
    tieneVencimiento: doc.tieneVencimiento,
    observaciones: doc.observaciones ?? "",
    historial: mapHistorial(doc.historial),
    esAdicional: true,
  };
}

export async function registrarHistorialDocumento(params: {
  documentoId: string;
  accion: string;
  detalle?: string;
  usuarioId?: string;
  version?: string | null;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoUrl?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
}) {
  await prisma.documentoEmpresaHistorial.create({
    data: {
      documentoId: params.documentoId,
      usuarioId: params.usuarioId ?? USUARIO_ID,
      accion: params.accion,
      detalle: params.detalle,
      version: params.version ?? null,
      archivoNombre: params.archivoNombre ?? null,
      archivoNombreOriginal: params.archivoNombreOriginal ?? null,
      archivoUrl: params.archivoUrl ?? null,
      archivoTipo: params.archivoTipo ?? null,
      archivoPeso: params.archivoPeso ?? null,
    },
  });
}

export async function restaurarDocumentoVersion(params: {
  documentoId: string;
  historialId: string;
}) {
  await asegurarContextoBase();

  const [documento, historial] = await Promise.all([
    prisma.documentoEmpresa.findUnique({
      where: { id: params.documentoId },
      select: {
        id: true,
        nombre: true,
        categoria: true,
        tipo: true,
        estado: true,
        version: true,
        archivoNombre: true,
        archivoNombreOriginal: true,
        archivoUrl: true,
        archivoTipo: true,
        archivoPeso: true,
        tieneVencimiento: true,
        fechaEmision: true,
        fechaVencimiento: true,
        observaciones: true,
        creadoPorEmail: true,
        documentoRequeridoId: true,
      },
    }),
    prisma.documentoEmpresaHistorial.findUnique({
      where: { id: params.historialId },
      select: {
        id: true,
        documentoId: true,
        version: true,
        archivoNombre: true,
        archivoNombreOriginal: true,
        archivoUrl: true,
        archivoTipo: true,
        archivoPeso: true,
      },
    }),
  ]);

  if (!documento) {
    throw new Error("No se encontró el documento a restaurar.");
  }

  if (!historial || historial.documentoId !== params.documentoId) {
    throw new Error("No se encontró la versión histórica solicitada.");
  }

  if (!historial.archivoUrl) {
    throw new Error("La versión histórica seleccionada no tiene archivo asociado.");
  }

  await registrarHistorialDocumento({
    documentoId: documento.id,
    accion: "Versión archivada",
    detalle: `Se archivó la versión ${documento.version} antes de restaurar una versión anterior.`,
    version: documento.version,
    archivoNombre: documento.archivoNombre,
    archivoNombreOriginal: documento.archivoNombreOriginal,
    archivoUrl: documento.archivoUrl,
    archivoTipo: documento.archivoTipo,
    archivoPeso: documento.archivoPeso,
  });

  await actualizarDocumentoEmpresa(documento.id, {
    nombre: documento.nombre,
    categoria: documento.categoria as CategoriaDocumento,
    tipo: documento.tipo ?? undefined,
    estado: documento.estado as EstadoDocumento,
    version: historial.version ?? documento.version,
    archivoNombre: historial.archivoNombre,
    archivoNombreOriginal: historial.archivoNombreOriginal,
    archivoUrl: historial.archivoUrl,
    archivoTipo: historial.archivoTipo,
    archivoPeso: historial.archivoPeso,
    tieneVencimiento: documento.tieneVencimiento,
    fechaEmision: documento.fechaEmision ? documento.fechaEmision.toISOString().slice(0, 10) : null,
    fechaVencimiento: documento.fechaVencimiento ? documento.fechaVencimiento.toISOString().slice(0, 10) : null,
    observaciones: documento.observaciones ?? undefined,
    creadoPorEmail: documento.creadoPorEmail ?? undefined,
    documentoRequeridoId: documento.documentoRequeridoId,
  });

  await registrarHistorialDocumento({
    documentoId: documento.id,
    accion: "Versión restaurada",
    detalle: `Se restauró la versión ${historial.version ?? "sin versión"}.`,
    version: historial.version,
    archivoNombre: historial.archivoNombre,
    archivoNombreOriginal: historial.archivoNombreOriginal,
    archivoUrl: historial.archivoUrl,
    archivoTipo: historial.archivoTipo,
    archivoPeso: historial.archivoPeso,
  });
}

export async function getDocumentosEmpresa(): Promise<DocumentoMatrizRow[]> {
  await asegurarContextoBase();
  await asegurarMatrizBase();

  const requeridos = await prisma.documentoRequeridoEmpresa.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: {
      documentos: {
        where: { empresaId: EMPRESA_ID },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          subidoPor: {
            select: { nombre: true, email: true },
          },
          historial: {
            include: {
              usuario: {
                select: { nombre: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const adicionales = await prisma.documentoEmpresa.findMany({
    where: {
      empresaId: EMPRESA_ID,
      documentoRequeridoId: null,
    },
    include: {
      subidoPor: {
        select: { nombre: true, email: true },
      },
      historial: {
        include: {
          usuario: {
            select: { nombre: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return [
    ...requeridos.map((r) => rowFromDocumentoRequerido(r)),
    ...adicionales.map((doc) => rowFromDocumentoAdicional(doc)),
  ];
}

export async function crearDocumentoEmpresa(data: DocumentoEmpresaInput) {
  await asegurarContextoBase();
  await asegurarMatrizBase();

  if (!data.nombre.trim()) {
    throw new Error("El nombre del documento es obligatorio");
  }
  if (!ESTADOS_VALIDOS.includes(data.estado)) {
    throw new Error("Estado de documento no válido");
  }

  const created = await prisma.documentoEmpresa.create({
    data: {
      nombre: data.nombre.trim(),
      categoria: data.categoria,
      tipo: data.tipo?.trim() || null,
      estado: data.estado,
      version: data.version?.trim() || "1.0",
      archivoNombre: normalizarStringOpcional(data.archivoNombre, true),
      archivoNombreOriginal: normalizarStringOpcional(data.archivoNombreOriginal, true),
      archivoUrl: data.archivoUrl ?? null,
      archivoTipo: data.archivoTipo ?? null,
      archivoPeso: data.archivoPeso ?? null,
      tieneVencimiento: data.tieneVencimiento,
      fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : null,
      fechaVencimiento: data.tieneVencimiento && data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
      observaciones: data.observaciones?.trim() || null,
      creadoPorEmail: data.creadoPorEmail?.trim() || "usuario.base@nextprev.local",
      documentoRequeridoId: data.documentoRequeridoId ?? null,
      empresaId: EMPRESA_ID,
      subidoPorId: USUARIO_ID,
    },
  });

  await registrarHistorialDocumento({
    documentoId: created.id,
    accion: "Documento cargado",
    detalle: `Documento cargado en versión ${created.version}`,
    version: created.version,
    archivoNombre: created.archivoNombre,
    archivoNombreOriginal: created.archivoNombreOriginal,
    archivoUrl: created.archivoUrl,
    archivoTipo: created.archivoTipo,
    archivoPeso: created.archivoPeso,
  });

  return created.id;
}

export async function actualizarDocumentoEmpresa(id: string, data: DocumentoEmpresaInput) {
  await asegurarContextoBase();

  if (!ESTADOS_VALIDOS.includes(data.estado)) {
    throw new Error("Estado de documento no válido");
  }

  const updated = await prisma.documentoEmpresa.update({
    where: { id },
    data: {
      nombre: data.nombre.trim(),
      categoria: data.categoria,
      tipo: data.tipo?.trim() || null,
      estado: data.estado,
      version: data.version?.trim() || "1.0",
      archivoNombre: normalizarStringOpcional(data.archivoNombre, true),
      archivoNombreOriginal:
        data.archivoNombreOriginal === undefined
          ? undefined
          : normalizarStringOpcional(data.archivoNombreOriginal, true),
      archivoUrl: data.archivoUrl === undefined ? undefined : data.archivoUrl,
      archivoTipo: data.archivoTipo === undefined ? undefined : normalizarStringOpcional(data.archivoTipo),
      archivoPeso: data.archivoPeso === undefined ? undefined : data.archivoPeso,
      tieneVencimiento: data.tieneVencimiento,
      fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : null,
      fechaVencimiento: data.tieneVencimiento && data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
      observaciones: data.observaciones?.trim() || null,
      creadoPorEmail: data.creadoPorEmail?.trim() || undefined,
      documentoRequeridoId: data.documentoRequeridoId ?? undefined,
    },
  });

  await registrarHistorialDocumento({
    documentoId: updated.id,
    accion: "Metadatos actualizados",
    detalle: "Se actualizaron metadatos generales del documento",
  });

  return updated.id;
}

export async function getContextoFijoDocumentacion() {
  await asegurarContextoBase();
  await asegurarMatrizBase();

  const usuario = await prisma.usuario.findUnique({
    where: { id: USUARIO_ID },
    select: { id: true, nombre: true, email: true, empresaId: true },
  });

  return {
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    usuario,
  };
}

export type { DocumentoEmpresaInput };
