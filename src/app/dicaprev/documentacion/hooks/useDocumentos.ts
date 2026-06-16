"use client";

import { useEffect, useMemo, useState } from "react";
import { calcularMetricasDocumentos, calcularVigenciaDocumento } from "@/lib/documentacion/cumplimiento-documento";
import {
  actualizarDocumentoEmpresa,
  crearDocumentoEmpresa,
  enviarDocumentoEmpresaAFirma,
  firmarDocumentoEmpresa,
  generarInformeDocumentalEmpresa,
  getContextoFijoDocumentacion,
  getResumenAlertasDocumentalesEmpresa,
  registrarHistorialDocumento,
  restaurarDocumentoVersion as restaurarDocumentoVersionAction,
  validarDocumentoEmpresa,
  type DocumentoEmpresaInput,
  type InformeDocumentalEmpresa,
  type ResumenAlertasDocumentales,
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
  dotacion: number;
  documentos: DocumentoMatrizRow[];
  tabActiva: TabDocumentacion;
  setTabActiva: (tab: TabDocumentacion) => void;
  filtros: DocumentosFiltros;
  setFiltros: (f: DocumentosFiltros) => void;
  filtrados: DocumentoMatrizRow[];
  historialGlobal: Array<HistorialDocumento & { documentoId: string; documentoNombre: string; categoria: CategoriaDocumento }>;
  kpis: {
    total: number;
    aplicables: number;
    vigentes: number;
    porVencer: number;
    vencidos: number;
    pendientes: number;
    pendientesCarga: number;
    noAplica: number;
    cumplimientoPct: number;
    actualizadosMes: number;
  };
  alertasResumen: ResumenAlertasDocumentales;
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
  validarDocumento: (documentoId: string, contenidoEditable?: string) => Promise<{ ok: boolean; error?: string }>;
  enviarDocumentoAFirma: (documentoId: string) => Promise<{ ok: boolean; error?: string }>;
  firmarDocumento: (documentoId: string) => Promise<{ ok: boolean; error?: string }>;
  descargarInformeDocumental: () => Promise<InformeDocumentalEmpresa>;
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

const RESUMEN_ALERTAS_POR_DEFECTO: ResumenAlertasDocumentales = {
  critica: 0,
  alta: 0,
  media: 0,
  baja: 0,
  total: 0,
};

function vigenciaDocumento(doc: DocumentoMatrizRow) {
  if (doc.estado === "No aplica") return "no_aplica" as const;
  if (doc.estado === "Pendiente de carga") return "pendiente" as const;
  return calcularVigenciaDocumento(doc, 1);
}

export function useDocumentos(): UseDocumentosResult {
  const [documentos, setDocumentos] = useState<DocumentoMatrizRow[]>([]);
  const [tabActiva, setTabActiva] = useState<TabDocumentacion>("todos");
  const [filtros, setFiltros] = useState<DocumentosFiltros>(FILTROS_POR_DEFECTO);
  const [usuarioActual, setUsuarioActual] = useState(USUARIO_POR_DEFECTO);
  const [dotacion, setDotacion] = useState(0);
  const [alertasResumen, setAlertasResumen] = useState<ResumenAlertasDocumentales>(RESUMEN_ALERTAS_POR_DEFECTO);

  const cargarMatriz = async () => {
    const response = await fetch("/api/dicaprev/documentacion/matriz", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("No se pudo cargar la matriz documental");
    }
    const payload = (await response.json()) as {
      usuario: { nombre: string; email: string } | null;
      dotacion?: number;
      documentos: DocumentoMatrizRow[];
    };

    setUsuarioActual({
      nombre: payload.usuario?.nombre ?? USUARIO_POR_DEFECTO.nombre,
      email: payload.usuario?.email ?? USUARIO_POR_DEFECTO.email,
    });
    setDotacion(payload.dotacion ?? 0);
    setDocumentos(payload.documentos);
  };

  const cargarAlertasResumen = async () => {
    const contexto = await getContextoFijoDocumentacion();
    const resumen = await getResumenAlertasDocumentalesEmpresa({ empresaId: contexto.empresaId });
    setAlertasResumen(resumen);
  };

  const recargarDocumentos = async () => {
    await Promise.all([cargarMatriz(), cargarAlertasResumen()]);
  };

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([cargarMatriz(), cargarAlertasResumen()]);
      } catch {
        setUsuarioActual(USUARIO_POR_DEFECTO);
        setDotacion(0);
        setDocumentos([]);
        setAlertasResumen(RESUMEN_ALERTAS_POR_DEFECTO);
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

  const kpis = useMemo(() => calcularMetricasDocumentos(documentos), [documentos]);

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

  const validarDocumento: UseDocumentosResult["validarDocumento"] = async (documentoId, contenidoEditable) => {
    const resultado = await validarDocumentoEmpresa({ documentoId, contenidoEditable });
    if (resultado.ok) {
      await recargarDocumentos();
    }
    return resultado;
  };

  const enviarDocumentoAFirma: UseDocumentosResult["enviarDocumentoAFirma"] = async (documentoId) => {
    const resultado = await enviarDocumentoEmpresaAFirma({ documentoId });
    if (resultado.ok) {
      await recargarDocumentos();
    }
    return resultado;
  };

  const firmarDocumento: UseDocumentosResult["firmarDocumento"] = async (documentoId) => {
    const resultado = await firmarDocumentoEmpresa({ documentoId });
    if (resultado.ok) {
      await recargarDocumentos();
    }
    return resultado;
  };

  const descargarInformeDocumental: UseDocumentosResult["descargarInformeDocumental"] = async () => {
    const contexto = await getContextoFijoDocumentacion();
    return generarInformeDocumentalEmpresa({ empresaId: contexto.empresaId });
  };

  return {
    usuarioActual,
    dotacion,
    documentos,
    tabActiva,
    setTabActiva,
    filtros,
    setFiltros,
    filtrados,
    historialGlobal,
    kpis,
    alertasResumen,
    addDocumento,
    replaceDocumentoArchivo,
    updateDocumentoMetadatos,
    marcarDocumentoNoAplica,
    marcarDocumentoAplica,
    restaurarDocumentoVersion,
    validarDocumento,
    enviarDocumentoAFirma,
    firmarDocumento,
    descargarInformeDocumental,
    recargarDocumentos,
  };
}
