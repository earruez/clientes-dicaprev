import { DIAS_ATENCION_INSTALACION, PermisoRiesgo, PermisoTipoPlazo } from "../types";

/**
 * Calcula la fecha estimada de resolución basada en:
 * - Fecha de presentación
 * - Plazo en días
 * - Tipo de plazo (hábiles o corridos)
 */
export function calcularFechaEstimadaResolucion(
  fechaPresentacion: Date,
  plazoDias: number | null | undefined,
  tipoPlazo: PermisoTipoPlazo | null | undefined,
): Date | null {
  if (!fechaPresentacion || !plazoDias || !tipoPlazo || tipoPlazo === "NO_INFORMADO") {
    return null;
  }

  const fecha = new Date(fechaPresentacion);

  if (tipoPlazo === "CORRIDOS") {
    // Sumar días corridos simples
    fecha.setDate(fecha.getDate() + plazoDias);
    return fecha;
  }

  if (tipoPlazo === "HABILES") {
    // Sumar solo días hábiles (lunes-viernes)
    let diasAgregados = 0;

    while (diasAgregados < plazoDias) {
      fecha.setDate(fecha.getDate() + 1);
      const diaSemana = fecha.getDay();

      // 0 = domingo, 6 = sábado
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAgregados++;
      }
    }

    return fecha;
  }

  return null;
}

/**
 * Calcula el nivel de riesgo comparando:
 * - Fecha estimada de resolución
 * - Fecha de instalación
 * - Disponibilidad de datos
 */
export function calcularNivelRiesgo(
  fechaInstalacion: Date,
  fechaEstimadaResolucion: Date | null | undefined,
  plazoDias: number | null | undefined,
  tipoPlazo: PermisoTipoPlazo | null | undefined,
): PermisoRiesgo {
  // Si no hay plazo ni fecha estimada, no hay datos
  if (!plazoDias || !tipoPlazo || tipoPlazo === "NO_INFORMADO" || !fechaEstimadaResolucion) {
    return "SIN_DATOS";
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const instalacion = new Date(fechaInstalacion);
  instalacion.setHours(0, 0, 0, 0);

  const estimada = new Date(fechaEstimadaResolucion);
  estimada.setHours(0, 0, 0, 0);

  // Si la fecha estimada es posterior a la instalación, está en riesgo
  if (estimada > instalacion) {
    return "EN_RIESGO";
  }

  // Calcular diferencia en días
  const diferenciaDias = Math.floor(
    (instalacion.getTime() - estimada.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Si está muy próximo, requiere atención
  if (diferenciaDias <= DIAS_ATENCION_INSTALACION) {
    return "ATENCION";
  }

  // Si está dentro del plazo
  return "EN_PLAZO";
}

/**
 * Formatea una fecha para mostrar en la UI
 */
export function formatearFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";

  const d = new Date(fecha);
  return d.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Formatea un tiempo relativo (ej: "Hace 2 días")
 */
export function tiempoRelativo(fecha: Date | string | null | undefined): string {
  if (!fecha) return "Sin movimiento";

  const d = new Date(fecha);
  const ahora = new Date();
  const diferencia = ahora.getTime() - d.getTime();
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
  if (dias < 365) return `Hace ${Math.floor(dias / 30)} meses`;

  return formatearFecha(fecha);
}

/**
 * Convierte un objeto a query string
 */
export function construirQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return entries.length > 0 ? "?" + entries.join("&") : "";
}

/**
 * Parsea query params desde una URL
 */
export function parseQueryParams(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!queryString) return params;

  const search = queryString.startsWith("?") ? queryString.slice(1) : queryString;

  search.split("&").forEach((param) => {
    const [key, value] = param.split("=");
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
    }
  });

  return params;
}
