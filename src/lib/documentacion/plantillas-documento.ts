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
  /** Título de la sección tal como debe aparecer en el documento (Markdown heading) */
  titulo: string;
  /** Descripción del contenido esperado en esta sección */
  descripcion: string;
  /** Si es false, su ausencia genera advertencia pero no invalida el documento */
  requerida: boolean;
};

export type PlantillaDocumento = {
  /** UUID estable de la plantilla */
  id: string;
  /**
   * Código único de la plantilla.
   * Convenio: "PLT-{SIGLA}", e.g. "PLT-IRL", "PLT-EPP".
   */
  codigo: string;
  /**
   * Códigos de documentos con los que se asocia esta plantilla.
   * Se usan para lookup por código de TipoDocumento o ReglaDocumental.
   * Formato normalizado: minúsculas sin tildes.
   */
  codigosDocumento: string[];
  /**
   * Fragmentos normalizados del nombre del documento que activan esta plantilla.
   * Útil cuando el documento no tiene un código canónico, pero su nombre contiene
   * palabras clave reconocibles.
   */
  nombresNormalizados: string[];
  nombre: string;
  /** Versión semántica de la plantilla */
  version?: string;
  descripcion: string;
  /** Entidad a la que aplica el documento generado */
  entidad: "empresa" | "trabajador" | "ambos";
  /** Secciones que debe contener el documento */
  secciones: SeccionPlantilla[];
  /** Bases legales de referencia */
  baseNormativa: string[];
  /**
   * Instrucción adicional para el prompt de IA.
   * Se inyecta al final del prompt para dar contexto específico sobre el formato.
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
  /** Porcentaje de secciones requeridas presentes (0–100) */
  completitudPct: number;
};

// ─── Registro de plantillas ───────────────────────────────────────────────────

const PLANTILLAS_DOCUMENTO: PlantillaDocumento[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // PLT-IRL — Identificación de Riesgos Laborales (por puesto de trabajo)
  // Documento de trabajador. Base normativa: Ley 16.744 Art. 21, DS44.
  // ──────────────────────────────────────────────────────────────────────────
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
    nombre: "Identificación de Riesgos Laborales (IRL)",
    descripcion:
      "Documento que identifica y comunica formalmente los riesgos presentes en el puesto de trabajo, " +
      "las medidas de control aplicadas y el EPP asignado. Firmado por el trabajador y el empleador. " +
      "Obligatorio en Chile bajo Ley 16.744 y DS44.",
    entidad: "trabajador",
    secciones: [
      {
        id: "encabezado",
        titulo: "## Identificación del Trabajador y Empresa",
        descripcion:
          "Nombre completo, RUT, cargo, área, centro de trabajo, fecha de ingreso y nombre de la empresa.",
        requerida: true,
      },
      {
        id: "descripcion_puesto",
        titulo: "## Descripción del Puesto de Trabajo",
        descripcion:
          "Descripción de las funciones principales, ambientes de trabajo y condiciones habituales de la tarea.",
        requerida: true,
      },
      {
        id: "riesgos_identificados",
        titulo: "## Riesgos Identificados",
        descripcion:
          "Listado de riesgos occupacionales presentes: físicos, químicos, biológicos, ergonómicos y psicosociales. " +
          "Incluir para cada riesgo: tipo, fuente, vía de exposición y consecuencia potencial.",
        requerida: true,
      },
      {
        id: "medidas_control",
        titulo: "## Medidas de Control",
        descripcion:
          "Controles aplicados según jerarquía (eliminación, sustitución, controles de ingeniería, " +
          "administrativos, EPP). Indicar responsable de cada medida.",
        requerida: true,
      },
      {
        id: "epp_asignado",
        titulo: "## EPP Asignado",
        descripcion:
          "Listado del equipo de protección personal obligatorio para este puesto: tipo, especificación técnica y condición de uso.",
        requerida: true,
      },
      {
        id: "capacitacion",
        titulo: "## Capacitación Requerida",
        descripcion:
          "Capacitaciones de seguridad exigidas para el cargo: inducción, protocolos MINSAL aplicables, " +
          "uso de EPP y primeros auxilios.",
        requerida: false,
      },
      {
        id: "declaracion_firmas",
        titulo: "## Declaración y Firmas",
        descripcion:
          "Declaración del trabajador de haber recibido y comprendido la información. " +
          "Espacio para firma del trabajador, representante de la empresa y fecha.",
        requerida: true,
      },
    ],
    baseNormativa: ["Ley 16.744", "DS44", "DS54", "Ley 21.643 (Ley Karin)"],
    instruccionIA:
      "Este es un documento legal de obligacion de informar (IRL). " +
      "Debe ser preciso, claro y en lenguaje accesible para el trabajador. " +
      "Los riesgos deben ser específicos al cargo y la industria. " +
      "Incluir referencias normativas al pie de cada sección. " +
      "El formato de firma debe tener espacios en blanco para nombre, RUT y fecha.",
    activa: true,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLT-EPP — Acta de Entrega de Equipos de Protección Personal
  // Documento de trabajador. Base normativa: DS44, NCh 461.
  // ──────────────────────────────────────────────────────────────────────────
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
      "Acta que certifica la entrega formal de equipos de protección personal al trabajador, " +
      "indicando los elementos entregados, sus condiciones de uso y mantenimiento, " +
      "y las responsabilidades del trabajador respecto del uso correcto y cuidado del EPP. " +
      "Obligatorio según DS44 y normas NCh.",
    entidad: "trabajador",
    secciones: [
      {
        id: "encabezado",
        titulo: "## Identificación del Trabajador y Empresa",
        descripcion:
          "Nombre completo, RUT, cargo, área, centro de trabajo y nombre de la empresa.",
        requerida: true,
      },
      {
        id: "epp_entregado",
        titulo: "## EPP Entregado",
        descripcion:
          "Tabla con los equipos entregados: tipo de EPP, descripción, marca/modelo, talla/medida, " +
          "cantidad, número de norma que cumple (NCh o ISO), fecha de entrega y estado (nuevo/reposición).",
        requerida: true,
      },
      {
        id: "instrucciones_uso",
        titulo: "## Instrucciones de Uso y Mantenimiento",
        descripcion:
          "Indicaciones claras sobre cómo usar correctamente cada EPP, cuándo debe usarse, " +
          "cómo limpiarlo y almacenarlo, y cuándo solicitar reposición.",
        requerida: true,
      },
      {
        id: "responsabilidades",
        titulo: "## Responsabilidades del Trabajador",
        descripcion:
          "Obligaciones del trabajador: uso obligatorio en zonas de riesgo, reporte de daños, " +
          "devolución al término del contrato, prohibición de usar EPP ajeno o defectuoso.",
        requerida: true,
      },
      {
        id: "condiciones_devolucion",
        titulo: "## Condiciones de Devolución o Reposición",
        descripcion:
          "Circunstancias en que se debe devolver o reponer el EPP: término de contrato, " +
          "desgaste normal, daño, o cambio de cargo.",
        requerida: false,
      },
      {
        id: "declaracion_firmas",
        titulo: "## Declaración y Firmas",
        descripcion:
          "Declaración del trabajador de haber recibido los EPP indicados y de conocer " +
          "las instrucciones de uso. Firma del trabajador, encargado SST y fecha.",
        requerida: true,
      },
    ],
    baseNormativa: ["DS44", "NCh 461", "Ley 16.744 Art. 68", "Circular 3244 SUSESO"],
    instruccionIA:
      "Este es un acta legal de entrega de EPP. " +
      "La tabla de EPP entregado debe ser detallada y estar estructurada como tabla Markdown. " +
      "Las instrucciones de uso deben ser específicas para el tipo de EPP y la industria. " +
      "Usar lenguaje simple y directo. " +
      "El bloque de firmas debe incluir tres filas: Trabajador, Encargado SST y Representante Empresa.",
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

/**
 * Busca una plantilla por código exacto (case-insensitive, sin tildes).
 * Coincide contra `plantilla.codigo` y `plantilla.codigosDocumento`.
 */
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

/**
 * Busca una plantilla por nombre normalizado del documento.
 * Útil cuando el documento no tiene código explícito.
 * Retorna la primera plantilla activa cuyo `nombresNormalizados` contenga
 * alguna de las palabras clave del nombre recibido.
 */
export function getPlantillaPorNombre(nombreDocumento: string): PlantillaDocumento | null {
  const normNombre = normalizar(nombreDocumento);
  return (
    PLANTILLAS_DOCUMENTO.find((p) => {
      if (!p.activa) return false;
      return p.nombresNormalizados.some((kw) => normNombre.includes(normalizar(kw)));
    }) ?? null
  );
}

/**
 * Combina búsqueda por código y por nombre.
 * Primero intenta código exacto; si no hay coincidencia, busca por nombre.
 */
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

/**
 * Valida que el contenido de un documento cumpla con la estructura de la plantilla.
 * Verifica que cada sección requerida tenga su heading presente en el texto.
 */
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

/**
 * Lista todas las plantillas activas.
 */
export function listarPlantillas(): PlantillaDocumento[] {
  return PLANTILLAS_DOCUMENTO.filter((p) => p.activa);
}

export function normalizarCodigoPlantilla(codigo: string): string {
  const norm = normalizar(codigo);
  if (norm === "irl" || norm === "plt irl" || norm === "plt-irl") return "IRL";
  if (norm === "epp" || norm === "plt epp" || norm === "plt-epp") return "EPP";
  return codigo.trim().toUpperCase();
}

/**
 * Genera un contenido base editable en markdown para una plantilla.
 */
export function construirContenidoBasePlantilla(plantilla: PlantillaDocumento): string {
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
