"use server";

import { calcularEstadoDocumento, esDocumentoAplicable } from "@/lib/documentacion/cumplimiento-documento";
import {
  calcularCumplimientoEmpresa,
  type CumplimientoEmpresaResultado,
} from "@/lib/documentacion/cumplimiento-empresa";
import {
  ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS,
  findDocumentoEmpresaCanonicoPorRequerido,
} from "@/lib/documentacion/documento-empresa-duplicados";
import {
  generarAlertasDocumentalesEmpresa,
  type AlertasDocumentalesEmpresaResultado,
  type ResumenAlertasDocumentales,
} from "@/lib/documentacion/alertas-documentales";
import {
  construirContenidoBasePlantilla,
  getPlantillaBasePorCodigo,
  normalizarCodigoPlantilla,
} from "@/lib/documentacion/plantillas-documento";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { AppContext } from "@/server/context";
import type {
  CategoriaDocumento,
  DocumentoMatrizRow,
  EstadoDocumento,
  HistorialDocumento,
} from "./types";
const EMPRESA_CANTIDAD_TRABAJADORES = 5;

const ESTADOS_VALIDOS: EstadoDocumento[] = [
  "Vigente",
  "Por vencer",
  "Vencido",
  "Pendiente de carga",
  "En revisión",
  "Validado",
  "Enviado a firma",
  "Firmado",
  "firmado",
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
  aplicaDesdeTrabajadores: number | null;
  aplicaHastaTrabajadores: number | null;
  requiereVencimiento: boolean;
  periodicidadMeses: number | null;
  orden: number;
};

const DOCUMENTOS_REQUERIDOS_BASE: DocumentoRequeridoSeed[] = [
  {
    nombre: "Reglamento Interno de Orden, Higiene y Seguridad",
    categoria: "sst",
    descripcion: "RIOHS actualizado y comunicado al personal.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 1,
  },
  {
    nombre: "RUT empresa",
    categoria: "legales_empresa",
    descripcion: "RUT o e-RUT vigente de la empresa emitido por el SII.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 2,
  },
  {
    nombre: "Escritura de constitución y modificaciones",
    categoria: "legales_empresa",
    descripcion: "Escritura social de constitución con sus modificaciones vigentes, cuando existan.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 3,
  },
  {
    nombre: "Certificado de vigencia de la sociedad",
    categoria: "legales_empresa",
    descripcion: "Certificado de vigencia o estatuto actualizado emitido por el organismo competente.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 3,
    orden: 4,
  },
  {
    nombre: "Personeria o poder vigente del representante legal",
    categoria: "legales_empresa",
    descripcion: "Documento que acredita la representación legal vigente para firmar y comparecer ante terceros.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 5,
  },
  {
    nombre: "Certificado de afiliación a mutualidad / ISL",
    categoria: "mutualidad_ley_16744",
    descripcion: "Certificado vigente de afiliación a mutualidad o ISL.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 6,
  },
  {
    nombre: "Certificado F30",
    categoria: "laborales_previsionales",
    descripcion: "Certificado de cumplimiento laboral y previsional F30.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 7,
  },
  {
    nombre: "Certificado F30-1",
    categoria: "laborales_previsionales",
    descripcion: "Certificado F30-1 vigente.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 8,
  },
  {
    nombre: "Nomina de trabajadores vigente",
    categoria: "laborales_previsionales",
    descripcion: "Nomina actualizada del personal vigente para acreditaciones y control documental.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 9,
  },
  {
    nombre: "Certificado de deuda previsional / Previred",
    categoria: "laborales_previsionales",
    descripcion: "Comprobante o certificado de cumplimiento previsional vigente.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 10,
  },
  {
    nombre: "Matriz IPER",
    categoria: "sst",
    descripcion: "Matriz de identificación de peligros y evaluación de riesgos.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 11,
  },
  {
    nombre: "Programa de trabajo preventivo / plan anual de prevención",
    categoria: "sst",
    descripcion: "Plan anual de actividades preventivas.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 12,
  },
  {
    nombre: "Plan de emergencia",
    categoria: "sst",
    descripcion: "Plan de emergencia actualizado por centro de trabajo.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 13,
  },
  {
    nombre: "Procedimiento de investigación de accidentes",
    categoria: "sst",
    descripcion: "Procedimiento formal para investigación de accidentes.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 14,
  },
  {
    nombre: "Procedimiento de entrega y reposición de EPP",
    categoria: "sst",
    descripcion: "Procedimiento interno para asignación, control y reposición de elementos de protección personal.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 15,
  },
  {
    nombre: "Plan de capacitación",
    categoria: "sst",
    descripcion: "Plan anual o programa de capacitaciones SST aplicable a la dotación de la empresa.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 16,
  },
  {
    nombre: "Formato base de entrega de EPP",
    categoria: "plantillas_formatos",
    descripcion:
      "Plantilla corporativa para registrar entrega de elementos de protección personal. El registro firmado debe asociarse a cada trabajador en Control Documental.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 17,
  },
  {
    nombre: "Formato / matriz de capacitaciones obligatorias",
    categoria: "plantillas_formatos",
    descripcion:
      "Plantilla o matriz corporativa de control. Los certificados individuales deben asociarse a cada trabajador.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 18,
  },
  {
    nombre: "Constitución Comité Paritario, si aplica",
    categoria: "sst",
    descripcion: "Documento de constitución de Comité Paritario cuando corresponde.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 25,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 19,
  },
  {
    nombre: "Actas Comité Paritario, si aplica",
    categoria: "sst",
    descripcion: "Actas de sesiones del Comité Paritario cuando corresponde.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 25,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 20,
  },
  {
    nombre: "Designación encargado/experto en prevención, si aplica",
    categoria: "sst",
    descripcion: "Designación formal de encargado o experto en prevención.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 25,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 21,
  },
  {
    nombre: "Constitución Departamento de Prevención, si aplica",
    categoria: "sst",
    descripcion: "Documento formal de constitución del Departamento de Prevención de Riesgos cuando corresponde por dotación.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 100,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 22,
  },
  {
    nombre: "Documentos de protocolos aplicables: psicosocial, TMERT, MMC, UV, PREXOR si corresponde",
    categoria: "protocolos",
    descripcion: "Protocolos aplicables según riesgo y rubro.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 23,
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

function vigenciaLabel(
  estado: EstadoDocumento,
  tieneVencimiento: boolean,
  fechaVencimiento: Date | null
) {
  if (estado === "No aplica") return "No aplica";
  if (estado === "Pendiente de carga") return "Pendiente";
  if (!tieneVencimiento || !fechaVencimiento) return "Sin vencimiento";
  return fechaVencimiento.toLocaleDateString("es-CL");
}

function normalizarStringOpcional(value: string | null | undefined, trim = false) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = trim ? value.trim() : value;
  return normalized === "" ? null : normalized;
}

async function asegurarContextoBase(context: AppContext) {
  await prisma.empresa.upsert({
    where: { id: context.empresaId },
    update: {},
    create: {
      id: context.empresaId,
      nombre: "DICAPREV Empresa Base",
      razonSocial: "DICAPREV SPA",
    },
  });

  await prisma.usuario.upsert({
    where: { id: context.usuarioId },
    update: {
      empresaId: context.empresaId,
      nombre: "Usuario Base",
      email: context.email,
      rol: context.rol,
    },
    create: {
      id: context.usuarioId,
      nombre: "Usuario Base",
      email: context.email,
      rol: context.rol,
      empresaId: context.empresaId,
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
        aplicaDesdeTrabajadores: doc.aplicaDesdeTrabajadores,
        aplicaHastaTrabajadores: doc.aplicaHastaTrabajadores,
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
        aplicaDesdeTrabajadores: doc.aplicaDesdeTrabajadores,
        aplicaHastaTrabajadores: doc.aplicaHastaTrabajadores,
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
    oldNombre: "Reglamento Interno de Higiene y Seguridad",
    oldCategoria: "sst",
    newNombre: "Reglamento Interno de Orden, Higiene y Seguridad",
    newCategoria: "sst",
    newDescripcion: "RIOHS actualizado y comunicado al personal.",
    obligatorio: true,
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    orden: 1,
  });

  await migrarDocumentoRequerido({
    oldNombre: "Registro de entrega de EPP",
    oldCategoria: "sst",
    newNombre: "Formato base de entrega de EPP",
    newCategoria: "plantillas_formatos",
    newDescripcion:
      "Plantilla corporativa para registrar entrega de elementos de protección personal. El registro firmado debe asociarse a cada trabajador en Control Documental.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 1,
    aplicaHastaTrabajadores: null,
    orden: 17,
  });

  await migrarDocumentoRequerido({
    oldNombre: "Registro de capacitaciones obligatorias",
    oldCategoria: "sst",
    newNombre: "Formato / matriz de capacitaciones obligatorias",
    newCategoria: "plantillas_formatos",
    newDescripcion:
      "Plantilla o matriz corporativa de control. Los certificados individuales deben asociarse a cada trabajador.",
    obligatorio: false,
    aplicaDesdeTrabajadores: 10,
    aplicaHastaTrabajadores: null,
    orden: 18,
  });
}

async function migrarDocumentoRequerido(params: {
  oldNombre: string;
  oldCategoria: string;
  newNombre: string;
  newCategoria: string;
  newDescripcion: string;
  obligatorio: boolean;
  aplicaDesdeTrabajadores?: number | null;
  aplicaHastaTrabajadores?: number | null;
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
        aplicaDesdeTrabajadores: params.aplicaDesdeTrabajadores ?? null,
        aplicaHastaTrabajadores: params.aplicaHastaTrabajadores ?? null,
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
      aplicaDesdeTrabajadores: params.aplicaDesdeTrabajadores ?? null,
      aplicaHastaTrabajadores: params.aplicaHastaTrabajadores ?? null,
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
  aplicaDesdeTrabajadores: number | null;
  aplicaHastaTrabajadores: number | null;
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
    firmado: boolean;
    firmadoPor: string | null;
    firmadoEn: Date | null;
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
  const baseDocumento = {
    documentoEmpresaId: doc?.id ?? null,
    archivoNombre: doc?.archivoNombre ?? null,
    archivoUrl: doc?.archivoUrl ?? null,
    tieneVencimiento: doc?.tieneVencimiento ?? requerido.requiereVencimiento,
    fechaVencimiento: doc?.fechaVencimiento ? doc.fechaVencimiento.toISOString().slice(0, 10) : null,
    estado: normalizarEstado(doc?.estado),
    aplicaDesdeTrabajadores: requerido.aplicaDesdeTrabajadores,
    aplicaHastaTrabajadores: requerido.aplicaHastaTrabajadores,
    esAdicional: false,
  } as const;
  const estadoCalculado = calcularEstadoDocumento(baseDocumento, EMPRESA_CANTIDAD_TRABAJADORES);
  const esAplicable = esDocumentoAplicable(baseDocumento, EMPRESA_CANTIDAD_TRABAJADORES);

  if (!doc) {
    return {
      id: `req-${requerido.id}`,
      documentoRequeridoId: requerido.id,
      documentoEmpresaId: null,
      nombre: requerido.nombre,
      categoria: requerido.categoria as CategoriaDocumento,
      descripcion: requerido.descripcion,
      obligatorio: requerido.obligatorio,
      estado: estadoCalculado,
      vigencia: vigenciaLabel(estadoCalculado, requerido.requiereVencimiento, null),
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
      aplicaDesdeTrabajadores: requerido.aplicaDesdeTrabajadores,
      aplicaHastaTrabajadores: requerido.aplicaHastaTrabajadores,
      esAplicable,
      firmado: false,
      firmadoPor: null,
      firmadoEn: null,
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
    estado: estadoCalculado,
    vigencia: vigenciaLabel(estadoCalculado, doc.tieneVencimiento, doc.fechaVencimiento),
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
    aplicaDesdeTrabajadores: requerido.aplicaDesdeTrabajadores,
    aplicaHastaTrabajadores: requerido.aplicaHastaTrabajadores,
    esAplicable,
    firmado: doc.firmado,
    firmadoPor: doc.firmadoPor ?? null,
    firmadoEn: doc.firmadoEn ? doc.firmadoEn.toISOString() : null,
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
  firmado: boolean;
  firmadoPor: string | null;
  firmadoEn: Date | null;
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
  const baseDocumento = {
    documentoEmpresaId: doc.id,
    archivoNombre: doc.archivoNombre,
    archivoUrl: doc.archivoUrl,
    tieneVencimiento: doc.tieneVencimiento,
    fechaVencimiento: doc.fechaVencimiento ? doc.fechaVencimiento.toISOString().slice(0, 10) : null,
    estado: normalizarEstado(doc.estado),
    aplicaDesdeTrabajadores: null,
    aplicaHastaTrabajadores: null,
    esAdicional: true,
  } as const;
  const estadoCalculado = calcularEstadoDocumento(baseDocumento, EMPRESA_CANTIDAD_TRABAJADORES);

  return {
    id: `doc-${doc.id}`,
    documentoRequeridoId: null,
    documentoEmpresaId: doc.id,
    nombre: doc.nombre,
    categoria: doc.categoria as CategoriaDocumento,
    descripcion: "Documento adicional fuera de la matriz base",
    obligatorio: false,
    estado: estadoCalculado,
    vigencia: vigenciaLabel(estadoCalculado, doc.tieneVencimiento, doc.fechaVencimiento),
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
    aplicaDesdeTrabajadores: null,
    aplicaHastaTrabajadores: null,
    esAplicable: true,
    firmado: doc.firmado,
    firmadoPor: doc.firmadoPor ?? null,
    firmadoEn: doc.firmadoEn ? doc.firmadoEn.toISOString() : null,
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
  const context = await requirePermission("canManageDocumentacion");

  await prisma.documentoEmpresaHistorial.create({
    data: {
      documentoId: params.documentoId,
      usuarioId: params.usuarioId ?? context.usuarioId,
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
  const context = await requirePermission("canManageDocumentacion");
  await asegurarContextoBase(context);

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
  const context = await requirePermission("canReadDocumentacion");
  await asegurarContextoBase(context);
  await asegurarMatrizBase();

  const requeridos = await prisma.documentoRequeridoEmpresa.findMany({
    where: { activo: true },
    orderBy: { orden: "asc" },
    include: {
      documentos: {
        where: {
          empresaId: context.empresaId,
          estado: { notIn: [...ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS] },
        },
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
      empresaId: context.empresaId,
      documentoRequeridoId: null,
      estado: { notIn: [...ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS] },
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
  const context = await requirePermission("canCreateDocumentacion");
  await asegurarContextoBase(context);
  await asegurarMatrizBase();

  if (!data.nombre.trim()) {
    throw new Error("El nombre del documento es obligatorio");
  }
  if (!ESTADOS_VALIDOS.includes(data.estado)) {
    throw new Error("Estado de documento no válido");
  }

  const payload = {
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
    creadoPorEmail: data.creadoPorEmail?.trim() || context.email,
    documentoRequeridoId: data.documentoRequeridoId ?? null,
  };

  // Blindaje anti-duplicado para documentos requeridos: actualizar canónico en vez de crear uno nuevo.
  if (data.documentoRequeridoId) {
    const canonico = await findDocumentoEmpresaCanonicoPorRequerido({
      empresaId: context.empresaId,
      documentoRequeridoId: data.documentoRequeridoId,
    });

    if (canonico) {
      const updated = await prisma.documentoEmpresa.update({
        where: { id: canonico.id },
        data: payload,
      });

      await registrarHistorialDocumento({
        documentoId: updated.id,
        accion: "Documento actualizado por protección anti-duplicado",
        detalle: `Se reutilizó documento canónico para ${data.nombre.trim()}`,
        version: updated.version,
        archivoNombre: updated.archivoNombre,
        archivoNombreOriginal: updated.archivoNombreOriginal,
        archivoUrl: updated.archivoUrl,
        archivoTipo: updated.archivoTipo,
        archivoPeso: updated.archivoPeso,
      });

      return updated.id;
    }
  }

  const created = await prisma.documentoEmpresa.create({
    data: {
      ...payload,
      empresaId: context.empresaId,
      subidoPorId: context.usuarioId,
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
  const context = await requirePermission("canManageDocumentacion");
  await asegurarContextoBase(context);

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
  const context = await requirePermission("canReadDocumentacion");
  await asegurarContextoBase(context);
  await asegurarMatrizBase();

  const usuario = await prisma.usuario.findUnique({
    where: { id: context.usuarioId },
    select: { id: true, nombre: true, email: true, empresaId: true },
  });

  return {
    empresaId: context.empresaId,
    usuarioId: context.usuarioId,
    usuario,
  };
}

export async function getCumplimientoDocumentalEmpresa(): Promise<CumplimientoEmpresaResultado> {
  const context = await requirePermission("canReadDocumentacion");
  await asegurarContextoBase(context);
  return calcularCumplimientoEmpresa({ empresaId: context.empresaId });
}

export async function getAlertasDocumentalesEmpresa(params: {
  empresaId: string;
  diasPorVencer?: number;
}): Promise<AlertasDocumentalesEmpresaResultado> {
  const context = await requirePermission("canReadDocumentacion");
  await asegurarContextoBase(context);

  if (params.empresaId !== context.empresaId) {
    throw new Error("No tienes permisos para consultar alertas de otra empresa.");
  }

  return generarAlertasDocumentalesEmpresa({
    empresaId: params.empresaId,
    diasPorVencer: params.diasPorVencer,
  });
}

export async function getResumenAlertasDocumentalesEmpresa(params: {
  empresaId: string;
  diasPorVencer?: number;
}): Promise<ResumenAlertasDocumentales> {
  const resultado = await getAlertasDocumentalesEmpresa(params);
  return resultado.resumen;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRMA DIGITAL SIMPLE — Fase 26.9
// ─────────────────────────────────────────────────────────────────────────────

/** Estados desde los que se permite firmar un documento de empresa. */
const ESTADOS_FIRMABLES: string[] = ["enviado_firma", "Enviado a firma"];

export type FirmarDocumentoResultado =
  | { ok: true; logId: string; firmadoEn: string; firmadoPor: string }
  | { ok: false; error: string };

type InformeDocumentoItem = {
  id: string;
  nombre: string;
  tipo: string | null;
  categoria: string;
  estado: string;
  firmado: boolean;
  firmadoPor: string | null;
  firmadoEn: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  trabajadorId?: string;
  trabajadorNombre?: string;
};

export type InformeDocumentalEmpresa = {
  meta: {
    version: "27.0-json";
    generadoEn: string;
  };
  empresa: {
    id: string;
    nombre: string;
    rut: string | null;
    razonSocial: string | null;
    giro: string | null;
    cantidadTrabajadores: number | null;
  };
  cumplimiento: {
    porcentajeCumplimiento: number;
    totalAplicables: number;
    totalCumple: number;
    totalFaltantes: number;
    totalIncompletos: number;
  };
  resumenDocumentos: {
    totalEmpresa: number;
    totalTrabajador: number;
    totalFirmados: number;
    totalPendientesFirma: number;
    totalVencidos: number;
  };
  documentos: {
    empresa: InformeDocumentoItem[];
    trabajador: InformeDocumentoItem[];
    firmados: InformeDocumentoItem[];
    pendientesFirma: InformeDocumentoItem[];
    vencidos: InformeDocumentoItem[];
  };
};

function normalizeEstado(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toInformeItem(params: {
  id: string;
  nombre: string;
  tipo: string | null;
  categoria: string;
  estado: string;
  firmado: boolean;
  firmadoPor: string | null;
  firmadoEn: Date | null;
  fechaEmision: Date | null;
  fechaVencimiento: Date | null;
  trabajadorId?: string;
  trabajadorNombre?: string;
}): InformeDocumentoItem {
  return {
    id: params.id,
    nombre: params.nombre,
    tipo: params.tipo,
    categoria: params.categoria,
    estado: params.estado,
    firmado: params.firmado,
    firmadoPor: params.firmadoPor,
    firmadoEn: params.firmadoEn ? params.firmadoEn.toISOString() : null,
    fechaEmision: params.fechaEmision ? params.fechaEmision.toISOString() : null,
    fechaVencimiento: params.fechaVencimiento ? params.fechaVencimiento.toISOString() : null,
    trabajadorId: params.trabajadorId,
    trabajadorNombre: params.trabajadorNombre,
  };
}

export async function generarInformeDocumentalEmpresaData(params: {
  empresaId: string;
}): Promise<InformeDocumentalEmpresa> {
  const [empresa, cumplimiento, docsEmpresaRaw, docsTrabajadorRaw] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: params.empresaId },
      select: {
        id: true,
        nombre: true,
        rut: true,
        razonSocial: true,
        giro: true,
        cantidadTrabajadores: true,
      },
    }),
    calcularCumplimientoEmpresa({ empresaId: params.empresaId }),
    prisma.documentoEmpresa.findMany({
      where: {
        empresaId: params.empresaId,
        estado: { notIn: [...ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS] },
      },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        categoria: true,
        estado: true,
        firmado: true,
        firmadoPor: true,
        firmadoEn: true,
        fechaEmision: true,
        fechaVencimiento: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.trabajadorDocumento.findMany({
      where: {
        empresaId: params.empresaId,
        estado: { not: "reemplazado" },
      },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        categoria: true,
        estado: true,
        firmado: true,
        firmadoPor: true,
        firmadoEn: true,
        fechaEmision: true,
        fechaVencimiento: true,
        trabajadorId: true,
        trabajador: {
          select: {
            nombres: true,
            apellidos: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada para informe documental.");
  }

  const docsEmpresa = docsEmpresaRaw.map((doc) =>
    toInformeItem({
      id: doc.id,
      nombre: doc.nombre,
      tipo: doc.tipo,
      categoria: doc.categoria,
      estado: doc.estado,
      firmado: doc.firmado,
      firmadoPor: doc.firmadoPor,
      firmadoEn: doc.firmadoEn,
      fechaEmision: doc.fechaEmision,
      fechaVencimiento: doc.fechaVencimiento,
    }),
  );

  const docsTrabajador = docsTrabajadorRaw.map((doc) =>
    toInformeItem({
      id: doc.id,
      nombre: doc.nombre,
      tipo: doc.tipo,
      categoria: doc.categoria,
      estado: doc.estado,
      firmado: doc.firmado,
      firmadoPor: doc.firmadoPor,
      firmadoEn: doc.firmadoEn,
      fechaEmision: doc.fechaEmision,
      fechaVencimiento: doc.fechaVencimiento,
      trabajadorId: doc.trabajadorId,
      trabajadorNombre: [doc.trabajador?.nombres ?? "", doc.trabajador?.apellidos ?? ""].join(" ").trim() || undefined,
    }),
  );

  const allDocs = [...docsEmpresa, ...docsTrabajador];

  const firmados = allDocs.filter((doc) => doc.firmado);
  const pendientesFirma = allDocs.filter((doc) => {
    const estado = normalizeEstado(doc.estado);
    const firmable =
      estado === "pendiente" ||
      estado === "pendiente_firma" ||
      estado === "en_revision" ||
      estado === "vigente" ||
      estado === "aprobado";
    return !doc.firmado && firmable;
  });
  const vencidos = allDocs.filter((doc) => normalizeEstado(doc.estado) === "vencido");

  return {
    meta: {
      version: "27.0-json",
      generadoEn: new Date().toISOString(),
    },
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
      rut: empresa.rut,
      razonSocial: empresa.razonSocial,
      giro: empresa.giro,
      cantidadTrabajadores: empresa.cantidadTrabajadores,
    },
    cumplimiento: {
      porcentajeCumplimiento: cumplimiento.porcentajeCumplimiento,
      totalAplicables: cumplimiento.totalAplicables,
      totalCumple: cumplimiento.totalCumple,
      totalFaltantes: cumplimiento.totalFaltantes,
      totalIncompletos: cumplimiento.totalIncompletos,
    },
    resumenDocumentos: {
      totalEmpresa: docsEmpresa.length,
      totalTrabajador: docsTrabajador.length,
      totalFirmados: firmados.length,
      totalPendientesFirma: pendientesFirma.length,
      totalVencidos: vencidos.length,
    },
    documentos: {
      empresa: docsEmpresa,
      trabajador: docsTrabajador,
      firmados,
      pendientesFirma,
      vencidos,
    },
  };
}

export async function generarInformeDocumentalEmpresa(params: {
  empresaId: string;
}): Promise<InformeDocumentalEmpresa> {
  const context = await requirePermission("canReadDocumentacion");
  await asegurarContextoBase(context);

  if (params.empresaId !== context.empresaId) {
    throw new Error("No tienes permisos para generar el informe de otra empresa.");
  }

  return generarInformeDocumentalEmpresaData({ empresaId: params.empresaId });
}

export async function validarDocumentoEmpresa(params: {
  documentoId: string;
  contenidoEditable?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const context = await requirePermission("canManageDocumentacion");

  const doc = await prisma.documentoEmpresa.findUnique({
    where: { id: params.documentoId },
    select: {
      id: true,
      nombre: true,
      empresaId: true,
      estado: true,
      firmado: true,
      observaciones: true,
    },
  });

  if (!doc) return { ok: false, error: "Documento no encontrado." };
  if (doc.empresaId !== context.empresaId) {
    return { ok: false, error: "No tienes permiso para validar este documento." };
  }
  if (doc.firmado) {
    return { ok: false, error: "El documento ya está firmado." };
  }

  const estadoActual = (doc.estado ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (estadoActual !== "en_revision") {
    return { ok: false, error: "Solo se puede validar un documento en revisión." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: context.usuarioId },
    select: { nombre: true, email: true },
  });
  const actor = usuario?.nombre ?? usuario?.email ?? context.usuarioId;

  const contenido = params.contenidoEditable?.trim();

  await prisma.documentoEmpresa.update({
    where: { id: doc.id },
    data: {
      estado: "Validado",
      observaciones: contenido ?? undefined,
    },
  });

  await prisma.documentoEmpresaHistorial.create({
    data: {
      documentoId: doc.id,
      usuarioId: context.usuarioId,
      accion: "validado",
      detalle: `Documento validado por ${actor}`,
    },
  });

  return { ok: true };
}

export async function enviarDocumentoEmpresaAFirma(params: {
  documentoId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const context = await requirePermission("canManageDocumentacion");

  const doc = await prisma.documentoEmpresa.findUnique({
    where: { id: params.documentoId },
    select: {
      id: true,
      nombre: true,
      empresaId: true,
      estado: true,
      firmado: true,
    },
  });

  if (!doc) return { ok: false, error: "Documento no encontrado." };
  if (doc.empresaId !== context.empresaId) {
    return { ok: false, error: "No tienes permiso para enviar este documento a firma." };
  }
  if (doc.firmado) {
    return { ok: false, error: "El documento ya está firmado." };
  }

  const estadoActual = (doc.estado ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (estadoActual !== "validado") {
    return { ok: false, error: "Solo se puede enviar a firma un documento validado." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: context.usuarioId },
    select: { nombre: true, email: true },
  });
  const actor = usuario?.nombre ?? usuario?.email ?? context.usuarioId;

  await prisma.documentoEmpresa.update({
    where: { id: doc.id },
    data: { estado: "Enviado a firma" },
  });

  await prisma.documentoEmpresaHistorial.create({
    data: {
      documentoId: doc.id,
      usuarioId: context.usuarioId,
      accion: "enviado_firma",
      detalle: `Documento enviado a firma por ${actor}`,
    },
  });

  return { ok: true };
}

/**
 * Firma un documento de empresa de forma simple y trazable.
 * - Valida permisos (canManageDocumentacion).
 * - Valida que el documento exista y pertenezca a la empresa del usuario.
 * - Impide firmar un documento ya firmado.
 * - Valida que el estado sea uno de los permitidos (pendiente | en_revision).
 * - Actualiza estado → "firmado", registra firmadoPor y firmadoEn.
 * - Registra entrada en DocumentoEmpresaHistorial.
 */
export async function firmarDocumentoEmpresa(params: {
  documentoId: string;
}): Promise<FirmarDocumentoResultado> {
  const context = await requirePermission("canManageDocumentacion");

  const doc = await prisma.documentoEmpresa.findUnique({
    where: { id: params.documentoId },
    select: {
      id: true,
      nombre: true,
      estado: true,
      firmado: true,
      empresaId: true,
    },
  });

  if (!doc) {
    return { ok: false, error: "Documento no encontrado." };
  }

  if (doc.empresaId !== context.empresaId) {
    return { ok: false, error: "No tienes permiso para firmar este documento." };
  }

  if (doc.firmado) {
    return { ok: false, error: "El documento ya fue firmado anteriormente." };
  }

  const estadoActual = (doc.estado ?? "").toLowerCase().replace(/\s/g, "_");
  const firmable =
    ESTADOS_FIRMABLES.map((e) => e.toLowerCase().replace(/\s/g, "_")).includes(estadoActual);

  if (!firmable) {
    return {
      ok: false,
      error: `El documento en estado "${doc.estado}" no puede ser firmado. Solo se permiten documentos enviados a firma.`,
    };
  }

  const firmadoEn = new Date();

  // Obtener nombre del usuario firmante
  const usuario = await prisma.usuario.findUnique({
    where: { id: context.usuarioId },
    select: { nombre: true, email: true },
  });
  const firmadoPor = usuario?.nombre ?? usuario?.email ?? context.usuarioId;

  await prisma.documentoEmpresa.update({
    where: { id: doc.id },
    data: {
      estado: "Firmado",
      firmado: true,
      firmadoPor,
      firmadoEn,
    },
  });

  const historial = await prisma.documentoEmpresaHistorial.create({
    data: {
      documentoId: doc.id,
      usuarioId: context.usuarioId,
      accion: "firmado",
      detalle: `Documento firmado por ${firmadoPor}`,
      version: null,
    },
  });

  return {
    ok: true,
    logId: historial.id,
    firmadoEn: firmadoEn.toISOString(),
    firmadoPor,
  };
}

type PlantillaDocumentoEmpresaPayload = {
  codigo: string;
  contenidoBase: string;
  activa?: boolean;
  version?: string;
};

export type PlantillaDocumentoEmpresaDTO = {
  id: string | null;
  empresaId: string;
  codigo: string;
  contenidoBase: string;
  activa: boolean;
  version: string;
  fuente: "empresa" | "base";
  createdAt: string | null;
};

function validarCodigoPlantillaEditable(codigoRaw: string): "IRL" | "EPP" {
  const codigo = normalizarCodigoPlantilla(codigoRaw);
  if (codigo !== "IRL" && codigo !== "EPP") {
    throw new Error("Codigo de plantilla no soportado. Solo se permite IRL o EPP.");
  }
  return codigo;
}

export async function obtenerPlantillaEmpresa(codigoRaw: string): Promise<PlantillaDocumentoEmpresaDTO> {
  const context = await requirePermission("canReadDocumentacion");
  const codigo = validarCodigoPlantillaEditable(codigoRaw);

  const existente = await prisma.plantillaDocumentoEmpresa.findUnique({
    where: {
      empresaId_codigo: {
        empresaId: context.empresaId,
        codigo,
      },
    },
    select: {
      id: true,
      empresaId: true,
      codigo: true,
      contenidoBase: true,
      activa: true,
      version: true,
      createdAt: true,
    },
  });

  if (existente) {
    return {
      id: existente.id,
      empresaId: existente.empresaId,
      codigo: existente.codigo,
      contenidoBase: existente.contenidoBase,
      activa: existente.activa,
      version: existente.version,
      fuente: "empresa",
      createdAt: existente.createdAt.toISOString(),
    };
  }

  const plantillaBase = getPlantillaBasePorCodigo(codigo);
  if (!plantillaBase) {
    throw new Error("No existe plantilla base para el codigo solicitado.");
  }

  return {
    id: null,
    empresaId: context.empresaId,
    codigo,
    contenidoBase: construirContenidoBasePlantilla(plantillaBase),
    activa: true,
    version: plantillaBase.version ?? "1.0",
    fuente: "base",
    createdAt: null,
  };
}

export async function crearPlantillaEmpresa(
  payload: PlantillaDocumentoEmpresaPayload,
): Promise<{ ok: boolean; plantilla?: PlantillaDocumentoEmpresaDTO; error?: string }> {
  try {
    const context = await requirePermission("canManageDocumentacion");
    const codigo = validarCodigoPlantillaEditable(payload.codigo);
    const contenidoBase = payload.contenidoBase?.trim();

    if (!contenidoBase) {
      return { ok: false, error: "El contenido base es obligatorio." };
    }

    const created = await prisma.plantillaDocumentoEmpresa.create({
      data: {
        empresaId: context.empresaId,
        codigo,
        contenidoBase,
        activa: payload.activa ?? true,
        version: payload.version?.trim() || "1.0",
      },
      select: {
        id: true,
        empresaId: true,
        codigo: true,
        contenidoBase: true,
        activa: true,
        version: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      plantilla: {
        id: created.id,
        empresaId: created.empresaId,
        codigo: created.codigo,
        contenidoBase: created.contenidoBase,
        activa: created.activa,
        version: created.version,
        fuente: "empresa",
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear la plantilla.";
    return { ok: false, error: message };
  }
}

export async function actualizarPlantillaEmpresa(
  payload: PlantillaDocumentoEmpresaPayload,
): Promise<{ ok: boolean; plantilla?: PlantillaDocumentoEmpresaDTO; error?: string }> {
  try {
    const context = await requirePermission("canManageDocumentacion");
    const codigo = validarCodigoPlantillaEditable(payload.codigo);
    const contenidoBase = payload.contenidoBase?.trim();

    if (!contenidoBase) {
      return { ok: false, error: "El contenido base es obligatorio." };
    }

    const updated = await prisma.plantillaDocumentoEmpresa.upsert({
      where: {
        empresaId_codigo: {
          empresaId: context.empresaId,
          codigo,
        },
      },
      create: {
        empresaId: context.empresaId,
        codigo,
        contenidoBase,
        activa: payload.activa ?? true,
        version: payload.version?.trim() || "1.0",
      },
      update: {
        contenidoBase,
        activa: payload.activa ?? true,
        version: payload.version?.trim() || "1.0",
      },
      select: {
        id: true,
        empresaId: true,
        codigo: true,
        contenidoBase: true,
        activa: true,
        version: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      plantilla: {
        id: updated.id,
        empresaId: updated.empresaId,
        codigo: updated.codigo,
        contenidoBase: updated.contenidoBase,
        activa: updated.activa,
        version: updated.version,
        fuente: "empresa",
        createdAt: updated.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible actualizar la plantilla.";
    return { ok: false, error: message };
  }
}

export type {
  DocumentoEmpresaInput,
  AlertasDocumentalesEmpresaResultado,
  ResumenAlertasDocumentales,
};
