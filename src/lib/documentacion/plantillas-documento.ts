import {
  crearDocumentoEppEstructurado,
  crearDocumentoIrlEstructurado,
  serializarDocumentoEstructurado,
} from "./documento-estructurado";

/**
 * Fase 27.6A — Sistema de plantillas documentales
 *
 * Define el modelo PlantillaDocumento genérico y el registro inicial
 * con plantillas IRL y EPP para documentos de trabajadores.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SeccionPlantilla = {
  /** Identificador interno, e.g. "identificacion_trabajador" */
  id: string;
  /** Titulo de la seccion tal como debe aparecer en el documento (Markdown heading) */
  titulo: string;
  /** Descripcion del contenido esperado en esta seccion */
  descripcion: string;
  /** Si es false, su ausencia genera advertencia pero no invalida el documento */
  requerida: boolean;
};

export type PlantillaDocumento = {
  /** UUID estable de la plantilla */
  id: string;
  /**
   * Codigo unico de la plantilla.
   * Convenio: "PLT-{SIGLA}", e.g. "PLT-IRL", "PLT-EPP".
   */
  codigo: string;
  /**
   * Codigos de documentos con los que se asocia esta plantilla.
   * Se usan para lookup por codigo de TipoDocumento o ReglaDocumental.
   * Formato normalizado: minusculas sin tildes.
   */
  codigosDocumento: string[];
  /**
   * Fragmentos normalizados del nombre del documento que activan esta plantilla.
   * Util cuando el documento no tiene un codigo canonico, pero su nombre contiene
   * palabras clave reconocibles.
   */
  nombresNormalizados: string[];
  nombre: string;
  /** Version semantica de la plantilla */
  version?: string;
  descripcion: string;
  /** Entidad a la que aplica el documento generado */
  entidad: "empresa" | "trabajador" | "ambos";
  /** Secciones que debe contener el documento */
  secciones: SeccionPlantilla[];
  /** Bases legales de referencia */
  baseNormativa: string[];
  /**
   * Instruccion adicional para el prompt de IA.
   * Se inyecta al final del prompt para dar contexto especifico sobre el formato.
   */
  instruccionIA: string;
  activa: boolean;
};

export type ResultadoValidacionPlantilla = {
  valido: boolean;
  /** IDs de secciones cuyo heading fue encontrado en el contenido */
  seccionesPresentes: string[];
  /** IDs de secciones requeridas que no se encontraron */
  seccionesFaltantes: string[];
  /** Porcentaje de secciones requeridas presentes (0-100) */
  completitudPct: number;
};

// ─── Registro de plantillas ───────────────────────────────────────────────────

const PLANTILLAS_DOCUMENTO: PlantillaDocumento[] = [
  {
    id: "plt-irl-v1",
    codigo: "PLT-IRL",
    version: "1.0",
    codigosDocumento: ["td-irl", "DOC-IRL", "irl"],
    nombresNormalizados: [
      "identificacion de riesgos",
      "identificacion riesgos laborales",
      "informe de riesgos",
      "irl",
      "odi",
      "obligacion de informar",
    ],
    nombre: "Informe de Riesgos Laborales (IRL)",
    descripcion:
      "Documento que identifica y comunica formalmente los riesgos presentes en el puesto de trabajo, " +
      "las medidas de control aplicadas y el EPP asignado. Firmado por el trabajador y el empleador. " +
      "Obligatorio en Chile bajo Ley 16.744 y DS44.",
    entidad: "trabajador",
    secciones: [
      {
        id: "encabezado",
        titulo: "## Identificacion del Trabajador y Empresa",
        descripcion:
          "Nombre completo, RUT, cargo, area, centro de trabajo, fecha de ingreso y nombre de la empresa.",
        requerida: true,
      },
      {
        id: "descripcion_puesto",
        titulo: "## Descripcion del Puesto de Trabajo",
        descripcion:
          "Descripcion de las funciones principales, ambientes de trabajo y condiciones habituales de la tarea.",
        requerida: true,
      },
      {
        id: "riesgos_identificados",
        titulo: "## Riesgos Identificados",
        descripcion:
          "Listado de riesgos ocupacionales presentes: fisicos, quimicos, biologicos, ergonomicos y psicosociales. " +
          "Incluir para cada riesgo: tipo, fuente, via de exposicion y consecuencia potencial.",
        requerida: true,
      },
      {
        id: "medidas_control",
        titulo: "## Medidas de Control",
        descripcion:
          "Controles aplicados segun jerarquia (eliminacion, sustitucion, controles de ingenieria, " +
          "administrativos, EPP). Indicar responsable de cada medida.",
        requerida: true,
      },
      {
        id: "epp_asignado",
        titulo: "## EPP Asignado",
        descripcion:
          "Listado del equipo de proteccion personal obligatorio para este puesto: tipo, especificacion tecnica y condicion de uso.",
        requerida: true,
      },
      {
        id: "capacitacion",
        titulo: "## Capacitacion Requerida",
        descripcion:
          "Capacitaciones de seguridad exigidas para el cargo: induccion, protocolos MINSAL aplicables, " +
          "uso de EPP y primeros auxilios.",
        requerida: false,
      },
      {
        id: "declaracion_firmas",
        titulo: "## Declaracion y Firmas",
        descripcion:
          "Declaracion del trabajador de haber recibido y comprendido la informacion. " +
          "Espacio para firma del trabajador, representante de la empresa y fecha.",
        requerida: true,
      },
    ],
    baseNormativa: ["Ley 16.744", "DS44", "DS54", "Ley 21.643 (Ley Karin)"],
    instruccionIA:
      "DOCUMENTO LEGAL: Informe de Riesgos Laborales (IRL). " +
      "CRITERIOS TECNICOS CHILENOS: " +
      "1. Usar terminologia de prevencion de riesgos estandar en Chile (segun SUSESO, DS44, NCh). " +
      "2. Especificar riesgos reales del puesto. " +
      "3. Para cada riesgo: fuente generadora, via de exposicion y consecuencia potencial. " +
      "4. Jerarquia de controles: Eliminacion -> Sustitucion -> Ingenieria -> Administrativos -> EPP. " +
      "5. EPP: especificar norma tecnica (NCh, ISO) cuando aplique. " +
      "6. Capacitaciones: incluir protocolos MINSAL si aplica. " +
      "7. Lenguaje tecnico pero accesible. " +
      "8. Firmas: espacios para trabajador, prevencionista y empleador.",
    activa: true,
  },
  {
    id: "plt-epp-v1",
    codigo: "PLT-EPP",
    version: "1.0",
    codigosDocumento: ["td-08", "td-epp", "DOC-EPP", "epp"],
    nombresNormalizados: [
      "entrega de epp",
      "entrega epp",
      "equipos de proteccion personal",
      "acta epp",
      "recepcion epp",
      "acta de recepcion de elementos de proteccion",
    ],
    nombre: "Acta de Entrega de Equipos de Protección Personal (EPP)",
    descripcion:
      "Acta que certifica la entrega formal de equipos de proteccion personal al trabajador, " +
      "indicando los elementos entregados, sus condiciones de uso y mantenimiento, " +
      "y las responsabilidades del trabajador respecto del uso correcto y cuidado del EPP. " +
      "Obligatorio segun DS44 y normas NCh.",
    entidad: "trabajador",
    secciones: [
      {
        id: "encabezado",
        titulo: "## Identificacion del Trabajador y Empresa",
        descripcion:
          "Nombre completo, RUT, cargo, area, centro de trabajo y nombre de la empresa.",
        requerida: true,
      },
      {
        id: "epp_entregado",
        titulo: "## EPP Entregado",
        descripcion:
          "Tabla con los equipos entregados: tipo de EPP, descripcion, marca/modelo, talla/medida, " +
          "cantidad, norma tecnica, fecha de entrega y estado.",
        requerida: true,
      },
      {
        id: "instrucciones_uso",
        titulo: "## Instrucciones de Uso y Mantenimiento",
        descripcion:
          "Indicaciones claras sobre como usar correctamente cada EPP, cuando debe usarse, " +
          "como limpiarlo y almacenarlo, y cuando solicitar reposicion.",
        requerida: true,
      },
      {
        id: "responsabilidades",
        titulo: "## Responsabilidades del Trabajador",
        descripcion:
          "Obligaciones del trabajador: uso obligatorio en zonas de riesgo, reporte de danos, " +
          "devolucion al termino del contrato, prohibicion de usar EPP ajeno o defectuoso.",
        requerida: true,
      },
      {
        id: "condiciones_devolucion",
        titulo: "## Condiciones de Devolucion o Reposicion",
        descripcion:
          "Circunstancias en que se debe devolver o reponer el EPP: termino de contrato, desgaste normal, dano, o cambio de cargo.",
        requerida: false,
      },
      {
        id: "declaracion_firmas",
        titulo: "## Declaracion y Firmas",
        descripcion:
          "Declaracion del trabajador de haber recibido los EPP indicados y de conocer las instrucciones de uso. Firma del trabajador, encargado SST y fecha.",
        requerida: true,
      },
    ],
    baseNormativa: ["DS44", "NCh 461", "Ley 16.744 Art. 68", "Circular 3244 SUSESO"],
    instruccionIA:
      "DOCUMENTO LEGAL: Acta de Entrega y Recepcion de EPP. " +
      "CRITERIOS TECNICOS CHILENOS: " +
      "1. Usar lenguaje formal y tecnico. " +
      "2. Tabla EPP obligatoria con columnas claras. " +
      "3. Especificar norma tecnica cuando corresponda. " +
      "4. Instrucciones de uso y mantenimiento especificas. " +
      "5. Incluir responsabilidades y criterios de reposicion. " +
      "6. Incluir espacios de firma.",
    activa: true,
  },
];

// ─── Funciones de acceso ──────────────────────────────────────────────────────

function normalizar(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPlantillaPorCodigo(codigo: string): PlantillaDocumento | null {
  const norm = normalizar(codigo);
  return (
    PLANTILLAS_DOCUMENTO.find((p) => {
      if (!p.activa) return false;
      const allCodigos = [p.codigo, ...p.codigosDocumento].map(normalizar);
      return allCodigos.some((c) => c === norm);
    }) ?? null
  );
}

export function getPlantillaPorNombre(nombreDocumento: string): PlantillaDocumento | null {
  const normNombre = normalizar(nombreDocumento);
  return (
    PLANTILLAS_DOCUMENTO.find((p) => {
      if (!p.activa) return false;
      return p.nombresNormalizados.some((kw) => normNombre.includes(normalizar(kw)));
    }) ?? null
  );
}

export function getPlantilla(
  codigo: string | null | undefined,
  nombre: string | null | undefined,
): PlantillaDocumento | null {
  if (codigo) {
    const byCode = getPlantillaPorCodigo(codigo);
    if (byCode) return byCode;
  }
  if (nombre) {
    return getPlantillaPorNombre(nombre);
  }
  return null;
}

export function validarContenidoContraPlantilla(
  contenido: string,
  plantilla: PlantillaDocumento,
): ResultadoValidacionPlantilla {
  const normContenido = normalizar(contenido);

  const seccionesRequeridas = plantilla.secciones.filter((s) => s.requerida);
  const seccionesPresentes: string[] = [];
  const seccionesFaltantes: string[] = [];

  for (const seccion of plantilla.secciones) {
    const normTitulo = normalizar(seccion.titulo.replace(/^#+\s*/, ""));
    const encontrada = normContenido.includes(normTitulo);
    if (encontrada) {
      seccionesPresentes.push(seccion.id);
    } else if (seccion.requerida) {
      seccionesFaltantes.push(seccion.id);
    }
  }

  const completitudPct =
    seccionesRequeridas.length === 0
      ? 100
      : Math.round(
          ((seccionesRequeridas.length - seccionesFaltantes.length) /
            seccionesRequeridas.length) *
            100,
        );

  return {
    valido: seccionesFaltantes.length === 0,
    seccionesPresentes,
    seccionesFaltantes,
    completitudPct,
  };
}

export function listarPlantillas(): PlantillaDocumento[] {
  return PLANTILLAS_DOCUMENTO.filter((p) => p.activa);
}

export function normalizarCodigoPlantilla(codigo: string): string {
  const norm = normalizar(codigo);
  if (norm === "irl" || norm === "plt irl" || norm === "plt-irl") return "IRL";
  if (norm === "epp" || norm === "plt epp" || norm === "plt-epp") return "EPP";
  if (norm === "odi" || norm === "odi_riesgos" || norm === "doc-odi") return "IRL";
  return codigo.trim().toUpperCase();
}

export function normalizarNombreDocumentoDisplay(nombre: string): string {
  const norm = normalizar(nombre);
  if (
    norm.includes("obligacion de informar") ||
    norm === "odi firmada" ||
    norm === "odi" ||
    norm.startsWith("odi ") ||
    norm.includes(" odi")
  ) {
    return nombre
      .replace(/\bODI\b/g, "IRL")
      .replace(/[Oo]bligaci[oó]n de [Ii]nformar( [Rr]iesgos)?( ODI)?/g, "Información de Riesgos Laborales")
      .replace(/\bodi\b/gi, "IRL");
  }
  return nombre;
}

/**
 * Genera un contenido base para una plantilla.
 * IRL/EPP se serializan como JSON estructurado para el editor especializado.
 */
export function construirContenidoBasePlantilla(plantilla: PlantillaDocumento): string {
  const codigoNormalizado = normalizarCodigoPlantilla(plantilla.codigo);

  if (codigoNormalizado === "IRL") {
    return serializarDocumentoEstructurado(
      crearDocumentoIrlEstructurado({
        tipoNombre: plantilla.nombre,
        trabajadorNombre: "Trabajador",
        trabajadorRut: "",
        cargo: "",
      }),
    );
  }

  if (codigoNormalizado === "EPP") {
    return serializarDocumentoEstructurado(
      crearDocumentoEppEstructurado({
        tipoNombre: plantilla.nombre,
        trabajadorNombre: "Trabajador",
        trabajadorRut: "",
        cargo: "",
      }),
    );
  }

  const encabezado = [`# ${plantilla.nombre}`, ""];
  const cuerpo = plantilla.secciones.flatMap((s) => [s.titulo, "", `*${s.descripcion}*`, ""]);
  const pie = ["## Referencias normativas", "", plantilla.baseNormativa.map((item) => `- ${item}`).join("\n"), ""];
  return [...encabezado, ...cuerpo, ...pie].join("\n").trim();
}

export function getPlantillaBasePorCodigo(codigo: string): PlantillaDocumento | null {
  const canonico = normalizarCodigoPlantilla(codigo);
  if (canonico === "IRL") return getPlantillaPorCodigo("IRL");
  if (canonico === "EPP") return getPlantillaPorCodigo("EPP");
  return getPlantillaPorCodigo(codigo);
}
