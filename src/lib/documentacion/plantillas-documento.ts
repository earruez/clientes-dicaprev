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
      "DOCUMENTO LEGAL: Identificación de Riesgos Laborales (IRL). " +
      "CRITERIOS TÉCNICOS CHILENOS: " +
      "1. Usar terminología de prevención de riesgos estándar en Chile (según SUSESO, DS44, NCh). " +
      "2. Especificar riesgos REALES del puesto (NO genéricos). Incluir tipo (ergonómico, químico, biológico, psicosocial, físico). " +
      "3. Para CADA riesgo: fuente generadora, vía de exposición (inhalación, contacto, ingesta), consecuencia potencial (daño específico). " +
      "4. Jerarquía de controles: Eliminación → Sustitución → Ingeniería → Administrativos → EPP. NO usar solo EPP. " +
      "5. EPP: especificar norma técnica (NCh, ISO) que cumple (ej: 'Protector ocular NCh1318'). " +
      "6. Capacitaciones: incluir protocolos MINSAL si aplica, inducción específica del riesgo. " +
      "7. Lenguaje: técnico pero accesible. Evitar vaguedades ('ambiente seguro'). Ser concreto. " +
      "8. Firmas: espacios para Trabajador (nombre, RUT, fecha), Prevencionista, Gerente/Empleador.",
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
      "DOCUMENTO LEGAL: Acta de Entrega y Recepción de EPP (Equipos de Protección Personal). " +
      "CRITERIOS TÉCNICOS CHILENOS: " +
      "1. Usar lenguaje formal y técnico según estándares ds44 SUSESO y normas NCh. " +
      "2. TABLA EPP OBLIGATORIA: Debe incluir columnas separadas: Elemento EPP | Marca | Modelo | Talla | Cantidad | Norma Técnica | Fecha Entrega | Firma. " +
      "3. Para cada EPP: especificar norma técnica exacta (ej: 'Protector ocular NCh1318', 'Respirador N95 ISO8573'). " +
      "4. Instrucciones: ser específicas para el tipo de EPP (cómo ponerse, inspección diaria, limpieza, almacenamiento, indicadores de reposición). " +
      "5. Responsabilidades: usar obligatorio en área de riesgo, reporte inmediato de daños/defectos, prohibición de compartir, devolución al término. " +
      "6. Reposición: especificar criterios (desgaste normal, daño, cambio de sector, término de contrato). " +
      "7. Formato: 3 espacios para firma (Trabajador con RUT, Prevencionista, Empleador/Gerente) con fechas. " +
      "8. Tono: serio e instructivo. NO genérico.",
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
  // Compatibilidad legacy: ODI se mapea a IRL
  if (norm === "odi" || norm === "odi_riesgos" || norm === "doc-odi") return "IRL";
  return codigo.trim().toUpperCase();
}

/**
 * Normaliza el nombre visible de un documento para la UI.
 * Mapea nombres legacy ODI → IRL para compatibilidad con registros anteriores.
 */
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
 * Genera un contenido base editable en markdown para una plantilla.
 * Proporciona contenido profesional tipo-Baker listo para edición empresarial.
 */
export function construirContenidoBasePlantilla(plantilla: PlantillaDocumento): string {
  const codigoNormalizado = normalizarCodigoPlantilla(plantilla.codigo);

  // Generar contenido específico por tipo de plantilla
  if (codigoNormalizado === "IRL") {
    return generarContenidoBaseIRL();
  } else if (codigoNormalizado === "EPP") {
    return generarContenidoBaseEPP();
  }

  // Fallback genérico para otras plantillas
  const encabezado = [`# ${plantilla.nombre}`, ""];
  const cuerpo = plantilla.secciones.flatMap((s) => [s.titulo, "", `*${s.descripcion}*`, ""]);
  const pie = ["## Referencias normativas", "", plantilla.baseNormativa.map((item) => `- ${item}`).join("\n"), ""];
  return [...encabezado, ...cuerpo, ...pie].join("\n").trim();
}

/**
 * Genera contenido base profesional para plantilla IRL (Identificación de Riesgos Laborales).
 */
function generarContenidoBaseIRL(): string {
  return `# IDENTIFICACIÓN DE RIESGOS LABORALES (IRL)

## Bases Legales y Referencias Normativas

Esta identificación de riesgos se realiza conforme a lo dispuesto en:

- **Ley Nº 16.744**: Sobre Accidentes del Trabajo y Enfermedades Profesionales (Art. 21)
- **Decreto Supremo Nº 44**: Reglamento sobre Condiciones Sanitarias Mínimas en el Trabajo
- **Decreto Supremo Nº 54**: Reglamento de Condiciones Sanitarias y Ambientales básicas
- **Ley Nº 21.643**: Ley Contra el Acoso Laboral (Ley Karin)
- **Circular SUSESO Nº 3244**: Obligaciones en Materia de Seguridad y Salud en el Trabajo

## Identificación del Trabajador y Empresa

| Campo | Valor |
|-------|-------|
| **Nombre del Trabajador** | |
| **RUT** | |
| **Cargo/Puesto** | |
| **Área/Sección** | |
| **Centro de Trabajo** | |
| **Fecha de Ingreso** | |
| **Nombre de la Empresa** | |
| **RUT Empresa** | |

## Descripción del Puesto de Trabajo

_Describa las funciones principales, el ambiente físico de trabajo, horarios, línea de supervisión y condiciones habituales de la tarea._

[Espacio para descripción del puesto específico]

## Condiciones Ambientales del Lugar de Trabajo

- **Temperatura**: [Rango normal de °C]
- **Ruido**: [Nivel de dB aproximado]
- **Iluminación**: [Natural/Artificial - intensidad]
- **Ventilación**: [Tipo y suficiencia]
- **Espacios**: [Dimensiones, movilidad, orden general]

## Riesgos Identificados

| Tipo de Riesgo | Fuente Generadora | Vía de Exposición | Daño Potencial | Probabilidad | Severidad |
|---|---|---|---|---|---|
| Ergonómico | [Descripción] | [Inhalación/Contacto/Ingesta/Otro] | [Daño específico] | [Alta/Media/Baja] | [Alta/Media/Baja] |
| Físico | [Descripción] | [Inhalación/Contacto/Ingesta/Otro] | [Daño específico] | [Alta/Media/Baja] | [Alta/Media/Baja] |
| Químico | [Descripción] | [Inhalación/Contacto/Ingesta/Otro] | [Daño específico] | [Alta/Media/Baja] | [Alta/Media/Baja] |
| Biológico | [Descripción] | [Inhalación/Contacto/Ingesta/Otro] | [Daño específico] | [Alta/Media/Baja] | [Alta/Media/Baja] |
| Psicosocial | [Descripción] | [Inhalación/Contacto/Ingesta/Otro] | [Daño específico] | [Alta/Media/Baja] | [Alta/Media/Baja] |

## Medidas de Control Establecidas

Conforme a la jerarquía de control (Eliminación → Sustitución → Controles de Ingeniería → Administrativos → EPP):

| Control | Descripción | Responsable | Periodicidad |
|---------|-------------|-------------|--------------|
| Eliminación | [Medida específica] | [Cargo] | [Semanal/Mensual/Otro] |
| Sustitución | [Medida específica] | [Cargo] | [Semanal/Mensual/Otro] |
| Ingeniería | [Medida específica] | [Cargo] | [Semanal/Mensual/Otro] |
| Administrativa | [Medida específica] | [Cargo] | [Semanal/Mensual/Otro] |
| EPP | [Ver sección siguiente] | [Cargo] | [Semanal/Mensual/Otro] |

## Equipos de Protección Personal (EPP) Asignado

| Elemento EPP | Especificación Técnica | Norma | Condición de Uso | Stock |
|---|---|---|---|---|
| [Tipo] | [Marca/Modelo] | NCh / ISO | [Cuándo usar] | [Cantidad] |

## Capacitación Requerida

- **Inducción General**: Procedimientos generales de seguridad de la empresa
- **Inducción Específica**: Riesgos del puesto y medidas de control
- **Uso de EPP**: Selección, colocación, inspección, limpieza y mantención
- **Protocolos Aplicables**: [MINSAL/Específicos del sector]
- **Primeros Auxilios**: Procedimiento de reporte en caso de accidente

## Declaración y Firmas

Declaro que he recibido copia de esta Identificación de Riesgos Laborales, comprendo los riesgos propios de mi cargo y las medidas de control establecidas para prevenirlos.

| Signatario | Nombre (Letra Imprenta) | RUT | Firma | Fecha |
|---|---|---|---|---|
| **Trabajador** | | | | |
| **Prevencionista/SST** | | | | |
| **Empleador/Gerente** | | | | |

---

*Documento generado conforme a regulaciones de Seguridad y Salud en el Trabajo en Chile. A conservar en poder del trabajador y una copia en archivo de empresa.*`;
}

/**
 * Genera contenido base profesional para plantilla EPP (Acta de Entrega de Equipos de Protección Personal).
 */
function generarContenidoBaseEPP(): string {
  return `# ACTA DE ENTREGA Y RECEPCIÓN DE EQUIPOS DE PROTECCIÓN PERSONAL (EPP)

## Bases Legales

La entrega de Equipos de Protección Personal (EPP) se realiza conforme a:

- **Decreto Supremo Nº 44**: Reglamento sobre Condiciones Sanitarias Mínimas en el Trabajo
- **Norma Chilena NCh 461**: Elementos de Protección Personal
- **Ley Nº 16.744**: Sobre Accidentes del Trabajo y Enfermedades Profesionales (Art. 68)
- **Circular SUSESO Nº 3244**: Obligaciones en Materia de Seguridad y Salud en el Trabajo

## Identificación del Trabajador y Empresa

| Campo | Valor |
|-------|-------|
| **Nombre del Trabajador** | |
| **RUT** | |
| **Cargo/Puesto** | |
| **Área/Sección** | |
| **Centro de Trabajo** | |
| **Nombre de la Empresa** | |

## EPP Entregado y Recibido

El trabajador recibe los siguientes equipos de protección personal:

| Elemento EPP | Marca | Modelo | Talla | Cantidad | Norma Técnica | Fecha Entrega | Firma Recibido |
|---|---|---|---|---|---|---|---|
| Casco de Seguridad | | | Única | 1 | NCh 1373 | | |
| Protector Ocular | | | Única | 1 | NCh 1318 | | |
| Protector Auditivo | | | Única | 1 | NCh 397 | | |
| Respirador/Mascarilla | | | | | ISO 8573-1 | | |
| Guantes de Trabajo | | | | 2 pares | NCh 2536 | | |
| Chaleco Reflectante | | | M/L/XL | 1 | NCh 1334 | | |
| Calzado de Seguridad | | | | 1 par | NCh 1344 | | |
| Arnés de Seguridad | | | Única | 1 | NCh 1258 | | |
| Protector contra Caídas | | | | | ISO 23601 | | |

## Instrucciones de Uso y Mantenimiento

### Casco de Seguridad
- **Cómo usar**: Colocar firmemente sobre la cabeza, ajustar la correa
- **Cuándo usar**: Obligatoriamente en área de obra/planta/almacén
- **Limpieza**: Agua y jabón neutro, secar con paño suave
- **Almacenamiento**: Lugar fresco y seco, evitar luz solar directa
- **Indicador de reposición**: Cuando presente grietas, deformaciones o más de 5 años de uso

### Protector Ocular
- **Cómo usar**: Ajustar bien sobre ojos antes de iniciar la actividad
- **Cuándo usar**: En áreas con riesgo de proyección de partículas
- **Limpieza**: Con paño suave y solución limpiadora especial
- **Almacenamiento**: En estuche protector
- **Indicador de reposición**: Cuando esté rayado, roto o nublado

### Respirador
- **Cómo usar**: Ajustar correctamente, realizar prueba de sello
- **Cuándo usar**: Cuando se requiera según protocolo de riesgos químicos/biológicos
- **Limpieza**: Cambiar filtro según frecuencia de uso, máscara con agua y jabón
- **Almacenamiento**: Bolsa hermética en lugar limpio
- **Indicador de reposición**: Cuando sea difícil respirar o filtro esté vencido

### Guantes de Trabajo
- **Cómo usar**: Certificar ajuste correcto en muñeca y dedo
- **Cuándo usar**: En todas las actividades de manipuleo/montaje
- **Limpieza**: Enjuague con agua, secar completamente
- **Almacenamiento**: Lugar seco, evitar humedad
- **Indicador de reposición**: Cuando presenten roturas, comillas o signos de permeabilidad

### Calzado de Seguridad
- **Cómo usar**: Abrocharse completamente, verificar puntera y plantilla
- **Cuándo usar**: Durante toda jornada laboral en área de riesgo
- **Limpieza**: Limpiar con cepillo, secar, neutralizar olores
- **Almacenamiento**: Lugar ventilado
- **Indicador de reposición**: Cuando suela esté desgastada o puntera no brinde protección

## Responsabilidades del Trabajador

El trabajador acepta las siguientes responsabilidades:

1. **Uso Obligatorio**: Utilizar el EPP completo en todas las áreas de riesgo conforme a indicaciones
2. **Reporte Inmediato**: Comunicar de inmediato daños, defectos o necesidad de reposición
3. **Prohibición de Compartir**: No usar EPP de otro trabajador, evitar daño a terceros
4. **No Modificación**: No alterar, retirar piezas ni cambiar funcionalidad del EPP
5. **Custodia**: Mantener en buen estado, guardando correctamente después de su uso
6. **Devolución**: Entregar el EPP al término del contrato, cambio de cargo o cuando se ordene
7. **Capacitación**: Confirmar haber recibido instrucciones de uso correcto

## Condiciones de Devolución o Reposición

- **Desgaste Normal**: EPP deteriorado por uso correcto será reemplazado sin costo
- **Daño Accidental**: Daño por uso inadecuado será evaluado para determinación de reposición
- **Cambio de Cargo/Sector**: EPP será adaptado según nuevos riesgos
- **Término de Contrato**: Obligación de devolución íntegra según estado de uso normal
- **Solicitud de Reposición**: Presentar elemento dañado para autorización de cambio

## Declaración y Firmas

Declaro bajo juramento que he recibido los Equipos de Protección Personal indicados en buen estado, comprendo cómo usarlos correctamente y conozco las instrucciones de mantenimiento y cuidado. Me comprometo a utilizarlos según las indicaciones y a reportar cualquier defecto o daño inmediatamente.

| Signatario | Nombre (Letra Imprenta) | RUT | Firma | Fecha |
|---|---|---|---|---|
| **Trabajador** | | | | |
| **Encargado SST / Prevencionista** | | | | |
| **Empleador / Representante Empresa** | | | | |

---

*Este acta debe ser conservada por el trabajador y una copia en archivo de la empresa. Constituto prueba de entrega del EPP según DS44.*`;
}

export function getPlantillaBasePorCodigo(codigo: string): PlantillaDocumento | null {
  const canonico = normalizarCodigoPlantilla(codigo);
  if (canonico === "IRL") return getPlantillaPorCodigo("IRL");
  if (canonico === "EPP") return getPlantillaPorCodigo("EPP");
  return getPlantillaPorCodigo(codigo);
}
