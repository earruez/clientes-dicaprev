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
  | "Administrativa"
  | "Minería"
  | "Salud"
  | "Agroindustria";

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
  riesgosEspecificos?: string[];
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
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo DS44 avanzado", "Primeros auxilios"],
    },
    {
      id: "c02", nombre: "Maestro de Obra", codigo: "MOP-010", areaId: "a02",
      tipo: "Supervisión", requiereDS44: true,
      riesgosClave: "Trabajo en altura, maquinaria pesada, izaje de cargas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Trabajo en altura básico", "Operación de andamios"],
      riesgosEspecificos: ["altura", "maquinaria", "izaje"],
    },
    {
      id: "c03", nombre: "Electricista Industrial", codigo: "ELC-020", areaId: "a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Alta tensión, riesgo eléctrico, espacios confinados.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo eléctrico industrial", "Espacios confinados"],
      riesgosEspecificos: ["electrico", "espacios_confinados"],
    },
    {
      id: "c04", nombre: "Operador de Grúa", codigo: "GRU-005", areaId: "a02",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Izaje de cargas, trabajo en altura extrema.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE", "DJ_ALCOHOL_DROGAS"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de grúas", "Trabajo en altura crítico"],
      riesgosEspecificos: ["altura", "izaje", "maquinaria"],
    },
    {
      id: "c05", nombre: "Administrativo SST", codigo: "ADM-030", areaId: "a03",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Riesgo ergonómico, pantallas, sedentarismo.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "c06", nombre: "Inspector de Calidad", codigo: "CAL-007", areaId: "a04",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Herramientas manuales, exposición química leve.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
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
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo en seguridad", "Primeros auxilios"],
      riesgosEspecificos: ["maquinaria", "ruido"],
    },
    {
      id: "pr_c02", nombre: "Operador de Máquinas", codigo: "PRD-010", areaId: "pr_a01",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Operación de maquinaria pesada, atrapamiento, ruido industrial.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE", "PREXOR_AUDIOMETRIA"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de maquinaria", "LOTO"],
      riesgosEspecificos: ["maquinaria", "ruido", "atrapamiento"],
    },
    {
      id: "pr_c03", nombre: "Técnico de Mantenimiento", codigo: "MNT-001", areaId: "pr_a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo eléctrico, alta tensión, espacios confinados.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "LOTO", "Espacios confinados"],
      riesgosEspecificos: ["electrico", "espacios_confinados"],
    },
    {
      id: "pr_c04", nombre: "Inspector de Calidad", codigo: "CAL-001", areaId: "pr_a03",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Herramientas manuales, exposición química, posturas forzadas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Uso EPP laboratorio"],
    },
    {
      id: "pr_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "pr_a04",
      tipo: "Prevención", requiereDS44: true,
      riesgosClave: "Gestión de riesgos industriales, DS44, investigación de accidentes.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "DS44 avanzado", "Investigación de accidentes"],
    },
    {
      id: "pr_c06", nombre: "Bodeguero", codigo: "LOG-001", areaId: "pr_a06",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Manejo manual de cargas, orden, caídas al mismo nivel.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
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
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE", "DJ_ALCOHOL_DROGAS"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo defensivo", "Carga y descarga segura"],
      riesgosEspecificos: ["vial", "fatiga", "carga_descarga"],
    },
    {
      id: "lo_c02", nombre: "Jefe de Bodega", codigo: "BOD-001", areaId: "lo_a02",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Caídas, maquinaria de bodega, manejo de cargas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Operación de grúa horquilla"],
    },
    {
      id: "lo_c03", nombre: "Bodeguero", codigo: "BOD-010", areaId: "lo_a02",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Caídas al mismo nivel, manipulación manual de cargas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo manual de cargas"],
    },
    {
      id: "lo_c04", nombre: "Despachador", codigo: "DIS-001", areaId: "lo_a03",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa"],
    },
    {
      id: "lo_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "lo_a04",
      tipo: "Prevención", requiereDS44: true,
      riesgosClave: "Gestión de seguridad vial, accidentes de tránsito, DS44.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Seguridad vial avanzada", "DS44 conductores"],
    },
    {
      id: "lo_c06", nombre: "Administrativo", codigo: "ADM-001", areaId: "lo_a05",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Riesgo ergonómico, trabajo con pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
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
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "DS44 aplicado", "Gestión de riesgos por sector"],
    },
    {
      id: "sv_c02", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "sv_a02",
      tipo: "Prevención", requiereDS44: false,
      riesgosClave: "Visitas a terreno, exposición a riesgos de clientes.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Auditorías SST"],
    },
    {
      id: "sv_c03", nombre: "Jefe de Proyectos", codigo: "CON-010", areaId: "sv_a01",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Riesgo psicosocial, carga de trabajo, pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Gestión del estrés laboral"],
    },
    {
      id: "sv_c04", nombre: "Asistente Administrativa", codigo: "ADM-001", areaId: "sv_a03",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas, riesgo ergonómico.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "sv_c05", nombre: "Ejecutivo Comercial", codigo: "COM-001", areaId: "sv_a04",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Accidentes en tránsito (visitas), carga de trabajo.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL", "LICENCIA_HABILITANTE"],
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
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Pausas activas"],
    },
    {
      id: "cm_c02", nombre: "Jefe de Ventas", codigo: "VEN-010", areaId: "cm_a01",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Carga laboral, riesgo psicosocial, trabajo de pie.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo seguro"],
    },
    {
      id: "cm_c03", nombre: "Bodeguero", codigo: "BOD-001", areaId: "cm_a02",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Manejo manual de cargas, caídas, orden y limpieza.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo manual de cargas"],
    },
    {
      id: "cm_c04", nombre: "Administrativo", codigo: "ADM-001", areaId: "cm_a04",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Riesgo ergonómico, trabajo con pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "cm_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "cm_a05",
      tipo: "Prevención", requiereDS44: false,
      riesgosClave: "Recorridos de inspección, riesgos del rubro comercial.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
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
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina", "Manejo del estrés"],
    },
    {
      id: "ad_c02", nombre: "Contadora", codigo: "FIN-001", areaId: "ad_a02",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Carga mental, pantallas, trabajo sedentario.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "ad_c03", nombre: "Analista de Sistemas", codigo: "TEC-001", areaId: "ad_a03",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, carga mental, exposición prolongada a pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en pantallas"],
    },
    {
      id: "ad_c04", nombre: "Jefe de Operaciones", codigo: "OPR-001", areaId: "ad_a04",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Carga laboral, toma de decisiones, riesgo psicosocial.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo y bienestar"],
    },
    {
      id: "ad_c05", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "ad_a05",
      tipo: "Prevención", requiereDS44: false,
      riesgosClave: "Recorridos de inspección, gestión de riesgos de oficina.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo ergonómico y psicosocial"],
    },
  ],
};

const mineria: PlantillaConfig = {
  tipo: "Minería",
  label: "Empresa Minera",
  descripcion:
    "Minería y extracción de recursos. Énfasis en riesgos de silicosis, ruido industrial, explosivos, espacios confinados y trabajo en altura.",
  colorBg: "bg-yellow-50",
  colorText: "text-yellow-800",
  colorBorder: "border-yellow-300",
  areas: [
    { id: "mi_a01", nombre: "Mina / Extracción",        codigo: "MIN-001", descripcion: "Operaciones de extracción, perforación y tronadura en interior o rajo abierto." },
    { id: "mi_a02", nombre: "Planta de Procesamiento",  codigo: "PLT-001", descripcion: "Procesamiento y beneficio de minerales extraídos." },
    { id: "mi_a03", nombre: "Mantenimiento",             codigo: "MNT-001", descripcion: "Mantención de equipos mineros, maquinaria pesada e instalaciones." },
    { id: "mi_a04", nombre: "Seguridad Mina",            codigo: "SEG-001", descripcion: "Gestión SST minera, cumplimiento DS132 y DS44, prevención de riesgos críticos." },
    { id: "mi_a05", nombre: "Administración",            codigo: "ADM-001", descripcion: "Gestión administrativa, RRHH y soporte documental." },
  ],
  cargos: [
    {
      id: "mi_c01", nombre: "Perforador", codigo: "MIN-001", areaId: "mi_a01",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Exposición a silice, ruido extremo, vibraciones, explosivos, derrumbes.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA", "PLANESI_SILICOSIS"],
      capacitacionesBase: ["Inducción SST empresa", "Perforación segura", "PLANESI", "Uso EPP minero"],
      riesgosEspecificos: ["silice", "ruido", "explosivos", "espacios_confinados", "polvo"],
    },
    {
      id: "mi_c02", nombre: "Tronador", codigo: "MIN-002", areaId: "mi_a01",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Manejo de explosivos, vibración, polvo, derrumbes.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA", "PLANESI_SILICOSIS", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo seguro de explosivos", "PLANESI", "Uso EPP minero"],
      riesgosEspecificos: ["explosivos", "silice", "ruido", "polvo"],
    },
    {
      id: "mi_c03", nombre: "Minero de Interior", codigo: "MIN-003", areaId: "mi_a01",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Espacios confinados, silice, gases, derrumbes, ruido.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA", "PLANESI_SILICOSIS"],
      capacitacionesBase: ["Inducción SST empresa", "Espacios confinados", "PLANESI", "Uso EPP minero"],
      riesgosEspecificos: ["silice", "ruido", "espacios_confinados", "polvo", "gases"],
    },
    {
      id: "mi_c04", nombre: "Jefe de Turno Mina", codigo: "MIN-010", areaId: "mi_a01",
      tipo: "Supervisión", requiereDS44: true,
      riesgosClave: "Supervisión de operaciones críticas, gestión de emergencias, riesgos mineros.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo en seguridad minera", "Gestión de emergencias"],
      riesgosEspecificos: ["silice", "ruido", "explosivos", "espacios_confinados"],
    },
    {
      id: "mi_c05", nombre: "Operador de Planta", codigo: "PLT-001", areaId: "mi_a02",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Ruido industrial, reactivos químicos, polvo mineral, maquinaria.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de planta", "Manejo de reactivos"],
      riesgosEspecificos: ["ruido", "quimico", "polvo", "maquinaria"],
    },
    {
      id: "mi_c06", nombre: "Supervisor de Planta", codigo: "PLT-010", areaId: "mi_a02",
      tipo: "Supervisión", requiereDS44: true,
      riesgosClave: "Supervisión proceso, reactivos, ruido, gestión turnos.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo en seguridad", "Gestión de turnos"],
      riesgosEspecificos: ["ruido", "quimico", "polvo"],
    },
    {
      id: "mi_c07", nombre: "Técnico de Proceso", codigo: "PLT-020", areaId: "mi_a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Reactivos químicos, ruido, polvo, maquinaria.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo de reactivos", "LOTO"],
      riesgosEspecificos: ["quimico", "ruido", "polvo"],
    },
    {
      id: "mi_c08", nombre: "Mecánico Industrial", codigo: "MNT-001", areaId: "mi_a03",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Atrapamiento, ruido, herramientas, espacios confinados.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA"],
      capacitacionesBase: ["Inducción SST empresa", "LOTO", "Espacios confinados"],
      riesgosEspecificos: ["ruido", "maquinaria", "espacios_confinados"],
    },
    {
      id: "mi_c09", nombre: "Electricista", codigo: "MNT-010", areaId: "mi_a03",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Alta tensión, riesgo eléctrico, espacios confinados.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo eléctrico", "LOTO", "Espacios confinados"],
      riesgosEspecificos: ["electrico", "espacios_confinados"],
    },
    {
      id: "mi_c10", nombre: "Soldador", codigo: "MNT-020", areaId: "mi_a03",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Quemaduras, radiación UV, humos de soldadura, ruido.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA"],
      capacitacionesBase: ["Inducción SST empresa", "Soldadura segura", "Protección respiratoria"],
      riesgosEspecificos: ["ruido", "quimico", "radiacion"],
    },
    {
      id: "mi_c11", nombre: "Prevencionista de Riesgos", codigo: "SEG-001", areaId: "mi_a04",
      tipo: "Prevención", requiereDS44: true,
      riesgosClave: "Exposición a todos los riesgos mineros, gestión DS132 y DS44.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "DS132 minería", "DS44 avanzado", "Investigación de accidentes"],
      riesgosEspecificos: ["silice", "ruido", "explosivos"],
    },
    {
      id: "mi_c12", nombre: "Inspector de Seguridad", codigo: "SEG-010", areaId: "mi_a04",
      tipo: "Prevención", requiereDS44: true,
      riesgosClave: "Recorridos en zonas de riesgo, exposición a peligros mineros.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Inspección de seguridad minera"],
      riesgosEspecificos: ["silice", "ruido", "explosivos", "espacios_confinados"],
    },
    {
      id: "mi_c13", nombre: "Administrador", codigo: "ADM-001", areaId: "mi_a05",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "mi_c14", nombre: "Asistente Administrativo", codigo: "ADM-010", areaId: "mi_a05",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
  ],
};

const salud: PlantillaConfig = {
  tipo: "Salud",
  label: "Empresa de Salud",
  descripcion:
    "Clínicas, hospitales y centros de salud. Énfasis en riesgo biológico, químico, radiación, ergonomía y turnos nocturnos.",
  colorBg: "bg-teal-50",
  colorText: "text-teal-700",
  colorBorder: "border-teal-200",
  areas: [
    { id: "sa_a01", nombre: "Urgencias / Emergencias", codigo: "URG-001", descripcion: "Atención de urgencias y emergencias médicas, trabajo de alta presión y riesgo biológico." },
    { id: "sa_a02", nombre: "Pabellón / Quirófano",    codigo: "PAB-001", descripcion: "Cirugías y procedimientos quirúrgicos, exposición a agentes biológicos y químicos." },
    { id: "sa_a03", nombre: "Hospitalización",          codigo: "HOS-001", descripcion: "Atención de pacientes hospitalizados, manejo de equipos médicos y riesgo biológico." },
    { id: "sa_a04", nombre: "Laboratorio",              codigo: "LAB-001", descripcion: "Análisis clínicos, manejo de muestras biológicas y reactivos químicos." },
    { id: "sa_a05", nombre: "Administración",           codigo: "ADM-001", descripcion: "Gestión administrativa, RRHH y soporte operacional del establecimiento." },
  ],
  cargos: [
    {
      id: "sa_c01", nombre: "Médico de Urgencia", codigo: "URG-001", areaId: "sa_a01",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo biológico, carga mental extrema, turno nocturno, agresiones.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Manejo de residuos peligrosos", "RCP avanzado"],
      riesgosEspecificos: ["biologico", "quimico", "turno_nocturno", "ergonomico"],
    },
    {
      id: "sa_c02", nombre: "Enfermero/a", codigo: "URG-010", areaId: "sa_a01",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo biológico, manipulación de pacientes, carga física, turno nocturno.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Movilización de pacientes", "Prevención pinchazos"],
      riesgosEspecificos: ["biologico", "ergonomico", "turno_nocturno"],
    },
    {
      id: "sa_c03", nombre: "Técnico en Enfermería (TENS)", codigo: "URG-020", areaId: "sa_a01",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo biológico, manipulación de pacientes, carga física.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Movilización de pacientes"],
      riesgosEspecificos: ["biologico", "ergonomico", "turno_nocturno"],
    },
    {
      id: "sa_c04", nombre: "Cirujano", codigo: "PAB-001", areaId: "sa_a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo biológico, radiación, bipolaridad de carga mental, postura forzada.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Protección radiológica"],
      riesgosEspecificos: ["biologico", "radiacion", "ergonomico"],
    },
    {
      id: "sa_c05", nombre: "Pabellonero", codigo: "PAB-010", areaId: "sa_a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo biológico, productos químicos de esterilización, posturas forzadas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Manejo de residuos hospitalarios"],
      riesgosEspecificos: ["biologico", "quimico", "ergonomico"],
    },
    {
      id: "sa_c06", nombre: "Anestesista", codigo: "PAB-020", areaId: "sa_a02",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Exposición a gases anestésicos, riesgo biológico, carga mental.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Gases anestésicos y ventilación"],
      riesgosEspecificos: ["biologico", "quimico", "radiacion"],
    },
    {
      id: "sa_c07", nombre: "Enfermero/a Supervisor", codigo: "HOS-001", areaId: "sa_a03",
      tipo: "Supervisión", requiereDS44: true,
      riesgosClave: "Riesgo biológico, manipulación de pacientes, turno nocturno.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Liderazgo en salud", "Movilización de pacientes"],
      riesgosEspecificos: ["biologico", "ergonomico", "turno_nocturno"],
    },
    {
      id: "sa_c08", nombre: "TENS", codigo: "HOS-010", areaId: "sa_a03",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo biológico, carga física, turno nocturno.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Movilización de pacientes"],
      riesgosEspecificos: ["biologico", "ergonomico", "turno_nocturno"],
    },
    {
      id: "sa_c09", nombre: "Auxiliar de Enfermería", codigo: "HOS-020", areaId: "sa_a03",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Riesgo biológico, carga física, limpieza y aseo.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Manejo de residuos hospitalarios"],
      riesgosEspecificos: ["biologico", "ergonomico"],
    },
    {
      id: "sa_c10", nombre: "Tecnólogo Médico", codigo: "LAB-001", areaId: "sa_a04",
      tipo: "Técnico", requiereDS44: true,
      riesgosClave: "Riesgo biológico, reactivos químicos, punzocortantes.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Manejo de reactivos", "Prevención pinchazos"],
      riesgosEspecificos: ["biologico", "quimico"],
    },
    {
      id: "sa_c11", nombre: "Auxiliar de Laboratorio", codigo: "LAB-010", areaId: "sa_a04",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Riesgo biológico, reactivos químicos.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Riesgo biológico", "Manejo de residuos"],
      riesgosEspecificos: ["biologico", "quimico"],
    },
    {
      id: "sa_c12", nombre: "Administrativo", codigo: "ADM-001", areaId: "sa_a05",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas, atención al público.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
    },
    {
      id: "sa_c13", nombre: "Recepcionista", codigo: "ADM-010", areaId: "sa_a05",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, atención al público, pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina", "Manejo de situaciones difíciles"],
    },
  ],
};

const agroindustria: PlantillaConfig = {
  tipo: "Agroindustria",
  label: "Empresa Agroindustrial",
  descripcion:
    "Agroindustria y procesamiento de alimentos. Énfasis en frío extremo, ruido, plaguicidas, ergonomía y trabajo en turnos.",
  colorBg: "bg-green-50",
  colorText: "text-green-700",
  colorBorder: "border-green-200",
  areas: [
    { id: "ag_a01", nombre: "Campo / Producción Agrícola", codigo: "CAM-001", descripcion: "Producción agrícola, manejo de cultivos, aplicación de plaguicidas y cosecha." },
    { id: "ag_a02", nombre: "Planta de Proceso",           codigo: "PLT-001", descripcion: "Procesamiento, selección, clasificación y empaque de productos agrícolas." },
    { id: "ag_a03", nombre: "Frigorífico / Cámara",        codigo: "FRG-001", descripcion: "Almacenamiento en frío, cámaras frigoríficas y procesamiento de carnes/frutas." },
    { id: "ag_a04", nombre: "Bodega",                      codigo: "BOD-001", descripcion: "Almacenamiento de insumos, productos terminados y materiales de embalaje." },
    { id: "ag_a05", nombre: "Administración",              codigo: "ADM-001", descripcion: "Gestión administrativa, RRHH, coordinación de turnos y soporte operacional." },
  ],
  cargos: [
    {
      id: "ag_c01", nombre: "Temporero/a", codigo: "CAM-001", areaId: "ag_a01",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Exposición solar, plaguicidas, esfuerzo físico, trabajo a la intemperie.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo seguro de plaguicidas", "Protección solar"],
      riesgosEspecificos: ["quimico_plaguicidas", "ergonomico", "turnos"],
    },
    {
      id: "ag_c02", nombre: "Supervisor de Campo", codigo: "CAM-010", areaId: "ag_a01",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Exposición solar, plaguicidas, gestión de equipos en terreno.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo seguro de plaguicidas", "Liderazgo en seguridad"],
      riesgosEspecificos: ["quimico_plaguicidas", "ergonomico"],
    },
    {
      id: "ag_c03", nombre: "Operador de Maquinaria Agrícola", codigo: "CAM-020", areaId: "ag_a01",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Maquinaria agrícola, volcamiento, atrapamiento, ruido.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE", "PREXOR_AUDIOMETRIA", "DJ_ALCOHOL_DROGAS"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de maquinaria agrícola", "LOTO"],
      riesgosEspecificos: ["ruido", "maquinaria", "quimico_plaguicidas"],
    },
    {
      id: "ag_c04", nombre: "Operador de Línea", codigo: "PLT-001", areaId: "ag_a02",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Movimientos repetitivos, ruido, frío moderado, posturas forzadas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "PREXOR_AUDIOMETRIA", "TMERT_EVALUACION"],
      capacitacionesBase: ["Inducción SST empresa", "Pausas activas", "Ergonomía en línea de proceso"],
      riesgosEspecificos: ["ruido", "ergonomico", "frio_extremo", "turnos"],
    },
    {
      id: "ag_c05", nombre: "Supervisor de Planta", codigo: "PLT-010", areaId: "ag_a02",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Supervisión de línea, ruido, gestión de turnos.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo en seguridad", "Ergonomía en proceso"],
      riesgosEspecificos: ["ruido", "ergonomico", "turnos"],
    },
    {
      id: "ag_c06", nombre: "Técnico de Proceso", codigo: "PLT-020", areaId: "ag_a02",
      tipo: "Técnico", requiereDS44: false,
      riesgosClave: "Maquinaria de proceso, ruido, reactivos sanitizantes.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "PREXOR_AUDIOMETRIA"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de maquinaria", "LOTO"],
      riesgosEspecificos: ["ruido", "quimico", "maquinaria"],
    },
    {
      id: "ag_c07", nombre: "Operador de Cámara", codigo: "FRG-001", areaId: "ag_a03",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Frío extremo, manipulación de cargas, caídas, hipotermia.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"],
      capacitacionesBase: ["Inducción SST empresa", "Trabajo en frío extremo", "Manejo manual de cargas"],
      riesgosEspecificos: ["frio_extremo", "ergonomico", "turnos"],
    },
    {
      id: "ag_c08", nombre: "Carnicero Industrial", codigo: "FRG-010", areaId: "ag_a03",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Cortes, frío extremo, movimientos repetitivos, herramientas cortantes.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "TMERT_EVALUACION"],
      capacitacionesBase: ["Inducción SST empresa", "Trabajo en frío extremo", "Uso seguro de cuchillos", "Pausas activas"],
      riesgosEspecificos: ["frio_extremo", "ergonomico", "cortantes"],
    },
    {
      id: "ag_c09", nombre: "Bodeguero", codigo: "BOD-001", areaId: "ag_a04",
      tipo: "Operativo", requiereDS44: false,
      riesgosClave: "Manejo manual de cargas, orden, caídas al mismo nivel.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Manejo manual de cargas"],
      riesgosEspecificos: ["ergonomico"],
    },
    {
      id: "ag_c10", nombre: "Operador de Stacker", codigo: "BOD-010", areaId: "ag_a04",
      tipo: "Operativo", requiereDS44: true,
      riesgosClave: "Operación de maquinaria, atropellos, caídas de carga.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL", "LICENCIA_HABILITANTE", "DJ_ALCOHOL_DROGAS"],
      capacitacionesBase: ["Inducción SST empresa", "Operación segura de stacker/grúa horquilla"],
      riesgosEspecificos: ["maquinaria", "ruido"],
    },
    {
      id: "ag_c11", nombre: "Jefe de Turno", codigo: "ADM-001", areaId: "ag_a05",
      tipo: "Supervisión", requiereDS44: false,
      riesgosClave: "Gestión de turnos, carga laboral, coordinación de personal.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "ENTREGA_EPP", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Liderazgo en seguridad", "Gestión de turnos"],
      riesgosEspecificos: ["turnos"],
    },
    {
      id: "ag_c12", nombre: "Administrador", codigo: "ADM-010", areaId: "ag_a05",
      tipo: "Administración", requiereDS44: false,
      riesgosClave: "Trabajo sedentario, pantallas.",
      documentosBase: ["CONTRATO_TRABAJO", "CEDULA_IDENTIDAD", "ODI_OBLIGACION_INFORMAR", "IRL_RIESGOS", "CAPACITACION_INICIAL"],
      capacitacionesBase: ["Inducción SST empresa", "Ergonomía en oficina"],
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
  "Minería":              mineria,
  Salud:                  salud,
  Agroindustria:          agroindustria,
};

export const TIPOS_EMPRESA: TipoEmpresa[] = [
  "Constructora",
  "Productiva",
  "Logística",
  "Asesoría / Servicios",
  "Comercial",
  "Administrativa",
  "Minería",
  "Salud",
  "Agroindustria",
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
