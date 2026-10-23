import type { EstadoHallazgo } from "@/app/dicaprev/cumplimiento/types";

export type TarjetaEstadoHallazgo = "todos" | "abierto" | "en_proceso" | "resuelto" | "cerrado";

/** Las tarjetas agrupan estados: "En proceso" incluye "En seguimiento". */
export function coincideTarjetaHallazgo(estado: EstadoHallazgo, tarjeta: TarjetaEstadoHallazgo): boolean {
  if (tarjeta === "todos") return true;
  if (tarjeta === "en_proceso") return estado === "en_proceso" || estado === "en_seguimiento";
  return estado === tarjeta;
}

/** La vista principal excluye cerrados sin borrarlos de la base de datos. */
export type FiltroEstadoHallazgo = EstadoHallazgo | "activos" | "todos";

export function coincideFiltroEstadoHallazgo(estado: EstadoHallazgo, filtro: FiltroEstadoHallazgo): boolean {
  if (filtro === "activos") return estado !== "cerrado";
  if (filtro === "todos") return true;
  return estado === filtro;
}
