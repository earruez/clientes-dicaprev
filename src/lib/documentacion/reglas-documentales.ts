export type TamanoEmpresa = "micro" | "pequena" | "mediana" | "grande";

export type IndustriaNextPrev =
  | "todas"
  | "servicios"
  | "comercio"
  | "manufactura"
  | "construccion"
  | "logistica_transporte"
  | "salud"
  | "mineria"
  | "agroindustria"
  | "alimentos";

export type ReglaDocumentalNextPrev = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  subcategoria: string | null;
  entidadVivaSugerida: string | null;
  nivel: string | null;
  entidadAplicable: "empresa" | "trabajador";
  obligatoriedad: "obligatorio" | "condicional" | null;
  aplica: {
    industrias: IndustriaNextPrev[];
    industriasExcluidas: IndustriaNextPrev[];
    tamanosEmpresa: TamanoEmpresa[];
    rangoTrabajadores: string | null;
    riesgos: string[];
    reglaActivacion: string | null;
    condicionIndustria: string | null;
  };
  workflow: {
    estadoOperativoEsperado: string | null;
    estadoInicialSugerido: string;
    frecuenciaVigencia: string | null;
    responsableSugerido: string | null;
    firmaRequerida: string | null;
    validacionUsuario: string | null;
    requiereValidacionUsuario: boolean;
    descargableEnInforme: boolean;
  };
  automatizacion: {
    nivel: string | null;
    tipo: string | null;
  };
  cumplimiento: {
    prioridad: string | null;
    baseNormativa: string[];
    fuenteUrl: string | null;
  };
  notasNextPrev: string | null;
};

export const REGLAS_DOCUMENTALES: ReglaDocumentalNextPrev[] = [
  {
    id: "DOC-001",
    codigo: "DOC-001",
    nombre: "Politica de Seguridad y Salud en el Trabajo",
    categoria: "empresa",
    subcategoria: "Gobierno SST",
    entidadVivaSugerida: "PoliticaSST",
    nivel: "Empresa",
    entidadAplicable: "empresa",
    obligatoriedad: "obligatorio",
    aplica: {
      industrias: ["todas"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["general"],
      reglaActivacion: "Empresa activa con trabajadores",
      condicionIndustria: "Transversal",
    },
    workflow: {
      estadoOperativoEsperado: "Aprobado / Vigente",
      estadoInicialSugerido: "borrador",
      frecuenciaVigencia: "Revision anual",
      responsableSugerido: "Representante legal / Prevencionista",
      firmaRequerida: "No",
      validacionUsuario: "Aprobacion responsable SST",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Plantilla parametrizada" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44", "Ley 16.744"],
      fuenteUrl: "https://www.bcn.cl/leychile/navegar?idNorma=1205298",
    },
    notasNextPrev: null,
  },
  {
    id: "DOC-002",
    codigo: "DOC-002",
    nombre: "Reglamento Interno SST",
    categoria: "empresa",
    subcategoria: "Gobierno SST",
    entidadVivaSugerida: "ReglamentoInternoSST",
    nivel: "Empresa",
    entidadAplicable: "empresa",
    obligatoriedad: "obligatorio",
    aplica: {
      industrias: ["todas"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["general"],
      reglaActivacion: "Empresa activa con trabajadores",
      condicionIndustria: "Transversal",
    },
    workflow: {
      estadoOperativoEsperado: "Vigente",
      estadoInicialSugerido: "borrador",
      frecuenciaVigencia: "Revision anual",
      responsableSugerido: "Representante legal",
      firmaRequerida: "No",
      validacionUsuario: "Aprobacion admin empresa",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Plantilla parametrizada" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44"],
      fuenteUrl: "https://www.bcn.cl/leychile/navegar?idNorma=1205298",
    },
    notasNextPrev: null,
  },
  {
    id: "DOC-011",
    codigo: "DOC-011",
    nombre: "Induccion SST",
    categoria: "capacitaciones",
    subcategoria: "Base trabajador",
    entidadVivaSugerida: "InduccionSST",
    nivel: "Trabajador",
    entidadAplicable: "trabajador",
    obligatoriedad: "obligatorio",
    aplica: {
      industrias: ["todas"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["general"],
      reglaActivacion: "Trabajador activo",
      condicionIndustria: "Transversal",
    },
    workflow: {
      estadoOperativoEsperado: "Pendiente / Completo",
      estadoInicialSugerido: "pendiente",
      frecuenciaVigencia: "Anual",
      responsableSugerido: "SST",
      firmaRequerida: "No",
      validacionUsuario: "Validacion SST",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Generacion automatica" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44"],
      fuenteUrl: null,
    },
    notasNextPrev: null,
  },
  {
    id: "DOC-073",
    codigo: "DOC-073",
    nombre: "PREXOR / conservacion auditiva",
    categoria: "protocolos",
    subcategoria: "Protocolos MINSAL",
    entidadVivaSugerida: "CapacitacionPREXOR",
    nivel: "Trabajador",
    entidadAplicable: "trabajador",
    obligatoriedad: "condicional",
    aplica: {
      industrias: ["manufactura", "construccion", "logistica_transporte", "mineria"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["ruido"],
      reglaActivacion: "Exposicion a ruido",
      condicionIndustria: "Aplica si existe exposicion a ruido ocupacional",
    },
    workflow: {
      estadoOperativoEsperado: "Pendiente / Completo",
      estadoInicialSugerido: "pendiente",
      frecuenciaVigencia: "Segun protocolo",
      responsableSugerido: "SST",
      firmaRequerida: "No",
      validacionUsuario: "Validacion responsable protocolo",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Reglas + evidencia" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44", "Protocolos MINSAL/SUSESO"],
      fuenteUrl: "https://www.achs.cl/empresas/protocolos-MINSAL-ACHS",
    },
    notasNextPrev: "Activada por PREXOR",
  },
  {
    id: "DOC-074",
    codigo: "DOC-074",
    nombre: "Silice / PLANESI",
    categoria: "protocolos",
    subcategoria: "Protocolos MINSAL",
    entidadVivaSugerida: "CapacitacionSilice",
    nivel: "Trabajador",
    entidadAplicable: "trabajador",
    obligatoriedad: "condicional",
    aplica: {
      industrias: ["construccion", "mineria", "manufactura"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["silice"],
      reglaActivacion: "Exposicion silice",
      condicionIndustria: "Aplica si existe exposicion a silice o polvo respirable",
    },
    workflow: {
      estadoOperativoEsperado: "Pendiente / Completo",
      estadoInicialSugerido: "pendiente",
      frecuenciaVigencia: "Segun protocolo",
      responsableSugerido: "SST",
      firmaRequerida: "No",
      validacionUsuario: "Validacion responsable protocolo",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Reglas + evidencia" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44", "Protocolos MINSAL/SUSESO"],
      fuenteUrl: "https://www.achs.cl/empresas/protocolos-MINSAL-ACHS",
    },
    notasNextPrev: "Activada por PLANESI",
  },
  {
    id: "DOC-003",
    codigo: "DOC-003",
    nombre: "Plan de Emergencia y Evacuacion",
    categoria: "empresa",
    subcategoria: "Emergencias",
    entidadVivaSugerida: "PlanEmergencia",
    nivel: "Empresa",
    entidadAplicable: "empresa",
    obligatoriedad: "obligatorio",
    aplica: {
      industrias: ["todas"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["general"],
      reglaActivacion: "Empresa activa con trabajadores",
      condicionIndustria: "Transversal",
    },
    workflow: {
      estadoOperativoEsperado: "Vigente",
      estadoInicialSugerido: "borrador",
      frecuenciaVigencia: "Revision anual",
      responsableSugerido: "Prevencionista / Jefe de Emergencias",
      firmaRequerida: "No",
      validacionUsuario: "Aprobacion responsable SST",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Plantilla parametrizada" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44", "NCh 1411", "Res. Exenta 156 SUSESO"],
      fuenteUrl: null,
    },
    notasNextPrev: null,
  },
  {
    id: "DOC-004",
    codigo: "DOC-004",
    nombre: "Politica de Prevencion Acoso Laboral y Sexual (Ley Karin)",
    categoria: "empresa",
    subcategoria: "Gobierno SST",
    entidadVivaSugerida: "PoliticaLeyKarin",
    nivel: "Empresa",
    entidadAplicable: "empresa",
    obligatoriedad: "obligatorio",
    aplica: {
      industrias: ["todas"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["general"],
      reglaActivacion: "Empresa activa con trabajadores",
      condicionIndustria: "Transversal",
    },
    workflow: {
      estadoOperativoEsperado: "Vigente",
      estadoInicialSugerido: "borrador",
      frecuenciaVigencia: "Revision anual",
      responsableSugerido: "RRHH / Representante legal",
      firmaRequerida: "No",
      validacionUsuario: "Aprobacion representante legal",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Plantilla parametrizada" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["Ley 21.643 (Ley Karin)", "Ley 20.607", "Código del Trabajo Art. 2"],
      fuenteUrl: null,
    },
    notasNextPrev: "Obligatoria desde agosto 2024. Toda empresa sin excepción.",
  },
  {
    id: "DOC-012",
    codigo: "DOC-012",
    nombre: "Declaracion Jurada No Consumo Alcohol y Drogas",
    categoria: "capacitaciones",
    subcategoria: "Base trabajador",
    entidadVivaSugerida: "DJAlcoholDrogas",
    nivel: "Trabajador",
    entidadAplicable: "trabajador",
    obligatoriedad: "condicional",
    aplica: {
      industrias: ["todas"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["general"],
      reglaActivacion: "Cargos con maquinaria, conduccion o trabajo en altura",
      condicionIndustria: "Aplica especialmente en construccion, logistica, manufactura, mineria",
    },
    workflow: {
      estadoOperativoEsperado: "Pendiente / Completo",
      estadoInicialSugerido: "pendiente",
      frecuenciaVigencia: "Al ingreso y anual",
      responsableSugerido: "RRHH / SST",
      firmaRequerida: "Si",
      validacionUsuario: "Firma trabajador",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Generacion automatica" },
    cumplimiento: {
      prioridad: "media",
      baseNormativa: ["DS44", "Código del Trabajo Art. 154 N°9"],
      fuenteUrl: null,
    },
    notasNextPrev: null,
  },
  {
    id: "DOC-013",
    codigo: "DOC-013",
    nombre: "Constancia de Capacitacion SST",
    categoria: "capacitaciones",
    subcategoria: "Base trabajador",
    entidadVivaSugerida: "ConstanciaCapacitacion",
    nivel: "Trabajador",
    entidadAplicable: "trabajador",
    obligatoriedad: "obligatorio",
    aplica: {
      industrias: ["todas"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["general"],
      reglaActivacion: "Por cada capacitacion obligatoria completada",
      condicionIndustria: "Transversal",
    },
    workflow: {
      estadoOperativoEsperado: "Completo",
      estadoInicialSugerido: "pendiente",
      frecuenciaVigencia: "Por evento de capacitacion",
      responsableSugerido: "SST / RRHH",
      firmaRequerida: "Si",
      validacionUsuario: "Firma trabajador y relator",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Generacion automatica desde modulo capacitaciones" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44", "Ley 16.744 Art. 66"],
      fuenteUrl: null,
    },
    notasNextPrev: "Generacion automatica al completar capacitacion en modulo Capacitaciones.",
  },
  {
    id: "DOC-075",
    codigo: "DOC-075",
    nombre: "Protocolo TMERT - Trastornos Musculo Esqueleticos",
    categoria: "protocolos",
    subcategoria: "Protocolos MINSAL",
    entidadVivaSugerida: "CapacitacionTMERT",
    nivel: "Trabajador",
    entidadAplicable: "trabajador",
    obligatoriedad: "condicional",
    aplica: {
      industrias: ["manufactura", "comercio", "servicios", "salud", "logistica_transporte", "alimentos"],
      industriasExcluidas: [],
      tamanosEmpresa: ["micro", "pequena", "mediana", "grande"],
      rangoTrabajadores: "Todos",
      riesgos: ["tmert"],
      reglaActivacion: "Trabajo repetitivo o posturas forzadas",
      condicionIndustria: "Aplica si hay trabajo repetitivo, posturas forzadas o manipulacion de carga",
    },
    workflow: {
      estadoOperativoEsperado: "Pendiente / Completo",
      estadoInicialSugerido: "pendiente",
      frecuenciaVigencia: "Segun protocolo",
      responsableSugerido: "SST",
      firmaRequerida: "No",
      validacionUsuario: "Validacion responsable protocolo",
      requiereValidacionUsuario: true,
      descargableEnInforme: true,
    },
    automatizacion: { nivel: "alta", tipo: "Reglas + evidencia" },
    cumplimiento: {
      prioridad: "alta",
      baseNormativa: ["DS44", "Protocolos MINSAL/SUSESO", "Ley 20.001"],
      fuenteUrl: null,
    },
    notasNextPrev: "Activada por riesgo ergonomico en cargos con trabajo repetitivo.",
  },
];
