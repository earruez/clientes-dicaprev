import { calcularCumplimientoEmpresa } from "@/lib/documentacion/cumplimiento-empresa";
import { cumpleCondicionesDocumento } from "@/lib/documentacion/cumplimiento-documento";
import {
  construirContenidoBasePlantilla,
  getPlantilla,
  normalizarCodigoPlantilla,
  validarContenidoContraPlantilla,
  type PlantillaDocumento,
} from "@/lib/documentacion/plantillas-documento";
import { REGLAS_DOCUMENTALES, type ReglaDocumentalNextPrev } from "@/lib/documentacion/reglas-documentales";
import { prisma } from "@/lib/prisma";

type GenerarContenidoContexto = {
  empresa: {
    nombre: string;
    giro: string | null;
    tipoEmpresa: string | null;
    tamanoEmpresa: string | null;
  };
  trabajador?: {
    id: string;
    nombreCompleto: string;
  };
  industria: string;
  riesgos: string[];
};

/** Salida estructurada del generador de contenido IA. */
export type ContenidoGeneradoIA = {
  contenido: string;
  version: number;
  generadoPor: "IA";
  fecha: Date;
};

export type GeneracionDocumentoItem = {
  reglaId: string;
  codigo: string;
  nombre: string;
  entidad: "empresa" | "trabajador";
  accion: "generado" | "actualizado" | "omitido";
  documentoId: string | null;
  trabajadorId?: string;
};

export type GenerarDocumentosFaltantesResultado = {
  generados: number;
  actualizados: number;
  omitidos: number;
  items: GeneracionDocumentoItem[];
  logId: string | null;
};

type ResultadoGeneracionContenido = {
  data: ContenidoGeneradoIA;
  usoIA: boolean;
  errorIA: boolean;
};

type PlantillaMetadata = {
  plantillaCodigo: string;
  plantillaVersion: string | null;
  completitudPlantilla: number;
  seccionesFaltantes: string[];
};

type ResultadoValidacionPlantillaInterna = {
  plantilla: PlantillaDocumento | null;
  metadata: PlantillaMetadata | null;
  requiereRevisionBajaCompletitud: boolean;
};

type PlantillaDocumentoEfectiva = {
  codigo: string;
  version: string | null;
  fuente: "empresa" | "base";
  contenidoBase: string;
  plantillaBase: PlantillaDocumento | null;
};

// ─────────────────────────────────────────────
// CONTROL DE EJECUCIÓN – flag por empresa (singleton en proceso)
// ─────────────────────────────────────────────

const _ejecucionEnCurso = new Map<string, boolean>();

function marcarEnCurso(empresaId: string): boolean {
  if (_ejecucionEnCurso.get(empresaId)) return false;
  _ejecucionEnCurso.set(empresaId, true);
  return true;
}

function liberarEjecucion(empresaId: string): void {
  _ejecucionEnCurso.delete(empresaId);
}

const MAX_CONTENIDO_CHARS = 4000;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_MAX_TOKENS = 900;

// Cache de prompts para bajar costo y evitar llamadas redundantes en una misma ejecución.
const _cacheContenido = new Map<string, ResultadoGeneracionContenido>();

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferIndustria(empresa: { tipoEmpresa: string | null; giro: string | null }) {
  const source = normalizeToken(`${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""}`);
  if (source.includes("constru")) return "construccion";
  if (source.includes("manufact")) return "manufactura";
  if (source.includes("miner")) return "mineria";
  if (source.includes("logist") || source.includes("transport")) return "logistica_transporte";
  if (source.includes("agro")) return "agroindustria";
  if (source.includes("alimento")) return "alimentos";
  if (source.includes("salud")) return "salud";
  if (source.includes("comerc")) return "comercio";
  return "servicios";
}

function inferRiesgos(input: {
  empresa: { tipoEmpresa: string | null; giro: string | null };
  regla: ReglaDocumentalNextPrev;
  trabajador?: { cargoPerfil: string | null; cargoDescripcion: string | null };
}) {
  const fromRule = input.regla.aplica.riesgos
    .map((item) => normalizeToken(item))
    .filter((item) => item && item !== "general" && item !== "todos");

  const source = normalizeToken(
    `${input.empresa.tipoEmpresa ?? ""} ${input.empresa.giro ?? ""} ${input.trabajador?.cargoPerfil ?? ""} ${input.trabajador?.cargoDescripcion ?? ""}`,
  );

  const inferred: string[] = [];
  if (source.includes("ruido")) inferred.push("ruido");
  if (source.includes("silice") || source.includes("silica")) inferred.push("silice");
  if (source.includes("uv") || source.includes("radiacion")) inferred.push("uv");
  if (source.includes("tmert")) inferred.push("tmert");
  if (source.includes("psicosocial")) inferred.push("psicosocial");

  return Array.from(new Set([...fromRule, ...inferred]));
}

function extractHeadingsFromContenidoBase(contenidoBase: string): string[] {
  return contenidoBase
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, "").trim())
    .filter(Boolean);
}

async function resolverPlantillaDocumentoEfectiva(
  empresaId: string,
  doc: ReglaDocumentalNextPrev,
): Promise<PlantillaDocumentoEfectiva | null> {
  const plantillaBase = getPlantilla(doc.codigo, doc.nombre);
  if (!plantillaBase) return null;

  const codigoCanonico = normalizarCodigoPlantilla(plantillaBase.codigo);

  if (codigoCanonico !== "IRL" && codigoCanonico !== "EPP") {
    return {
      codigo: plantillaBase.codigo,
      version: plantillaBase.version ?? null,
      fuente: "base",
      contenidoBase: construirContenidoBasePlantilla(plantillaBase),
      plantillaBase,
    };
  }

  const plantillaEmpresa = await prisma.plantillaDocumentoEmpresa.findUnique({
    where: {
      empresaId_codigo: {
        empresaId,
        codigo: codigoCanonico,
      },
    },
    select: {
      codigo: true,
      version: true,
      contenidoBase: true,
      activa: true,
    },
  });

  if (plantillaEmpresa && plantillaEmpresa.activa) {
    return {
      codigo: plantillaEmpresa.codigo,
      version: plantillaEmpresa.version,
      fuente: "empresa",
      contenidoBase: plantillaEmpresa.contenidoBase,
      plantillaBase,
    };
  }

  return {
    codigo: codigoCanonico,
    version: plantillaBase.version ?? null,
    fuente: "base",
    contenidoBase: construirContenidoBasePlantilla(plantillaBase),
    plantillaBase,
  };
}

// TODO: Manejar tokens y costos antes de activar en produccion
// TODO: Agregar reintentos con backoff y control de errores de red
export function generarContenidoDocumentoMock(
  doc: ReglaDocumentalNextPrev,
  contexto: GenerarContenidoContexto,
  plantillaEfectiva?: PlantillaDocumentoEfectiva | null,
): ContenidoGeneradoIA {
  const riesgos = contexto.riesgos.length > 0 ? contexto.riesgos.join(", ") : "sin riesgos especificos";

  // Si existe plantilla efectiva (empresa/base), priorizar su contenido editable.
  const plantilla = plantillaEfectiva?.plantillaBase ?? getPlantilla(doc.codigo, doc.nombre);

  let lines: (string | null)[];

  if (plantillaEfectiva) {
    lines = [
      `# ${doc.nombre}`,
      "",
      `<!-- Generado con plantilla ${plantillaEfectiva.codigo} (${plantillaEfectiva.fuente}) -->`,
      "",
      plantillaEfectiva.contenidoBase,
    ];
  } else if (plantilla) {
    lines = [
      `# ${doc.nombre}`,
      "",
      "<!-- Generado con plantilla: " + plantilla.codigo + " -->",
      "",
      "## Contexto",
      `- Empresa: ${contexto.empresa.nombre}`,
      `- Industria: ${contexto.industria}`,
      `- Riesgos detectados: ${riesgos}`,
      contexto.trabajador ? `- Trabajador: ${contexto.trabajador.nombreCompleto}` : null,
      "",
      ...plantilla.secciones.flatMap((s) => [
        s.titulo,
        "",
        `*${s.descripcion}*`,
        "",
      ]),
      `**Base normativa:** ${plantilla.baseNormativa.join(" | ")}`,
    ];
  } else {
    lines = [
      `# ${doc.nombre}`,
      "",
      "## Contexto",
      `- Empresa: ${contexto.empresa.nombre}`,
      `- Industria: ${contexto.industria}`,
      `- Tamano empresa: ${contexto.empresa.tamanoEmpresa ?? "no informado"}`,
      `- Giro: ${contexto.empresa.giro ?? "no informado"}`,
      `- Riesgos detectados: ${riesgos}`,
      contexto.trabajador ? `- Trabajador: ${contexto.trabajador.nombreCompleto}` : null,
      "",
      "## Contenido sugerido (IA mock)",
      "1. Objetivo del documento.",
      "2. Alcance y responsables.",
      "3. Procedimiento / evidencia requerida.",
      "4. Frecuencia de actualizacion.",
      "5. Firma y aprobacion.",
      "",
      `Base normativa: ${doc.cumplimiento.baseNormativa.join(", ")}`,
    ];
  }

  // Proteccion: limitar tamano y asegurar contenido no vacio.
  const joined = lines.filter(Boolean).join("\n");
  const contenido =
    joined.length > 0
      ? joined.slice(0, MAX_CONTENIDO_CHARS)
      : `# ${doc.nombre}\n\nDocumento generado automaticamente.`;

  return {
    contenido,
    version: 1,
    generadoPor: "IA",
    fecha: new Date(),
  };
}

function sanitizeContenido(text: string, titulo: string) {
  const cleaned = (text ?? "").trim();
  if (!cleaned) return `# ${titulo}\n\nDocumento generado automaticamente.`;

  const bounded = cleaned.slice(0, MAX_CONTENIDO_CHARS).trim();
  if (!bounded.includes("##")) {
    return [`# ${titulo}`, "", "## Contenido", bounded].join("\n").slice(0, MAX_CONTENIDO_CHARS);
  }

  return bounded;
}

function validarPlantillaGenerada(
  doc: ReglaDocumentalNextPrev,
  contenido: string,
  plantillaEfectiva?: PlantillaDocumentoEfectiva | null,
): ResultadoValidacionPlantillaInterna {
  const plantilla = plantillaEfectiva?.plantillaBase ?? getPlantilla(doc.codigo, doc.nombre);
  if (!plantilla && !plantillaEfectiva) {
    return {
      plantilla: null,
      metadata: null,
      requiereRevisionBajaCompletitud: false,
    };
  }

  const contenidoNorm = normalizeToken(contenido);

  let seccionesFaltantes: string[] = [];
  let completitudPlantilla = 100;

  if (plantillaEfectiva?.fuente === "empresa") {
    const headings = extractHeadingsFromContenidoBase(plantillaEfectiva.contenidoBase);
    if (headings.length > 0) {
      seccionesFaltantes = headings.filter((heading) => !contenidoNorm.includes(normalizeToken(heading)));
      completitudPlantilla = Math.max(0, Math.round(((headings.length - seccionesFaltantes.length) / headings.length) * 100));
    } else if (plantilla) {
      const validacionBase = validarContenidoContraPlantilla(contenido, plantilla);
      seccionesFaltantes = [...validacionBase.seccionesFaltantes];
      completitudPlantilla = validacionBase.completitudPct;
    }
  } else if (plantilla) {
    const validacion = validarContenidoContraPlantilla(contenido, plantilla);
    seccionesFaltantes = [...validacion.seccionesFaltantes];
    completitudPlantilla = validacion.completitudPct;
  }

  // Validación adicional estricta para PLT-EPP:
  // además de secciones, exigir presencia de tabla markdown en bloque EPP entregado.
  const esEpp = (plantillaEfectiva?.codigo ?? plantilla?.codigo ?? "").toUpperCase().includes("EPP");
  if (esEpp) {
    const hasMarkdownTable = /\|.+\|.+\|/.test(contenido);
    if (!hasMarkdownTable && !seccionesFaltantes.includes("tabla_epp")) {
      seccionesFaltantes.push("tabla_epp");
    }
  }

  if (seccionesFaltantes.includes("tabla_epp")) {
    completitudPlantilla = Math.max(0, completitudPlantilla - 20);
  }

  return {
    plantilla: plantilla ?? null,
    metadata: {
      plantillaCodigo: plantillaEfectiva?.codigo ?? plantilla?.codigo ?? doc.codigo,
      plantillaVersion: plantillaEfectiva?.version ?? plantilla?.version ?? null,
      completitudPlantilla,
      seccionesFaltantes,
    },
    requiereRevisionBajaCompletitud: completitudPlantilla < 80,
  };
}

function serializarContenidoConMetadata(contenido: string, metadata: PlantillaMetadata | null): string {
  if (!metadata) return contenido;
  const header = `<!-- plantilla_metadata: ${JSON.stringify(metadata)} -->`;
  return [header, "", contenido].join("\n");
}

function construirDetalleValidacionPlantilla(
  metadata: PlantillaMetadata | null,
  requiereRevisionBajaCompletitud: boolean,
): string | null {
  if (!metadata) return null;

  const faltantesLabel =
    metadata.seccionesFaltantes.length > 0 ? metadata.seccionesFaltantes.join(", ") : "ninguna";

  const mensajes = [
    `Plantilla ${metadata.plantillaCodigo}${metadata.plantillaVersion ? ` v${metadata.plantillaVersion}` : ""}.`,
    `Completitud: ${metadata.completitudPlantilla}%.`,
    `Secciones faltantes: ${faltantesLabel}.`,
  ];

  if (requiereRevisionBajaCompletitud) {
    mensajes.push("Contenido generado requiere revision por baja completitud de plantilla.");
  }

  return mensajes.join(" ");
}

function buildPrompt(
  doc: ReglaDocumentalNextPrev,
  contexto: GenerarContenidoContexto,
  plantillaEfectiva?: PlantillaDocumentoEfectiva | null,
) {
  const riesgos = contexto.riesgos.length > 0 ? contexto.riesgos.join(", ") : "sin riesgos especificos";
  const perfilTrabajador = contexto.trabajador
    ? `Trabajador: ${contexto.trabajador.nombreCompleto}.`
    : "Documento de alcance empresa.";

  // Intentar obtener plantilla específica para este documento.
  const plantilla = plantillaEfectiva?.plantillaBase ?? getPlantilla(doc.codigo, doc.nombre);

  const baseNormativa = plantilla
    ? plantilla.baseNormativa.join(", ")
    : doc.cumplimiento.baseNormativa.join(", ");

  const estructuraMinima = plantillaEfectiva
    ? [
        "ESTRUCTURA OBLIGATORIA: La salida debe respetar EXACTAMENTE esta estructura (no elimines ni renombres secciones):",
        "```markdown",
        plantillaEfectiva.contenidoBase,
        "```",
      ]
    : plantilla
    ? [
        "ESTRUCTURA OBLIGATORIA: Incluye TODAS estas secciones en este orden:",
        `# ${doc.nombre}`,
        ...plantilla.secciones.map((s) => s.titulo),
        "",
        "INSTRUCCIÓN ESPECÍFICA PARA ESTE DOCUMENTO:",
        plantilla.instruccionIA,
      ]
    : [
        "ESTRUCTURA MÍNIMA: Incluye estas secciones:",
        `# ${doc.nombre}`,
        "## Objetivo",
        "## Alcance",
        "## Responsabilidades",
        "## Procedimiento",
        "## Registros y Evidencias",
        "## Referencias normativas",
      ];

  const instruccionesCalidadChilena = [
    "CRITERIOS DE CALIDAD OBLIGATORIOS:",
    "1. LENGUAJE: Español técnico de Chile (usar terminología conforme a SUSESO, DS44, normas NCh). Evita vaguedades.",
    "2. NO GENÉRICO: Adapta contenido al giro específico (minería, construcción, salud, manufactura, etc.). Nombres concretos, situaciones reales del sector.",
    "3. RIESGOS ESPECÍFICOS: Para cada riesgo identificado, explicita: (a) fuente generadora, (b) vía de exposición, (c) daño potencial, (d) medida de control.",
    "4. NORMAS TÉCNICAS: Cita normas chilenas e ISO exactas (ej: 'conforme a NCh 1318 para protector ocular'; 'según DS44 Art. 6'). NO uses normas genéricas.",
    "5. TONO: Formal, serio, orientado a prevención. Dirigido a trabajadores chilenos con educación media completa.",
    "6. OPERACIONALIDAD: Secciones prácticas con tablas, listas de chequeo, criterios de decisión. Evita párrafos solo descriptivos.",
    "7. TABLAS MARKDOWN: Cuando corresponda, usa tablas con columnas claras. Especialmente para EPP, riesgos, medidas de control.",
  ];

  return [
    "OBJETIVO: Eres un especialista en SST (Seguridad y Salud en el Trabajo) chileno, con experiencia en regulaciones conforme a Ley 16.744, DS44 y estándares de prevención de riesgos.",
    "",
    `DOCUMENTO A GENERAR: ${doc.nombre} (Código: ${doc.codigo})`,
    `INDUSTRIA: ${contexto.industria}`,
    `RIESGOS PRESENTES: ${riesgos}`,
    `TAMAÑO DE EMPRESA: ${contexto.empresa.tamanoEmpresa ?? "no informado"}`,
    `GIRO O ACTIVIDAD: ${contexto.empresa.giro ?? "no informado"}`,
    `CONTEXTO: ${perfilTrabajador}`,
    `BASE NORMATIVA: ${baseNormativa}`,
    "",
    ...estructuraMinima,
    "",
    ...instruccionesCalidadChilena,
    "",
    "SALIDA:",
    "- Genera SOLO el contenido del documento. Sin explicaciones adicionales.",
    "- Respeta EXACTAMENTE la estructura especificada.",
    "- Asegura completitud: todas las secciones requeridas deben estar presentes y bien desarrolladas.",
  ].join("\n");
}

export async function generarContenidoDocumentoIA(
  doc: ReglaDocumentalNextPrev,
  contexto: GenerarContenidoContexto,
  plantillaEfectiva?: PlantillaDocumentoEfectiva | null,
): Promise<ResultadoGeneracionContenido> {
  const cacheKey = [
    doc.id,
    contexto.industria,
    contexto.riesgos.join("|"),
    contexto.trabajador?.id ?? "empresa",
    plantillaEfectiva?.codigo ?? "sin_plantilla",
    plantillaEfectiva?.version ?? "sin_version",
    plantillaEfectiva?.fuente ?? "base",
  ].join("::");
  const cached = _cacheContenido.get(cacheKey);
  if (cached) return cached;

  const fallback = (): ResultadoGeneracionContenido => ({
    data: generarContenidoDocumentoMock(doc, contexto, plantillaEfectiva),
    usoIA: false,
    errorIA: true,
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const result = {
      data: generarContenidoDocumentoMock(doc, contexto, plantillaEfectiva),
      usoIA: false,
      errorIA: false,
    };
    _cacheContenido.set(cacheKey, result);
    return result;
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [
          {
            role: "system",
            content: "Eres un experto en documentos SST para Chile.",
          },
          {
            role: "user",
            content: buildPrompt(doc, contexto, plantillaEfectiva),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content ?? "";
    const sanitized = sanitizeContenido(content, doc.nombre);

    const result: ResultadoGeneracionContenido = {
      data: {
        contenido: sanitized,
        version: 1,
        generadoPor: "IA",
        fecha: new Date(),
      },
      usoIA: true,
      errorIA: false,
    };

    _cacheContenido.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[documentacion][ia] fallo proveedor IA, aplicando fallback mock", {
      docCodigo: doc.codigo,
      error,
    });
    const result = fallback();
    _cacheContenido.set(cacheKey, result);
    return result;
  }
}

function isDocumentoValido(estado: string) {
  const normalized = normalizeToken(estado);
  return normalized === "aprobado" || normalized === "vigente" || normalized === "firmado";
}

export async function generarDocumentosFaltantesIA(params: {
  empresaId: string;
  usuarioId: string;
  email: string;
}): Promise<GenerarDocumentosFaltantesResultado> {
  // Control de ejecucion concurrente: una sola ejecucion activa por empresa.
  const adquirido = marcarEnCurso(params.empresaId);
  if (!adquirido) {
    throw new Error("Generacion en curso. Vuelve a intentarlo en unos segundos.");
  }

  const inicioMs = Date.now();

  try {
    return await _ejecutarGeneracion(params, inicioMs);
  } finally {
    liberarEjecucion(params.empresaId);
    console.info("[documentacion][ia] ejecucion finalizada", {
      empresaId: params.empresaId,
      duracionMs: Date.now() - inicioMs,
    });
  }
}

async function _ejecutarGeneracion(
  params: { empresaId: string; usuarioId: string; email: string },
  inicioMs: number,
): Promise<GenerarDocumentosFaltantesResultado> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: params.empresaId },
    select: {
      id: true,
      nombre: true,
      giro: true,
      tipoEmpresa: true,
      tamanoEmpresa: true,
      cantidadTrabajadores: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  const [trabajadores, cumplimiento] = await Promise.all([
    prisma.trabajador.findMany({
      where: { empresaId: params.empresaId, estado: { not: "inactivo" } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
    }),
    calcularCumplimientoEmpresa({ empresaId: params.empresaId }),
  ]);

  const reglasObjetivo = cumplimiento.detalles
    .filter((item) => item.estado === "faltante" || item.estado === "incompleto")
    .map((item) => REGLAS_DOCUMENTALES.find((regla) => regla.id === item.reglaId))
    .filter(Boolean) as ReglaDocumentalNextPrev[];

  // Si no hay documentos faltantes ni incompletos, salir sin procesar.
  if (reglasObjetivo.length === 0) {
    const log = await _registrarLog({
      ...params,
      generados: 0,
      actualizados: 0,
      omitidos: 0,
      usoIA: false,
      errorIA: false,
      duracionMs: Date.now() - inicioMs,
    });
    return { generados: 0, actualizados: 0, omitidos: 0, items: [], logId: log?.id ?? null };
  }

  const industria = inferIndustria({ tipoEmpresa: empresa.tipoEmpresa, giro: empresa.giro });
  const items: GeneracionDocumentoItem[] = [];
  let generados = 0;
  let actualizados = 0;
  let omitidos = 0;
  let usoIA = false;
  let errorIA = false;

  for (const regla of reglasObjetivo) {
    const plantillaEfectiva = await resolverPlantillaDocumentoEfectiva(params.empresaId, regla);

    if (regla.entidadAplicable === "empresa") {
      const existentes = await prisma.documentoEmpresa.findMany({
        where: {
          empresaId: params.empresaId,
          OR: [{ tipo: regla.codigo }, { nombre: regla.nombre }],
          estado: { not: "Reemplazado" },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, estado: true, tipo: true, nombre: true },
      });

      const contexto = {
        empresa: {
          nombre: empresa.nombre,
          giro: empresa.giro,
          tipoEmpresa: empresa.tipoEmpresa,
          tamanoEmpresa: empresa.tamanoEmpresa,
        },
        industria,
        riesgos: inferRiesgos({ empresa, regla }),
      };

      const generado = await generarContenidoDocumentoIA(regla, contexto, plantillaEfectiva);
      const validacionPlantilla = validarPlantillaGenerada(regla, generado.data.contenido, plantillaEfectiva);
      usoIA = usoIA || generado.usoIA;
      errorIA = errorIA || generado.errorIA;

      const estadoGenerado = validacionPlantilla.requiereRevisionBajaCompletitud ? "en_revision" : "pendiente";
      const observacionesGeneradas = serializarContenidoConMetadata(
        generado.data.contenido,
        validacionPlantilla.metadata,
      );
      const detalleValidacion = construirDetalleValidacionPlantilla(
        validacionPlantilla.metadata,
        validacionPlantilla.requiereRevisionBajaCompletitud,
      );

      if (existentes.length === 0) {
        const created = await prisma.documentoEmpresa.create({
          data: {
            empresaId: params.empresaId,
            nombre: regla.nombre,
            categoria: regla.categoria,
            tipo: regla.codigo,
            // No bloquea generación: si plantilla queda bajo 80%, inicia en revisión.
            estado: estadoGenerado,
            version: `${generado.data.version}.0`,
            observaciones: observacionesGeneradas,
            subidoPorId: params.usuarioId,
            creadoPorEmail: params.email,
            tieneVencimiento: Boolean(regla.workflow.frecuenciaVigencia),
          },
          select: { id: true },
        });

        await prisma.documentoEmpresaHistorial.create({
          data: {
            documentoId: created.id,
            usuarioId: params.usuarioId,
            accion: "DOCUMENTO_GENERADO_IA",
            detalle:
              `Documento generado automaticamente con IA (${estadoGenerado === "en_revision" ? "en revision" : "pendiente"} de revision).` +
              (detalleValidacion ? ` ${detalleValidacion}` : ""),
            version: `${generado.data.version}.0`,
          },
        });

        if (validacionPlantilla.requiereRevisionBajaCompletitud) {
          await prisma.documentoEmpresaHistorial.create({
            data: {
              documentoId: created.id,
              usuarioId: params.usuarioId,
              accion: "VALIDACION_PLANTILLA_BAJA_COMPLETITUD",
              detalle: "Contenido generado requiere revision por baja completitud de plantilla",
              version: `${generado.data.version}.0`,
            },
          });
        }

        if ((validacionPlantilla.metadata?.seccionesFaltantes.length ?? 0) > 0) {
          await prisma.documentoEmpresaHistorial.create({
            data: {
              documentoId: created.id,
              usuarioId: params.usuarioId,
              accion: "VALIDACION_PLANTILLA_SECCIONES_FALTANTES",
              detalle: `Secciones faltantes detectadas: ${validacionPlantilla.metadata?.seccionesFaltantes.join(", ")}`,
              version: `${generado.data.version}.0`,
            },
          });
        }

        items.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "empresa",
          accion: "generado",
          documentoId: created.id,
        });
        generados += 1;
      } else {
        const doc = existentes[0];
        if (isDocumentoValido(doc.estado)) {
          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "empresa",
            accion: "omitido",
            documentoId: doc.id,
          });
          omitidos += 1;
        } else {
          // incompleto → en_revision (requiere aprobacion humana, no directamente vigente)
          // TODO: Definir workflow completo: en_revision → pendiente_firma → firmado → aprobado
          const updated = await prisma.documentoEmpresa.update({
            where: { id: doc.id },
            data: {
              estado: "en_revision",
              observaciones: observacionesGeneradas,
              version: `${generado.data.version}.1`,
            },
            select: { id: true },
          });

          await prisma.documentoEmpresaHistorial.create({
            data: {
              documentoId: updated.id,
              usuarioId: params.usuarioId,
              accion: "DOCUMENTO_ACTUALIZADO_IA",
              detalle:
                "Documento actualizado con IA (en revision pendiente de aprobacion)." +
                (detalleValidacion ? ` ${detalleValidacion}` : ""),
              version: `${generado.data.version}.1`,
            },
          });

          if (validacionPlantilla.requiereRevisionBajaCompletitud) {
            await prisma.documentoEmpresaHistorial.create({
              data: {
                documentoId: updated.id,
                usuarioId: params.usuarioId,
                accion: "VALIDACION_PLANTILLA_BAJA_COMPLETITUD",
                detalle: "Contenido generado requiere revision por baja completitud de plantilla",
                version: `${generado.data.version}.1`,
              },
            });
          }

          if ((validacionPlantilla.metadata?.seccionesFaltantes.length ?? 0) > 0) {
            await prisma.documentoEmpresaHistorial.create({
              data: {
                documentoId: updated.id,
                usuarioId: params.usuarioId,
                accion: "VALIDACION_PLANTILLA_SECCIONES_FALTANTES",
                detalle: `Secciones faltantes detectadas: ${validacionPlantilla.metadata?.seccionesFaltantes.join(", ")}`,
                version: `${generado.data.version}.1`,
              },
            });
          }

          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "empresa",
            accion: "actualizado",
            documentoId: updated.id,
          });
          actualizados += 1;
        }
      }

      continue;
    }

    const trabajadoresAplicables = trabajadores.filter((trabajador) =>
      cumpleCondicionesDocumento(
        regla,
        {
          tipoEmpresa: empresa.tipoEmpresa,
          giro: empresa.giro,
          tamanoEmpresa: empresa.tamanoEmpresa,
          cantidadTrabajadores: empresa.cantidadTrabajadores,
        },
        {
          cargo: {
            perfilSST: trabajador.cargo?.perfilSST,
            descripcion: trabajador.cargo?.descripcion,
          },
        },
      ),
    );

    for (const trabajador of trabajadoresAplicables) {
      const existente = await prisma.trabajadorDocumento.findFirst({
        where: {
          empresaId: params.empresaId,
          trabajadorId: trabajador.id,
          esVigente: true,
          OR: [{ tipo: regla.codigo }, { nombre: regla.nombre }],
        },
        select: { id: true, estado: true, tipo: true, nombre: true },
      });

      const contexto = {
        empresa: {
          nombre: empresa.nombre,
          giro: empresa.giro,
          tipoEmpresa: empresa.tipoEmpresa,
          tamanoEmpresa: empresa.tamanoEmpresa,
        },
        trabajador: {
          id: trabajador.id,
          nombreCompleto: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
        },
        industria,
        riesgos: inferRiesgos({
          empresa,
          regla,
          trabajador: {
            cargoPerfil: trabajador.cargo?.perfilSST ?? null,
            cargoDescripcion: trabajador.cargo?.descripcion ?? null,
          },
        }),
      };

      const generado = await generarContenidoDocumentoIA(regla, contexto, plantillaEfectiva);
      const validacionPlantilla = validarPlantillaGenerada(regla, generado.data.contenido, plantillaEfectiva);
      usoIA = usoIA || generado.usoIA;
      errorIA = errorIA || generado.errorIA;

      const estadoGenerado = validacionPlantilla.requiereRevisionBajaCompletitud ? "en_revision" : "pendiente";
      const observacionesGeneradas = serializarContenidoConMetadata(
        generado.data.contenido,
        validacionPlantilla.metadata,
      );
      const detalleValidacion = construirDetalleValidacionPlantilla(
        validacionPlantilla.metadata,
        validacionPlantilla.requiereRevisionBajaCompletitud,
      );

      if (!existente) {
        try {
          const created = await prisma.trabajadorDocumento.create({
            data: {
              trabajadorId: trabajador.id,
              empresaId: params.empresaId,
              nombre: regla.nombre,
              tipo: regla.codigo,
              categoria: "trabajador",
              // No bloquea generación: si plantilla queda bajo 80%, inicia en revisión.
              estado: estadoGenerado,
              version: `${generado.data.version}.0`,
              observaciones: observacionesGeneradas,
              subidoPorId: params.usuarioId,
              creadoPorEmail: params.email,
              tieneVencimiento: Boolean(regla.workflow.frecuenciaVigencia),
            },
            select: { id: true },
          });

          await prisma.trabajadorDocumentoHistorial.create({
            data: {
              documentoId: created.id,
              usuarioId: params.usuarioId,
              accion: "DOCUMENTO_GENERADO_IA",
              detalle:
                `Documento generado automaticamente con IA (${estadoGenerado === "en_revision" ? "en revision" : "pendiente"} de revision).` +
                (detalleValidacion ? ` ${detalleValidacion}` : ""),
              version: `${generado.data.version}.0`,
            },
          });

          if (validacionPlantilla.requiereRevisionBajaCompletitud) {
            await prisma.trabajadorDocumentoHistorial.create({
              data: {
                documentoId: created.id,
                usuarioId: params.usuarioId,
                accion: "VALIDACION_PLANTILLA_BAJA_COMPLETITUD",
                detalle: "Contenido generado requiere revision por baja completitud de plantilla",
                version: `${generado.data.version}.0`,
              },
            });
          }

          if ((validacionPlantilla.metadata?.seccionesFaltantes.length ?? 0) > 0) {
            await prisma.trabajadorDocumentoHistorial.create({
              data: {
                documentoId: created.id,
                usuarioId: params.usuarioId,
                accion: "VALIDACION_PLANTILLA_SECCIONES_FALTANTES",
                detalle: `Secciones faltantes detectadas: ${validacionPlantilla.metadata?.seccionesFaltantes.join(", ")}`,
                version: `${generado.data.version}.0`,
              },
            });
          }

          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "trabajador",
            accion: "generado",
            documentoId: created.id,
            trabajadorId: trabajador.id,
          });
          generados += 1;
        } catch {
          // Evita romper la ejecucion por condiciones de carrera con indice unico.
          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "trabajador",
            accion: "omitido",
            documentoId: null,
            trabajadorId: trabajador.id,
          });
          omitidos += 1;
        }
      } else if (isDocumentoValido(existente.estado)) {
        items.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "trabajador",
          accion: "omitido",
          documentoId: existente.id,
          trabajadorId: trabajador.id,
        });
        omitidos += 1;
      } else {
        // incompleto → en_revision
        // TODO: Definir workflow completo de estados documentales
        const updated = await prisma.trabajadorDocumento.update({
          where: { id: existente.id },
          data: {
            estado: "en_revision",
            observaciones: observacionesGeneradas,
            version: `${generado.data.version}.1`,
          },
          select: { id: true },
        });

        await prisma.trabajadorDocumentoHistorial.create({
          data: {
            documentoId: updated.id,
            usuarioId: params.usuarioId,
            accion: "DOCUMENTO_ACTUALIZADO_IA",
            detalle:
              "Documento actualizado con IA (en revision pendiente de aprobacion)." +
              (detalleValidacion ? ` ${detalleValidacion}` : ""),
            version: `${generado.data.version}.1`,
          },
        });

        if (validacionPlantilla.requiereRevisionBajaCompletitud) {
          await prisma.trabajadorDocumentoHistorial.create({
            data: {
              documentoId: updated.id,
              usuarioId: params.usuarioId,
              accion: "VALIDACION_PLANTILLA_BAJA_COMPLETITUD",
              detalle: "Contenido generado requiere revision por baja completitud de plantilla",
              version: `${generado.data.version}.1`,
            },
          });
        }

        if ((validacionPlantilla.metadata?.seccionesFaltantes.length ?? 0) > 0) {
          await prisma.trabajadorDocumentoHistorial.create({
            data: {
              documentoId: updated.id,
              usuarioId: params.usuarioId,
              accion: "VALIDACION_PLANTILLA_SECCIONES_FALTANTES",
              detalle: `Secciones faltantes detectadas: ${validacionPlantilla.metadata?.seccionesFaltantes.join(", ")}`,
              version: `${generado.data.version}.1`,
            },
          });
        }

        items.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "trabajador",
          accion: "actualizado",
          documentoId: updated.id,
          trabajadorId: trabajador.id,
        });
        actualizados += 1;
      }
    }
  }

  console.info("[documentacion][ia] documentos procesados", {
    empresaId: params.empresaId,
    generados,
    actualizados,
    omitidos,
    usoIA,
    errorIA,
    duracionMs: Date.now() - inicioMs,
  });

  // Registro de auditoria en DB.
  const log = await _registrarLog({
    ...params,
    generados,
    actualizados,
    omitidos,
    usoIA,
    errorIA,
    duracionMs: Date.now() - inicioMs,
  });

  return {
    generados,
    actualizados,
    omitidos,
    items,
    logId: log?.id ?? null,
  };
}

// ─────────────────────────────────────────────
// AUDITORÍA – guardar log de ejecucion
// ─────────────────────────────────────────────

async function _registrarLog(params: {
  empresaId: string;
  usuarioId: string;
  generados: number;
  actualizados: number;
  omitidos: number;
  usoIA: boolean;
  errorIA: boolean;
  duracionMs: number;
}): Promise<{ id: string } | null> {
  try {
    return await prisma.generacionDocumentosLog.create({
      data: {
        empresaId: params.empresaId,
        usuarioId: params.usuarioId,
        generados: params.generados,
        actualizados: params.actualizados,
        omitidos: params.omitidos,
        usoIA: params.usoIA,
        errorIA: params.errorIA,
        duracionMs: params.duracionMs,
      },
      select: { id: true },
    });
  } catch (err) {
    // No bloquear la respuesta si el log falla.
    console.error("[documentacion][ia] error al registrar log de auditoria", err);
    return null;
  }
}
