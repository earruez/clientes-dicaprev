import type { Hallazgo, EstadoHallazgo } from "@/app/dicaprev/cumplimiento/types";

export type PeriodicidadInformeHallazgos = "diario" | "semanal" | "mensual";
export type TipoInformeHallazgos = PeriodicidadInformeHallazgos | "seleccion";

export const ESTADOS_INFORME: Array<{ clave: EstadoHallazgo; nombre: string }> = [
  { clave: "abierto", nombre: "Abiertos" },
  { clave: "en_seguimiento", nombre: "En seguimiento" },
  { clave: "en_proceso", nombre: "En proceso" },
  { clave: "resuelto", nombre: "Resueltos" },
  { clave: "cerrado", nombre: "Cerrados" },
];

function isoUtc(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function leerIso(fecha: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha de referencia inválida.");
  const parsed = new Date(fecha + "T12:00:00Z");
  if (Number.isNaN(parsed.getTime()) || isoUtc(parsed) !== fecha) throw new Error("Fecha de referencia inválida.");
  return parsed;
}

/** Fecha local en Chile: no usar toISOString() para la fecha de creación. */
export function fechaChile(fecha: string | Date): string {
  const parsed = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(parsed);
  const n = (key: string) => parts.find((p) => p.type === key)?.value || "";
  return n("year") + "-" + n("month") + "-" + n("day");
}

export function rangoInformeHallazgos(tipo: PeriodicidadInformeHallazgos, referencia: string) {
  const fecha = leerIso(referencia);
  let inicio = fecha;
  let termino = fecha;
  if (tipo === "semanal") {
    const dia = (fecha.getUTCDay() + 6) % 7; // lunes a domingo
    inicio = new Date(fecha);
    inicio.setUTCDate(fecha.getUTCDate() - dia);
    termino = new Date(inicio);
    termino.setUTCDate(inicio.getUTCDate() + 6);
  } else if (tipo === "mensual") {
    inicio = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1, 12));
    termino = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0, 12));
  }
  const desde = isoUtc(inicio);
  const hasta = isoUtc(termino);
  return { desde, hasta, titulo: tipo === "diario" ? "Informe diario" : tipo === "semanal" ? "Informe semanal" : "Informe mensual" };
}

export function filtrarHallazgosInforme(hallazgos: Hallazgo[], tipo: TipoInformeHallazgos, referencia: string): Hallazgo[] {
  if (tipo === "seleccion") return [...hallazgos];
  const { desde, hasta } = rangoInformeHallazgos(tipo, referencia);
  return hallazgos.filter((h) => {
    const fecha = fechaChile(h.fechaCreacion);
    return fecha >= desde && fecha <= hasta;
  });
}

export function estaVencidoInforme(h: Hallazgo, hoy: string): boolean {
  return h.estado !== "cerrado" && h.estado !== "resuelto" &&
    Boolean(h.fechaCompromiso) && h.fechaCompromiso < hoy;
}

export function agruparHallazgosPorEstado(hallazgos: Hallazgo[]) {
  return ESTADOS_INFORME.map((estado) => ({
    ...estado,
    hallazgos: hallazgos.filter((h) => h.estado === estado.clave),
  }));
}
