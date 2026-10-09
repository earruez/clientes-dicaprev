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

export function estadoEfectivo(estado: string, fechaVencimiento: Date | string | null): string {
  if (fechaVencimiento && !["observado", "rechazado"].includes(estado)) {
    const vence = new Date(fechaVencimiento).toISOString().slice(0, 10);
    const hoy = new Date().toISOString().slice(0, 10);
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
