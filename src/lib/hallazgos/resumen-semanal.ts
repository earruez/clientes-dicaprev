import { fechaCompromisoHallazgo, fechaHoyChile } from "@/lib/hallazgos/avisos-utils";

export type HallazgoResumenItem = {
  id: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  fechaCompromiso: Date;
  createdAt: Date;
  centro: string;
  responsable: string;
};

function sumarDias(iso: string, dias: number): string {
  const fecha = new Date(iso + "T12:00:00Z");
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Semana completa inmediatamente anterior, de lunes a domingo (Chile). */
export function periodoResumenSemanalHallazgos(ahora = new Date()) {
  const hoy = fechaHoyChile(ahora);
  const diaSemana = new Date(hoy + "T12:00:00Z").getUTCDay();
  const diasDesdeLunes = (diaSemana + 6) % 7;
  const lunesActual = sumarDias(hoy, -diasDesdeLunes);
  const desde = sumarDias(lunesActual, -7);
  const hasta = sumarDias(lunesActual, -1);
  return { desde, hasta, hoy, proximos7Dias: sumarDias(hoy, 7) };
}

const PENDIENTES = new Set(["abierto", "en_proceso", "en_seguimiento"]);
const FINALIZADOS = new Set(["cerrado", "resuelto"]);

export function resumirHallazgos(
  items: HallazgoResumenItem[],
  periodo: ReturnType<typeof periodoResumenSemanalHallazgos>,
) {
  const nuevos = items.filter((h) => {
    const fecha = fechaHoyChile(h.createdAt);
    return fecha >= periodo.desde && fecha <= periodo.hasta;
  });
  const abiertos = items.filter((h) => !FINALIZADOS.has(h.estado));
  const vencidos = abiertos.filter((h) => fechaCompromisoHallazgo(h.fechaCompromiso) < periodo.hoy);
  const proximos = abiertos.filter((h) => {
    const fecha = fechaCompromisoHallazgo(h.fechaCompromiso);
    return fecha >= periodo.hoy && fecha <= periodo.proximos7Dias;
  });
  const prioritarios = [...items].sort((a, b) => {
    const valor = (h: HallazgoResumenItem) =>
      (h.prioridad === "critica" ? 100 : h.prioridad === "alta" ? 50 : 0)
      + (PENDIENTES.has(h.estado) && fechaCompromisoHallazgo(h.fechaCompromiso) < periodo.hoy ? 30 : 0)
      + (fechaHoyChile(h.createdAt) >= periodo.desde ? 10 : 0);
    return valor(b) - valor(a) || a.fechaCompromiso.getTime() - b.fechaCompromiso.getTime();
  });
  return {
    nuevos: nuevos.length,
    abiertos: abiertos.length,
    vencidos: vencidos.length,
    proximos: proximos.length,
    destacados: prioritarios.slice(0, 12),
    total: items.length,
  };
}
