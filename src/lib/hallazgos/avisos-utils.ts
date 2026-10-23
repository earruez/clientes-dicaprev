/** Destinatarios de alertas de hallazgos: sin duplicar correos por rol. */
export type RolAvisoHallazgo = "responsable" | "creador" | "administrador";
export type DestinatarioAvisoHallazgo = { email: string; nombre: string; roles: RolAvisoHallazgo[] };

export function agruparDestinatariosHallazgo(
  candidatos: Array<{ email?: string | null; nombre?: string | null; rol: RolAvisoHallazgo }>,
): DestinatarioAvisoHallazgo[] {
  const destinatarios = new Map<string, DestinatarioAvisoHallazgo>();
  for (const candidato of candidatos) {
    const email = candidato.email?.trim().toLowerCase() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const actual = destinatarios.get(email);
    if (actual) {
      if (!actual.roles.includes(candidato.rol)) actual.roles.push(candidato.rol);
    } else {
      destinatarios.set(email, { email, nombre: candidato.nombre?.trim() || email, roles: [candidato.rol] });
    }
  }
  return [...destinatarios.values()];
}

export function fechaHoyChile(now: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const p = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value || "";
  return [p("year"), p("month"), p("day")].join("-");
}

export function fechaCompromisoHallazgo(fecha: Date): string {
  // Las fechas de compromiso se almacenan como fecha civil UTC (YYYY-MM-DD).
  return fecha.toISOString().slice(0, 10);
}

export function correspondeAvisarHallazgo(estado: string, fechaCompromiso: Date, hoy: string): boolean {
  return estado !== "cerrado" && fechaCompromisoHallazgo(fechaCompromiso) <= hoy;
}

export function fechaLegibleHallazgo(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return [dia, mes, ano].join("-");
}
