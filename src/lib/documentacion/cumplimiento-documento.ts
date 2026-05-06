import type { DocumentoMatrizRow, EstadoDocumento } from "@/app/dicaprev/documentacion/types";

const DAY_MS = 1000 * 60 * 60 * 24;

export type DocumentoCumplimientoBase = Pick<
  DocumentoMatrizRow,
  | "documentoEmpresaId"
  | "archivoNombre"
  | "archivoUrl"
  | "tieneVencimiento"
  | "fechaVencimiento"
  | "estado"
  | "aplicaDesdeTrabajadores"
  | "aplicaHastaTrabajadores"
  | "esAdicional"
>;

export function esDocumentoAplicable(documento: DocumentoCumplimientoBase, cantidadTrabajadores: number) {
  if (documento.esAdicional) return true;
  if (
    documento.aplicaDesdeTrabajadores !== null &&
    documento.aplicaDesdeTrabajadores !== undefined &&
    cantidadTrabajadores < documento.aplicaDesdeTrabajadores
  ) {
    return false;
  }

  if (
    documento.aplicaHastaTrabajadores !== null &&
    documento.aplicaHastaTrabajadores !== undefined &&
    cantidadTrabajadores > documento.aplicaHastaTrabajadores
  ) {
    return false;
  }

  return true;
}

export function calcularEstadoDocumento(
  documento: DocumentoCumplimientoBase,
  cantidadTrabajadores: number,
  today = new Date()
): EstadoDocumento {
  if (!esDocumentoAplicable(documento, cantidadTrabajadores)) {
    return "No aplica";
  }

  if (documento.estado === "No aplica") {
    return "No aplica";
  }

  const tieneArchivo = Boolean(documento.documentoEmpresaId && (documento.archivoUrl || documento.archivoNombre));
  if (!tieneArchivo) {
    return "Pendiente de carga";
  }

  if (!documento.tieneVencimiento || !documento.fechaVencimiento) {
    return "Vigente";
  }

  const dueDate = new Date(documento.fechaVencimiento);
  const baseToday = new Date(today);
  baseToday.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - baseToday.getTime()) / DAY_MS);

  if (diffDays < 0) {
    return "Vencido";
  }

  if (diffDays <= 30) {
    return "Por vencer";
  }

  return "Vigente";
}

export function calcularVigenciaDocumento(
  documento: DocumentoCumplimientoBase,
  cantidadTrabajadores: number,
  today = new Date()
) {
  const estado = calcularEstadoDocumento(documento, cantidadTrabajadores, today);

  if (estado === "No aplica") return "no_aplica" as const;
  if (estado === "Pendiente de carga") return "pendiente" as const;
  if (!documento.tieneVencimiento || !documento.fechaVencimiento) return "sin_vencimiento" as const;
  if (estado === "Vencido") return "vencido" as const;
  if (estado === "Por vencer") return "por_vencer" as const;
  return "vigente" as const;
}

export function calcularMetricasDocumentos(documentos: DocumentoMatrizRow[]) {
  const aplicables = documentos.filter((doc) => doc.esAplicable);
  const vigentes = aplicables.filter((doc) => doc.estado === "Vigente").length;
  const porVencer = aplicables.filter((doc) => doc.estado === "Por vencer").length;
  const vencidos = aplicables.filter((doc) => doc.estado === "Vencido").length;
  const pendientes = aplicables.filter((doc) => doc.estado === "Pendiente de carga").length;
  const noAplica = documentos.filter((doc) => doc.estado === "No aplica").length;
  const actualizadosMes = (() => {
    const now = new Date();
    return documentos.filter((doc) => {
      if (!doc.fechaActualizacion) return false;
      const date = new Date(doc.fechaActualizacion);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  })();

  return {
    total: documentos.length,
    aplicables: aplicables.length,
    vigentes,
    porVencer,
    vencidos,
    pendientes,
    noAplica,
    cumplimientoPct: aplicables.length > 0 ? Math.round((vigentes / aplicables.length) * 100) : 100,
    pendientesCarga: pendientes,
    actualizadosMes,
  };
}
