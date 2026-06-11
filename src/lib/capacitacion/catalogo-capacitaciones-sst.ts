export type CategoriaCapacitacionSST =
  | "induccion"
  | "prevencion_riesgos"
  | "emergencia"
  | "ergonomia"
  | "altura"
  | "electrico"
  | "quimico"
  | "manejo_cargas"
  | "conduccion"
  | "salud_ocupacional"
  | "ley_karin"
  | "ruido"
  | "silice"
  | "incendio"
  | "primeros_auxilios"
  | "covid_biologico";

export type ModalidadSST = "presencial" | "virtual" | "e-learning" | "mixta";

export type ReglaAplicacionSST = {
  cargoKeywords?: string[];
  areaKeywords?: string[];
  excluirCargos?: string[];
  todosTrabajadores?: boolean;
  cantidadMinTrabajadores?: number;
};

export type CapacitacionSSTDef = {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaCapacitacionSST;
  modalidad: ModalidadSST;
  duracionHoras: number;
  vigenciaMeses: number;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  esObligatoria: boolean;
  normativaBase: string;
  regla: ReglaAplicacionSST;
};

export const CATALOGO_CAPACITACIONES_SST: CapacitacionSSTDef[] = [
  {
    codigo: "CAP-SST-001",
    nombre: "Inducción en Prevención de Riesgos",
    descripcion: "Inducción obligatoria al sistema de gestión de SST de la empresa, identificación de riesgos generales y medidas preventivas.",
    categoria: "induccion",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS44 art. 67, DS40 art. 21, Ley 16.744",
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-002",
    nombre: "Obligación de Informar (ODI) - Riesgos del Puesto de Trabajo",
    descripcion: "Información sobre los riesgos específicos del puesto, agentes físicos, químicos y biológicos presentes, y las medidas de control.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "DS40 art. 21, Ley 16.744 art. 69",
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-003",
    nombre: "Uso Correcto de Equipos de Protección Personal (EPP)",
    descripcion: "Selección, uso, mantenimiento y limitaciones de los EPP asignados. Verificación práctica de colocación y ajuste.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "DS594 art. 53, DS40",
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-004",
    nombre: "Plan de Emergencia y Evacuación",
    descripcion: "Procedimientos de emergencia, rutas de evacuación, puntos de encuentro, uso de extintores y roles en emergencias.",
    categoria: "emergencia",
    modalidad: "presencial",
    duracionHoras: 3,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "DS594 art. 44, DS40, NCh 1410",
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-005",
    nombre: "Primeros Auxilios Básicos",
    descripcion: "RCP básico, manejo de heridas, quemaduras, fracturas e intoxicaciones. Uso del botiquín y DEA si aplica.",
    categoria: "primeros_auxilios",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 24,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS594 art. 23, Ley 16.744 art. 71",
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-006",
    nombre: "Ley Karin - Prevención del Acoso Laboral y Sexual",
    descripcion: "Marco legal Ley 21.643, protocolos de denuncia y prevención del acoso laboral, sexual y violencia en el trabajo.",
    categoria: "ley_karin",
    modalidad: "virtual",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "Ley 21.643 (Ley Karin), art. 211-A Código del Trabajo",
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-007",
    nombre: "Radiación UV - Protección Solar en el Trabajo",
    descripcion: "Riesgos de exposición a radiación ultravioleta, uso de protector solar, ropa y medidas de control ambiental.",
    categoria: "salud_ocupacional",
    modalidad: "e-learning",
    duracionHoras: 1,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "Ley 20.096, DS594 art. 109",
    regla: {
      areaKeywords: ["campo", "exterior", "construcción", "obras", "minería", "mina", "terreno", "forestal"],
      cargoKeywords: ["conductor", "chofer", "operador", "inspector", "supervisor de terreno", "técnico campo"],
    },
  },
  {
    codigo: "CAP-SST-008",
    nombre: "Reglamento Interno de Orden, Higiene y Seguridad",
    descripcion: "Difusión y entrega del Reglamento Interno. Obligaciones y derechos del trabajador, normas de higiene y conductas prohibidas.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 1,
    vigenciaMeses: 24,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "DS44 art. 67, Código del Trabajo art. 153",
    regla: { todosTrabajadores: true, cantidadMinTrabajadores: 10 },
  },
  {
    codigo: "CAP-SST-009",
    nombre: "Prevención y Combate de Incendios",
    descripcion: "Clases de fuego, uso correcto de extintores portátiles, activación de alarmas y coordinación con bomberos.",
    categoria: "incendio",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS594 art. 44, NCh 1432, NCh 934",
    regla: {
      areaKeywords: ["bodega", "almacén", "producción", "planta", "manufactura", "cocina", "combustible"],
      cargoKeywords: ["bodeguero", "operador", "supervisor", "jefe de bodega", "maestro", "soldador"],
    },
  },
  {
    codigo: "CAP-SST-010",
    nombre: "Trabajos en Altura Física",
    descripcion: "Identificación de riesgos de caída, sistema de detención de caídas, arnés y anclajes, acceso y descenso seguro. >1,8m.",
    categoria: "altura",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS160 DS44 art. 67, NCh 997, DS594",
    regla: {
      cargoKeywords: ["altura", "andamio", "grúa", "gruero", "techumbre", "techador", "pintor", "electricista", "instalador", "montador", "carpintero"],
      areaKeywords: ["construcción", "obras", "montaje", "instalaciones"],
    },
  },
  {
    codigo: "CAP-SST-011",
    nombre: "Seguridad en Trabajos Eléctricos",
    descripcion: "Riesgos eléctricos, bloqueo y etiquetado (LOTO), distancias de seguridad, EPP eléctrico y primeros auxilios por electrocución.",
    categoria: "electrico",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS1/2009 MINENERGIA, NCh Elec 4/2003, DS594",
    regla: {
      cargoKeywords: ["electricista", "técnico eléctrico", "electromecánico", "liniero", "instalador eléctrico"],
      areaKeywords: ["eléctrica", "mantenimiento eléctrico", "sala de máquinas"],
    },
  },
  {
    codigo: "CAP-SST-012",
    nombre: "Manejo Seguro de Sustancias Peligrosas (HSDS)",
    descripcion: "Sistema GHS/SGA, lectura de HDS, almacenamiento, derrame y eliminación de residuos peligrosos. Derecho a Saber.",
    categoria: "quimico",
    modalidad: "presencial",
    duracionHoras: 6,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS148/2003 MINSAL, DS594 art. 37-56",
    regla: {
      cargoKeywords: ["químico", "laboratorista", "operador de planta", "proceso", "maestro", "técnico"],
      areaKeywords: ["laboratorio", "planta química", "bodega de productos", "producción", "manufactura", "minería"],
    },
  },
  {
    codigo: "CAP-SST-013",
    nombre: "Manejo Manual de Cargas (MMC)",
    descripcion: "Técnicas seguras de levantamiento, transporte y descarga. Límites legales (23kg hombres, 20kg mujeres). Pausas activas.",
    categoria: "manejo_cargas",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "Ley 20.001, DS63/2005, DS594",
    regla: {
      cargoKeywords: ["bodeguero", "operador", "reponedor", "estibador", "cargador", "despachador", "conductor", "mecánico", "maestro"],
      areaKeywords: ["bodega", "producción", "manufactura", "logística", "distribución", "almacén"],
    },
  },
  {
    codigo: "CAP-SST-014",
    nombre: "Prevención de Trastornos Músculo-Esqueléticos (TMERT)",
    descripcion: "Identificación de factores de riesgo ergonómico, movimientos repetitivos, posturas forzadas y medidas preventivas.",
    categoria: "ergonomia",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "Resolución 1082/2009 MINSAL, DS594, Ley 20.001",
    regla: {
      cargoKeywords: ["digitador", "cajero", "operador de línea", "envasador", "reponedor", "costurero", "montador"],
      areaKeywords: ["producción", "manufactura", "envasado", "atención al cliente", "call center", "informática"],
    },
  },
  {
    codigo: "CAP-SST-015",
    nombre: "Manejo Defensivo y Seguridad Vial",
    descripcion: "Técnicas de conducción preventiva, fatiga al volante, normas de tránsito laboral, revisión pre-operacional de vehículos.",
    categoria: "conduccion",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "Ley 18.290 (Ley de Tránsito), DS254, DS44",
    regla: {
      cargoKeywords: ["conductor", "chofer", "transportista", "repartidor", "mensajero", "operador de máquina", "gruero", "maquinista"],
    },
  },
  {
    codigo: "CAP-SST-016",
    nombre: "Política de Alcohol y Drogas en el Trabajo",
    descripcion: "Efectos del alcohol/drogas en el trabajo, política de la empresa, consecuencias legales y apoyo de salud ocupacional.",
    categoria: "salud_ocupacional",
    modalidad: "e-learning",
    duracionHoras: 1,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "DS594 art. 25, DS44, Ley 20.000",
    regla: {
      cargoKeywords: ["conductor", "chofer", "operador", "maquinista", "gruero", "minero", "altura"],
      areaKeywords: ["transporte", "producción", "mina", "construcción", "planta"],
    },
  },
  {
    codigo: "CAP-SST-017",
    nombre: "Prevención de Pérdida Auditiva por Ruido (PREXOR)",
    descripcion: "Efectos del ruido en la salud, uso de protección auditiva, límites de exposición (85dB), y audiometría periódica.",
    categoria: "ruido",
    modalidad: "presencial",
    duracionHoras: 3,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "Decreto 109/1968, DS594 art. 74-83, Protocolo PREXOR/SUSESO",
    regla: {
      cargoKeywords: ["operador", "mecánico", "soldador", "carpintero", "maestro", "perforador", "tronador", "maquinista"],
      areaKeywords: ["producción", "manufactura", "planta", "taller", "mina", "construcción", "bodega"],
    },
  },
  {
    codigo: "CAP-SST-018",
    nombre: "Prevención de Silicosis (PLANESI)",
    descripcion: "Riesgos de exposición a polvo de sílice cristalina, medidas de control, EPP respiratorio y vigilancia de salud.",
    categoria: "silice",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "Decreto 360/2009 MINSAL, Protocolo PLANESI, DS594",
    regla: {
      cargoKeywords: ["perforador", "tronador", "minero", "cantero", "albañil", "picapedrero"],
      areaKeywords: ["mina", "cantera", "túnel", "construcción subterránea", "perforación"],
    },
  },
  {
    codigo: "CAP-SST-019",
    nombre: "Formación Comité Paritario de Higiene y Seguridad (CPHS)",
    descripcion: "Funciones y atribuciones del CPHS, metodología de investigación de accidentes, planificación de actividades preventivas.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 16,
    vigenciaMeses: 36,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS54/1969, DS44 art. 66, Ley 16.744",
    regla: {
      cargoKeywords: ["prevencionista", "experto en prevención", "miembro cphs", "delegado seguridad"],
      cantidadMinTrabajadores: 25,
    },
  },
  {
    codigo: "CAP-SST-020",
    nombre: "Trabajo Seguro en Espacios Confinados",
    descripcion: "Identificación de espacios confinados, evaluación atmosférica, procedimientos de entrada/rescate y comunicación.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    normativaBase: "DS594 art. 37, NCh 2407, DS44",
    regla: {
      cargoKeywords: ["plomero", "gasfíter", "minero de interior", "operador de cámara", "operador de cisterna", "alcantarillado"],
      areaKeywords: ["mina", "subterráneo", "cámara frigorífica", "cisterna", "alcantarillado"],
    },
  },
  {
    codigo: "CAP-SST-021",
    nombre: "Precauciones Estándar y Control de Infecciones",
    descripcion: "Exposición a riesgo biológico, lavado de manos, uso de EPP clínico, manejo de residuos hospitalarios y accidente cortopunzante.",
    categoria: "covid_biologico",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    normativaBase: "Resolución 2138/2010 MINSAL, DS594, Circular 2.203 SUSESO",
    regla: {
      areaKeywords: ["urgencias", "pabellón", "hospitalización", "laboratorio", "clínico", "dental", "salud"],
      cargoKeywords: ["médico", "enfermero", "técnico en enfermería", "tens", "auxiliar de enfermería", "pabellonero", "paramédico", "tecnólogo médico"],
    },
  },
];
