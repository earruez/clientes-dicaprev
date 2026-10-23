import type { EstadoHallazgo } from "@/app/dicaprev/cumplimiento/types";

export type TarjetaEstadoHallazgo = "todos" | "abierto" | "en_proceso" | "resuelto" | "cerrado";

/** Las tarjetas agrupan estados: "En proceso" incluye "En seguimiento". */
export function coincideTarjetaHallazgo(estado: EstadoHallazgo, tarjeta: TarjetaEstadoHallazgo): boolean {
  if (tarjeta === "todos") return true;
  if (tarjeta === "en_proceso") return estado === "en_proceso" || estado === "en_seguimiento";
  return estado === tarjeta;
}
