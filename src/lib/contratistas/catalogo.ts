import type { CategoriaContratista } from "./requisitos";

/**
 * El catálogo es orientativo: obligatoriedad legal y aplicabilidad dependen
 * del contrato, riesgos, dotación y requerimientos expresos de la mandante.
 */
export type AlcanceDocumento = "empresa" | "faena";
export type CatalogoContratistaItem = {
  clave: string;
  nombre: string;
  alcance: AlcanceDocumento;
  categoria: CategoriaContratista;
  grupo: string;
  obligatorio: boolean;
  requiereVencimiento: boolean;
  descripcion?: string;
};

export const CATALOGO_CONTRATISTAS: CatalogoContratistaItem[] = [
  { clave: "rut_electronico", nombre: "e-RUT / identificación tributaria de la empresa", alcance: "empresa", categoria: "empresa", grupo: "Identificación", obligatorio: false, requiereVencimiento: false },
  { clave: "inicio_actividades", nombre: "Inicio de actividades ante el SII", alcance: "empresa", categoria: "empresa", grupo: "Identificación", obligatorio: false, requiereVencimiento: false },
  { clave: "escritura", nombre: "Escritura de constitución o estatutos", alcance: "empresa", categoria: "empresa", grupo: "Legal", obligatorio: false, requiereVencimiento: false },
  { clave: "vigencia_sociedad", nombre: "Certificado de vigencia de la sociedad", alcance: "empresa", categoria: "empresa", grupo: "Legal", obligatorio: false, requiereVencimiento: true },
  { clave: "personeria", nombre: "Personería y facultades del representante legal", alcance: "empresa", categoria: "empresa", grupo: "Legal", obligatorio: false, requiereVencimiento: true },
  { clave: "afiliacion", nombre: "Afiliación al organismo administrador Ley 16.744", alcance: "empresa", categoria: "empresa", grupo: "Prevención", obligatorio: true, requiereVencimiento: true },
  { clave: "reglamento", nombre: "Reglamento interno aplicable", alcance: "empresa", categoria: "empresa", grupo: "Prevención", obligatorio: false, requiereVencimiento: false },
  { clave: "tasa_cotizacion", nombre: "Certificado de cotización del seguro Ley 16.744", alcance: "empresa", categoria: "empresa", grupo: "Prevención", obligatorio: false, requiereVencimiento: true },
  { clave: "siniestralidad", nombre: "Antecedentes de siniestralidad", alcance: "empresa", categoria: "empresa", grupo: "Prevención", obligatorio: false, requiereVencimiento: true },
  { clave: "certificado_deuda", nombre: "Certificado de deuda previsional", alcance: "empresa", categoria: "empresa", grupo: "Laboral", obligatorio: false, requiereVencimiento: true },
  { clave: "registro_empresa", nombre: "Inscripción o registro de contratista (si aplica)", alcance: "empresa", categoria: "empresa", grupo: "Legal", obligatorio: false, requiereVencimiento: true },
  { clave: "poliza_rc", nombre: "Póliza de responsabilidad civil", alcance: "empresa", categoria: "empresa", grupo: "Seguros", obligatorio: false, requiereVencimiento: true },
  { clave: "poliza_accidentes", nombre: "Seguro adicional de accidentes (si se exige)", alcance: "empresa", categoria: "empresa", grupo: "Seguros", obligatorio: false, requiereVencimiento: true },
  { clave: "f30", nombre: "Certificado de antecedentes laborales y previsionales F30", alcance: "faena", categoria: "empresa", grupo: "Laboral", obligatorio: false, requiereVencimiento: true },
  { clave: "f301", nombre: "Certificado F30-1 del período y contrato", alcance: "faena", categoria: "empresa", grupo: "Laboral", obligatorio: true, requiereVencimiento: true },
  { clave: "nomina", nombre: "Nómina de trabajadores asignados a la faena", alcance: "faena", categoria: "empresa", grupo: "Personal", obligatorio: true, requiereVencimiento: false },
  { clave: "contrato_servicios", nombre: "Contrato u orden de servicio con la mandante", alcance: "faena", categoria: "empresa", grupo: "Contrato", obligatorio: false, requiereVencimiento: true },
  { clave: "miper", nombre: "MIPER específica de actividades y riesgos de la faena", alcance: "faena", categoria: "empresa", grupo: "Prevención", obligatorio: true, requiereVencimiento: false },
  { clave: "pts", nombre: "Procedimientos de trabajo seguro específicos", alcance: "faena", categoria: "empresa", grupo: "Prevención", obligatorio: true, requiereVencimiento: false },
  { clave: "programa", nombre: "Programa de trabajo preventivo de la faena", alcance: "faena", categoria: "empresa", grupo: "Prevención", obligatorio: false, requiereVencimiento: false },
  { clave: "plan_emergencia", nombre: "Plan de respuesta ante emergencias de faena", alcance: "faena", categoria: "empresa", grupo: "Prevención", obligatorio: false, requiereVencimiento: false },
  { clave: "recepcion_reglamento", nombre: "Recepción del Reglamento Especial de Contratistas", alcance: "faena", categoria: "empresa", grupo: "Mandante", obligatorio: false, requiereVencimiento: false },
  { clave: "acta_inicio", nombre: "Acta de inicio o entrega de terreno", alcance: "faena", categoria: "empresa", grupo: "Mandante", obligatorio: false, requiereVencimiento: false },
  { clave: "permisos_trabajo", nombre: "Permisos de trabajo aplicables a la actividad", alcance: "faena", categoria: "empresa", grupo: "Permisos", obligatorio: false, requiereVencimiento: true },
  { clave: "hds", nombre: "Hojas de datos de seguridad (HDS) de sustancias usadas", alcance: "faena", categoria: "empresa", grupo: "Prevención", obligatorio: false, requiereVencimiento: true },
  { clave: "charla_inicio", nombre: "Inducción o charla de inicio específica de la faena", alcance: "faena", categoria: "empresa", grupo: "Personal", obligatorio: false, requiereVencimiento: false },
  { clave: "contrato_trabajador", nombre: "Contrato o acreditación de vínculo laboral", alcance: "faena", categoria: "trabajador", grupo: "Personal", obligatorio: true, requiereVencimiento: false },
  { clave: "irl", nombre: "Información de riesgos laborales (IRL)", alcance: "faena", categoria: "trabajador", grupo: "Prevención", obligatorio: true, requiereVencimiento: false },
  { clave: "epp", nombre: "Registro de entrega de EPP", alcance: "faena", categoria: "trabajador", grupo: "Prevención", obligatorio: true, requiereVencimiento: false },
  { clave: "capacitaciones", nombre: "Capacitaciones exigidas para el cargo", alcance: "faena", categoria: "trabajador", grupo: "Personal", obligatorio: true, requiereVencimiento: true },
  { clave: "examen_ocupacional", nombre: "Evaluación de salud ocupacional pertinente (cuando aplica)", alcance: "faena", categoria: "trabajador", grupo: "Salud ocupacional", obligatorio: false, requiereVencimiento: true },
  { clave: "licencia_conducir", nombre: "Licencia de conducir vigente (conductor asignado)", alcance: "faena", categoria: "trabajador", grupo: "Personal", obligatorio: false, requiereVencimiento: true },
  { clave: "padron", nombre: "Padrón o certificado de inscripción del vehículo", alcance: "faena", categoria: "vehiculo", grupo: "Vehículos", obligatorio: true, requiereVencimiento: false },
  { clave: "soap", nombre: "Seguro obligatorio SOAP", alcance: "faena", categoria: "vehiculo", grupo: "Vehículos", obligatorio: true, requiereVencimiento: true },
  { clave: "permiso", nombre: "Permiso de circulación", alcance: "faena", categoria: "vehiculo", grupo: "Vehículos", obligatorio: true, requiereVencimiento: true },
  { clave: "revision", nombre: "Revisión técnica", alcance: "faena", categoria: "vehiculo", grupo: "Vehículos", obligatorio: true, requiereVencimiento: true },
  { clave: "gases", nombre: "Certificado de emisiones contaminantes", alcance: "faena", categoria: "vehiculo", grupo: "Vehículos", obligatorio: true, requiereVencimiento: true },
  { clave: "autorizacion_vehiculo", nombre: "Autorización de ingreso del vehículo a faena", alcance: "faena", categoria: "vehiculo", grupo: "Mandante", obligatorio: false, requiereVencimiento: true },
  { clave: "mantencion", nombre: "Certificado o registro de mantención de equipo", alcance: "faena", categoria: "equipo", grupo: "Equipos", obligatorio: true, requiereVencimiento: true },
  { clave: "operador", nombre: "Competencia y autorización del operador", alcance: "faena", categoria: "equipo", grupo: "Equipos", obligatorio: true, requiereVencimiento: true },
  { clave: "certificado_equipo", nombre: "Certificado de inspección o pruebas del equipo", alcance: "faena", categoria: "equipo", grupo: "Equipos", obligatorio: false, requiereVencimiento: true },
];
export const CATALOGO_EMPRESA = CATALOGO_CONTRATISTAS.filter((x) => x.alcance === "empresa");
export const CATALOGO_FAENA = CATALOGO_CONTRATISTAS.filter((x) => x.alcance === "faena" && x.categoria === "empresa");
export function normalizarClaveDocumento(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0,80);
}
