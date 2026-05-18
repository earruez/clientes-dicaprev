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
  // ── Identificación ──────────────────────────────────────────────────────────
  empresa_nombre: string;
  empresa_contratista: string;
  empresa_mandante: string;
  codigo_documento: string;
  version: string;
  cargo: string;
  anio: string;
  tipo_induccion: string;
  modalidad: string;
  tipo_actividad: string;
  // ── Datos del trabajador ────────────────────────────────────────────────────
  trabajador_nombre: string;
  trabajador_rut: string;
  trabajador_cargo: string;
  trabajador_area: string;
  fecha: string;
  jornada: string;
  turno: string;
  hora_inicio: string;
  hora_termino: string;
  telefono_emergencia: string;
  // ── Lugar e instalaciones ───────────────────────────────────────────────────
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
  // ── Riesgos ─────────────────────────────────────────────────────────────────
  riesgos_generales_tabla: IrlRiesgoFila[];
  riesgos_especificos_tabla: IrlRiesgoFila[];
  // ── Normativa y protocolos ──────────────────────────────────────────────────
  normas_generales: string;
  protocolos_minsal: string;
  documentos_asociados: string;
  // ── Secciones adicionales ───────────────────────────────────────────────────
  emergencias_evacuacion: string;
  pts: string;
  epp_induccion_tabla: IrlEppItem[];
  compromisos_trabajador: string[];
  // ── Cierre ──────────────────────────────────────────────────────────────────
  declaracion: string;
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

  return {
    empresa_nombre: empresa,
    empresa_contratista: "",
    empresa_mandante: empresa,
    codigo_documento: "NEXTPREV TEMPLATE-01",
    version: "1.0",
    cargo: normalizarTexto(params.cargo),
    anio: anioActual(),
    tipo_induccion: normalizarTexto(params.tipoNombre, "Información de Riesgos Laborales"),
    modalidad: "Presencial",
    tipo_actividad: "Información de riesgos del puesto de trabajo",
    trabajador_nombre: normalizarTexto(params.trabajadorNombre),
    trabajador_rut: normalizarTexto(params.trabajadorRut),
    trabajador_cargo: normalizarTexto(params.cargo),
    trabajador_area: normalizarTexto(params.area),
    fecha,
    jornada: "Diurna",
    turno: "Mañana",
    hora_inicio: "08:00",
    hora_termino: "17:00",
    telefono_emergencia: "",
    direccion_lugar_trabajo: normalizarTexto(params.centroTrabajo),
    lugar_trabajo: normalizarTexto(params.centroTrabajo),
    espacio_trabajo:
      "Ambiente operativo con interacción de herramientas, equipos y desplazamiento en áreas de trabajo.",
    condiciones_ambientales:
      "Condiciones variables de temperatura, ruido y circulación de personal según jornada.",
    orden_aseo:
      "Mantener pasillos despejados, retiro de residuos y correcta segregación de materiales.",
    prevencionista_nombre: "",
    prevencionista_cargo: "Prevencionista de Riesgos",
    accidentes_anteriores: "Sin accidentes previos registrados.",
    capacitaciones_previas: [
      "Inducción general de empresa",
    ],
    riesgos_generales_tabla: [
      crearFilaRiesgo("Caídas al mismo y distinto nivel", "Contusiones, esguinces o fracturas", "Uso de calzado de seguridad y orden de superficies"),
      crearFilaRiesgo("Golpes o atrapamientos", "Traumatismos y laceraciones", "Aplicar procedimiento seguro y distancia de seguridad"),
      crearFilaRiesgo("Sobreesfuerzo", "Lesiones musculoesqueléticas", "Técnica correcta de manipulación y pausas activas"),
    ],
    riesgos_especificos_tabla: [
      crearFilaRiesgo("Riesgos propios del cargo", "Accidente laboral", "Cumplir instrucciones y AST de la tarea"),
      crearFilaRiesgo("Exposición por desorden operacional", "Caídas y golpes", "Aplicar estándar de orden y aseo permanente"),
    ],
    normas_generales:
      "Cumplir reglamento interno, usar EPP obligatorio y reportar condiciones inseguras de inmediato.",
    protocolos_minsal: "Aplicar protocolos MINSAL vigentes de acuerdo con exposición y tareas.",
    documentos_asociados: "AST, PTS del cargo, matriz de riesgos y registros de capacitación.",
    emergencias_evacuacion:
      "En caso de emergencia: evacuar por vías señalizadas, reunirse en punto de encuentro y esperar instrucciones del encargado de emergencia. Teléfono emergencia: 131 (Bomberos) / 132 (Ambulancia).",
    pts: "Procedimiento de Trabajo Seguro (PTS): revisar el ART antes de iniciar la tarea, usar los EPP correspondientes, reportar cualquier condición insegura al supervisor antes de continuar.",
    epp_induccion_tabla: [
      { descripcion: "Casco de seguridad", cantidad: 1, entregado: true, observaciones: "" },
      { descripcion: "Lentes de seguridad", cantidad: 1, entregado: true, observaciones: "" },
      { descripcion: "Guantes de protección", cantidad: 1, entregado: true, observaciones: "" },
      { descripcion: "Zapatos de seguridad", cantidad: 1, entregado: true, observaciones: "" },
    ],
    compromisos_trabajador: [
      "Usaré correctamente los EPP asignados en todo momento durante la jornada.",
      "Reportaré inmediatamente cualquier condición insegura o accidente a mi supervisor.",
      "Cumpliré el Reglamento Interno de Orden, Higiene y Seguridad.",
      "Participaré en las capacitaciones y actividades de prevención que me convoquen.",
      "No operaré equipos o maquinarias para los que no esté habilitado.",
    ],
    declaracion:
      `Declaro haber recibido y comprendido la información de riesgos laborales con fecha ${fecha}.`,
    firma_trabajador: normalizarTexto(params.trabajadorNombre),
    firma_relator: "Relator / Prevencionista",
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
    });
    return {
      ...doc,
      campos: {
        ...base,
        ...doc.campos,
        // Ensure new array fields are arrays even if missing in old data
        capacitaciones_previas: doc.campos.capacitaciones_previas ?? base.capacitaciones_previas,
        compromisos_trabajador: doc.campos.compromisos_trabajador ?? base.compromisos_trabajador,
        epp_induccion_tabla: doc.campos.epp_induccion_tabla ?? base.epp_induccion_tabla,
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
