"use client";

import { useEffect, useMemo, useState } from "react";
import {
  actualizarDocumentoEmpresa,
  crearDocumentoEmpresa,
  registrarHistorialDocumento,
  restaurarDocumentoVersion as restaurarDocumentoVersionAction,
  type DocumentoEmpresaInput,
} from "../actions";
import {
  type CategoriaDocumento,
  type DocumentoMatrizRow,
  type DocumentosFiltros,
  type EstadoDocumento,
  type HistorialDocumento,
  type TabDocumentacion,
} from "../types";

export type UseDocumentosResult = {
  usuarioActual: { nombre: string; email: string };
  documentos: DocumentoMatrizRow[];
  tabActiva: TabDocumentacion;
  setTabActiva: (tab: TabDocumentacion) => void;
  filtros: DocumentosFiltros;
  setFiltros: (f: DocumentosFiltros) => void;
  filtrados: DocumentoMatrizRow[];
  historialGlobal: Array<HistorialDocumento & { documentoId: string; documentoNombre: string; categoria: CategoriaDocumento }>;
  kpis: {
    total: number;
    vigentes: number;
    porVencer: number;
    vencidos: number;
    pendientesCarga: number;
    actualizadosMes: number;
  };
  addDocumento: (input: DocumentoEmpresaInput) => Promise<boolean>;
  replaceDocumentoArchivo: (input: {
    documentoId: string | null;
    documentoRequeridoId: string | null;
    archivoNombre: string;
    archivoNombreOriginal: string;
    archivoUrl: string;
    archivoTipo: string | null;
    archivoPeso: number;
    version: string;
    observaciones: string;
  }) => Promise<boolean>;
  updateDocumentoMetadatos: (input: {
    documentoId: string | null;
    documentoRequeridoId: string | null;
    nombre: string;
    categoria: CategoriaDocumento;
    tipo: string;
    estado: EstadoDocumento;
    fechaEmision: string;
    fechaVencimiento: string | null;
    tieneVencimiento: boolean;
    observaciones: string;
    version: string;
    archivoNombre?: string;
  }) => Promise<boolean>;
  marcarDocumentoNoAplica: (documentoId: string | null, documentoRequeridoId: string | null, base: DocumentoMatrizRow) => Promise<boolean>;
  marcarDocumentoAplica: (documentoId: string | null, documentoRequeridoId: string | null, base: DocumentoMatrizRow) => Promise<boolean>;
  restaurarDocumentoVersion: (documentoId: string, historialId: string) => Promise<boolean>;
  recargarDocumentos: () => Promise<void>;
};

const FILTROS_POR_DEFECTO: DocumentosFiltros = {
  categoria: "todas",
  estado: "todos",
  vigencia: "todas",
  search: "",
  subidoPor: "",
  fechaSubida: "",
};

const USUARIO_POR_DEFECTO = {
  nombre: "Usuario Base",
  email: "usuario.base@nextprev.local",
};

function vigenciaDocumento(doc: DocumentoMatrizRow) {
  if (!doc.tieneVencimiento || !doc.fechaVencimiento) return "sin_vencimiento" as const;
  const today = new Date();
  const due = new Date(doc.fechaVencimiento);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "vencido" as const;
  if (diffDays <= 30) return "por_vencer" as const;
  return "vigente" as const;
}

export function useDocumentos(): UseDocumentosResult {
  const [documentos, setDocumentos] = useState<DocumentoMatrizRow[]>([]);
  const [tabActiva, setTabActiva] = useState<TabDocumentacion>("todos");
  const [filtros, setFiltros] = useState<DocumentosFiltros>(FILTROS_POR_DEFECTO);
  const [usuarioActual, setUsuarioActual] = useState(USUARIO_POR_DEFECTO);

  const cargarMatriz = async () => {
    const response = await fetch("/api/dicaprev/documentacion/matriz", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("No se pudo cargar la matriz documental");
    }
    const payload = (await response.json()) as {
      usuario: { nombre: string; email: string } | null;
      documentos: DocumentoMatrizRow[];
    };

    setUsuarioActual({
      nombre: payload.usuario?.nombre ?? USUARIO_POR_DEFECTO.nombre,
      email: payload.usuario?.email ?? USUARIO_POR_DEFECTO.email,
    });
    setDocumentos(payload.documentos);
  };

  const recargarDocumentos = async () => {
    await cargarMatriz();
  };

  useEffect(() => {
    void (async () => {
      try {
        await cargarMatriz();
      } catch {
        setUsuarioActual(USUARIO_POR_DEFECTO);
        setDocumentos([]);
      }
    })();
  }, []);

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
        ![doc.nombre, doc.tipo, doc.ultimoArchivo ?? ""].join(" ").toLowerCase().includes(filtros.search.toLowerCase())
      ) {
        return false;
      }

      if (
        filtros.subidoPor.trim() &&
        ![doc.subidoPor ?? "", doc.subidoPorEmail ?? ""].join(" ").toLowerCase().includes(filtros.subidoPor.toLowerCase())
      ) {
        return false;
      }

      if (filtros.fechaSubida && (!doc.fechaSubida || !doc.fechaSubida.startsWith(filtros.fechaSubida))) {
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
          documentoId: doc.documentoEmpresaId ?? doc.id,
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
      vigentes: documentos.filter((d) => d.estado === "Vigente").length,
      porVencer: documentos.filter((d) => d.estado === "Por vencer").length,
      vencidos: documentos.filter((d) => d.estado === "Vencido").length,
      pendientesCarga: documentos.filter((d) => d.estado === "Pendiente de carga").length,
      actualizadosMes: documentos.filter((d) => {
        if (!d.fechaActualizacion) return false;
        const date = new Date(d.fechaActualizacion);
        return date.getMonth() === month && date.getFullYear() === year;
      }).length,
    };
  }, [documentos]);

  const addDocumento: UseDocumentosResult["addDocumento"] = async (input) => {
    if (!input.nombre.trim() || !input.categoria) return false;
    if (input.tieneVencimiento && !input.fechaVencimiento) return false;

    await crearDocumentoEmpresa(input);
    await recargarDocumentos();
    return true;
  };

  const replaceDocumentoArchivo: UseDocumentosResult["replaceDocumentoArchivo"] = async (input) => {
    const row = documentos.find((item) => item.documentoEmpresaId === input.documentoId || item.documentoRequeridoId === input.documentoRequeridoId);
    if (!row) return false;

    if (!row.documentoEmpresaId) {
      await crearDocumentoEmpresa({
        nombre: row.nombre,
        categoria: row.categoria,
        tipo: row.tipo,
        estado: "En revisión",
        version: input.version.trim() || "1.0",
        archivoNombre: input.archivoNombre,
        archivoNombreOriginal: input.archivoNombreOriginal,
        archivoUrl: input.archivoUrl,
        archivoTipo: input.archivoTipo,
        archivoPeso: input.archivoPeso,
        tieneVencimiento: row.tieneVencimiento,
        fechaEmision: row.fechaEmision || null,
        fechaVencimiento: row.fechaVencimiento,
        observaciones: input.observaciones,
        creadoPorEmail: row.subidoPorEmail ?? undefined,
        documentoRequeridoId: row.documentoRequeridoId,
      });
      await recargarDocumentos();
      return true;
    }

    await registrarHistorialDocumento({
      documentoId: row.documentoEmpresaId,
      accion: "Versión archivada",
      detalle: `Se archivó la versión ${row.version || "1.0"} para trazabilidad histórica.`,
      version: row.version,
      archivoNombre: row.archivoNombre,
      archivoNombreOriginal: row.archivoNombreOriginal,
      archivoUrl: row.archivoUrl,
      archivoTipo: row.archivoTipo,
      archivoPeso: row.archivoPeso,
    });

    await actualizarDocumentoEmpresa(row.documentoEmpresaId, {
      nombre: row.nombre,
      categoria: row.categoria,
      tipo: row.tipo,
      estado: "En revisión",
      version: input.version.trim() || row.version || "1.0",
      archivoNombre: input.archivoNombre,
      archivoNombreOriginal: input.archivoNombreOriginal,
      archivoUrl: input.archivoUrl,
      archivoTipo: input.archivoTipo,
      archivoPeso: input.archivoPeso,
      tieneVencimiento: row.tieneVencimiento,
      fechaEmision: row.fechaEmision,
      fechaVencimiento: row.fechaVencimiento,
      observaciones: input.observaciones.trim() || row.observaciones,
      creadoPorEmail: row.subidoPorEmail ?? undefined,
      documentoRequeridoId: row.documentoRequeridoId,
    });

    await registrarHistorialDocumento({
      documentoId: row.documentoEmpresaId,
      accion: "Documento reemplazado",
      detalle:
        `Versión anterior: ${row.version || "1.0"}. ` +
        `Nueva versión: ${input.version.trim() || row.version || "1.0"}. ` +
        `Archivo anterior: ${row.archivoNombreOriginal || row.archivoNombre || "sin archivo"}. ` +
        `Archivo nuevo: ${input.archivoNombreOriginal}.`,
      version: input.version.trim() || row.version || "1.0",
      archivoNombre: input.archivoNombre,
      archivoNombreOriginal: input.archivoNombreOriginal,
      archivoUrl: input.archivoUrl,
      archivoTipo: input.archivoTipo,
      archivoPeso: input.archivoPeso,
    });

    await recargarDocumentos();
    return true;
  };

  const updateDocumentoMetadatos: UseDocumentosResult["updateDocumentoMetadatos"] = async (input) => {
    if (!input.documentoId) {
      await crearDocumentoEmpresa({
        nombre: input.nombre,
        categoria: input.categoria,
        tipo: input.tipo,
        estado: input.estado,
        version: input.version,
        archivoNombre: input.archivoNombre,
        archivoUrl: undefined,
        archivoTipo: undefined,
        archivoPeso: undefined,
        tieneVencimiento: input.tieneVencimiento,
        fechaEmision: input.fechaEmision,
        fechaVencimiento: input.fechaVencimiento,
        observaciones: input.observaciones,
        documentoRequeridoId: input.documentoRequeridoId,
      });
      await recargarDocumentos();
      return true;
    }

    await actualizarDocumentoEmpresa(input.documentoId, {
      nombre: input.nombre,
      categoria: input.categoria,
      tipo: input.tipo,
      estado: input.estado,
      version: input.version,
      archivoNombre: input.archivoNombre,
      archivoUrl: undefined,
      archivoTipo: undefined,
      archivoPeso: undefined,
      tieneVencimiento: input.tieneVencimiento,
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento,
      observaciones: input.observaciones,
      documentoRequeridoId: input.documentoRequeridoId,
    });

    await recargarDocumentos();
    return true;
  };

  const marcarDocumentoNoAplica: UseDocumentosResult["marcarDocumentoNoAplica"] = async (documentoId, documentoRequeridoId, base) => {
    if (!documentoId) {
      await crearDocumentoEmpresa({
        nombre: base.nombre,
        categoria: base.categoria,
        tipo: base.tipo,
        estado: "No aplica",
        version: base.version || "1.0",
        archivoNombre: base.ultimoArchivo || undefined,
        archivoUrl: base.archivoUrl,
        archivoTipo: base.archivoTipo,
        archivoPeso: base.archivoPeso,
        tieneVencimiento: base.tieneVencimiento,
        fechaEmision: base.fechaEmision,
        fechaVencimiento: base.fechaVencimiento,
        observaciones: base.observaciones,
        creadoPorEmail: base.subidoPorEmail ?? undefined,
        documentoRequeridoId,
      });
      await recargarDocumentos();
      return true;
    }

    await actualizarDocumentoEmpresa(documentoId, {
      nombre: base.nombre,
      categoria: base.categoria,
      tipo: base.tipo,
      estado: "No aplica",
      version: base.version || "1.0",
      archivoNombre: base.ultimoArchivo || undefined,
      archivoUrl: base.archivoUrl,
      archivoTipo: base.archivoTipo,
      archivoPeso: base.archivoPeso,
      tieneVencimiento: base.tieneVencimiento,
      fechaEmision: base.fechaEmision,
      fechaVencimiento: base.fechaVencimiento,
      observaciones: base.observaciones,
      creadoPorEmail: base.subidoPorEmail ?? undefined,
      documentoRequeridoId,
    });

    await registrarHistorialDocumento({
      documentoId,
      accion: "Marcado como no aplica",
      detalle: "Documento excluido del control por criterio corporativo",
    });

    await recargarDocumentos();
    return true;
  };

  const marcarDocumentoAplica: UseDocumentosResult["marcarDocumentoAplica"] = async (documentoId, documentoRequeridoId, base) => {
    if (!documentoId) return false;

    await actualizarDocumentoEmpresa(documentoId, {
      nombre: base.nombre,
      categoria: base.categoria,
      tipo: base.tipo,
      estado: "Pendiente de carga",
      version: base.version || "1.0",
      archivoNombre: base.ultimoArchivo || undefined,
      archivoUrl: base.archivoUrl,
      archivoTipo: base.archivoTipo,
      archivoPeso: base.archivoPeso,
      tieneVencimiento: base.tieneVencimiento,
      fechaEmision: base.fechaEmision,
      fechaVencimiento: base.fechaVencimiento,
      observaciones: base.observaciones,
      creadoPorEmail: base.subidoPorEmail ?? undefined,
      documentoRequeridoId,
    });

    await registrarHistorialDocumento({
      documentoId,
      accion: "Reactivado",
      detalle: "Documento reactivado para control documental",
    });

    await recargarDocumentos();
    return true;
  };

  const restaurarDocumentoVersion: UseDocumentosResult["restaurarDocumentoVersion"] = async (documentoId, historialId) => {
    await restaurarDocumentoVersionAction({ documentoId, historialId });
    await recargarDocumentos();
    return true;
  };

  return {
    usuarioActual,
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
    marcarDocumentoAplica,
    restaurarDocumentoVersion,
    recargarDocumentos,
  };
}
