/**
 * Base legal: DS 44, art. 16 y Guía Técnica Res. Ex. 1117/2026.
 * Curso de mínimo 8 horas, con periodicidad que no exceda dos años.
 * No presupone que cada charla individual cumple por sí sola la obligación.
 */
export const DS44_CAPACITACION_BASE = {
  codigo: "ds44_art16",
  nombre: "Capacitación preventiva en riesgos laborales · Art. 16 DS 44",
  horasMinimas: 8,
  periodicidadMaxMeses: 24,
  referencia: "DS 44, artículo 16 · Resolución Exenta 1117/2026",
} as const;

export const DS44_CONTENIDOS = [
  { codigo: "riesgos", nombre: "Factores de riesgo del lugar y de las tareas" },
  { codigo: "salud", nombre: "Efectos en la salud y enfermedades profesionales" },
  { codigo: "medidas", nombre: "Medidas preventivas y controles" },
  { codigo: "seguro", nombre: "Cobertura, prestaciones y acceso al seguro Ley 16.744" },
  { codigo: "emergencias", nombre: "Plan de emergencias, catástrofes y desastres" },
  { codigo: "senalizacion", nombre: "Señalética y señalización de seguridad" },
  { codigo: "incendios", nombre: "Prevención y control de incendios, incluyendo extintores" },
] as const;

export const CAPACITACIONES_SEGUN_RIESGO = [
  { codigo: "epp", nombre: "Uso, cuidado y mantención de EPP" },
  { codigo: "altura", nombre: "Trabajo en altura y prevención de caídas" },
  { codigo: "maquinaria", nombre: "Operación segura de máquinas y herramientas" },
  { codigo: "sustancias", nombre: "Sustancias peligrosas y hojas de datos de seguridad" },
  { codigo: "electricidad", nombre: "Riesgo eléctrico y trabajo seguro" },
  { codigo: "ergonomia", nombre: "Manejo manual de cargas y ergonomía" },
  { codigo: "incendios", nombre: "Manejo y uso de extintores" },
  { codigo: "procedimientos", nombre: "Difusión de procedimientos de trabajo seguro" },
] as const;

export const TIPOS_ACTIVIDAD_CONTRATISTA = [
  { value: "charla", label: "Charla" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "difusion", label: "Difusión" },
  { value: "taller", label: "Taller" },
] as const;

export const TEMAS_ACTIVIDAD_CONTRATISTA = [
  ...DS44_CONTENIDOS.map((i) => ({ value: i.codigo, label: i.nombre })),
  ...CAPACITACIONES_SEGUN_RIESGO.filter((i) => i.codigo !== "incendios").map((i) => ({ value: i.codigo, label: i.nombre })),
  { value: "otro", label: "Otro tema (especificar)" },
] as const;

const tiposValidos = new Set<string>(TIPOS_ACTIVIDAD_CONTRATISTA.map((i) => i.value));
const temasValidos = new Set<string>(TEMAS_ACTIVIDAD_CONTRATISTA.map((i) => i.value));
const contenidosValidos = new Set<string>(DS44_CONTENIDOS.map((i) => i.codigo));

export type ActividadFormativaEntrada = {
  tipo: string; temaCodigo: string; titulo: string; fecha: string;
  duracionMinutos: number; relator: string; vinculadaCursoDs44: boolean;
  contenidosDs44: string[]; evaluacion: string;
};

export function validarActividadFormativa(i: ActividadFormativaEntrada): string | null {
  if (!tiposValidos.has(i.tipo)) return "Selecciona Charla, Capacitación, Difusión o Taller.";
  if (!temasValidos.has(i.temaCodigo)) return "Selecciona un tema de la lista.";
  if (i.titulo.trim().length < 4 || i.titulo.trim().length > 180) return "Ingresa un título de entre 4 y 180 caracteres.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.fecha)) return "Selecciona la fecha en que se realizó la actividad.";
  const fecha = new Date(i.fecha + "T12:00:00.000Z");
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0,10) !== i.fecha || fecha.getTime() > Date.now() + 86400000) {
    return "La fecha debe ser válida y no puede ser futura.";
  }
  if (!Number.isInteger(i.duracionMinutos) || i.duracionMinutos < 5 || i.duracionMinutos > 2880) {
    return "Indica una duración entre 5 minutos y 48 horas.";
  }
  if (i.relator.trim().length < 3 || i.relator.trim().length > 160) return "Indica el responsable o relator.";
  if (i.contenidosDs44.some((t) => !contenidosValidos.has(t))) return "Los contenidos DS 44 seleccionados no son válidos.";
  if (i.vinculadaCursoDs44 && i.contenidosDs44.length === 0) return "Selecciona al menos un contenido del artículo 16 para vincular la actividad al curso DS 44.";
  if (!["no_informada", "aprobada", "pendiente", "no_aplica"].includes(i.evaluacion)) return "Selecciona un estado de evaluación válido.";
  return null;
}

export function resumenCursoDs44(
  registros: ReadonlyArray<{
    vinculadaCursoDs44: boolean; duracionMinutos: number;
    contenidosDs44: string | null; estado: string; evaluacion: string; fecha: Date | string;
  }>,
  referencia = new Date(),
) {
  const limite = new Date(referencia);
  limite.setUTCFullYear(limite.getUTCFullYear() - 2);
  const acreditados = registros.filter((r) =>
    r.vinculadaCursoDs44 && r.estado === "validada" && r.evaluacion === "aprobada" &&
    new Date(r.fecha).getTime() >= limite.getTime(),
  );
  const totalMinutos = acreditados.reduce((n,r) => n + r.duracionMinutos,0);
  const contenidos = new Set(acreditados.flatMap(r => {
    try { return JSON.parse(r.contenidosDs44 || "[]") as string[]; } catch { return [] as string[]; }
  }));
  return {
    totalMinutos,
    horas: Math.round(totalMinutos / 60 * 10) / 10,
    contenidos: DS44_CONTENIDOS.map(i => ({ ...i, cubierto: contenidos.has(i.codigo) })),
    // La mandante siempre debe comprobar metodología, participación y evaluación.
    evidenciaSuficienteParaRevision: totalMinutos >= 480 && DS44_CONTENIDOS.every(i => contenidos.has(i.codigo)),
  };
}
