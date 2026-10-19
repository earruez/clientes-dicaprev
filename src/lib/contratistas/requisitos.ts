export type CategoriaContratista = "empresa" | "trabajador" | "vehiculo" | "equipo";

export type RequisitoModelo = {
  clave: string;
  nombre: string;
  categoria: CategoriaContratista;
  obligatorio: boolean;
};

export const REQUISITOS_EMPRESA: RequisitoModelo[] = [
  { clave: "afiliacion", nombre: "Certificado de afiliación al organismo administrador Ley 16.744", categoria: "empresa", obligatorio: true },
  { clave: "cotizacion", nombre: "Certificado de cotizaciones del seguro de accidentes del trabajo", categoria: "empresa", obligatorio: true },
  { clave: "f301", nombre: "Certificado de cumplimiento laboral y previsional F30-1", categoria: "empresa", obligatorio: true },
  { clave: "reglamento", nombre: "Reglamento interno aplicable", categoria: "empresa", obligatorio: true },
  { clave: "miper", nombre: "Matriz de identificación de peligros y evaluación de riesgos", categoria: "empresa", obligatorio: true },
  { clave: "pts", nombre: "Procedimientos de trabajo seguro para la actividad", categoria: "empresa", obligatorio: true },
  { clave: "programa", nombre: "Programa de trabajo preventivo", categoria: "empresa", obligatorio: false },
  { clave: "siniestralidad", nombre: "Antecedentes de siniestralidad", categoria: "empresa", obligatorio: false },
  { clave: "recepcion-reglamento", nombre: "Recepción del Reglamento Especial de contratistas", categoria: "empresa", obligatorio: false },
];

export const REQUISITOS_RECURSO: Record<Exclude<CategoriaContratista, "empresa">, RequisitoModelo[]> = {
  trabajador: [
    { clave: "contrato", nombre: "Contrato o acreditación de vínculo laboral", categoria: "trabajador", obligatorio: true },
    { clave: "irl", nombre: "Información de riesgos laborales (IRL)", categoria: "trabajador", obligatorio: true },
    { clave: "epp", nombre: "Registro de entrega de elementos de protección personal", categoria: "trabajador", obligatorio: true },
    { clave: "capacitaciones", nombre: "Capacitaciones exigidas para el cargo", categoria: "trabajador", obligatorio: true },
  ],
  vehiculo: [
    { clave: "padron", nombre: "Padrón o certificado de inscripción", categoria: "vehiculo", obligatorio: true },
    { clave: "soap", nombre: "SOAP", categoria: "vehiculo", obligatorio: true },
    { clave: "permiso", nombre: "Permiso de circulación", categoria: "vehiculo", obligatorio: true },
    { clave: "revision", nombre: "Revisión técnica", categoria: "vehiculo", obligatorio: true },
    { clave: "gases", nombre: "Certificado de emisiones contaminantes", categoria: "vehiculo", obligatorio: true },
  ],
  equipo: [
    { clave: "mantencion", nombre: "Certificado o registro de mantención del equipo", categoria: "equipo", obligatorio: true },
    { clave: "operador", nombre: "Autorización y competencia del operador", categoria: "equipo", obligatorio: true },
  ],
};

/** Vencimiento máximo según la pauta de cada mandante (no como plazo legal general). */
export function vencimientoMaximoPorMeses(
  emision: Date | string | null | undefined, vigenciaMeses: number | null | undefined,
): Date | null {
  if (!emision || !vigenciaMeses || vigenciaMeses <= 0) return null;
  const f = new Date(emision);
  if (Number.isNaN(f.getTime())) return null;
  const target = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + vigenciaMeses, 1, 12));
  const ultimo = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(f.getUTCDate(), ultimo));
  return target;
}

export function vencimientoEfectivoRequisito(
  vencimiento: Date | string | null | undefined,
  emision?: Date | string | null, vigenciaMeses?: number | null,
): Date | null {
  const informado = vencimiento ? new Date(vencimiento) : null;
  const limite = vencimientoMaximoPorMeses(emision, vigenciaMeses);
  if (informado && !Number.isNaN(informado.getTime()) && limite) {
    return informado.getTime() < limite.getTime() ? informado : limite;
  }
  return limite || (informado && !Number.isNaN(informado.getTime()) ? informado : null);
}

export function estadoEfectivo(
  estado: string, fechaVencimiento: Date | string | null,
  fechaEmision?: Date | string | null, vigenciaMeses?: number | null,
): string {
  // Un documento previamente aprobado sin fecha de entrega no acredita un límite de antigüedad.
  if (estado === "aprobado" && vigenciaMeses && !fechaEmision) return "vencido";
  const efectiva = vencimientoEfectivoRequisito(fechaVencimiento, fechaEmision, vigenciaMeses);
  if (efectiva && !["observado", "rechazado"].includes(estado)) {
    const vence = efectiva.toISOString().slice(0, 10);
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    if (vence < hoy) return "vencido";
  }
  return estado;
}

/** Permite desplegar el código antes de activar la migración en la base objetivo. */
export function faltaMigracionContratistas(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "P2021" || code === "P2022";
}
