// =====================================================================
//  Mock data — Módulo Acreditaciones
//  Regla: requisitos SIEMPRE desde plantilla. Nunca inventados ad hoc.
// =====================================================================

import type {
  Acreditacion,
  EmpresaCliente,
  Mandante,
  PlantillaAcreditacion,
  RequisitoPlantilla,
  Trabajador,
  Vehiculo,
  DocumentoInstancia,
  DocumentoBase,
  HistorialExpediente,
  BloqueTrabajador,
  RegistroHistorial,
} from "./types";
import { BIBLIOTECA_MOCK } from "../biblioteca/mock-biblioteca";

// ── Empresas cliente ─────────────────────────────────────────────────

export const EMPRESAS_MOCK: EmpresaCliente[] = [
  { id: "emp-001", razonSocial: "MVP CHILE SPA", rut: "76.653.076-1", rubro: "Fabricación e instalación de ventanas PVC/aluminio" },
];
/** Empresa operadora del sistema (contexto único) */
export const EMPRESA_OPERADORA = EMPRESAS_MOCK[0];
// ── Mandantes ────────────────────────────────────────────────────────

export const MANDANTES_MOCK: Mandante[] = [
  { id: "man-001", nombre: "Municipalidad de Ñuñoa", rut: "69.189.100-7", tipo: "municipalidad" },
  { id: "man-002", nombre: "Constructora Altamira S.A.", rut: "76.801.234-5", tipo: "constructora" },
  { id: "man-003", nombre: "Inmobiliaria Los Robles SpA", rut: "77.234.890-1", tipo: "privado" },
];

// ── Trabajadores mock (pool) ─────────────────────────────────────────

export const TRABAJADORES_MOCK: Trabajador[] = [
  { id: "w-001", nombre: "Juan Muñoz Carvajal",   rut: "12.345.678-K", cargo: "Supervisor de Obra" },
  { id: "w-002", nombre: "Cristina Reyes Soto",   rut: "14.789.012-3", cargo: "Administrativa" },
  { id: "w-003", nombre: "Ricardo Flores Pavez",  rut: "16.023.456-7", cargo: "Maestro PVC/Aluminio" },
  { id: "w-004", nombre: "Sebastián Vidal Herrera",rut: "17.890.123-4", cargo: "Instalador" },
  { id: "w-005", nombre: "Carlos Espinoza Tapia", rut: "15.456.789-0", cargo: "Maestro PVC/Aluminio" },
];

// ── Vehículos mock (pool) ────────────────────────────────────────────

export const VEHICULOS_MOCK: Vehiculo[] = [
  { id: "v-001", patente: "KDRG-45", modelo: "Toyota Hilux",   año: 2021 },
  { id: "v-002", patente: "BJTT-18", modelo: "Peugeot Partner", año: 2019 },
];

// ── Plantillas ────────────────────────────────────────────────────────

function req(
  id: string,
  plantillaId: string,
  nombreDocumento: string,
  categoria: RequisitoPlantilla["categoria"],
  aplicaA: RequisitoPlantilla["aplicaA"],
  opts: Partial<RequisitoPlantilla> = {}
): RequisitoPlantilla {
  return {
    id,
    plantillaId,
    nombreDocumento,
    categoria,
    aplicaA,
    obligatorio: true,
    permiteMultiples: false,
    requiereVencimiento: false,
    requiereRevisionManual: false,
    orden: parseInt(id.split("-").pop() ?? "0", 10),
    ...opts,
  };
}

export const PLANTILLAS_MOCK: PlantillaAcreditacion[] = [
  // ─── Municipalidad ───────────────────────────────────────────────
  {
    id: "plt-001",
    nombre: "Municipalidades — Contrato de Obra",
    mandante: "Municipalidades",
    mandanteId: "man-001",
    tipo: "municipal",
    descripcion: "Requisitos estándar para contratos con municipalidades de la RM.",
    activa: true,
    creadoEl: "2025-01-01",
    actualizadoEl: "2026-01-10",
    requisitos: [
      req("r-001-01", "plt-001", "RUT Empresa", "empresa", "empresa"),
      req("r-001-02", "plt-001", "Escritura de Constitución Social", "empresa", "empresa"),
      req("r-001-03", "plt-001", "Certificado de Vigencia Empresa", "empresa", "empresa", { requiereVencimiento: true }),
      req("r-001-04", "plt-001", "Nómina de Trabajadores", "empresa", "empresa"),
      req("r-001-05", "plt-001", "Certificado Sin Deuda Tributaria (SII)", "empresa", "empresa", { requiereVencimiento: true }),
      req("r-001-06", "plt-001", "Cédula de Identidad (vigente)", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-001-07", "plt-001", "Contrato de Trabajo", "trabajador", "trabajador"),
      req("r-001-08", "plt-001", "Liquidación de Remuneraciones (últimas 3)", "trabajador", "trabajador", { permiteMultiples: true }),
      req("r-001-09", "plt-001", "Certificado de Afiliación AFP", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-001-10", "plt-001", "Certificado ISAPRE / FONASA", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-001-11", "plt-001", "ODI Firmada (Obligación de Informar)", "trabajador", "trabajador"),
      req("r-001-12", "plt-001", "Examen de Salud Ocupacional", "trabajador", "trabajador", { obligatorio: false, requiereVencimiento: true }),
      req("r-001-13", "plt-001", "Reglamento Interno RIOHS", "sst", "empresa"),
      req("r-001-14", "plt-001", "Certificado Mutual Vigente (ACHS/ISL)", "sst", "empresa", { requiereVencimiento: true }),
      req("r-001-15", "plt-001", "Seguro de Accidentes del Trabajo", "sst", "empresa", { requiereVencimiento: true }),
    ],
  },

  // ─── Enel ────────────────────────────────────────────────────────
  {
    id: "plt-002",
    nombre: "Enel — Empresa contratista eléctrica",
    mandante: "Enel Distribución Chile",
    mandanteId: "man-002",
    tipo: "enel",
    descripcion: "Requisitos para empresas contratistas de distribuidoras eléctricas Enel.",
    activa: true,
    creadoEl: "2025-01-01",
    actualizadoEl: "2026-02-01",
    requisitos: [
      req("r-002-01", "plt-002", "RUT Empresa", "empresa", "empresa"),
      req("r-002-02", "plt-002", "Nómina de Trabajadores (formato Enel)", "empresa", "empresa"),
      req("r-002-03", "plt-002", "Certificado Sin Deuda Tesorería", "empresa", "empresa", { requiereVencimiento: true }),
      req("r-002-04", "plt-002", "Certificado SENCE", "empresa", "empresa", { obligatorio: false }),
      req("r-002-05", "plt-002", "Cédula de Identidad (vigente)", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-002-06", "plt-002", "Contrato de Trabajo", "trabajador", "trabajador"),
      req("r-002-07", "plt-002", "Licencia Eléctrica SEC clase A o B", "trabajador", "trabajador", { requiereVencimiento: true, requiereRevisionManual: true }),
      req("r-002-08", "plt-002", "Certificado de Afiliación AFP", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-002-09", "plt-002", "Registro Entrega EPP", "trabajador", "trabajador"),
      req("r-002-10", "plt-002", "Capacitación MAT (materiales peligrosos)", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-002-11", "plt-002", "Licencia de conducir (clase B o sup.)", "trabajador", "trabajador", { obligatorio: false, requiereVencimiento: true }),
      req("r-002-12", "plt-002", "RIOHS Empresa", "sst", "empresa"),
      req("r-002-13", "plt-002", "Procedimiento Trabajo en Altura", "sst", "empresa"),
      req("r-002-14", "plt-002", "Certificado Mutual Vigente", "sst", "empresa", { requiereVencimiento: true }),
      req("r-002-15", "plt-002", "Revisión Técnica y Gases", "vehiculo", "vehiculo", { requiereVencimiento: true }),
      req("r-002-16", "plt-002", "SOAP Vigente", "vehiculo", "vehiculo", { requiereVencimiento: true }),
      req("r-002-17", "plt-002", "Permiso de Circulación", "vehiculo", "vehiculo", { requiereVencimiento: true }),
    ],
  },

  // ─── Mandante General ────────────────────────────────────────────
  {
    id: "plt-003",
    nombre: "Mandante General — Sector privado",
    mandante: "Constructora Vanguard S.A.",
    mandanteId: "man-003",
    tipo: "mandante_general",
    descripcion: "Requisitos genéricos para contratos con empresas mandantes del sector privado.",
    activa: true,
    creadoEl: "2025-01-01",
    actualizadoEl: "2025-12-15",
    requisitos: [
      req("r-003-01", "plt-003", "RUT Empresa", "empresa", "empresa"),
      req("r-003-02", "plt-003", "Nómina de Trabajadores", "empresa", "empresa"),
      req("r-003-03", "plt-003", "Cédula de Identidad (vigente)", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-003-04", "plt-003", "Contrato de Trabajo", "trabajador", "trabajador"),
      req("r-003-05", "plt-003", "Certificado de Afiliación AFP", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-003-06", "plt-003", "Certificado ISAPRE / FONASA", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-003-07", "plt-003", "ODI Firmada", "trabajador", "trabajador"),
      req("r-003-08", "plt-003", "RIOHS Empresa", "sst", "empresa"),
      req("r-003-09", "plt-003", "Certificado Mutual Vigente", "sst", "empresa", { requiereVencimiento: true }),
    ],
  },

  // ─── CGE ─────────────────────────────────────────────────────────
  {
    id: "plt-004",
    nombre: "CGE — Empresa contratista eléctrica",
    mandante: "CGE Distribución",
    mandanteId: "man-004",
    tipo: "cge",
    descripcion: "Requisitos para empresas contratistas de CGE Distribución.",
    activa: true,
    creadoEl: "2025-06-01",
    actualizadoEl: "2026-01-20",
    requisitos: [
      req("r-004-01", "plt-004", "RUT Empresa", "empresa", "empresa"),
      req("r-004-02", "plt-004", "Patente Comercial Vigente", "empresa", "empresa", { requiereVencimiento: true }),
      req("r-004-03", "plt-004", "Nómina de Trabajadores", "empresa", "empresa"),
      req("r-004-04", "plt-004", "Cédula de Identidad (vigente)", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-004-05", "plt-004", "Licencia Eléctrica SEC", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-004-06", "plt-004", "Contrato de Trabajo", "trabajador", "trabajador"),
      req("r-004-07", "plt-004", "Certificado AFP", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-004-08", "plt-004", "Certificado Salud Previsional", "trabajador", "trabajador", { requiereVencimiento: true }),
      req("r-004-09", "plt-004", "RIOHS Empresa", "sst", "empresa"),
      req("r-004-10", "plt-004", "Certificado Mutual Vigente", "sst", "empresa", { requiereVencimiento: true }),
      req("r-004-11", "plt-004", "Revisión Técnica y Gases", "vehiculo", "vehiculo", { requiereVencimiento: true }),
      req("r-004-12", "plt-004", "SOAP Vigente", "vehiculo", "vehiculo", { requiereVencimiento: true }),
    ],
  },
];

// ── Acreditaciones mock ───────────────────────────────────────────────

export const ACREDITACIONES_MOCK: Acreditacion[] = [
  {
    id: "ac-001",
    empresaId: "emp-001",
    empresaNombre: "MVP CHILE SPA",
    mandanteId: "man-001",
    mandante: "Municipalidad de Ñuñoa",
    tipo: "municipal",
    estado: "enviado",
    plantillaId: "plt-001",
    plantillaNombre: "Municipalidades — Contrato de Obra",
    trabajadores: [TRABAJADORES_MOCK[0], TRABAJADORES_MOCK[2], TRABAJADORES_MOCK[3]],
    vehiculos: [],
    creadoEl: "2026-02-15",
    actualizadoEl: "2026-03-01",
    ultimoExpediente: "2026-03-01",
  },
  {
    id: "ac-002",
    empresaId: "emp-001",
    empresaNombre: "MVP CHILE SPA",
    mandanteId: "man-002",
    mandante: "Constructora Altamira S.A.",
    tipo: "mandante_general",
    estado: "rechazado",
    plantillaId: "plt-003",
    plantillaNombre: "Mandante General — Sector privado",
    trabajadores: [],
    vehiculos: [VEHICULOS_MOCK[1]],
    creadoEl: "2026-01-10",
    actualizadoEl: "2026-02-20",
    observaciones: "Documentos de vehículo no cumplen formato requerido.",
  },
  {
    id: "ac-003",
    empresaId: "emp-001",
    empresaNombre: "MVP CHILE SPA",
    mandanteId: "man-003",
    mandante: "Inmobiliaria Los Robles SpA",
    tipo: "mandante_general",
    estado: "en_preparacion",
    plantillaId: "plt-003",
    plantillaNombre: "Mandante General — Sector privado",
    trabajadores: [TRABAJADORES_MOCK[0], TRABAJADORES_MOCK[4]],
    vehiculos: [],
    creadoEl: "2026-03-20",
    actualizadoEl: "2026-04-01",
  },
];

// ── Historial mock ────────────────────────────────────────────────────

export const HISTORIAL_MOCK: Record<string, HistorialExpediente[]> = {
  "ac-001": [
    { id: "h-001", acreditacionId: "ac-001", fecha: "2026-03-01T10:30:00", generadoPor: "Juan Muñoz Carvajal", documentosIncluidos: 15, estado: "enviado" },
  ],
};

// ── Helpers de biblioteca ────────────────────────────────────────────

/**
 * Busca en la Biblioteca Documental el documento que mejor satisface
 * un requisito de plantilla para un titular dado.
 * Normaliza nombres quitando acentos y comparando en minúsculas.
 */
export function buscarDocumentoParaRequisito(
  requisito: RequisitoPlantilla,
  titularId: string,
  biblioteca: DocumentoBase[] = BIBLIOTECA_MOCK
): DocumentoBase | undefined {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const target = norm(requisito.nombreDocumento);

  return biblioteca.find((doc) => {
    if (!doc.reusableEnAcreditaciones) return false;
    if (doc.categoria !== requisito.categoria) return false;
    if (doc.aplicaA !== requisito.aplicaA) return false;
    // Para docs de trabajador/vehículo, el titular debe coincidir
    if (requisito.aplicaA !== "empresa" && doc.titularId !== titularId) return false;
    return norm(doc.nombre) === target;
  });
}

/**
 * Evalúa el estado actual de un DocumentoBase (por si la fecha de vencimiento
 * ya pasó aunque el estado almacenado diga "completo").
 */
export function evaluarEstadoDocumento(doc: DocumentoBase): DocumentoBase["estado"] {
  if (doc.estado === "faltante") return "faltante";
  if (doc.fechaVencimiento) {
    const vence = new Date(doc.fechaVencimiento);
    if (vence < HOY) return "vencido";
  }
  return doc.estado;
}

// ── Motor de generación de documentos instancia ──────────────────────
//    Regla: lee la plantilla → genera DocumentoInstancia por cada
//    requisito × titular.
//    PRIORIDAD: si existe en la Biblioteca Documental → vincular.
//    Si no existe → estado faltante (simulado en dev si no hay biblioteca).

const HOY = new Date("2026-04-09");

function offset(dias: number): string {
  const d = new Date(HOY);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function estadoSimulado(
  seed: number,
  oblRatio = 0.65
): "completo" | "vencido" | "faltante" {
  const v = seed % 10;
  if (v < Math.floor(oblRatio * 10)) return "completo";
  if (v < Math.floor(oblRatio * 10) + 2) return "vencido";
  return "faltante";
}

let _docIdx = 0;

export function generarDocumentosInstancia(
  acreditacion: Acreditacion
): DocumentoInstancia[] {
  const plantilla = PLANTILLAS_MOCK.find((p) => p.id === acreditacion.plantillaId);
  if (!plantilla) return [];

  _docIdx = 0;
  const docs: DocumentoInstancia[] = [];

  // Acreditaciones con más avance tienen estado más favorable
  const oblRatio =
    acreditacion.estado === "listo_para_enviar" || acreditacion.estado === "aprobado"
      ? 0.9
      : acreditacion.estado === "enviado"
      ? 0.8
      : acreditacion.estado === "rechazado"
      ? 0.5
      : 0.65;

  const seed0 = acreditacion.id.charCodeAt(acreditacion.id.length - 1);

  for (const req of plantilla.requisitos) {
    _docIdx++;

    if (req.aplicaA === "empresa") {
      const docBase = buscarDocumentoParaRequisito(req, "empresa");
      const estado = docBase
        ? evaluarEstadoDocumento(docBase)
        : estadoSimulado(seed0 + _docIdx, oblRatio);
      docs.push(mkDocDesdeBase(req, acreditacion.id, "empresa", acreditacion.empresaNombre, estado, _docIdx, docBase));
    }

    if (req.aplicaA === "trabajador") {
      for (const t of acreditacion.trabajadores) {
        _docIdx++;
        const docBase = buscarDocumentoParaRequisito(req, t.id);
        const estado = docBase
          ? evaluarEstadoDocumento(docBase)
          : estadoSimulado(seed0 + _docIdx + t.id.charCodeAt(t.id.length - 1), oblRatio);
        docs.push(mkDocDesdeBase(req, acreditacion.id, t.id, t.nombre, estado, _docIdx, docBase));
      }
    }

    if (req.aplicaA === "vehiculo") {
      for (const v of acreditacion.vehiculos) {
        _docIdx++;
        const docBase = buscarDocumentoParaRequisito(req, v.id);
        const estado = docBase
          ? evaluarEstadoDocumento(docBase)
          : estadoSimulado(seed0 + _docIdx + v.id.charCodeAt(v.id.length - 1), oblRatio);
        docs.push(
          mkDocDesdeBase(req, acreditacion.id, v.id, `${v.modelo} (${v.patente})`, estado, _docIdx, docBase)
        );
      }
    }
  }

  return docs;
}

function mkDocDesdeBase(
  req: RequisitoPlantilla,
  acId: string,
  titularId: string,
  titularNombre: string,
  estado: DocumentoInstancia["estado"],
  idx: number,
  docBase?: DocumentoBase
): DocumentoInstancia {
  const tieneArchivo = estado !== "faltante";
  // Si tenemos un doc de la biblioteca, tomamos sus metadatos reales
  if (docBase) {
    return {
      id: `di-${acId}-${idx}`,
      requisitoId: req.id,
      acreditacionId: acId,
      nombreDocumento: req.nombreDocumento,
      categoria: req.categoria,
      aplicaA: req.aplicaA,
      titularId,
      titularNombre,
      obligatorio: req.obligatorio,
      estado,
      archivoUrl: docBase.archivoUrl,
      nombreArchivo: docBase.nombreArchivo,
      fechaEmision: docBase.fechaEmision,
      fechaVencimiento: docBase.fechaVencimiento,
      observaciones:
        estado === "vencido"
          ? docBase.observaciones ?? "Documento vencido — renovar antes de enviar."
          : undefined,
      seleccionado: tieneArchivo,
      fuenteBiblioteca: true,
      documentoBaseId: docBase.id,
    };
  }
  // Fallback: datos simulados (doc no está en la biblioteca)
  return {
    id: `di-${acId}-${idx}`,
    requisitoId: req.id,
    acreditacionId: acId,
    nombreDocumento: req.nombreDocumento,
    categoria: req.categoria,
    aplicaA: req.aplicaA,
    titularId,
    titularNombre,
    obligatorio: req.obligatorio,
    estado,
    archivoUrl: tieneArchivo ? `/mock/doc-${idx}.pdf` : undefined,
    nombreArchivo: tieneArchivo ? `${req.nombreDocumento.replace(/[^a-zA-Z0-9]/g, "_")}.pdf` : undefined,
    fechaEmision: tieneArchivo ? offset(-30 - idx * 3) : undefined,
    fechaVencimiento: req.requiereVencimiento && tieneArchivo
      ? estado === "vencido"
        ? offset(-10)
        : offset(120 + idx * 8)
      : undefined,
    observaciones:
      estado === "vencido"
        ? "Documento vencido — renovar antes de enviar."
        : estado === "faltante"
        ? "Pendiente de carga."
        : undefined,
    seleccionado: tieneArchivo,
    fuenteBiblioteca: false,
  };
}

// ── Agrupador para la pantalla del expediente ─────────────────────────

export function agruparExpediente(
  acreditacion: Acreditacion,
  docs: DocumentoInstancia[]
): import("./types").ExpedienteAgrupado {
  const empresa = docs.filter((d) => d.categoria === "empresa");
  const sst = docs.filter((d) => d.categoria === "sst");
  const anexos = docs.filter((d) => d.categoria === "anexo");

  const trabajadoresMap = new Map<string, BloqueTrabajador>();
  for (const t of acreditacion.trabajadores) {
    trabajadoresMap.set(t.id, { trabajador: t, documentos: [] });
  }
  for (const d of docs.filter((d) => d.categoria === "trabajador")) {
    trabajadoresMap.get(d.titularId)?.documentos.push(d);
  }

  const vehiculosMap = new Map<string, BloqueTrabajador>();
  for (const v of acreditacion.vehiculos) {
    vehiculosMap.set(v.id, {
      trabajador: { id: v.id, nombre: `${v.modelo} (${v.patente})`, rut: v.patente, cargo: "Vehículo" },
      documentos: [],
    });
  }
  for (const d of docs.filter((d) => d.categoria === "vehiculo")) {
    vehiculosMap.get(d.titularId)?.documentos.push(d);
  }

  return {
    empresa,
    sst,
    trabajadores: Array.from(trabajadoresMap.values()),
    vehiculos: Array.from(vehiculosMap.values()),
    anexos,
  };
}

// ── Cálculo de completitud ────────────────────────────────────────────

export function calcularCompletitud(docs: DocumentoInstancia[], soloObligatorios = true): number {
  const base = soloObligatorios ? docs.filter((d) => d.obligatorio) : docs;
  if (base.length === 0) return 100;
  return Math.round((base.filter((d) => d.estado === "completo").length / base.length) * 100);
}

// ── Historial de gestión (vista analítica) ────────────────────────────────

export const HISTORIAL_GESTION_MOCK: RegistroHistorial[] = [
  {
    id: "hg-001",
    mandanteId: "man-003",
    mandante: "Inmobiliaria Los Robles SpA",
    tipo: "mandante_general",
    estado: "aprobado",
    cantidadTrabajadores: 2,
    cantidadVehiculos: 0,
    fechaCreacion: "2025-10-02",
    fechaEnvio: "2025-10-22",
    fechaRespuesta: "2025-11-12",
    resultado: "aprobado",
    responsable: "Jorge Mena Contreras",
    diasGestion: 41,
  },
  {
    id: "hg-002",
    mandanteId: "man-002",
    mandante: "Constructora Altamira S.A.",
    tipo: "mandante_general",
    estado: "rechazado",
    cantidadTrabajadores: 0,
    cantidadVehiculos: 1,
    fechaCreacion: "2026-01-10",
    fechaEnvio: "2026-01-28",
    fechaRespuesta: "2026-02-20",
    resultado: "rechazado",
    responsable: "Jorge Mena Contreras",
    diasGestion: 41,
    motivoRechazo: "documentos_vehiculo",
    observaciones: "Documentos de vehículo no cumplen formato requerido.",
  },
  {
    id: "hg-003",
    mandanteId: "man-001",
    mandante: "Municipalidad de Ñuñoa",
    tipo: "municipal",
    estado: "enviado",
    cantidadTrabajadores: 3,
    cantidadVehiculos: 0,
    fechaCreacion: "2026-02-15",
    fechaEnvio: "2026-03-01",
    responsable: "Juan Muñoz Carvajal",
    diasGestion: 54,
  },
  {
    id: "hg-004",
    mandanteId: "man-003",
    mandante: "Inmobiliaria Los Robles SpA",
    tipo: "mandante_general",
    estado: "aprobado",
    cantidadTrabajadores: 2,
    cantidadVehiculos: 0,
    fechaCreacion: "2025-05-10",
    fechaEnvio: "2025-05-28",
    fechaRespuesta: "2025-06-18",
    resultado: "aprobado",
    responsable: "Jorge Mena Contreras",
    diasGestion: 39,
  },
];


export function evaluarEstadoExpediente(docs: DocumentoInstancia[]): {
  bloqueado: boolean;
  advertencias: number;
  faltantesOblig: DocumentoInstancia[];
  vencidosOblig: DocumentoInstancia[];
  listoParaEnviar: boolean;
} {
  const faltantesOblig = docs.filter((d) => d.obligatorio && d.estado === "faltante");
  const vencidosOblig = docs.filter((d) => d.obligatorio && d.estado === "vencido");
  const bloqueado = faltantesOblig.length > 0;
  const advertencias = vencidosOblig.length;
  return {
    bloqueado,
    advertencias,
    faltantesOblig,
    vencidosOblig,
    listoParaEnviar: !bloqueado && advertencias === 0,
  };
}
