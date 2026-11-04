/** El estado operativo vive en el historial, sin alterar la procedencia de la evidencia.
 * El marcador de origen se mantiene solo como fallback de registros históricos.
 */
export const ORIGEN_MEDIDA_EN_PROCESO = "hallazgo_medida_en_proceso";

export type EstadoMedidaHallazgo = "pendiente" | "en_proceso" | "completada" | "descartada";

export function estadoMedidaHallazgo(
  estado: string | null | undefined,
  origen?: string | null,
  ultimoEstadoOperativo?: string | null,
): EstadoMedidaHallazgo {
  const valor = (estado || "").trim().toLowerCase();
  if (valor === "valida" || valor === "completada" || valor === "cerrada") return "completada";
  if (valor === "rechazada" || valor === "descartada") return "descartada";
  if (ultimoEstadoOperativo === "en_proceso" || ultimoEstadoOperativo === "pendiente") return ultimoEstadoOperativo;
  if (origen === ORIGEN_MEDIDA_EN_PROCESO || valor === "en_proceso") return "en_proceso";
  return "pendiente";
}

export function requisitosCierreMedidas(
  estados: EstadoMedidaHallazgo[],
  evidenciaCierre: boolean,
): { permitido: boolean; mensaje: string } {
  if (!estados.length) {
    return { permitido: false, mensaje: "Este hallazgo no tiene medidas correctivas registradas. Agrega al menos una medida y márcala como completada para poder cerrar." };
  }
  const pendientes = estados.filter((estado) => estado === "pendiente").length;
  const enProceso = estados.filter((estado) => estado === "en_proceso").length;
  if (pendientes || enProceso) {
    const partes = [
      pendientes ? pendientes + " pendiente" + (pendientes === 1 ? "" : "s") : "",
      enProceso ? enProceso + " en proceso" : "",
    ].filter(Boolean).join(" y ");
    return {
      permitido: false,
      mensaje: "Para cerrar el hallazgo, completa o descarta justificadamente todas las medidas correctivas pendientes. Quedan " + partes + ".",
    };
  }
  if (!estados.some((estado) => estado === "completada")) {
    return { permitido: false, mensaje: "Al menos una medida correctiva debe estar completada para cerrar el hallazgo." };
  }
  if (!evidenciaCierre) {
    return { permitido: false, mensaje: "Las medidas están gestionadas. Ahora registra una evidencia o escribe un comentario de cierre." };
  }
  return { permitido: true, mensaje: "" };
}
