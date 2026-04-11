/**
 * Company-type templates for the Empresa initial-configuration experience.
 *
 * Each template defines the Áreas and Cargos appropriate for that industry.
 * Once a template is chosen and applied, the data is persisted to localStorage
 * and the Areas/Cargos pages initialise from it on next mount.
 *
 * In production this will be replaced by a Firestore-driven onboarding flow.
 */

// ─── Shared types ──────────────────────────────────────────────────────── //

export type TipoEmpresa =
  | "Constructora"
  | "Productiva"
  | "Logística"
  | "Asesoría / Servicios"
  | "Comercial"
  | "Administrativa";

export type CargoTipo =
  | "Operativo"
  | "Supervisión"
  | "Administración"
  | "Prevención"
  | "Técnico";

export interface AreaDef {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
}

export interface CargoDef {
  id: string;
  nombre: string;
  codigo: string;
  areaId: string;
  tipo: CargoTipo;
  requiereDS44: boolean;
  riesgosClave: string;
  documentosBase: string[];
  capacitacionesBase: string[];
}

export interface PlantillaConfig {
  tipo: TipoEmpresa;
  label: string;
  descripcion: string;
  colorBg: string;
  colorText: string;
  colorBorder: string;
  areas: AreaDef[];
  cargos: CargoDef[];
}

// ─── Templates ─────────────────────────────────────────────────────────── //

const constructora: PlantillaConfig = {
  tipo: "Constructora",
  label: "Constructora",
  descripcion:
    "Obras civiles, construcción e infraestructura. Énfasis en DS44, trabajo en altura y operación de maquinaria.",
  colorBg: "bg-amber-50",
  colorText: "text-amber-700",
  colorBorder: "border-amber-200",
  areas: [
    { id: "a01", nombre: "Prevención de Riesgos",  codigo: "PRV-001", descripcion: "Gestión SST en todos los centros. Cumplimiento DS44, comités paritarios y capacitaciones." },
    { id: "a02", nombre: "Operaciones Terreno",    codigo: "OPR-001", descripcion: "Supervisión y ejecución de obras, coordinación de cuadrillas y contratistas." },
    { id: "a03", nombre: "Administración Central", codigo: "ADM-001", descripcion: "Gestión administrativa, soporte documental SST, coordinación de RRHH." },
    { id: "a04", nombre: "Control de Calidad",     codigo: "CAL-001", descripcion: "Verificación de especificaciones técnicas y aseguramiento de calidad." },
    { id: "a05", nombre: "Logística y Bodega",     codigo: "LOG-001", descripcion: "Transporte, almacenamiento y distribución de materiales e insumos." },
  ],
  cargos: [
    {
      id: "c01", nombre: "Prevencionista de Riesgos", codigo: "PRV-001", areaId: "a01",
      tipo: "Prevención", requiereDS44: true,
      riesgosClave: "Gestión de riesgos críticos, coordinación SST, control documental en terreno.",
      documentosBase: ["Contrato de trabajo", "Credencial prevención vigente", "Registro DS44"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo DS44 avanzado", "Primeros auxilios"],
    },
    {
      id: "c02", nombre: "Maestro de Obra", codigo: "MOP-010", areaId: "a02",
      tipo: "Supervisión", requiereDS44: true,
      riesgosClave: "Trabajo en altura, maquinaria pesada, izaje de cargas.",
      documentosBase: ["Contrato de trabajo", "Certificado técnico", "Registro DS44"],
      capacitacionesBase: ["Inducción SST empresa", "Trabajo en altura básico", "Operación de andamios"],
    },
    {
      id: "c03", nombre: "Electricista Industrial", codigo: "ELC-020", areaId: "a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Alta tensión, riesgo eléctrico, espacios confinados.",
      documentosBase: ["Contrato de trabajo", "Certificado SEC vigente", "Registro LOTO"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo eléctrico industrial", "Espacios confinados"],
    },
    {
      id: "c04", nombre: "Operador de Grúa", codigo: "GRU-005", areaId: "a02",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Izaje de cargas, trabajo en altura extrema.",
      documentosBase: ["Contrato de trabajo", "Licencia operador grúa vigente", "Certificado rigging"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de grúas", "Trabajo en altura crítico"],
    },
    {
      id: "c05", nombre: "Administrativo SST", codigo: "ADM-030", areaId: "a03",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Riesgo ergonómico, pantallas, sedentarismo.",
      documentosBase: ["Contrato de trabajo", "Anexo cargo", "Evaluación ergonómica"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "c06", nombre: "Inspector de Calidad", codigo: "CAL-007", areaId: "a04",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Herramientas manuales, exposición química leve.",
      documentosBase: ["Contrato de trabajo", "Certificado técnico calidad"],
      capacitacionesBase: ["Inducción SST empresa", "Uso EPP laboratorio"],
    },
  ],
};

const productiva: PlantillaConfig = {
  tipo: "Productiva",
  label: "Empresa Productiva",
  descripcion:
    "Industria manufacturera y producción. Énfasis en seguridad de maquinaria, riesgos químicos y operación de líneas de producción.",
  colorBg: "bg-indigo-50",
  colorText: "text-indigo-700",
  colorBorder: "border-indigo-200",
  areas: [
    { id: "pr_a01", nombre: "Producción",           codigo: "PRD-001", descripcion: "Ejecución y supervisión de líneas de producción y procesos industriales." },
    { id: "pr_a02", nombre: "Mantenimiento",         codigo: "MNT-001", descripcion: "Mantención preventiva y correctiva de equipos, maquinaria e instalaciones." },
    { id: "pr_a03", nombre: "Control de Calidad",    codigo: "CAL-001", descripcion: "Aseguramiento y control de calidad de materiales, procesos y productos." },
    { id: "pr_a04", nombre: "Seguridad Industrial",  codigo: "SEG-001", descripcion: "Gestión SST en procesos industriales. DS44, riesgos de maquinaria y químicos." },
    { id: "pr_a05", nombre: "RRHH y Administración", codigo: "RRH-001", descripcion: "Gestión del personal, administración general y soporte documental." },
    { id: "pr_a06", nombre: "Logística",             codigo: "LOG-001", descripcion: "Recepción, almacenamiento y despacho de materias primas y producto terminado." },
  ],
  cargos: [
    {
      id: "pr_c01", nombre: "Jefe de Producción", codigo: "PRD-001", areaId: "pr_a01",
      tipo: "Supervisión", requiereDS44: true,
      riesgosClave: "Supervisión de líneas industriales, maquinaria pesada, gestión de equipos.",
      documentosBase: ["Contrato de trabajo", "Certificado técnico", "Registro DS44"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo en seguridad", "Primeros auxilios"],
    },
    {
      id: "pr_c02", nombre: "Operador de Máquinas", codigo: "PRD-010", areaId: "pr_a01",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Operación de maquinaria pesada, atrapamiento, ruido industrial.",
      documentosBase: ["Contrato de trabajo", "Licencia operador vigente", "Examen psicosensotécnico"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de maquinaria", "LOTO"],
    },
    {
      id: "pr_c03", nombre: "Técnico de Mantenimiento", codigo: "MNT-001", areaId: "pr_a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo eléctrico, alta tensión, espacios confinados.",
      documentosBase: ["Contrato de trabajo", "Certificado mantención industrial", "Registro LOTO"],
      capacitacionesBase: ["Inducción SST empresa", "LOTO", "Espacios confinados"],
    },
    {
      id: "pr_c04", nombre: "Inspector de Calidad", codigo: "CAL-001", areaId: "pr_a03",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Herramientas manuales, exposición química, posturas forzadas.",
      documentosBase: ["Contrato de trabajo", "Certificado control de calidad"],
      capacitacionesBase: ["Inducción SST empresa", "Uso EPP laboratorio"],
    },
    {
      id: "pr_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "pr_a04",
      tipo: "Prevención", requiereDS44: true,
      riesgosClave: "Gestión de riesgos industriales, DS44, investigación de accidentes.",
      documentosBase: ["Contrato de trabajo", "Credencial prevención vigente", "Registro DS44"],
      capacitacionesBase: ["Inducción SST empresa", "DS44 avanzado", "Investigación de accidentes"],
    },
    {
      id: "pr_c06", nombre: "Bodeguero", codigo: "LOG-001", areaId: "pr_a06",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Manejo manual de cargas, orden, caídas al mismo nivel.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo manual de cargas"],
    },
  ],
};

const logistica: PlantillaConfig = {
  tipo: "Logística",
  label: "Empresa Logística",
  descripcion:
    "Transporte, distribución y almacenamiento. Énfasis en seguridad vial, manejo de cargas y DS44 para conductores.",
  colorBg: "bg-sky-50",
  colorText: "text-sky-700",
  colorBorder: "border-sky-200",
  areas: [
    { id: "lo_a01", nombre: "Flota y Transporte", codigo: "FLT-001", descripcion: "Operación y gestión de flota de vehículos y transporte de carga." },
    { id: "lo_a02", nombre: "Bodega y Almacén",   codigo: "BOD-001", descripcion: "Recepción, almacenamiento y despacho de mercancías." },
    { id: "lo_a03", nombre: "Distribución",       codigo: "DIS-001", descripcion: "Planificación y ejecución de rutas y entrega de pedidos." },
    { id: "lo_a04", nombre: "Seguridad Vial",     codigo: "SEG-001", descripcion: "Gestión de seguridad vial, DS44 para conductores y cumplimiento normativo." },
    { id: "lo_a05", nombre: "Administración",     codigo: "ADM-001", descripcion: "Gestión administrativa, facturación y soporte operacional." },
  ],
  cargos: [
    {
      id: "lo_c01", nombre: "Conductor de Camión", codigo: "FLT-001", areaId: "lo_a01",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Accidentes de tránsito, carga y descarga, fatiga.",
      documentosBase: ["Contrato de trabajo", "Licencia conducir vigente", "Examen psicosensotécnico", "Hoja de vida del conductor"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo defensivo", "Carga y descarga segura"],
    },
    {
      id: "lo_c02", nombre: "Jefe de Bodega", codigo: "BOD-001", areaId: "lo_a02",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Caídas, maquinaria de bodega, manejo de cargas.",
      documentosBase: ["Contrato de trabajo", "Certificado gestión de bodegas"],
      capacitacionesBase: ["Inducción SST empresa", "Operación de grúa horquilla"],
    },
    {
      id: "lo_c03", nombre: "Bodeguero", codigo: "BOD-010", areaId: "lo_a02",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Caídas al mismo nivel, manipulación manual de cargas.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo manual de cargas"],
    },
    {
      id: "lo_c04", nombre: "Despachador", codigo: "DIS-001", areaId: "lo_a03",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa"],
    },
    {
      id: "lo_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "lo_a04",
      tipo: "Prevención", requiereDS44: true,
      riesgosClave: "Gestión de seguridad vial, accidentes de tránsito, DS44.",
      documentosBase: ["Contrato de trabajo", "Credencial prevención vigente", "Registro DS44"],
      capacitacionesBase: ["Inducción SST empresa", "Seguridad vial avanzada", "DS44 conductores"],
    },
    {
      id: "lo_c06", nombre: "Administrativo", codigo: "ADM-001", areaId: "lo_a05",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Riesgo ergonómico, trabajo con pantallas.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
  ],
};

const servicios: PlantillaConfig = {
  tipo: "Asesoría / Servicios",
  label: "Asesoría / Servicios",
  descripcion:
    "Consultoría y servicios especializados. Foco en gestión de personas, riesgo ergonómico y documentación técnica.",
  colorBg: "bg-violet-50",
  colorText: "text-violet-700",
  colorBorder: "border-violet-200",
  areas: [
    { id: "sv_a01", nombre: "Consultoría y Proyectos", codigo: "CON-001", descripcion: "Desarrollo y ejecución de proyectos de asesoría para clientes." },
    { id: "sv_a02", nombre: "Seguridad y Prevención",  codigo: "SEG-001", descripcion: "Gestión SST para operaciones internas y clientes externos." },
    { id: "sv_a03", nombre: "Administración y RRHH",   codigo: "ADM-001", descripcion: "Soporte administrativo, gestión del personal y finanzas." },
    { id: "sv_a04", nombre: "Comercial y Desarrollo",  codigo: "COM-001", descripcion: "Generación de negocios, relaciones con clientes y desarrollo comercial." },
  ],
  cargos: [
    {
      id: "sv_c01", nombre: "Consultor SST", codigo: "CON-001", areaId: "sv_a01",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Trabajo en terreno con clientes, exposición a riesgos del rubro asesorado.",
      documentosBase: ["Contrato de trabajo", "Certificado habilitación SST", "Seguro de accidentes"],
      capacitacionesBase: ["Inducción SST empresa", "DS44 aplicado", "Gestión de riesgos por sector"],
    },
    {
      id: "sv_c02", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "sv_a02",
      tipo: "Prevención", requiereDS44: false,
      riesgosClave: "Visitas a terreno, exposición a riesgos de clientes.",
      documentosBase: ["Contrato de trabajo", "Credencial prevención vigente"],
      capacitacionesBase: ["Inducción SST empresa", "Auditorías SST"],
    },
    {
      id: "sv_c03", nombre: "Jefe de Proyectos", codigo: "CON-010", areaId: "sv_a01",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Riesgo psicosocial, carga de trabajo, pantallas.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Gestión del estrés laboral"],
    },
    {
      id: "sv_c04", nombre: "Asistente Administrativa", codigo: "ADM-001", areaId: "sv_a03",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas, riesgo ergonómico.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "sv_c05", nombre: "Ejecutivo Comercial", codigo: "COM-001", areaId: "sv_a04",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Accidentes en tránsito (visitas), carga de trabajo.",
      documentosBase: ["Contrato de trabajo", "Licencia conducir"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo defensivo"],
    },
  ],
};

const comercial: PlantillaConfig = {
  tipo: "Comercial",
  label: "Empresa Comercial",
  descripcion:
    "Comercio, distribución y ventas. Énfasis en servicio al cliente, manejo de mercancías y seguridad en puntos de venta.",
  colorBg: "bg-emerald-50",
  colorText: "text-emerald-700",
  colorBorder: "border-emerald-200",
  areas: [
    { id: "cm_a01", nombre: "Ventas y Atención",      codigo: "VEN-001", descripcion: "Gestión de ventas, atención al cliente y cumplimiento de metas comerciales." },
    { id: "cm_a02", nombre: "Bodega e Inventario",    codigo: "BOD-001", descripcion: "Recepción, almacenamiento y control de mercancías e inventario." },
    { id: "cm_a03", nombre: "Operaciones",            codigo: "OPR-001", descripcion: "Coordinación operativa de tiendas, puntos de venta y centros de distribución." },
    { id: "cm_a04", nombre: "Administración",         codigo: "ADM-001", descripcion: "Gestión administrativa, contabilidad, RRHH y soporte operacional." },
    { id: "cm_a05", nombre: "Seguridad y Prevención", codigo: "SEG-001", descripcion: "Seguridad laboral, prevención de riesgos y cumplimiento normativo." },
  ],
  cargos: [
    {
      id: "cm_c01", nombre: "Vendedor", codigo: "VEN-001", areaId: "cm_a01",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Trabajo de pie prolongado, carga de cajas, atención al público.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Pausas activas"],
    },
    {
      id: "cm_c02", nombre: "Jefe de Ventas", codigo: "VEN-010", areaId: "cm_a01",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Carga laboral, riesgo psicosocial, trabajo de pie.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo seguro"],
    },
    {
      id: "cm_c03", nombre: "Bodeguero", codigo: "BOD-001", areaId: "cm_a02",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Manejo manual de cargas, caídas, orden y limpieza.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo manual de cargas"],
    },
    {
      id: "cm_c04", nombre: "Administrativo", codigo: "ADM-001", areaId: "cm_a04",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Riesgo ergonómico, trabajo con pantallas.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "cm_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "cm_a05",
      tipo: "Prevención", requiereDS44: false,
      riesgosClave: "Recorridos de inspección, riesgos del rubro comercial.",
      documentosBase: ["Contrato de trabajo", "Credencial prevención vigente"],
      capacitacionesBase: ["Inducción SST empresa", "Gestión de riesgos comercial"],
    },
  ],
};

const administrativa: PlantillaConfig = {
  tipo: "Administrativa",
  label: "Empresa Administrativa",
  descripcion:
    "Organizaciones de perfil administrativo y servicios corporativos. Foco en riesgos ergonómicos, psicosociales y seguridad de oficinas.",
  colorBg: "bg-slate-50",
  colorText: "text-slate-600",
  colorBorder: "border-slate-300",
  areas: [
    { id: "ad_a01", nombre: "RRHH",                   codigo: "RRH-001", descripcion: "Gestión del personal, selección, contratos y bienestar organizacional." },
    { id: "ad_a02", nombre: "Finanzas y Contabilidad", codigo: "FIN-001", descripcion: "Gestión financiera, contabilidad, presupuestos e información financiera." },
    { id: "ad_a03", nombre: "Tecnología",              codigo: "TEC-001", descripcion: "Soporte tecnológico, sistemas de información e infraestructura digital." },
    { id: "ad_a04", nombre: "Operaciones",             codigo: "OPR-001", descripcion: "Coordinación de procesos y operaciones internas de la organización." },
    { id: "ad_a05", nombre: "Seguridad y Prevención",  codigo: "SEG-001", descripcion: "Gestión de riesgos laborales y cumplimiento normativo SST." },
  ],
  cargos: [
    {
      id: "ad_c01", nombre: "Analista RRHH", codigo: "RRH-001", areaId: "ad_a01",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas, riesgo psicosocial.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina", "Manejo del estrés"],
    },
    {
      id: "ad_c02", nombre: "Contadora", codigo: "FIN-001", areaId: "ad_a02",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Carga mental, pantallas, trabajo sedentario.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "ad_c03", nombre: "Analista de Sistemas", codigo: "TEC-001", areaId: "ad_a03",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, carga mental, exposición prolongada a pantallas.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en pantallas"],
    },
    {
      id: "ad_c04", nombre: "Jefe de Operaciones", codigo: "OPR-001", areaId: "ad_a04",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Carga laboral, toma de decisiones, riesgo psicosocial.",
      documentosBase: ["Contrato de trabajo"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo y bienestar"],
    },
    {
      id: "ad_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "ad_a05",
      tipo: "Prevención", requiereDS44: false,
      riesgosClave: "Recorridos de inspección, gestión de riesgos de oficina.",
      documentosBase: ["Contrato de trabajo", "Credencial prevención vigente"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo ergonómico y psicosocial"],
    },
  ],
};

// ─── Registry ──────────────────────────────────────────────────────────── //

export const PLANTILLAS: Record<TipoEmpresa, PlantillaConfig> = {
  Constructora:           constructora,
  Productiva:             productiva,
  "Logística":            logistica,
  "Asesoría / Servicios": servicios,
  Comercial:              comercial,
  Administrativa:         administrativa,
};

export const TIPOS_EMPRESA: TipoEmpresa[] = [
  "Constructora",
  "Productiva",
  "Logística",
  "Asesoría / Servicios",
  "Comercial",
  "Administrativa",
];

// ─── Persistence ───────────────────────────────────────────────────────── //

export const PLANTILLA_STORAGE_KEY = "dicaprev_plantilla_v1";

export type PlantillaModo = "reemplazar" | "agregar";

export interface PlantillaAplicada {
  tipo: TipoEmpresa;
  modo: PlantillaModo;
  areas: AreaDef[];
  cargos: CargoDef[];
  aplicadaEl: string;
}

export function guardarPlantilla(
  tipo: TipoEmpresa,
  modo: PlantillaModo = "reemplazar"
): void {
  if (typeof window === "undefined") return;
  const p = PLANTILLAS[tipo];
  const data: PlantillaAplicada = {
    tipo,
    modo,
    areas: p.areas,
    cargos: p.cargos,
    aplicadaEl: new Date().toISOString(),
  };
  localStorage.setItem(PLANTILLA_STORAGE_KEY, JSON.stringify(data));
}

export function leerPlantilla(): PlantillaAplicada | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLANTILLA_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlantillaAplicada) : null;
  } catch {
    return null;
  }
}

export function limpiarPlantilla(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PLANTILLA_STORAGE_KEY);
  }
}
