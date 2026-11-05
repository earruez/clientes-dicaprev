import { documentoContratistaPendienteValidacion, estadoVisibleRequisitoContratista, vigenciaMesesRequisito } from "@/lib/contratistas/requisitos";

export type RequisitoInforme = {
  nombre: string;
  categoria: string;
  recursoId: string | null;
  obligatorio: boolean;
  estado: string;
  archivoNombre: string | null;
  archivoOriginal?: string | null;
  fechaEmision: Date | string | null;
  fechaVencimiento: Date | string | null;
  vigenciaMeses: number | null;
  observacionRevision?: string | null;
};

export type EstadoAcreditacionDocumental = "Conforme documentalmente" | "Con observaciones" | "Pendiente de validación" | "Documentación incompleta";

export function estadoInformeDocumento(d: RequisitoInforme): string {
  return estadoVisibleRequisitoContratista(
    d.estado, d.archivoNombre, d.fechaVencimiento, d.fechaEmision, vigenciaMesesRequisito(d),
  );
}

export function resumenDocumentosInforme(docs: readonly RequisitoInforme[]) {
  const obligatorios = docs.filter((d) => d.obligatorio);
  return {
    total: docs.length,
    cargados: docs.filter((d) => !!d.archivoNombre).length,
    aprobados: docs.filter((d) => !!d.archivoNombre && estadoInformeDocumento(d) === "aprobado").length,
    porValidar: docs.filter((d) => documentoContratistaPendienteValidacion(d.estado, d.archivoNombre)).length,
    observados: docs.filter((d) => ["observado", "rechazado"].includes(d.estado)).length,
    vencidos: docs.filter((d) => estadoInformeDocumento(d) === "vencido").length,
    sinArchivo: docs.filter((d) => !d.archivoNombre).length,
    obligatorios: obligatorios.length,
    obligatoriosAprobados: obligatorios.filter((d) => !!d.archivoNombre && estadoInformeDocumento(d) === "aprobado").length,
  };
}

/** Estado documental, no autorización de ingreso a obra. Incluye requisitos corporativos exigibles. */
export function estadoAcreditacionDocumental(docs: readonly RequisitoInforme[]): EstadoAcreditacionDocumental {
  const obligatorios = docs.filter((d) => d.obligatorio);
  if (!obligatorios.length) return "Documentación incompleta";
  if (obligatorios.every((d) => d.archivoNombre && estadoInformeDocumento(d) === "aprobado")) return "Conforme documentalmente";
  if (obligatorios.some((d) => d.estado === "observado" || d.estado === "rechazado" || estadoInformeDocumento(d) === "vencido")) {
    return "Con observaciones";
  }
  if (obligatorios.some((d) => !d.archivoNombre)) return "Documentación incompleta";
  return "Pendiente de validación";
}

export function etiquetaInformeDocumento(d: RequisitoInforme) {
  const estado = estadoInformeDocumento(d);
  if (!d.archivoNombre) return "Sin cargar";
  return {
    aprobado: "Aprobado", en_revision: "Por validar", pendiente: "Por validar",
    observado: "Observado", rechazado: "Rechazado", vencido: "Vencido",
  }[estado] || "Pendiente";
}
