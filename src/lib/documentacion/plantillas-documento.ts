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
    nombre: "Identificación de Riesgos Laborales (IRL)",
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
      "DOCUMENTO LEGAL: Registro de Información de los Riesgos Laborales (IRL) según DS44. " +
      "FORMATO OBLIGATORIO — DEBES GENERAR EXACTAMENTE ESTA ESTRUCTURA EN MARKDOWN: " +
      "## Identificación de la Persona Trabajadora " +
      "Tabla con campos: Nombre y Apellidos | RUT | Cargo | Área | Fecha | Proyecto | Hora Inicio | Hora Término | Duración Capacitación | Contacto Emergencia. " +
      "Checkboxes: [X] Colaborador nuevo / Cambio en proceso / Nuevas Actividades (marca el que corresponda). " +
      "## Informado Por (Datos Relator) " +
      "Tabla: Nombre y Apellidos | RUT | Cargo | Firma " +
      "## Descripción del Puesto de Trabajo " +
      "### Descripción del Cargo " +
      "Párrafo detallado describiendo funciones, responsabilidades y contexto operacional del cargo ESPECÍFICO. " +
      "### Tareas que Realiza " +
      "Lista numerada de 8-12 tareas específicas del cargo. " +
      "### Espacio de Trabajo " +
      "Párrafo describiendo el ambiente físico y condiciones del lugar. " +
      "### Condiciones Ambientales " +
      "OBLIGATORIO: Tabla de checkboxes marcados con [X] para los agentes que aplican al cargo: " +
      "FÍSICOS: Ruido | Iluminación | T° Extremas | Vibraciones | Radiaciones | Presión Atmosférica. " +
      "BIOLÓGICOS: Virus/bacterias/hongos. " +
      "QUÍMICOS: Sustancias peligrosas | Polvos/humos/nieblas | Vapores Orgánicos | Productos químicos. " +
      "AGENTES DE RIESGO: Eléctrico | Altura física | Caída mismo nivel | Caída distinto nivel | Golpes/atrapamientos | Tránsito vehicular. " +
      "ERGONÓMICOS: Posturas forzadas | Movimientos repetitivos | Manipulación de carga | Factores psicosociales. " +
      "### Condiciones de Orden y Aseo " +
      "Lista de 4-6 exigencias de orden y aseo específicas del puesto. " +
      "### Máquinas y Herramientas " +
      "Tabla: N° | Listado de Equipos y Herramientas | Medidas de Seguridad. Mínimo 4 filas con equipos/herramientas reales del cargo. " +
      "### EPP Asignado " +
      "Referencia a la Matriz EPP del cargo. " +
      "## Riesgos y Medidas Preventivas " +
      "CINCO tablas obligatorias, cada una con 4 columnas: RIESGO | CONSECUENCIAS | MEDIDAS PREVENTIVAS | MÉTODOS O PROCEDIMIENTOS DE TRABAJO CORRECTOS. " +
      "### Riesgos Generales (mínimo 5 filas: caídas, golpes, tránsito) " +
      "### Riesgos en Trabajos con Máquinas y Equipos (mínimo 5 filas) " +
      "### Riesgos Psicosociales (mínimo 4 filas) " +
      "### Riesgos por Agentes Químicos (mínimo 4 filas, si no aplican indicar N/A) " +
      "### Riesgos Derivados de Emergencias (incendio, sismo, lluvia, accidente del trabajo) " +
      "## Normas Generales de Seguridad " +
      "9 ítems numerados con checkbox, incluyendo: Ley 16.744, MMC (Ley 20.001/20.949/DS63 con límites hombre 25kg/mujer 20kg), Control emergencias, Res. Exenta 156 SUSESO, EPP (DS18), Ergonomía, Extintores (PQS/CO2), Señalizaciones (rojo/amarillo/verde), Análisis de Riesgos en el Trabajo. " +
      "## Declaración y Firmas " +
      "Sección con espacio para firma del trabajador, relator/informador y representante empresa. " +
      "CRITERIOS TÉCNICOS: Español técnico chileno, terminología SUSESO/DS44/NCh. Riesgos específicos del cargo, no genéricos. Normas exactas (NCh, ISO, DS). Tablas markdown con columnas claras.",
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
  {
    id: "plt-politica-sst-v1",
    codigo: "PLT-POLITICA-SST",
    version: "1.0",
    codigosDocumento: ["DOC-001", "politica-sst", "politica-ssst"],
    nombresNormalizados: ["politica de seguridad", "politica sst", "politica seguridad salud", "politica prevencion"],
    nombre: "Política de Seguridad y Salud en el Trabajo",
    descripcion:
      "Declaración formal de la empresa sobre su compromiso con la seguridad y salud en el trabajo, objetivos, responsabilidades y principios guía. Obligatoria según DS44.",
    entidad: "empresa",
    secciones: [
      { id: "encabezado", titulo: "## Identificación de la Empresa", descripcion: "Razón social, RUT, giro, dirección, representante legal.", requerida: true },
      { id: "declaracion", titulo: "## Declaración de Compromiso", descripcion: "Compromiso explícito de la dirección con la SST.", requerida: true },
      { id: "objetivos", titulo: "## Objetivos de la Política SST", descripcion: "Objetivos medibles: reducir accidentes, cumplir normativa, mejora continua.", requerida: true },
      { id: "alcance", titulo: "## Alcance", descripcion: "A quiénes aplica: trabajadores propios, contratistas, visitas.", requerida: true },
      { id: "responsabilidades", titulo: "## Responsabilidades", descripcion: "Roles del empleador, supervisores, trabajadores y Comité Paritario.", requerida: true },
      { id: "principios", titulo: "## Principios y Valores SST", descripcion: "Principios guía: tolerancia cero, participación, mejora continua.", requerida: true },
      { id: "revision", titulo: "## Revisión y Actualización", descripcion: "Frecuencia de revisión (anual) y responsable.", requerida: false },
      { id: "firmas", titulo: "## Aprobación y Firmas", descripcion: "Firma del representante legal, fecha de emisión y vigencia.", requerida: true },
    ],
    baseNormativa: ["DS44", "Ley 16.744", "ISO 45001:2018"],
    instruccionIA:
      "DOCUMENTO: Política de Seguridad y Salud en el Trabajo. Empresa chilena. FORMATO: Documento formal de 1-2 páginas. Lenguaje directivo pero accesible. Debe ser específica al giro de la empresa (construcción, manufactura, comercio, etc.), no genérica. Incluir objetivos SMART medibles. Responsabilidades claras por nivel jerárquico. Firmas del representante legal. Base normativa: DS44, Ley 16.744, Ley Karin 21.643.",
    activa: true,
  },
  {
    id: "plt-riohs-v1",
    codigo: "PLT-RIOHS",
    version: "1.0",
    codigosDocumento: ["DOC-002", "riohs", "reglamento-interno"],
    nombresNormalizados: ["reglamento interno", "reglamento higiene seguridad", "riohs", "reglamento interno sst"],
    nombre: "Reglamento Interno de Higiene y Seguridad (RIOHS)",
    descripcion:
      "Reglamento que establece las obligaciones, prohibiciones y normas de seguridad para todos los trabajadores. Obligatorio para empresas con 10 o más trabajadores según Código del Trabajo.",
    entidad: "empresa",
    secciones: [
      { id: "encabezado", titulo: "## Identificación y Datos de la Empresa", descripcion: "Razón social, RUT, representante legal, actividad.", requerida: true },
      { id: "titulo1", titulo: "## Título I — Ingreso y Contratación", descripcion: "Requisitos de ingreso, documentos, examen preocupacional.", requerida: true },
      { id: "titulo2", titulo: "## Título II — Obligaciones del Trabajador", descripcion: "Obligaciones en materia de higiene y seguridad, uso de EPP, reporte de condiciones inseguras.", requerida: true },
      { id: "titulo3", titulo: "## Título III — Prohibiciones", descripcion: "Conductas prohibidas: alcohol, drogas, retirar protecciones, no usar EPP.", requerida: true },
      { id: "titulo4", titulo: "## Título IV — Orden, Higiene y Aseo", descripcion: "Obligaciones de orden y aseo en puestos de trabajo.", requerida: true },
      { id: "titulo5", titulo: "## Título V — Prevención de Riesgos", descripcion: "Procedimientos seguros, uso de EPP, capacitaciones obligatorias.", requerida: true },
      { id: "titulo6", titulo: "## Título VI — Comité Paritario", descripcion: "Funciones y atribuciones del Comité Paritario (si aplica por dotación).", requerida: false },
      { id: "titulo7", titulo: "## Título VII — Procedimientos en Accidentes", descripcion: "Pasos a seguir ante accidente: primeros auxilios, DIAT, notificación.", requerida: true },
      { id: "titulo8", titulo: "## Título VIII — Sanciones", descripcion: "Graduación de sanciones por incumplimiento (amonestación, multa, desvinculación).", requerida: true },
      { id: "firmas", titulo: "## Aprobación y Vigencia", descripcion: "Firma representante legal, fecha emisión, visación Inspección del Trabajo.", requerida: true },
    ],
    baseNormativa: ["DS44", "Ley 16.744", "DS54", "Código del Trabajo Art. 153-157"],
    instruccionIA:
      "DOCUMENTO: Reglamento Interno de Higiene y Seguridad (RIOHS). FORMATO: Documento estructurado en Títulos y Artículos numerados. Obligaciones y prohibiciones específicas al giro de la empresa. Lenguaje legal pero claro. Incluir referencia a protocolos MINSAL aplicables según industria. Sanciones graduadas. Mencionar derechos y deberes tanto del empleador como del trabajador. Base normativa chilena: Código del Trabajo Arts. 153-157, DS44, Ley 16.744.",
    activa: true,
  },
  {
    id: "plt-plan-emergencia-v1",
    codigo: "PLT-PLAN-EMERGENCIA",
    version: "1.0",
    codigosDocumento: ["DOC-PLAN-EME", "plan-emergencia"],
    nombresNormalizados: ["plan de emergencia", "plan emergencia evacuacion", "plan de evacuacion", "plan emergencias"],
    nombre: "Plan de Emergencia y Evacuación",
    descripcion:
      "Plan que define los procedimientos de respuesta ante emergencias (incendio, sismo, evacuación), roles de brigadistas, vías de evacuación y punto de encuentro.",
    entidad: "empresa",
    secciones: [
      { id: "encabezado", titulo: "## Identificación del Establecimiento", descripcion: "Empresa, dirección, actividad, número de trabajadores, responsable del plan.", requerida: true },
      { id: "marco_legal", titulo: "## Marco Legal y Objetivo", descripcion: "DS44, NCh 1411, Res. 156 SUSESO. Objetivo del plan.", requerida: true },
      { id: "organizacion", titulo: "## Organización de Brigadas de Emergencia", descripcion: "Roles: Jefe de emergencia, Jefe de evacuación, Brigadistas (primeros auxilios, combate incendio, evacuación). Nombres y turnos.", requerida: true },
      { id: "clasificacion", titulo: "## Clasificación de Emergencias", descripcion: "Nivel 1 (controlable internamente), Nivel 2 (requiere apoyo externo), Nivel 3 (catastrófica).", requerida: true },
      { id: "protocolo_incendio", titulo: "## Protocolo de Incendio", descripcion: "Pasos numerados: detectar, alarmar, combatir (si es seguro), evacuar. Contactos emergencia: Bomberos 132, SAMU 131.", requerida: true },
      { id: "protocolo_sismo", titulo: "## Protocolo de Sismo", descripcion: "Pasos durante y después del sismo. Zonas seguras, revisión de instalaciones.", requerida: true },
      { id: "evacuacion", titulo: "## Procedimiento de Evacuación", descripcion: "Señal de evacuación, rutas, responsables por zona, punto de encuentro, conteo de personal.", requerida: true },
      { id: "comunicaciones", titulo: "## Comunicaciones y Contactos de Emergencia", descripcion: "Tabla con contactos: Bomberos, SAMU, Carabineros, Mutual/ACHS/IST, representante empresa.", requerida: true },
      { id: "capacitacion", titulo: "## Capacitación y Simulacros", descripcion: "Frecuencia de simulacros (mínimo anual), registro de participantes.", requerida: false },
      { id: "firmas", titulo: "## Aprobación", descripcion: "Firma representante legal y fecha.", requerida: true },
    ],
    baseNormativa: ["DS44", "NCh 1411", "Res. Exenta 156 SUSESO", "Ley 16.744"],
    instruccionIA:
      "DOCUMENTO: Plan de Emergencia y Evacuación. FORMATO: Documento operacional con procedimientos numerados, roles definidos y tablas de contactos. Específico al tipo de instalación (oficina, bodega, planta, obra). Incluir diagrama textual de rutas de evacuación si es posible. Contactos reales de emergencia chilenos (Bomberos 132, SAMU 131, Carabineros 133). Roles de brigada con nombres a completar. Simulacros anuales obligatorios. Adaptado al riesgo principal de la industria (incendio en manufactura, sismo en construcción, etc.).",
    activa: true,
  },
  {
    id: "plt-ley-karin-v1",
    codigo: "PLT-LEY-KARIN",
    version: "1.0",
    codigosDocumento: ["DOC-LEY-KARIN", "ley-karin"],
    nombresNormalizados: ["ley karin", "politica acoso", "protocolo acoso", "politica no discriminacion", "prevencion acoso laboral"],
    nombre: "Política de Prevención del Acoso Laboral y Sexual (Ley Karin)",
    descripcion:
      "Política obligatoria desde agosto 2024 que establece las medidas de prevención, el protocolo de denuncia y el procedimiento de investigación del acoso laboral, sexual y violencia en el trabajo. Ley 21.643 (Ley Karin).",
    entidad: "empresa",
    secciones: [
      { id: "encabezado", titulo: "## Identificación de la Empresa", descripcion: "Razón social, RUT, dirección.", requerida: true },
      { id: "declaracion", titulo: "## Declaración de Principios", descripcion: "Compromiso con ambiente laboral libre de acoso y violencia.", requerida: true },
      { id: "definiciones", titulo: "## Definiciones", descripcion: "Acoso sexual (Art. 2 CT), acoso laboral o mobbing (Art. 2 CT), violencia en el trabajo, sujetos activos y pasivos.", requerida: true },
      { id: "ambito", titulo: "## Ámbito de Aplicación", descripcion: "Aplica a todos los trabajadores, contratistas, proveedores y visitas.", requerida: true },
      { id: "conductas", titulo: "## Conductas Constitutivas de Acoso", descripcion: "Ejemplos concretos de conductas prohibidas de acoso sexual y laboral.", requerida: true },
      { id: "protocolo_denuncia", titulo: "## Protocolo de Denuncia", descripcion: "Canales de denuncia: supervisor, RRHH, correo confidencial, Inspección del Trabajo. Plazo: 6 meses desde el último hecho.", requerida: true },
      { id: "investigacion", titulo: "## Procedimiento de Investigación", descripcion: "Plazos: 30 días para investigación interna, medidas de resguardo inmediatas, confidencialidad.", requerida: true },
      { id: "sanciones", titulo: "## Sanciones", descripcion: "Sanciones graduadas según gravedad, desde amonestación hasta desvinculación.", requerida: true },
      { id: "medidas_resguardo", titulo: "## Medidas de Resguardo", descripcion: "Medidas mientras dura la investigación: cambio de turno, traslado, teletrabajo.", requerida: true },
      { id: "difusion", titulo: "## Difusión y Capacitación", descripcion: "Mecanismos de difusión: publicación en lugar visible, entrega a nuevos trabajadores, capacitación anual.", requerida: false },
      { id: "firmas", titulo: "## Aprobación", descripcion: "Firma representante legal y fecha.", requerida: true },
    ],
    baseNormativa: ["Ley 21.643 (Ley Karin)", "Ley 20.607", "Código del Trabajo Arts. 2, 153, 211-A", "DS44"],
    instruccionIA:
      "DOCUMENTO: Política de Prevención del Acoso Laboral y Sexual, Ley Karin (Ley 21.643, vigente desde agosto 2024). IMPORTANCIA: Obligatoria para TODAS las empresas desde agosto 2024. FORMATO: Documento formal con definiciones legales exactas del Código del Trabajo chileno. Protocolo de denuncia con plazos legales (30 días investigación). Canales de denuncia concretos. Medidas de resguardo específicas. Adaptada al tamaño y estructura de la empresa. Lenguaje incluyente y claro.",
    activa: true,
  },
  {
    id: "plt-dj-alcohol-drogas-v1",
    codigo: "PLT-DJ-ALCOHOL-DROGAS",
    version: "1.0",
    codigosDocumento: ["DOC-DJ-AD", "dj-alcohol-drogas"],
    nombresNormalizados: ["declaracion jurada alcohol", "declaracion alcohol drogas", "politica alcohol", "declaracion sustancias"],
    nombre: "Declaración Jurada de No Consumo de Alcohol y Drogas",
    descripcion:
      "Documento mediante el cual el trabajador declara conocer y aceptar la política de la empresa respecto al consumo de alcohol y drogas en el lugar de trabajo.",
    entidad: "trabajador",
    secciones: [
      { id: "encabezado", titulo: "## Identificación", descripcion: "Datos empresa y trabajador: nombre, RUT, cargo, área, fecha.", requerida: true },
      { id: "politica", titulo: "## Política de la Empresa", descripcion: "Descripción de la política de alcohol y drogas: prohibición en horario laboral y previa al inicio.", requerida: true },
      { id: "consecuencias", titulo: "## Consecuencias del Incumplimiento", descripcion: "Medidas disciplinarias hasta desvinculación. Referencia al RIOHS.", requerida: true },
      { id: "consentimiento_test", titulo: "## Consentimiento para Control", descripcion: "Autorización para test de alcoholemia y drogas cuando la empresa lo estime necesario.", requerida: true },
      { id: "declaracion", titulo: "## Declaración del Trabajador", descripcion: "El trabajador declara: conocer la política, no presentarse bajo influencia, reportar uso de medicamentos que afecten capacidades.", requerida: true },
      { id: "firmas", titulo: "## Fecha y Firmas", descripcion: "Fecha, firma del trabajador y firma del representante de la empresa.", requerida: true },
    ],
    baseNormativa: ["DS44", "Código del Trabajo Art. 154 N°9", "Ley 20.001"],
    instruccionIA:
      "DOCUMENTO: Declaración Jurada de No Consumo de Alcohol y Drogas. FORMATO: Formulario breve (1 página). Lenguaje claro y directo. Política específica al tipo de trabajo (operadores de maquinaria, conductores, trabajo en altura tienen tolerancia cero absoluta). Incluir procedimiento concreto si trabajador usa medicamentos. Espacio para firma y huella si aplica.",
    activa: true,
  },
  {
    id: "plt-constancia-cap-v1",
    codigo: "PLT-CONSTANCIA-CAP",
    version: "1.0",
    codigosDocumento: ["DOC-CONST-CAP", "constancia-capacitacion"],
    nombresNormalizados: ["constancia capacitacion", "certificado capacitacion", "registro capacitacion", "acta capacitacion"],
    nombre: "Constancia / Certificado de Capacitación SST",
    descripcion:
      "Documento que certifica que el trabajador recibió capacitación en una materia específica de seguridad y salud en el trabajo, incluyendo contenidos, duración, evaluación y firmas.",
    entidad: "trabajador",
    secciones: [
      { id: "encabezado", titulo: "## Datos de la Capacitación", descripcion: "Tema, fecha, duración (horas), lugar, modalidad (presencial/online/mixta), nombre del relator/instructor.", requerida: true },
      { id: "empresa", titulo: "## Datos de la Empresa", descripcion: "Razón social, RUT, actividad.", requerida: true },
      { id: "trabajador", titulo: "## Datos del Participante", descripcion: "Nombre completo, RUT, cargo, área, centro de trabajo.", requerida: true },
      { id: "contenidos", titulo: "## Contenidos Tratados", descripcion: "Lista de temas cubiertos en la capacitación.", requerida: true },
      { id: "evaluacion", titulo: "## Evaluación", descripcion: "Tipo de evaluación (escrita, práctica, teórica), nota o resultado (aprobado/reprobado), puntaje.", requerida: false },
      { id: "base_normativa", titulo: "## Base Normativa", descripcion: "Normativa que exige esta capacitación.", requerida: false },
      { id: "declaracion", titulo: "## Declaración", descripcion: "El trabajador declara haber recibido y comprendido la capacitación.", requerida: true },
      { id: "firmas", titulo: "## Firmas", descripcion: "Firma del trabajador, firma del relator/instructor, sello empresa.", requerida: true },
    ],
    baseNormativa: ["DS44", "Ley 16.744 Art. 66", "DS40 Art. 21"],
    instruccionIA:
      "DOCUMENTO: Constancia de Capacitación SST. FORMATO: Formulario estructurado con datos de la capacitación específica. Contenidos adaptados al tema de la capacitación (inducción, EPP, manejo de cargas, emergencias, etc.). Evaluación con criterios claros. Referencia normativa exacta. Apto para ser firmado digitalmente.",
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
