export type PlantillaCodigoEstructurado = "IRL" | "EPP";

export type IrlRiesgoFila = {
  peligro: string;
  consecuencia: string;
  medida: string;
};

/** Ítem de EPP resumido que aparece dentro de la sección de resumen del IRL */
export type IrlEppItem = {
  descripcion: string;
  cantidad: number;
  entregado: boolean;
  observaciones: string;
};

/** Fila de la tabla de Protocolos MINSAL */
export type ProtocoloMinsalFila = {
  protocolo: string;
  aplica: string;
  detalle: string;
};

export type EppItem = {
  descripcion: string;
  marca: string;
  modelo: string;
  color: string;
  talla: string;
  cantidad: number;
  norma_tecnica: string;
  fecha_entrega: string;
  fecha_vencimiento_epp: string;
  si: boolean;
  no: boolean;
  firma_recepcion: string;
  observaciones: string;
};

export type DocumentoIrlCampos = {
  // ── Encabezado ──────────────────────────────────────────────────────────────
  empresa_nombre: string;
  empresa_contratista: string;
  empresa_mandante: string;
  codigo_documento: string;
  version: string;
  cargo: string;
  anio: string;
  // ── Sección 1-3: Tipo inducción / Modalidad / Actividad ─────────────────────
  tipo_induccion: string;
  modalidad: string;
  tipo_actividad: string;
  // ── Sección 4: Identificación del trabajador ────────────────────────────────
  trabajador_nombre: string;
  trabajador_rut: string;
  trabajador_cargo: string;
  trabajador_area: string;
  fecha: string;
  duracion_capacitacion: string;
  jornada: string;
  turno: string;
  hora_inicio: string;
  hora_termino: string;
  telefono_emergencia: string;
  // ── Sección 5: Características del lugar de trabajo ────────────────────────
  direccion_lugar_trabajo: string;
  lugar_trabajo: string;
  espacio_trabajo: string;
  condiciones_ambientales: string;
  orden_aseo: string;
  // ── Prevencionista ──────────────────────────────────────────────────────────
  prevencionista_nombre: string;
  prevencionista_cargo: string;
  // ── Antecedentes del trabajador ─────────────────────────────────────────────
  accidentes_anteriores: string;
  capacitaciones_previas: string[];
  // ── Sección 6: Riesgos generales ───────────────────────────────────────────
  riesgos_generales_tabla: IrlRiesgoFila[];
  // ── Sección 6.1: Riesgos por máquinas y equipos ────────────────────────────
  riesgos_maquinas_tabla: IrlRiesgoFila[];
  // ── Sección 6.2: Riesgos por agentes químicos ──────────────────────────────
  riesgos_quimicos_tabla: IrlRiesgoFila[];
  // ── Sección 6.3: Riesgos psicosociales ─────────────────────────────────────
  riesgos_psicosociales_tabla: IrlRiesgoFila[];
  // ── Sección 7.1: Riesgos inherentes a la actividad ─────────────────────────
  descripcion_actividad: string;
  tareas_realiza: string;
  lugares_trabajo_cargo: string;
  herramientas_equipos: string;
  epp_requerido_info: string;
  riesgos_tareas_tabla: IrlRiesgoFila[];
  riesgos_lugar_tabla: IrlRiesgoFila[];
  // ── (legacy) Riesgos específicos tabla – mantengo por compat ───────────────
  riesgos_especificos_tabla: IrlRiesgoFila[];
  // ── Sección 8a: Ley 16.744 ─────────────────────────────────────────────────
  normas_ley16744: string;
  // ── Sección 8b: Manejo manual de cargas ────────────────────────────────────
  normas_mmc: string;
  // ── Sección 8c: Control de emergencias ─────────────────────────────────────
  normas_emergencias_control: string;
  // ── Sección 8d: Actuación en caso de emergencias ───────────────────────────
  normas_emergencias_actuacion: string;
  // ── Sección 8e: Accidentes graves y fatales ─────────────────────────────────
  normas_accidentes_graves: string;
  // ── Sección 8f: EPP – obligatoriedad ───────────────────────────────────────
  normas_epp_info: string;
  // ── Sección 8g: Ergonomía ───────────────────────────────────────────────────
  normas_ergonomia: string;
  // ── Sección 8h: Extintores ──────────────────────────────────────────────────
  normas_extintores: string;
  // ── Sección 8i: Señalizaciones ──────────────────────────────────────────────
  normas_senalizacion: string;
  // ── Sección 8j: PTS ─────────────────────────────────────────────────────────
  normas_pts_texto: string;
  // ── Sección 8k: Protocolos MINSAL ──────────────────────────────────────────
  normas_protocolos_tabla: ProtocoloMinsalFila[];
  // ── Sección 8l: Sustancias químicas ────────────────────────────────────────
  normas_quimicos: string;
  // ── Legacy combinados ──────────────────────────────────────────────────────
  normas_generales: string;
  protocolos_minsal: string;
  documentos_asociados: string;
  emergencias_evacuacion: string;
  pts: string;
  // ── Sección 9: Documentos asociados ────────────────────────────────────────
  documentos_pts_lista: string[];
  documentos_hds_lista: string[];
  documentos_otros_lista: string[];
  // ── Sección 10: Declaración ─────────────────────────────────────────────────
  epp_induccion_tabla: IrlEppItem[];
  compromisos_trabajador: string[];
  declaracion: string;
  // ── Sección 11: Firmas ──────────────────────────────────────────────────────
  firma_trabajador: string;
  firma_relator: string;
};

export type DocumentoEppCampos = {
  trabajador_nombre: string;
  trabajador_rut: string;
  area: string;
  fecha: string;
  epp_tabla: EppItem[];
  observaciones_generales: string;
  declaracion: string;
  firma_trabajador: string;
  entregado_por: string;
};

export type DocumentoEstructuradoBase<TCodigo extends PlantillaCodigoEstructurado, TCampos> = {
  plantillaCodigo: TCodigo;
  version: number;
  campos: TCampos;
};

export type DocumentoIrlEstructurado = DocumentoEstructuradoBase<"IRL", DocumentoIrlCampos>;
export type DocumentoEppEstructurado = DocumentoEstructuradoBase<"EPP", DocumentoEppCampos>;
export type DocumentoEstructurado = DocumentoIrlEstructurado | DocumentoEppEstructurado;

type LegacyDocumentoIrlEstructurado = {
  version: 1;
  tipo: "irl";
  introduccion: {
    marcoLegal: string;
    tipoInduccion: string;
    modalidad: string;
    tipoActividad: string;
  };
  identificacion: {
    trabajadorNombre: string;
    trabajadorRut: string;
    cargo: string;
    area: string;
    centroTrabajo: string;
    caracteristicasLugarTrabajo: string;
  };
  riesgosGenerales: string[];
  riesgosEspecificos: string[];
  riesgosMaquinasEquipos: string[];
  riesgosQuimicos: string[];
  riesgosPsicosociales: string[];
  emergencias: string[];
  protocolos: string[];
  pts: string[];
  epp: string[];
  declaraciones: {
    recepcionInformacion: string;
  };
  firmas: {
    trabajador: string;
    relatorPreventor: string;
  };
};

type LegacyDocumentoEppEstructurado = {
  version: 1;
  tipo: "epp";
  introduccion: {
    marcoLegal: string;
    tipoActividad: string;
    trabajadorNombre: string;
    trabajadorRut: string;
    cargo: string;
    area: string;
  };
  filas: Array<{
    descripcion: string;
    marca: string;
    modelo: string;
    fechaEntrega: string;
    entregado: boolean;
    observaciones: string;
  }>;
  observacionesGenerales: string;
  declaracionFinal: string;
  firmas: {
    trabajador: string;
    empleador: string;
  };
};

function normalizarTexto(valor: string | undefined | null, fallback = ""): string {
  const text = (valor ?? "").trim();
  return text.length ? text : fallback;
}

function fechaIsoActual(): string {
  return new Date().toISOString().slice(0, 10);
}

function anioActual(): string {
  return String(new Date().getFullYear());
}

function crearFilaRiesgo(peligro: string, consecuencia = "", medida = ""): IrlRiesgoFila {
  return {
    peligro: normalizarTexto(peligro),
    consecuencia: normalizarTexto(consecuencia),
    medida: normalizarTexto(medida),
  };
}

function camposIrlBase(params: {
  tipoNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  area?: string;
  centroTrabajo?: string;
  empresa?: string;
  fecha?: string;
}): DocumentoIrlCampos {
  const fecha = params.fecha ?? fechaIsoActual();
  const empresa = params.empresa ?? "DICAPREV";
  const cargo = normalizarTexto(params.cargo) || "sin cargo especificado";
  const area = normalizarTexto(params.area) || "el área asignada";
  const centroTrabajo = normalizarTexto(params.centroTrabajo);
  const centroPrincipal = centroTrabajo || `Dependencias de ${empresa}`;

  return {
    // ── Encabezado ─────────────────────────────────────────────────────────
    empresa_nombre: empresa,
    empresa_contratista: "",
    empresa_mandante: empresa,
    codigo_documento: "REG-IRL-03",
    version: "1",
    cargo,
    anio: anioActual(),
    // ── Secciones 1-3 ─────────────────────────────────────────────────────
    tipo_induccion: "Persona trabajadora nueva",
    modalidad: "Presencial",
    tipo_actividad: "Interna",
    // ── Sección 4: Identificación ──────────────────────────────────────────
    trabajador_nombre: normalizarTexto(params.trabajadorNombre),
    trabajador_rut: normalizarTexto(params.trabajadorRut),
    trabajador_cargo: cargo,
    trabajador_area: area,
    fecha,
    duracion_capacitacion: "",
    jornada: "Diurna",
    turno: "Mañana",
    hora_inicio: "08:00",
    hora_termino: "17:00",
    telefono_emergencia: "",
    // ── Sección 5: Lugar de trabajo ────────────────────────────────────────
    direccion_lugar_trabajo: centroTrabajo || `Dependencias de ${empresa}`,
    lugar_trabajo: centroPrincipal,
    espacio_trabajo:
      `El ocupante del cargo desarrolla sus funciones en las dependencias de la empresa y/o en las áreas asignadas según la naturaleza del trabajo. El espacio incluye los equipos, herramientas y mobiliario necesarios para el desempeño de las labores. Se requieren condiciones adecuadas de iluminación, ventilación y orden para la correcta ejecución de las tareas.`,
    condiciones_ambientales:
      `Las condiciones ambientales del puesto de trabajo incluyen iluminación, temperatura, ventilación y nivel de ruido según el área asignada. El trabajador puede estar expuesto a condiciones variables según jornada y tipo de tarea. Se aplican las medidas de control establecidas en la normativa vigente y el Programa de Prevención de Riesgos.`,
    orden_aseo:
      `El cargo requiere mantener el área de trabajo limpia, ordenada y despejada, evitando la acumulación de materiales innecesarios que puedan generar caídas, golpes o interferencias. Los equipos y herramientas deben mantenerse en buen estado y correctamente ubicados. Cualquier condición insegura debe ser reportada de inmediato a la jefatura directa.`,
    // ── Prevencionista ─────────────────────────────────────────────────────
    prevencionista_nombre: "",
    prevencionista_cargo: "Prevencionista de Riesgos",
    // ── Antecedentes ───────────────────────────────────────────────────────
    accidentes_anteriores: "Sin accidentes previos registrados.",
    capacitaciones_previas: ["Inducción general de empresa"],
    // ── Sección 6: Riesgos generales ──────────────────────────────────────
    riesgos_generales_tabla: [
      crearFilaRiesgo(
        "Caídas al mismo nivel por desplazamientos en el área de trabajo, pasillos o escaleras.",
        "Contusiones, esguinces, fracturas y lesiones incapacitantes.",
        "Mantener pisos, pasillos y vías de circulación despejadas y en buen estado. Usar calzado de seguridad adecuado.",
      ),
      crearFilaRiesgo(
        "Golpes por o contra mobiliario, equipos u objetos en el área de trabajo.",
        "Traumatismos, contusiones y lesiones leves.",
        "Mantener orden y aseo en el área de trabajo. Señalizar zonas de tránsito y respetar demarcaciones.",
      ),
      crearFilaRiesgo(
        "Sobreesfuerzos y posturas forzadas durante la jornada de trabajo.",
        "Lesiones musculoesqueléticas: dolor cervical, dorsal o lumbar; trastornos musculoesqueléticos (TME).",
        "Aplicar técnicas correctas de trabajo y manipulación de materiales. Realizar pausas activas y cambios de postura.",
      ),
      crearFilaRiesgo(
        "Contacto eléctrico por uso de equipos o instalaciones eléctricas.",
        "Descargas eléctricas, quemaduras, paro cardíaco o riesgo vital.",
        "Utilizar equipos eléctricos en buen estado y certificados. Reportar inmediatamente fallas eléctricas o condiciones inseguras.",
      ),
    ],
    // ── Sección 6.1: Riesgos por máquinas/equipos ─────────────────────────
    riesgos_maquinas_tabla: [
      crearFilaRiesgo(
        "Contacto eléctrico al conectar o manipular equipos, herramientas eléctricas, enchufes o extensiones.",
        "Descargas eléctricas, quemaduras o riesgo de electrocución e incendio por sobrecarga.",
        "Utilizar equipos en buen estado y certificados. Evitar sobrecargar enchufes y extensiones. Reportar fallas inmediatamente.",
      ),
      crearFilaRiesgo(
        "Golpes o atrapamientos con partes móviles de equipos y maquinaria del cargo.",
        "Laceraciones, fracturas, amputaciones, traumatismos graves.",
        "Mantener guardas de seguridad instaladas. No intervenir maquinaria sin bloqueo y etiquetado. Usar EPP adecuado.",
      ),
      crearFilaRiesgo(
        "Caídas de materiales u objetos desde alturas o estantes durante el uso de equipos.",
        "Traumatismos, contusiones y lesiones por impacto.",
        "Almacenar materiales en forma segura y estable. Usar casco cuando corresponda. Respetar capacidades de carga de equipos.",
      ),
    ],
    // ── Sección 6.2: Riesgos químicos ─────────────────────────────────────
    riesgos_quimicos_tabla: [
      crearFilaRiesgo(
        "Contacto con productos de limpieza, lubricantes, pinturas o sustancias químicas presentes en el área de trabajo.",
        "Dermatitis, irritación ocular, riesgos respiratorios, alergias o intoxicaciones.",
        "Ventilar adecuadamente el área. Revisar HDS de los productos. Usar guantes, gafas y mascarilla si corresponde.",
      ),
      crearFilaRiesgo(
        "Exposición a vapores, polvos o aerosoles generados por procesos productivos o actividades del cargo.",
        "Irritación de vías respiratorias, cefaleas, efectos crónicos por exposición repetida.",
        "Usar EPP respiratorio adecuado. Mantener ventilación. Conocer procedimientos ante derrames y emergencias con químicos.",
      ),
    ],
    // ── Sección 6.3: Riesgos psicosociales ────────────────────────────────
    riesgos_psicosociales_tabla: [
      crearFilaRiesgo(
        "Estrés laboral por carga de trabajo, plazos exigentes y presión por resultados.",
        "Ansiedad, irritabilidad, fatiga mental, trastornos del sueño, disminución de la concentración.",
        "Planificar cargas de trabajo de forma realista con jefatura. Promover comunicación clara. Realizar pausas activas.",
      ),
      crearFilaRiesgo(
        "Demandas emocionales derivadas de la atención y coordinación con distintas áreas o personas.",
        "Desgaste emocional, desmotivación, alteraciones psicosomáticas.",
        "Aplicar Protocolo de Vigilancia de Riesgos Psicosociales CEAL-SM. Fomentar ambientes colaborativos y respetuosos.",
      ),
    ],
    // ── Sección 7.1: Riesgos específicos del cargo ────────────────────────
    descripcion_actividad:
      `El trabajador es responsable del desempeño de sus funciones en ${area} de ${empresa}, desarrollando sus labores conforme a las instrucciones de la jefatura directa, los procedimientos de trabajo seguro definidos y las normas internas de la empresa. Asegura el cumplimiento de los estándares de calidad, seguridad y productividad del área, reportando condiciones inseguras oportunamente.`,
    tareas_realiza:
      `• Ejecutar las tareas asignadas en ${area} conforme a los procedimientos de trabajo seguro.\n• Operar equipos, herramientas y materiales con la capacitación y autorización correspondiente.\n• Coordinar con la jefatura directa y compañeros de trabajo el avance de las labores asignadas.\n• Mantener el orden y aseo en el área de trabajo durante toda la jornada.\n• Reportar de inmediato condiciones inseguras, incidentes o accidentes a la jefatura directa.\n• Cumplir los Procedimientos de Trabajo Seguro (PTS) y normas internas de la empresa.\n• Participar activamente en las actividades de capacitación y prevención de riesgos.`,
    lugares_trabajo_cargo:
      `• ${centroPrincipal}.\n• Dependencias internas de ${empresa} asignadas al área ${area}.\n• Zonas de trabajo habilitadas para el cargo según organización interna de la empresa.`,
    herramientas_equipos:
      `• Herramientas y equipos asignados al cargo en ${area} según la naturaleza de las labores.\n• Equipos de comunicación (teléfono, radio) para coordinación con la jefatura directa.\n• EPP requerido según la matriz de riesgos del cargo.\n• El trabajador debe estar capacitado y autorizado para operar cada equipo o herramienta.`,
    epp_requerido_info:
      `EPP requeridos según la matriz de riesgos del cargo y la naturaleza de las tareas en ${area}. El trabajador debe usar los EPP asignados en todo momento durante la exposición al riesgo. Los EPP son entregados sin costo para el trabajador, certificados según D.S. 18 del Minsal.\n⚠ La entrega de EPP se registra en el documento 'Registro de Entrega de EPP' (documento separado).`,
    riesgos_tareas_tabla: [
      crearFilaRiesgo(
        "Caída a distinto nivel durante trabajos con uso de escalera, andamio u otras superficies elevadas.",
        "Traumatismos graves, fracturas óseas, lesiones de columna. Riesgo fatal.",
        "Usar arnés de seguridad y anclar a punto fijo certificado. Verificar condición de la escalera antes de usar. Delimitar zona inferior.",
      ),
      crearFilaRiesgo(
        "Contacto eléctrico al operar o intervenir equipos, herramientas o instalaciones eléctricas.",
        "Descarga eléctrica, quemaduras, fibrilación ventricular o riesgo vital.",
        "Verificar ausencia de tensión antes de intervenir. Aplicar LOTO. Usar herramientas aisladas certificadas. Nunca intervenir sistemas energizados sin PTS vigente.",
      ),
    ],
    riesgos_lugar_tabla: [
      crearFilaRiesgo(
        "Caídas al mismo nivel por estado de pisos, pasillos o vías de circulación.",
        "Contusiones, esguinces, fracturas.",
        "Mantener zonas de tránsito despejadas y señalizadas. Informar inmediatamente condiciones inseguras del entorno.",
      ),
      crearFilaRiesgo(
        "Riesgos psicosociales por carga mental, plazos y condiciones organizacionales del área de trabajo.",
        "Estrés, fatiga mental y disminución del rendimiento.",
        "Mantener comunicación continua con jefatura sobre cargas de trabajo. Aplicar CEAL-SM cuando corresponda.",
      ),
    ],
    // ── Legacy ─────────────────────────────────────────────────────────────
    riesgos_especificos_tabla: [],
    // ── Sección 8: Normas generales ────────────────────────────────────────
    normas_ley16744:
      `Ley 16.744 y su contenido: Define Accidente del Trabajo como toda lesión que sufra una persona a causa o con ocasión del trabajo. Accidente del Trayecto: ocurrido en el trayecto directo entre la habitación y el lugar de trabajo. Enfermedad Profesional: causada directamente por el ejercicio de la profesión. Beneficios médicos del seguro: atención clínica, honorarios médicos, medicamentos, días cama, exámenes, procedimientos, prótesis y rehabilitación. Beneficios económicos: subsidio por incapacidad laboral, indemnizaciones, pensiones de invalidez y sobrevivencia. Procedimiento: atención inmediata y primeros auxilios. Traslado a Mutual de Seguridad. Emisión de DIAT o DIEP. Notificación a la jefatura.`,
    normas_mmc:
      `Riesgos del Manejo Manual de Materiales (Ley 20.001, Art. 211H; Ley 20.949; D.S. 63): Límites máximos de carga manual: Hombres mayores de 18 años: hasta 25 kg. Mujeres y hombres menores de 18 años: no más de 20 kg. Mujeres embarazadas: prohibición de manipular cargas. Aplicar técnicas correctas de levantamiento, traslado, empuje y arrastre de cargas. Evaluación ergonómica cuando la manipulación sea frecuente o repetitiva. Uso de ayudas mecánicas (carros, mesas elevadoras, transpaletas). Capacitación periódica en técnicas de manipulación segura.`,
    normas_emergencias_control:
      `Control de Emergencias, Incendios y Primeros Auxilios: El trabajador debe conocer los procedimientos generales de emergencia de la empresa, rutas de evacuación, puntos de encuentro y canales de comunicación. En caso de incendio: reconocer el lugar de origen. Evaluar el estado de avance de las llamas. Si está entrenado y el fuego no se ha descontrolado, usar el extintor adecuado. Avisar inmediatamente a la jefatura directa. Retirarse del área. Llamar a emergencias: Ambulancia 131, Bomberos 132, Carabineros 133. En caso de accidente: activar protocolo interno, prestar primeros auxilios básicos y coordinar con servicios de emergencia.`,
    normas_emergencias_actuacion:
      `Actuación en caso de emergencias: INCENDIOS: Reconocer el lugar de origen del fuego. Evaluar el estado de avance de las llamas y elementos que podrían arder. Si está entrenado y el fuego no se ha descontrolado, hacer uso de los extintores. Avisar inmediatamente a la jefatura directa. Retirarse del área. Llamar a emergencias: Ambulancia 131, Bomberos 132, Carabineros 133. Si es un incendio ya declarado, activar el Plan de GRD. SISMOS: Mantener la calma. Mantenerse bajo vigas, pilares o muebles de seguridad. Detener la marcha si está conduciendo. Alejarse del cableado eléctrico y elementos con señales de caída. Esperar la señal para evacuar a zonas de seguridad. Una vez concluido el sismo, evaluar condición de equipos e infraestructura antes de retomar operaciones.`,
    normas_accidentes_graves:
      `Res. Exenta 156 SUSESO - Accidentes Graves y Fatales: Accidente Fatal: aquel cuyo resultado es la muerte inmediata del trabajador o durante su traslado a un centro asistencial. Accidente Grave: ocurre con caída desde más de 1,8 metros de altura; obliga a maniobras de rescate o reanimación; provoca pérdida inmediata de cualquier parte del cuerpo; involucra a un número de trabajadores que interrumpe el funcionamiento normal de la faena. Procedimiento obligatorio: Paralización inmediata de la faena afectada. Aislamiento del área. Prohibición de modificar el sitio del accidente. Comunicación inmediata a: SEREMI de Salud, Inspección del Trabajo, Organismo Administrador del Seguro, Superintendencia de Electricidad (si aplica), Carabineros o PDI (si corresponde). Cooperar con la investigación oficial.`,
    normas_epp_info:
      `Elementos de Protección Personal (EPP): Los EPP deben ser entregados sin costo para el trabajador, certificados según D.S. 18 del Ministerio de Salud. La entrega se realiza contra firma, registrando fecha, tipo de EPP y vigencia. El trabajador debe: mantener los EPP en buen estado, informar inmediatamente su deterioro, entregar el EPP dañado al momento de recibir uno nuevo. El uso de EPP es obligatorio durante todo el tiempo en que la persona esté expuesta al riesgo asociado a la tarea. La empresa debe verificar periódicamente su correcta utilización.`,
    normas_ergonomia:
      `Posición Ergonómica en Estaciones de Trabajo: Mantener la espalda apoyada en el respaldo de la silla, utilizando soporte lumbar adecuado. Regular la altura del asiento de modo que los pies se apoyen completamente en el suelo, manteniendo una flexión de rodillas cercana a 90-100°. Mantener los hombros relajados, con los codos cercanos al cuerpo y antebrazos apoyados, formando un ángulo cercano a 90°. Ubicar el monitor a la altura de los ojos, a una distancia aproximada de 50-70 cm. Colocar el teclado y mouse a una altura que evite extensión o flexión forzada de muñecas. Realizar pausas activas periódicas. Aplicar descansos visuales durante la jornada (regla 20-20-20).`,
    normas_extintores:
      `Capacitación teórica sobre uso y manejo de extintores: Componentes del fuego (combustible, calor, oxígeno). Clases de fuego: A (sólidos), B (líquidos), C (eléctricos), D (metales). Equipos de extinción: extintores de polvo químico seco (PQS) y dióxido de carbono (CO2). Uso del extintor - técnica PASS: Jalar el seguro. Apuntar a la base del fuego. Apretar la palanca. Barrer de un lado al otro hasta extinguir el fuego. Nunca dar la espalda al fuego al retirarse.`,
    normas_senalizacion:
      `Señalizaciones de Seguridad: ROJO = PELIGRO: letreros de color rojo se usan cuando existe un peligro o riesgo inmediato; también indican la ubicación de equipos de protección contra incendios. AMARILLO = PRECAUCIÓN: se usan para prevenir contra riesgos potenciales o acciones subestándar. VERDE = RECOMENDACIÓN: se usan para impartir conocimientos generales y sugerencias de seguridad; también indica circuitos de evacuación y zonas de seguridad. Todas las personas trabajadoras deben respetar las señalizaciones de seguridad de manera obligatoria.`,
    normas_pts_texto:
      `Procedimientos de Trabajo Seguro (PTS): Todas las tareas habituales de mediana o alta criticidad del cargo ${cargo} deben realizarse bajo los Procedimientos de Trabajo Seguro definidos por la empresa. El uso de PTS es obligatorio previo a la ejecución de cualquier actividad que implique un riesgo significativo. Revisar el AST antes de iniciar la tarea. Identificar peligros, evaluar riesgos y aplicar controles. Reportar cualquier condición insegura al supervisor antes de continuar.`,
    normas_protocolos_tabla: [
      {
        protocolo: "Protocolo Psicosocial (CEAL/SM)",
        aplica: "Sí",
        detalle: "Aplica a organizaciones con más de 10 trabajadores, enfocado en la vigilancia de la salud mental de los colaboradores.",
      },
      {
        protocolo: "Protocolo TMERT/MMC",
        aplica: "Sí",
        detalle: "Prevención de trastornos musculoesqueléticos relacionados con el trabajo, especialmente en actividades con manipulación manual de cargas, movimientos repetitivos o posturas forzadas.",
      },
    ],
    normas_quimicos:
      `Sustancias Químicas Peligrosas: En el desempeño de sus funciones, el trabajador puede estar expuesto a sustancias químicas según el cargo y el área de trabajo. Respetar siempre las Hojas de Datos de Seguridad (HDS) de los productos utilizados en el proceso. Ventilar adecuadamente el área cuando se utilicen productos químicos. Conocer los procedimientos ante derrames y emergencias con productos químicos. Usar EPP adecuado (guantes, gafas, mascarilla) al manipular sustancias químicas. No fumar ni generar chispas cerca de productos inflamables.`,
    // ── Legacy combinados ──────────────────────────────────────────────────
    normas_generales:
      `Cumplir el Reglamento Interno de Orden, Higiene y Seguridad. Usar EPP obligatorio en todo momento de exposición al riesgo. Reportar de inmediato incidentes, accidentes o condiciones inseguras a la jefatura. Participar activamente en capacitaciones y actividades de prevención. No operar equipos o maquinarias para los que no esté habilitado.`,
    protocolos_minsal:
      `Aplicar protocolos MINSAL vigentes según exposición y tareas: TMERT, MMC, Psicosocial (CEAL-SM), PREXOR y otros cuando corresponda.`,
    documentos_asociados:
      `PTS del cargo, AST diaria, matriz de riesgos, reglamento interno y registros de capacitación.`,
    emergencias_evacuacion:
      `En caso de emergencia: evacuar por vías señalizadas. Reunirse en el punto de encuentro designado. Esperar instrucciones del encargado de emergencia. Teléfonos de emergencia: Ambulancia 131 / Bomberos 132 / Carabineros 133.`,
    pts:
      `Revisar el AST antes de iniciar la tarea. Usar los EPP correspondientes. Reportar cualquier condición insegura al supervisor antes de continuar. Cumplir el PTS del cargo ${cargo}.`,
    // ── Sección 9: Documentos ─────────────────────────────────────────────
    documentos_pts_lista: [
      `PTS de Trabajo Seguro para el cargo ${cargo}`,
      "PTS de Uso Seguro de Equipos y Herramientas",
      "PTS de Orden y Aseo en Áreas de Trabajo",
      "PTS de Desplazamiento Seguro en la Empresa",
    ],
    documentos_hds_lista: [
      "Hojas de Datos de Seguridad de productos químicos presentes en el área de trabajo (si aplica).",
      "Hojas de Datos de Seguridad de productos de limpieza de uso general.",
    ],
    documentos_otros_lista: [
      "Evaluación ergonómica del puesto de trabajo (TMERT/MMC u otra metodología aplicada).",
      "Resultados y registros del Protocolo de Riesgos Psicosociales CEAL-SM.",
      "Registros de pausas activas y capacitaciones en seguridad.",
      "Registros de inducción en seguridad y normas internas de la empresa.",
    ],
    // ── Sección 10-11: Declaración y firmas ───────────────────────────────
    epp_induccion_tabla: [],
    compromisos_trabajador: [
      "Utilizar los Elementos de Protección Personal asignados en todo momento durante la exposición al riesgo.",
      "Reportar de inmediato incidentes, accidentes o condiciones inseguras a mi supervisor.",
      "Cumplir con los Procedimientos de Trabajo Seguro (PTS) del cargo.",
      "Participar activamente en las actividades de capacitación y prevención de riesgos.",
      "No operar equipos o maquinarias para los que no esté habilitado o capacitado.",
    ],
    declaracion:
      `Declaro haber recibido la Información sobre los Riesgos Laborales, impartida por ${empresa}. Dicha actividad contempla todos los puntos indicados en el presente documento y se ha llevado a cabo antes de mi ingreso a las instalaciones. Se me ha informado sobre los riesgos a los cuales estaré expuesto, las medidas de prevención que debo adoptar y las herramientas necesarias para su aplicación. Entiendo y acepto que el incumplimiento de las medidas de control señaladas puede derivar en un proceso sancionatorio según lo estipulado en el Reglamento Interno de Higiene y Seguridad.`,
    firma_trabajador: normalizarTexto(params.trabajadorNombre),
    firma_relator: "Relator / Prevencionista de Riesgos",
  };
}

function eppItemVacio(fecha: string): EppItem {
  return {
    descripcion: "",
    marca: "",
    modelo: "",
    color: "",
    talla: "",
    cantidad: 1,
    norma_tecnica: "",
    fecha_entrega: fecha,
    fecha_vencimiento_epp: "",
    si: true,
    no: false,
    firma_recepcion: "",
    observaciones: "",
  };
}

function camposEppBase(params: {
  trabajadorNombre: string;
  trabajadorRut: string;
  area?: string;
  fecha?: string;
}): DocumentoEppCampos {
  const fecha = params.fecha ?? fechaIsoActual();
  return {
    trabajador_nombre: normalizarTexto(params.trabajadorNombre),
    trabajador_rut: normalizarTexto(params.trabajadorRut),
    area: normalizarTexto(params.area),
    fecha,
    epp_tabla: [
      { ...eppItemVacio(fecha), descripcion: "Casco de seguridad", norma_tecnica: "NCh 1234" },
      { ...eppItemVacio(fecha), descripcion: "Lentes de seguridad", norma_tecnica: "NCh 1258 / ANSI Z87.1" },
      { ...eppItemVacio(fecha), descripcion: "Guantes de protección", norma_tecnica: "NCh 1286" },
      { ...eppItemVacio(fecha), descripcion: "Zapatos de seguridad", norma_tecnica: "NCh 1511" },
    ],
    observaciones_generales: "",
    declaracion:
      "Declaro haber recibido los EPP indicados y conocer su uso, cuidado y reposición.",
    firma_trabajador: normalizarTexto(params.trabajadorNombre),
    entregado_por: "Encargado SST",
  };
}

function isLegacyIrl(value: unknown): value is LegacyDocumentoIrlEstructurado {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyDocumentoIrlEstructurado>;
  return candidate.version === 1 && candidate.tipo === "irl";
}

function isLegacyEpp(value: unknown): value is LegacyDocumentoEppEstructurado {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyDocumentoEppEstructurado>;
  return candidate.version === 1 && candidate.tipo === "epp";
}

function convertirLegacyIrl(value: LegacyDocumentoIrlEstructurado): DocumentoIrlEstructurado {
  const riesgosGenerales = value.riesgosGenerales.map((item) =>
    crearFilaRiesgo(item, "", "Aplicar medidas preventivas definidas"),
  );
  const riesgosEspecificos = value.riesgosEspecificos.map((item) =>
    crearFilaRiesgo(item, "", "Aplicar procedimiento de trabajo seguro"),
  );

  const documentosAsociados = [
    ...value.pts.map((item) => item.trim()).filter(Boolean),
    ...value.epp.map((item) => item.trim()).filter(Boolean),
  ].join("\n");

  const extras = [
    ...value.riesgosMaquinasEquipos,
    ...value.riesgosQuimicos,
    ...value.riesgosPsicosociales,
  ].map((item) => item.trim()).filter(Boolean);

  return {
    plantillaCodigo: "IRL",
    version: 2,
    campos: {
      ...camposIrlBase({
        tipoNombre: value.introduccion.tipoInduccion,
        trabajadorNombre: value.identificacion.trabajadorNombre,
        trabajadorRut: value.identificacion.trabajadorRut,
        cargo: value.identificacion.cargo,
        area: value.identificacion.area,
        centroTrabajo: value.identificacion.centroTrabajo,
      }),
      modalidad: normalizarTexto(value.introduccion.modalidad, "Presencial"),
      tipo_actividad: normalizarTexto(value.introduccion.tipoActividad, "Información de riesgos del puesto de trabajo"),
      espacio_trabajo: normalizarTexto(value.identificacion.caracteristicasLugarTrabajo),
      riesgos_generales_tabla: riesgosGenerales.length ? riesgosGenerales : camposIrlBase({
        tipoNombre: value.introduccion.tipoInduccion,
        trabajadorNombre: value.identificacion.trabajadorNombre,
        trabajadorRut: value.identificacion.trabajadorRut,
        cargo: value.identificacion.cargo,
      }).riesgos_generales_tabla,
      riesgos_especificos_tabla: riesgosEspecificos.length ? riesgosEspecificos : camposIrlBase({
        tipoNombre: value.introduccion.tipoInduccion,
        trabajadorNombre: value.identificacion.trabajadorNombre,
        trabajadorRut: value.identificacion.trabajadorRut,
        cargo: value.identificacion.cargo,
      }).riesgos_especificos_tabla,
      protocolos_minsal: value.protocolos.join("\n"),
      documentos_asociados: documentosAsociados,
      normas_generales: value.emergencias.join("\n"),
      condiciones_ambientales: extras.join("\n"),
      declaracion: normalizarTexto(value.declaraciones.recepcionInformacion),
      firma_trabajador: normalizarTexto(value.firmas.trabajador),
      firma_relator: normalizarTexto(value.firmas.relatorPreventor),
    },
  };
}

function convertirLegacyEpp(value: LegacyDocumentoEppEstructurado): DocumentoEppEstructurado {
  return {
    plantillaCodigo: "EPP",
    version: 2,
    campos: {
      ...camposEppBase({
        trabajadorNombre: value.introduccion.trabajadorNombre,
        trabajadorRut: value.introduccion.trabajadorRut,
        area: value.introduccion.area,
      }),
      epp_tabla: value.filas.map((fila) => {
        const fecha = normalizarTexto(fila.fechaEntrega);
        return {
          descripcion: normalizarTexto(fila.descripcion),
          marca: normalizarTexto(fila.marca),
          modelo: normalizarTexto(fila.modelo),
          color: "",
          talla: "",
          cantidad: 1,
          norma_tecnica: "",
          fecha_entrega: fecha,
          fecha_vencimiento_epp: "",
          si: Boolean(fila.entregado),
          no: !fila.entregado,
          firma_recepcion: "",
          observaciones: normalizarTexto(fila.observaciones),
        };
      }),
      observaciones_generales: normalizarTexto(value.observacionesGenerales),
      declaracion: normalizarTexto(value.declaracionFinal),
      firma_trabajador: normalizarTexto(value.firmas.trabajador),
      entregado_por: normalizarTexto(value.firmas.empleador),
    },
  };
}

export function isDocumentoEstructurado(value: unknown): value is DocumentoEstructurado {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DocumentoEstructurado>;
  if (candidate.version !== 2) return false;
  if (candidate.plantillaCodigo !== "IRL" && candidate.plantillaCodigo !== "EPP") return false;
  return !!candidate.campos && typeof candidate.campos === "object";
}

/**
 * Migra un DocumentoEstructurado v2 al schema actual, rellenando campos nuevos
 * que no existían en versiones guardadas anteriormente.
 */
function migrarDocumentoEstructurado(doc: DocumentoEstructurado): DocumentoEstructurado {
  if (doc.plantillaCodigo === "EPP") {
    const base = camposEppBase({ trabajadorNombre: "", trabajadorRut: "" });
    return {
      ...doc,
      campos: {
        ...base,
        ...doc.campos,
        epp_tabla: (doc.campos.epp_tabla ?? []).map((item) => {
          const legacyItem = item as EppItem & { color_talla?: string };
          const colorTalla = legacyItem.color_talla ?? "";
          return {
            ...eppItemVacio(item.fecha_entrega ?? ""),
            ...item,
            color: item.color ?? colorTalla,
            talla: item.talla ?? "",
          };
        }),
      },
    };
  }

  if (doc.plantillaCodigo === "IRL") {
    const base = camposIrlBase({
      tipoNombre: doc.campos.tipo_induccion ?? "",
      trabajadorNombre: doc.campos.trabajador_nombre ?? "",
      trabajadorRut: doc.campos.trabajador_rut ?? "",
      cargo: doc.campos.cargo ?? "",
      area: doc.campos.trabajador_area,
    });
    // Cast doc.campos to partial to safely access new fields that old data may lack
    const old = doc.campos as Partial<DocumentoIrlCampos> & typeof doc.campos;
    return {
      ...doc,
      campos: {
        ...base,
        ...doc.campos,
        // Ensure all array fields fall back to base defaults if missing
        capacitaciones_previas: old.capacitaciones_previas ?? base.capacitaciones_previas,
        compromisos_trabajador: old.compromisos_trabajador ?? base.compromisos_trabajador,
        epp_induccion_tabla: old.epp_induccion_tabla ?? base.epp_induccion_tabla,
        riesgos_generales_tabla: old.riesgos_generales_tabla ?? base.riesgos_generales_tabla,
        riesgos_maquinas_tabla: old.riesgos_maquinas_tabla ?? base.riesgos_maquinas_tabla,
        riesgos_quimicos_tabla: old.riesgos_quimicos_tabla ?? base.riesgos_quimicos_tabla,
        riesgos_psicosociales_tabla: old.riesgos_psicosociales_tabla ?? base.riesgos_psicosociales_tabla,
        riesgos_especificos_tabla: old.riesgos_especificos_tabla ?? base.riesgos_especificos_tabla,
        riesgos_tareas_tabla: old.riesgos_tareas_tabla ?? base.riesgos_tareas_tabla,
        riesgos_lugar_tabla: old.riesgos_lugar_tabla ?? base.riesgos_lugar_tabla,
        normas_protocolos_tabla: old.normas_protocolos_tabla ?? base.normas_protocolos_tabla,
        documentos_pts_lista: old.documentos_pts_lista ?? base.documentos_pts_lista,
        documentos_hds_lista: old.documentos_hds_lista ?? base.documentos_hds_lista,
        documentos_otros_lista: old.documentos_otros_lista ?? base.documentos_otros_lista,
        // New text fields – use base if missing in stored data
        descripcion_actividad: old.descripcion_actividad ?? base.descripcion_actividad,
        tareas_realiza: old.tareas_realiza ?? base.tareas_realiza,
        lugares_trabajo_cargo: old.lugares_trabajo_cargo ?? base.lugares_trabajo_cargo,
        herramientas_equipos: old.herramientas_equipos ?? base.herramientas_equipos,
        epp_requerido_info: old.epp_requerido_info ?? base.epp_requerido_info,
        duracion_capacitacion: old.duracion_capacitacion ?? base.duracion_capacitacion,
        normas_ley16744: old.normas_ley16744 ?? base.normas_ley16744,
        normas_mmc: old.normas_mmc ?? base.normas_mmc,
        normas_emergencias_control: old.normas_emergencias_control ?? base.normas_emergencias_control,
        normas_emergencias_actuacion: old.normas_emergencias_actuacion ?? base.normas_emergencias_actuacion,
        normas_accidentes_graves: old.normas_accidentes_graves ?? base.normas_accidentes_graves,
        normas_epp_info: old.normas_epp_info ?? base.normas_epp_info,
        normas_ergonomia: old.normas_ergonomia ?? base.normas_ergonomia,
        normas_extintores: old.normas_extintores ?? base.normas_extintores,
        normas_senalizacion: old.normas_senalizacion ?? base.normas_senalizacion,
        normas_pts_texto: old.normas_pts_texto ?? base.normas_pts_texto,
        normas_quimicos: old.normas_quimicos ?? base.normas_quimicos,
      },
    };
  }

  return doc;
}

export function parseDocumentoEstructurado(contenido: string | null | undefined): DocumentoEstructurado | null {
  const raw = contenido?.trim();
  if (!raw) return null;

  const candidates: string[] = [raw];

  const withoutComments = raw.replace(/^(?:<!--[^]*?-->\s*)+/, "").trim();
  if (withoutComments && withoutComments !== raw) {
    candidates.push(withoutComments);
  }

  const fencedMatch = withoutComments.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = withoutComments.indexOf("{");
  const lastBrace = withoutComments.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(withoutComments.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isDocumentoEstructurado(parsed)) {
        return migrarDocumentoEstructurado(parsed);
      }
      if (isLegacyIrl(parsed)) {
        return convertirLegacyIrl(parsed);
      }
      if (isLegacyEpp(parsed)) {
        return convertirLegacyEpp(parsed);
      }
    } catch {
      // Try next representation.
    }
  }

  return null;
}

export function serializarDocumentoEstructurado(doc: DocumentoEstructurado): string {
  return JSON.stringify(doc, null, 2);
}

export function crearDocumentoIrlEstructurado(params: {
  tipoNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  area?: string;
  centroTrabajo?: string;
  empresa?: string;
  fecha?: string;
}): DocumentoIrlEstructurado {
  return {
    plantillaCodigo: "IRL",
    version: 2,
    campos: camposIrlBase(params),
  };
}

export function crearDocumentoEppEstructurado(params: {
  tipoNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  area?: string;
  empresa?: string;
  fecha?: string;
}): DocumentoEppEstructurado {
  void params.cargo;
  void params.empresa;

  return {
    plantillaCodigo: "EPP",
    version: 2,
    campos: camposEppBase({
      trabajadorNombre: params.trabajadorNombre,
      trabajadorRut: params.trabajadorRut,
      area: params.area,
      fecha: params.fecha,
    }),
  };
}
