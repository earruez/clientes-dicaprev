"use client";

import { useMemo, useState } from "react";
import { DOCUMENTOS_EMPRESA_MOCK, USUARIO_LOGUEADO_MOCK } from "../mock-data";
import {
  type CategoriaDocumento,
  type DocumentoEmpresa,
  type DocumentosFiltros,
  type EstadoDocumento,
  type HistorialDocumento,
  type TabDocumentacion,
} from "../types";

export type UseDocumentosResult = {
  usuarioActual: { nombre: string; email: string };
  documentos: DocumentoEmpresa[];
  tabActiva: TabDocumentacion;
  setTabActiva: (tab: TabDocumentacion) => void;
  filtros: DocumentosFiltros;
  setFiltros: (f: DocumentosFiltros) => void;
  filtrados: DocumentoEmpresa[];
  historialGlobal: Array<HistorialDocumento & { documentoId: string; documentoNombre: string; categoria: CategoriaDocumento }>;
  kpis: {
    total: number;
    vigentes: number;
    porVencer: number;
    vencidos: number;
    pendientesCarga: number;
    actualizadosMes: number;
  };
  addDocumento: (input: {
    nombre: string;
    categoria: CategoriaDocumento;
    tipo: string;
    estado: EstadoDocumento;
    fechaEmision: string;
    fechaVencimiento: string | null;
    tieneVencimiento: boolean;
    archivo: File;
    observaciones: string;
    version: string;
  }) => boolean;
  replaceDocumentoArchivo: (input: {
    documentoId: string;
    archivo: File;
    version: string;
    observaciones: string;
  }) => boolean;
  updateDocumentoMetadatos: (input: {
    documentoId: string;
    nombre: string;
    categoria: CategoriaDocumento;
    tipo: string;
    estado: EstadoDocumento;
    fechaEmision: string;
    fechaVencimiento: string | null;
    tieneVencimiento: boolean;
    observaciones: string;
    version: string;
  }) => boolean;
  marcarDocumentoNoAplica: (documentoId: string) => boolean;
};

const DOCUMENTOS_STORAGE_KEY = "nextprev:documentacion-empresa:v1";

const FILTROS_POR_DEFECTO: DocumentosFiltros = {
  categoria: "todas",
  estado: "todos",
  vigencia: "todas",
  search: "",
  subidoPor: "",
  fechaSubida: "",
};

function nowIso() {
  return new Date().toISOString();
}

function vigenciaDocumento(doc: DocumentoEmpresa) {
  if (!doc.tieneVencimiento || !doc.fechaVencimiento) return "sin_vencimiento" as const;
  const today = new Date();
  const due = new Date(doc.fechaVencimiento);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "vencido" as const;
  if (diffDays <= 30) return "por_vencer" as const;
  return "vigente" as const;
}

function pushHistory(
  doc: DocumentoEmpresa,
  event: Omit<HistorialDocumento, "id" | "fecha" | "usuario" | "usuarioEmail">
): DocumentoEmpresa {
  const row: HistorialDocumento = {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: nowIso(),
    usuario: USUARIO_LOGUEADO_MOCK.nombre,
    usuarioEmail: USUARIO_LOGUEADO_MOCK.email,
    accion: event.accion,
    detalle: event.detalle,
  };

  return {
    ...doc,
    actualizadoPor: USUARIO_LOGUEADO_MOCK.nombre,
    fechaActualizacion: row.fecha,
    historial: [row, ...doc.historial],
  };
}

function loadInitialDocuments() {
  if (typeof window === "undefined") return DOCUMENTOS_EMPRESA_MOCK;

  try {
    const raw = window.localStorage.getItem(DOCUMENTOS_STORAGE_KEY);
    if (!raw) return DOCUMENTOS_EMPRESA_MOCK;
    const parsed = JSON.parse(raw) as DocumentoEmpresa[];
    if (!Array.isArray(parsed)) return DOCUMENTOS_EMPRESA_MOCK;
    return parsed;
  } catch {
    return DOCUMENTOS_EMPRESA_MOCK;
  }
}

export function useDocumentos(inicial: DocumentoEmpresa[] = DOCUMENTOS_EMPRESA_MOCK): UseDocumentosResult {
  const [documentos, setDocumentos] = useState<DocumentoEmpresa[]>(() => {
    const data = loadInitialDocuments();
    return data.length ? data : inicial;
  });
  const [tabActiva, setTabActiva] = useState<TabDocumentacion>("todos");
  const [filtros, setFiltros] = useState<DocumentosFiltros>(FILTROS_POR_DEFECTO);

  const saveState = (nextDocs: DocumentoEmpresa[]) => {
    setDocumentos(nextDocs);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DOCUMENTOS_STORAGE_KEY, JSON.stringify(nextDocs));
    }
  };

  const filtrados = useMemo(() => {
    return documentos.filter((doc) => {
      if (tabActiva !== "todos" && tabActiva !== "historial" && doc.categoria !== tabActiva) {
        return false;
      }

      if (filtros.categoria !== "todas" && doc.categoria !== filtros.categoria) {
        return false;
      }

      if (filtros.estado !== "todos" && doc.estado !== filtros.estado) {
        return false;
      }

      if (filtros.vigencia !== "todas" && vigenciaDocumento(doc) !== filtros.vigencia) {
        return false;
      }

      if (
        filtros.search.trim() &&
        ![doc.nombre, doc.tipo, doc.archivoNombre ?? ""].join(" ").toLowerCase().includes(filtros.search.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.subidoPor.trim() &&
        ![doc.subidoPor, doc.subidoPorEmail].join(" ").toLowerCase().includes(filtros.subidoPor.toLowerCase())
      ) {
        return false;
      }

      if (filtros.fechaSubida && !doc.fechaSubida.startsWith(filtros.fechaSubida)) {
        return false;
      }

      return true;
    });
  }, [documentos, filtros, tabActiva]);

  const historialGlobal = useMemo(() => {
    return documentos
      .flatMap((doc) =>
        doc.historial.map((h) => ({
          ...h,
          documentoId: doc.id,
          documentoNombre: doc.nombre,
          categoria: doc.categoria,
        }))
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [documentos]);

  const kpis = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return {
      total: documentos.length,
      vigentes: documentos.filter((d) => d.estado === "vigente").length,
      porVencer: documentos.filter((d) => d.estado === "por_vencer").length,
      vencidos: documentos.filter((d) => d.estado === "vencido").length,
      pendientesCarga: documentos.filter((d) => d.estado === "pendiente_carga").length,
      actualizadosMes: documentos.filter((d) => {
        const date = new Date(d.fechaActualizacion);
        return date.getMonth() === month && date.getFullYear() === year;
      }).length,
    };
  }, [documentos]);

  const addDocumento: UseDocumentosResult["addDocumento"] = (input) => {
    if (!input.archivo || !input.nombre.trim() || !input.categoria) return false;
    if (input.tieneVencimiento && !input.fechaVencimiento) return false;

    const uploadDate = nowIso();
    const newDoc: DocumentoEmpresa = {
      id: `doc-${Date.now()}`,
      nombre: input.nombre.trim(),
      categoria: input.categoria,
      tipo: input.tipo.trim() || "Documento general",
      estado: input.estado,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.tieneVencimiento ? input.fechaVencimiento : null,
      tieneVencimiento: input.tieneVencimiento,
      archivoNombre: input.archivo.name,
      archivoUrl: typeof window !== "undefined" ? window.URL.createObjectURL(input.archivo) : null,
      archivoPeso: input.archivo.size,
      archivoTipo: input.archivo.type || "application/octet-stream",
      version: input.version.trim() || "1.0",
      subidoPor: USUARIO_LOGUEADO_MOCK.nombre,
      subidoPorEmail: USUARIO_LOGUEADO_MOCK.email,
      fechaSubida: uploadDate,
      actualizadoPor: USUARIO_LOGUEADO_MOCK.nombre,
      fechaActualizacion: uploadDate,
      observaciones: input.observaciones,
      historial: [
        {
          id: `hist-${Date.now()}`,
          fecha: uploadDate,
          usuario: USUARIO_LOGUEADO_MOCK.nombre,
          usuarioEmail: USUARIO_LOGUEADO_MOCK.email,
          accion: "Documento cargado",
          detalle: `Documento cargado en versión ${input.version || "1.0"}`,
        },
      ],
    };

    saveState([newDoc, ...documentos]);
    return true;
  };

  const replaceDocumentoArchivo: UseDocumentosResult["replaceDocumentoArchivo"] = (input) => {
    if (!input.archivo) return false;

    const updated = documentos.map((doc) => {
      if (doc.id !== input.documentoId) return doc;

      const replaced: DocumentoEmpresa = {
        ...doc,
        estado: doc.estado === "pendiente_carga" ? "en_revision" : "reemplazado",
        archivoNombre: input.archivo.name,
        archivoUrl: typeof window !== "undefined" ? window.URL.createObjectURL(input.archivo) : null,
        archivoPeso: input.archivo.size,
        archivoTipo: input.archivo.type || "application/octet-stream",
        version: input.version.trim() || doc.version,
        observaciones: input.observaciones.trim() || doc.observaciones,
      };

      return pushHistory(replaced, {
        accion: "Documento reemplazado",
        detalle: `Archivo reemplazado y versión actualizada a ${replaced.version}`,
      });
    });

    saveState(updated);
    return true;
  };

  const updateDocumentoMetadatos: UseDocumentosResult["updateDocumentoMetadatos"] = (input) => {
    const updated = documentos.map((doc) => {
      if (doc.id !== input.documentoId) return doc;

      const next = {
        ...doc,
        nombre: input.nombre.trim(),
        categoria: input.categoria,
        tipo: input.tipo.trim(),
        estado: input.estado,
        fechaEmision: input.fechaEmision,
        fechaVencimiento: input.tieneVencimiento ? input.fechaVencimiento : null,
        tieneVencimiento: input.tieneVencimiento,
        observaciones: input.observaciones,
        version: input.version,
      };

      return pushHistory(next, {
        accion: "Metadatos actualizados",
        detalle: "Se actualizaron metadatos generales del documento",
      });
    });

    saveState(updated);
    return true;
  };

  const marcarDocumentoNoAplica: UseDocumentosResult["marcarDocumentoNoAplica"] = (documentoId) => {
    const updated = documentos.map((doc) => {
      if (doc.id !== documentoId) return doc;
      return pushHistory(
        {
          ...doc,
          estado: "no_aplica",
        },
        {
          accion: "Marcado como no aplica",
          detalle: "Documento excluido del control por criterio corporativo",
        }
      );
    });
    saveState(updated);
    return true;
  };

  return {
    usuarioActual: USUARIO_LOGUEADO_MOCK,
    documentos,
    tabActiva,
    setTabActiva,
    filtros,
    setFiltros,
    filtrados,
    historialGlobal,
    kpis,
    addDocumento,
    replaceDocumentoArchivo,
    updateDocumentoMetadatos,
    marcarDocumentoNoAplica,
  };
}