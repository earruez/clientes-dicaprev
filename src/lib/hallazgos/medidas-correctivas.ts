/**
 * Persistencia compatible con EvidenciaCumplimiento: estado (enum actual)
 * + origen para indicar "en proceso" sin migración ni pérdida de historial.
 */
export const ORIGEN_MEDIDA_EN_PROCESO = "hallazgo_medida_en_proceso";

export type EstadoMedidaHallazgo = "pendiente" | "en_proceso" | "completada" | "descartada";

export function estadoMedidaHallazgo(estado: string | null | undefined, origen?: string | null): EstadoMedidaHallazgo {
  const valor = (estado || "").trim().toLowerCase();
  if (valor === "valida" || valor === "completada" || valor === "cerrada") return "completada";
  if (valor === "rechazada" || valor === "descartada") return "descartada";
  if (origen === ORIGEN_MEDIDA_EN_PROCESO || valor === "en_proceso") return "en_proceso";
  return "pendiente";
}

export function requisitosCierreMedidas(
  estados: EstadoMedidaHallazgo[],
  evidenciaCierre: boolean,
): { permitido: boolean; mensaje: string } {
  if (!estados.length) {
    return { permitido: false, mensaje: "Registra al menos una medida correctiva antes de cerrar el hallazgo." };
  }
  if (estados.some((estado) => estado === "pendiente" || estado === "en_proceso")) {
    return { permitido: false, mensaje: "Para cerrar el hallazgo, completa o descarta justificadamente todas las medidas correctivas pendientes." };
  }
  if (!estados.some((estado) => estado === "completada")) {
    return { permitido: false, mensaje: "Al menos una medida correctiva debe estar completada para cerrar el hallazgo." };
  }
  if (!evidenciaCierre) {
    return { permitido: false, mensaje: "Registra una evidencia o un comentario de cierre." };
  }
  return { permitido: true, mensaje: "" };
}
