/**
 * cumplimiento-engine.ts
 *
 * Motor de cumplimiento automático.
 * Evalúa obligaciones contra documentos reales en lugar de estados manuales.
 *
 * Arquitectura:
 *   cumplimiento-engine  →  pure functions, no React, no app/* imports
 *   obligaciones/page    →  puede seguir usando ObligacionCumplimiento con estados
 *                           derivados por este motor en vez de ser manuales
 *   documentacion/page   →  pasa documentos como DocumentoEvaluable via fromDocumento()
 *   acreditaciones       →  pasa DocumentoBase via fromDocumentoBase()
 *
 * En producción este motor consultará Firestore en tiempo real.
 * Por ahora opera sobre datos en memoria passados como parámetros.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos base del motor (sin importar de app/*)
// ─────────────────────────────────────────────────────────────────────────────

export type EntidadTipo = "empresa" | "centro" | "trabajador" | "vehiculo";

export type EstadoCumplimiento = "cumplido" | "pendiente" | "vencido";

export type FuenteTipo = "documento" | "capacitacion" | "manual";

/**
 * Clasificación de tamaño de empresa según número de trabajadores.
 *   micro    : < 10
 *   pequena  : 10 – 49
 *   mediana  : 50 – 199
 *   grande   : ≥ 200
 */
export type TamanoEmpresa = "micro" | "pequena" | "mediana" | "grande";

/**
 * Obligación que el motor acepta como input.
 * Compatible con ObligacionCumplimiento de cumplimiento/types.ts.
 */
export interface ObligacionInput {
  id: string;
  nombre: string;
  tipo?: string;
  /** Fecha límite global de la obligación (ISO date string, ej: "2026-06-30") */
  vencimiento?: string;
  /**
   * Tamaños de empresa a los que aplica esta obligación.
   * Cuando está vacío o ausente la obligación aplica a todos los tamaños.
   */
  tamañosAplica?: TamanoEmpresa[];
}

/**
 * Entidad sobre la que se evalúa el cumplimiento.
 */
export interface EntidadInput {
  id: string;
  tipo: EntidadTipo;
}

/**
 * Documento normalizado que el motor puede consumir.
 * Crear instancias mediante los adaptadores fromDocumento() / fromDocumentoBase().
 */
export interface DocumentoEvaluable {
  /** ID único del documento fuente */
  id: string;
  /** Nombre o etiqueta del documento */
  nombre: string;
  /** Tipo o categoría (ej: "certificado", "contrato", "plan") */
  tipo?: string;
  /** Entidad propietaria del documento */
  entidadId: string;
  entidadTipo: EntidadTipo;
  /**
   * Vínculo explícito a una obligación.
   * Si está presente, el motor lo prioriza para el matching.
   */
  obligacionId?: string;
  /** Fecha de vencimiento del documento (ISO date string, ej: "2026-12-31") */
  fechaVencimiento?: string;
}

/**
 * Resultado de evaluar UNA obligación para UNA entidad.
 */
export interface EvaluacionCumplimiento {
  obligacionId: string;
  /** Nombre de la obligación (para mostrar en UI sin joins) */
  obligacionNombre: string;
  entidadId: string;
  entidadTipo: EntidadTipo;
  /** Estado determinado automáticamente */
  estado: EstadoCumplimiento;
  /** Origen del dato que permitió determinarlo */
  fuenteTipo: FuenteTipo;
  /** ID del documento fuente (undefined cuando estado = "pendiente") */
  fuenteId?: string;
  /** Fecha de vencimiento del documento fuente, si aplica */
  fechaVencimiento?: string;
  /** Timestamp ISO en que se realizó la evaluación */
  evaluadoEl: string;
}

/**
 * Resumen de cumplimiento para una sola entidad.
 */
export interface ResultadoEntidad {
  entidadId: string;
  entidadTipo: EntidadTipo;
  evaluaciones: EvaluacionCumplimiento[];
  totalObligaciones: number;
  cumplidas: number;
  vencidas: number;
  pendientes: number;
  /** 0-100, redondo. Solo cuenta "cumplido" como aprobado. */
  porcentajeCumplimiento: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de fecha
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el tamaño de empresa según cantidad de trabajadores.
 *   < 10   → "micro"
 *   10-49  → "pequena"
 *   50-199 → "mediana"
 *   ≥ 200  → "grande"
 */
export function calcularTamañoEmpresa(cantidadTrabajadores: number): TamanoEmpresa {
  if (cantidadTrabajadores < 10) return "micro";
  if (cantidadTrabajadores < 50) return "pequena";
  if (cantidadTrabajadores < 200) return "mediana";
  return "grande";
}

/**
 * Compara una fecha de vencimiento ISO contra hoy.
 * - Sin fecha → "cumplido" (no hay plazo que verificar)
 * - Fecha futura o igual a hoy → "cumplido"
 * - Fecha pasada → "vencido"
 */
export function clasificarFecha(
  fechaVencimiento: string | undefined,
  hoy: Date
): "cumplido" | "vencido" {
  if (!fechaVencimiento) return "cumplido";
  // Comparamos solo la parte de fecha (yyyy-mm-dd) para evitar offset TZ
  const venc = new Date(fechaVencimiento + "T00:00:00");
  const hoyNorm = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate()
  );
  return venc >= hoyNorm ? "cumplido" : "vencido";
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encuentra documentos relevantes para una obligación + entidad.
 *
 * Prioridad de matching (de mayor a menor):
 *   1. doc.obligacionId === obligacion.id  (vínculo explícito)
 *   2. doc.nombre incluye el nombre de la obligación (fuzzy)
 *   3. doc.tipo === obligacion.tipo  (coincidencia por categoría)
 */
function matchDocumentos(
  obligacion: ObligacionInput,
  docs: DocumentoEvaluable[],
  entidad: EntidadInput
): DocumentoEvaluable[] {
  const docsDeEntidad = docs.filter(
    (d) => d.entidadId === entidad.id && d.entidadTipo === entidad.tipo
  );

  // 1. Vínculo explícito
  const vinculados = docsDeEntidad.filter(
    (d) => d.obligacionId === obligacion.id
  );
  if (vinculados.length > 0) return vinculados;

  // 2. Nombre de obligación incluido en nombre de documento (case-insensitive)
  const palabrasClave = obligacion.nombre
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4); // palabras significativas

  const porNombre = docsDeEntidad.filter((d) =>
    palabrasClave.some((kw) => d.nombre.toLowerCase().includes(kw))
  );
  if (porNombre.length > 0) return porNombre;

  // 3. Coincidencia por tipo
  if (obligacion.tipo) {
    const porTipo = docsDeEntidad.filter(
      (d) => d.tipo?.toLowerCase() === obligacion.tipo!.toLowerCase()
    );
    if (porTipo.length > 0) return porTipo;
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluadores principales
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evalúa UNA obligación para UNA entidad.
 *
 * Lógica:
 *   - Si hay documentos que coinciden:
 *       - Busca el más favorable (vigente si existe alguno)
 *       - Si el mejor está vigente → "cumplido"
 *       - Si todos están vencidos → "vencido"
 *   - Si no hay documentos → "pendiente"
 *
 * La obligación global también puede tener su propio `vencimiento`.
 * Si el documento está OK pero la obligación venció → "vencido".
 */
export function evaluarObligacion(
  obligacion: ObligacionInput,
  docs: DocumentoEvaluable[],
  entidad: EntidadInput,
  hoy: Date = new Date()
): EvaluacionCumplimiento {
  const evaluadoEl = hoy.toISOString();
  const candidatos = matchDocumentos(obligacion, docs, entidad);

  // Sin documentos → pendiente
  if (candidatos.length === 0) {
    return {
      obligacionId: obligacion.id,
      obligacionNombre: obligacion.nombre,
      entidadId: entidad.id,
      entidadTipo: entidad.tipo,
      estado: "pendiente",
      fuenteTipo: "manual",
      evaluadoEl,
    };
  }

  // Con documentos: preferir el vigente; si todos vencidos → "vencido"
  const vigente = candidatos.find(
    (d) => clasificarFecha(d.fechaVencimiento, hoy) === "cumplido"
  );
  const mejor = vigente ?? candidatos[0];
  const estadoDoc = clasificarFecha(mejor.fechaVencimiento, hoy);

  // Verificar también si la obligación global venció
  const estadoObligGlobal = clasificarFecha(obligacion.vencimiento, hoy);
  const estado: EstadoCumplimiento =
    estadoDoc === "vencido" || estadoObligGlobal === "vencido"
      ? "vencido"
      : "cumplido";

  return {
    obligacionId: obligacion.id,
    obligacionNombre: obligacion.nombre,
    entidadId: entidad.id,
    entidadTipo: entidad.tipo,
    estado,
    fuenteTipo: "documento",
    fuenteId: mejor.id,
    fechaVencimiento: mejor.fechaVencimiento ?? obligacion.vencimiento,
    evaluadoEl,
  };
}

/**
 * Evalúa TODAS las obligaciones para TODAS las entidades entregadas.
 * Retorna una lista plana de evaluaciones (N obligaciones × M entidades).
 *
 * @param tamanoEmpresa - Opcional. Cuando se indica, las obligaciones con
 *   `tamañosAplica` definidos se filtran: solo se evalúan aquellas que
 *   incluyen el tamaño actual. Obligaciones sin `tamañosAplica` (o con
 *   array vacío) siempre se evalúan.
 */
export function evaluarObligaciones(
  obligaciones: ObligacionInput[],
  docs: DocumentoEvaluable[],
  entidades: EntidadInput[],
  hoy: Date = new Date(),
  tamanoEmpresa?: TamanoEmpresa
): EvaluacionCumplimiento[] {
  const obligacionesAplicables = tamanoEmpresa
    ? obligaciones.filter(
        (o) =>
          !o.tamañosAplica?.length || o.tamañosAplica.includes(tamanoEmpresa)
      )
    : obligaciones;

  const resultados: EvaluacionCumplimiento[] = [];
  for (const entidad of entidades) {
    for (const obligacion of obligacionesAplicables) {
      resultados.push(evaluarObligacion(obligacion, docs, entidad, hoy));
    }
  }
  return resultados;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agregación por entidad
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el resumen de cumplimiento para UNA entidad dada
 * a partir del array de evaluaciones ya calculadas.
 */
export function calcularResultadoEntidad(
  entidad: EntidadInput,
  evaluaciones: EvaluacionCumplimiento[]
): ResultadoEntidad {
  const mine = evaluaciones.filter(
    (e) => e.entidadId === entidad.id && e.entidadTipo === entidad.tipo
  );
  const total = mine.length;
  const cumplidas = mine.filter((e) => e.estado === "cumplido").length;
  const vencidas = mine.filter((e) => e.estado === "vencido").length;
  const pendientes = mine.filter((e) => e.estado === "pendiente").length;
  const porcentajeCumplimiento =
    total === 0 ? 0 : Math.round((cumplidas / total) * 100);

  return {
    entidadId: entidad.id,
    entidadTipo: entidad.tipo,
    evaluaciones: mine,
    totalObligaciones: total,
    cumplidas,
    vencidas,
    pendientes,
    porcentajeCumplimiento,
  };
}

/**
 * Calcula el resumen de cumplimiento para CADA entidad de la lista.
 * Retorna un `ResultadoEntidad` por cada elemento de `entidades`.
 */
export function calcularResultadosPorEntidad(
  evaluaciones: EvaluacionCumplimiento[],
  entidades: EntidadInput[]
): ResultadoEntidad[] {
  return entidades.map((e) => calcularResultadoEntidad(e, evaluaciones));
}

/**
 * Porcentaje global de cumplimiento sobre TODO el array de evaluaciones,
 * independiente de entidad.
 */
export function porcentajeGlobal(
  evaluaciones: EvaluacionCumplimiento[]
): number {
  if (evaluaciones.length === 0) return 0;
  const cumplidas = evaluaciones.filter((e) => e.estado === "cumplido").length;
  return Math.round((cumplidas / evaluaciones.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Retrocompatibilidad con ObligacionCumplimiento (cumplimiento/types.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tipo que describe el subconjunto de EstadoObligacion que este motor puede inferir.
 * "con_brechas" no se infiere a nivel individual: requiere comparación entre entidades.
 */
export type EstadoObligacionDerived =
  | "cumplida"
  | "con_brechas"
  | "no_cumplida";

/**
 * Convierte EstadoCumplimiento → EstadoObligacion (terminología del módulo DS44 / cumplimiento).
 *   cumplido  → "cumplida"
 *   vencido   → "con_brechas"  (el documento existe pero no está vigente)
 *   pendiente → "no_cumplida"
 */
export function toEstadoObligacion(
  estado: EstadoCumplimiento
): EstadoObligacionDerived {
  const map: Record<EstadoCumplimiento, EstadoObligacionDerived> = {
    cumplido: "cumplida",
    vencido: "con_brechas",
    pendiente: "no_cumplida",
  };
  return map[estado];
}

/**
 * A partir de las evaluaciones ya calculadas, reconstruye el mapa
 * `estadosPorCentro` y el `cumplimientoGlobal` que usa ObligacionCumplimiento,
 * permitiendo actualizar los datos legacy sin cambiar la UI existente.
 *
 * @param obligacionId  - ID de la obligación a actualizar
 * @param evaluaciones  - resultado de evaluarObligaciones()
 * @returns { estadosPorCentro, cumplimientoGlobal }
 */
export function deriveEstadosObligacion(
  obligacionId: string,
  evaluaciones: EvaluacionCumplimiento[]
): {
  estadosPorCentro: Record<string, EstadoObligacionDerived>;
  cumplimientoGlobal: number;
} {
  const relacionadas = evaluaciones.filter(
    (e) => e.obligacionId === obligacionId
  );

  const estadosPorCentro: Record<string, EstadoObligacionDerived> = {};
  for (const ev of relacionadas) {
    estadosPorCentro[ev.entidadId] = toEstadoObligacion(ev.estado);
  }

  const total = relacionadas.length;
  const cumplidas = relacionadas.filter((e) => e.estado === "cumplido").length;
  const cumplimientoGlobal =
    total === 0 ? 0 : Math.round((cumplidas / total) * 100);

  return { estadosPorCentro, cumplimientoGlobal };
}

/**
 * Aplica los estados derivados del motor sobre un array de ObligacionCumplimiento,
 * devolviendo una copia actualizada (sin mutar el original).
 *
 * Uso típico en un useMemo o al cargar la página de obligaciones:
 * ```ts
 * const obligacionesVivas = enriquecerObligaciones(OBLIGACIONES_MOCK, evaluaciones);
 * ```
 */
export function enriquecerObligaciones<
  T extends {
    id: string;
    estadosPorCentro: Record<string, string>;
    cumplimientoGlobal: number;
  }
>(obligaciones: T[], evaluaciones: EvaluacionCumplimiento[]): T[] {
  return obligaciones.map((ob) => {
    const { estadosPorCentro, cumplimientoGlobal } = deriveEstadosObligacion(
      ob.id,
      evaluaciones
    );
    // Solo sobrescribimos si hay evaluaciones para esta obligación
    if (Object.keys(estadosPorCentro).length === 0) return ob;
    return { ...ob, estadosPorCentro, cumplimientoGlobal };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Adaptadores — convierten tipos existentes a DocumentoEvaluable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adaptador para Documento (documentacion/types.ts).
 *
 * @param doc          - Instancia de Documento
 * @param entidadId    - ID de la entidad (empresa, centro, etc.)
 * @param entidadTipo  - Tipo de la entidad
 * @param obligacionId - Opcional: ID de ObligacionCumplimiento relacionada
 */
export function fromDocumento(
  doc: {
    id: string;
    nombre: string;
    tipo: string;
    fechaVencimiento: string;
  },
  entidadId: string,
  entidadTipo: EntidadTipo,
  obligacionId?: string
): DocumentoEvaluable {
  return {
    id: doc.id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    entidadId,
    entidadTipo,
    obligacionId,
    fechaVencimiento: doc.fechaVencimiento,
  };
}

/**
 * Adaptador para DocumentoBase de acreditaciones.
 *
 * @param doc          - Objeto con id, nombre, tipo, estado, fechaVencimiento
 * @param entidadId    - ID de la entidad
 * @param entidadTipo  - Tipo de la entidad
 * @param obligacionId - Opcional: ID de ObligacionCumplimiento relacionada
 */
export function fromDocumentoBase(
  doc: {
    id: string;
    nombre: string;
    tipo?: string;
    fechaVencimiento?: string;
  },
  entidadId: string,
  entidadTipo: EntidadTipo,
  obligacionId?: string
): DocumentoEvaluable {
  return {
    id: doc.id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    entidadId,
    entidadTipo,
    obligacionId,
    fechaVencimiento: doc.fechaVencimiento,
  };
}

/**
 * Adaptador para documentos de trabajador (trabajadores-v2).
 * Acepta cualquier objeto con campos de documento de trabajador.
 */
export function fromDocumentoTrabajador(
  doc: {
    id: string;
    nombre: string;
    tipo?: string;
    fechaVencimiento?: string;
  },
  trabajadorId: string,
  obligacionId?: string
): DocumentoEvaluable {
  return {
    id: doc.id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    entidadId: trabajadorId,
    entidadTipo: "trabajador",
    obligacionId,
    fechaVencimiento: doc.fechaVencimiento,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generación automática de hallazgos desde evaluaciones
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tipo de hallazgo generado automáticamente por el motor.
 *   "faltante" — no existe evidencia documental (estado = "pendiente")
 *   "vencido"  — la documentación existe pero está vencida (estado = "vencido")
 */
export type TipoHallazgoGenerado = "faltante" | "vencido";

export type PrioridadGenerada = "critica" | "alta" | "media" | "baja";

/**
 * Hallazgo generado automáticamente por el motor de cumplimiento.
 * Es independiente del tipo `Hallazgo` de UI (cumplimiento/types.ts) y puede
 * convertirse a él mediante un adaptador en la capa de presentación.
 */
export interface HallazgoGenerado {
  /** Clave derivada: `auto-{obligacionId}-{entidadId}` */
  id: string;
  obligacionId: string;
  obligacionNombre: string;
  entidadId: string;
  entidadTipo: EntidadTipo;
  /** "faltante" si no hay documento; "vencido" si existe pero caducó */
  tipo: TipoHallazgoGenerado;
  prioridad: PrioridadGenerada;
  /** Título corto, apto para encabezado */
  titulo: string;
  /** Descripción detallada del problema detectado */
  descripcion: string;
  /** Origen del dato evaluado */
  fuenteTipo: FuenteTipo;
  /** ID del documento fuente (undefined cuando tipo = "faltante") */
  fuenteId?: string;
  /** Fecha de vencimiento del documento fuente, si aplica */
  fechaVencimiento?: string;
  /** ISO timestamp de cuando se generó el hallazgo */
  generadoEl: string;
}

/**
 * Genera hallazgos automáticos a partir de evaluaciones ya calculadas.
 *
 * Reglas:
 *   - estado = "pendiente" → tipo "faltante", prioridad "media"
 *   - estado = "vencido"   → tipo "vencido",  prioridad "alta"
 *   - estado = "cumplido"  → ignorado (no genera hallazgo)
 *
 * Esta función es pura: no filtra duplicados contra hallazgos manuales.
 * La deduplicación es responsabilidad de la capa que consume el resultado.
 *
 * @param evaluaciones - Resultado de `evaluarObligaciones()`
 * @returns Array de `HallazgoGenerado`, uno por evaluación no cumplida
 */
export function generarHallazgosDesdeEvaluaciones(
  evaluaciones: EvaluacionCumplimiento[]
): HallazgoGenerado[] {
  const generadoEl = new Date().toISOString();

  return evaluaciones
    .filter((ev) => ev.estado === "pendiente" || ev.estado === "vencido")
    .map<HallazgoGenerado>((ev) => {
      const tipo: TipoHallazgoGenerado =
        ev.estado === "vencido" ? "vencido" : "faltante";

      const prioridad: PrioridadGenerada =
        ev.estado === "vencido" ? "alta" : "media";

      const titulo =
        ev.estado === "vencido"
          ? `Documento vencido: ${ev.obligacionNombre}`
          : `Sin evidencia documental: ${ev.obligacionNombre}`;

      const descripcion =
        ev.estado === "vencido"
          ? `La obligación "${ev.obligacionNombre}" tiene documentación vencida (entidad: ${ev.entidadId}). Fuente: ${ev.fuenteId ?? "desconocida"}.`
          : `La obligación "${ev.obligacionNombre}" no tiene documentación registrada para la entidad ${ev.entidadId}.`;

      return {
        id: `auto-${ev.obligacionId}-${ev.entidadId}`,
        obligacionId: ev.obligacionId,
        obligacionNombre: ev.obligacionNombre,
        entidadId: ev.entidadId,
        entidadTipo: ev.entidadTipo,
        tipo,
        prioridad,
        titulo,
        descripcion,
        fuenteTipo: ev.fuenteTipo,
        fuenteId: ev.fuenteId,
        fechaVencimiento: ev.fechaVencimiento,
        generadoEl,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adaptador para certificados / documentos de vehículo (vehiculos-store).
 */
export function fromDocumentoVehiculo(
  doc: {
    id: string;
    nombre: string;
    tipo?: string;
    fechaVencimiento?: string;
  },
  vehiculoId: string,
  obligacionId?: string
): DocumentoEvaluable {
  return {
    id: doc.id,
    nombre: doc.nombre,
    tipo: doc.tipo,
    entidadId: vehiculoId,
    entidadTipo: "vehiculo",
    obligacionId,
    fechaVencimiento: doc.fechaVencimiento,
  };
}
