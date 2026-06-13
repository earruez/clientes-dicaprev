"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/server/auth/permissions";
import type { PrioridadHallazgo } from "../types";

export type TipoHallazgoIA =
  | "condicion_insegura"
  | "acto_inseguro"
  | "documental"
  | "emergencia"
  | "otro";

export type SugerenciaHallazgoIA = {
  titulo: string;
  descripcion: string;
  tipo: TipoHallazgoIA;
  prioridad: PrioridadHallazgo;
  confianza: number;
  evidenciaVisible: string;
  accionSugerida: string;
  requiereRevision: true;
};

export type AnalisisFotoHallazgoIAInput = {
  archivoUrl?: string | null;
  archivoNombre?: string | null;
  archivoTipo?: string | null;
  centroTrabajoId?: string | null;
  areaId?: string | null;
  observacion?: string | null;
};

export type AnalisisFotoHallazgoIAResultado =
  | {
      ok: true;
      sugerencias: SugerenciaHallazgoIA[];
      archivoUrl: string;
      archivoNombre: string | null;
    }
  | {
      ok: false;
      error: string;
    };

type ConfirmarHallazgoFotoIAInput = {
  sugerencia: SugerenciaHallazgoIA;
  archivoUrl: string;
  archivoNombre?: string | null;
  archivoTipo?: string | null;
  centroTrabajoId?: string | null;
  areaId?: string | null;
  observacion?: string | null;
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferImageMimeType(archivoUrl: string, archivoTipo?: string | null): string {
  const mimeType = (archivoTipo ?? "").trim().toLowerCase();
  if (mimeType.startsWith("image/")) {
    return mimeType;
  }

  const extension = path.extname(archivoUrl).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

function fallbackNoConcluyente(): SugerenciaHallazgoIA[] {
  return [
    {
      titulo: "No concluyente",
      descripcion:
        "La imagen no permite identificar un riesgo visible con suficiente certeza. Se requiere revisión manual en terreno.",
      tipo: "otro",
      prioridad: "baja",
      confianza: 15,
      evidenciaVisible: "La fotografía no muestra detalle suficiente para confirmar un hallazgo.",
      accionSugerida: "Registrar una nueva foto más nítida o revisar en terreno con apoyo del prevencionista.",
      requiereRevision: true,
    },
  ];
}

function buildPrompt(params: {
  empresaNombre: string;
  centroNombre: string | null;
  areaNombre: string | null;
  observacion: string | null;
}) {
  return [
    "Analiza la imagen adjunta y detecta posibles hallazgos de seguridad o salud ocupacional visibles.",
    "Considera especialmente:",
    "- extintores vencidos, descargados, sin señalética o con acceso obstruido",
    "- salidas de emergencia obstruidas",
    "- cableado expuesto",
    "- riesgo de caída",
    "- desorden o falta de aseo",
    "- almacenamiento inseguro",
    "- ausencia de EPP visible cuando el contexto lo exige",
    "- señalética faltante",
    "- botiquines o equipos de emergencia vencidos o incompletos",
    "- condiciones inseguras generales",
    "",
    "Si hay una etiqueta de extintor:",
    "- si la fecha de mantención o vencimiento es claramente legible y está vencida, sugerir hallazgo",
    "- si la fecha no es legible, no afirmar vencimiento; sugerir revisión manual",
    "",
    "Para 'accionSugerida' debes redactar una medida correctiva operacional y concreta:",
    "- incluir acción inmediata",
    "- incluir control preventivo",
    "- incluir condición para retomar trabajo cuando aplique",
    "- evitar frases genéricas",
    "- si la prioridad es 'critica', la medida debe indicar: paralizar faena de inmediato, corregir de inmediato y, si no se puede corregir de inmediato, dejar fuera de uso el área o la máquina hasta eliminar el riesgo",
    "Ejemplos de estilo:",
    "- Trabajo en altura sin arnés: Detener actividad, proveer arnés y línea de vida con anclaje certificado, verificar uso correcto y registrar evidencia antes de continuar.",
    "- Extintor vencido: Retirar o señalizar el equipo vencido, coordinar recarga o reemplazo inmediato, y dejar evidencia del extintor operativo.",
    "- Salida obstruida: Despejar de inmediato la vía de evacuación, señalizar prohibición de obstrucción y establecer control periódico.",
    "",
    "Devuelve solo JSON válido con este formato:",
    "{",
    '  "sugerencias": [',
    "    {",
    '      "titulo": "string",',
    '      "descripcion": "string",',
    '      "tipo": "condicion_insegura | acto_inseguro | documental | emergencia | otro",',
    '      "prioridad": "baja | media | alta | critica",',
    '      "confianza": 0.0,',
    '      "evidenciaVisible": "string",',
    '      "accionSugerida": "string",',
    '      "requiereRevision": true',
    "    }",
    "  ],",
    '  "resultadoGeneral": "con_hallazgos | no_concluyente | sin_hallazgos_visibles",',
    '  "advertencia": "Documento generado como apoyo y requiere revisión profesional antes de crear el hallazgo."',
    "}",
    "",
    `Empresa: ${params.empresaNombre}`,
    params.centroNombre ? `Centro: ${params.centroNombre}` : "Centro: no seleccionado",
    params.areaNombre ? `Area: ${params.areaNombre}` : "Area: no seleccionada",
    params.observacion ? `Observacion del usuario: ${params.observacion}` : "Observacion del usuario: no indicada",
  ].join("\n");
}

function accionCriticaInmediata(textoBase: string): string {
  const base = textoBase.trim();
  const instruccion =
    "Paralizar faena de inmediato y corregir de inmediato. Si no es posible corregir en el acto, dejar fuera de uso el área o la máquina hasta eliminar el riesgo y autorizar reapertura con verificación.";
  if (!base) return instruccion;

  const token = normalizeToken(base);
  if (
    token.includes("paralizar") &&
    token.includes("de inmediato") &&
    (token.includes("fuera de uso") || token.includes("sin uso") || token.includes("no usar"))
  ) {
    return base;
  }

  return `${instruccion} ${base}`.trim();
}

function normalizarSugerenciaHallazgoIA(raw: unknown): SugerenciaHallazgoIA | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Partial<SugerenciaHallazgoIA> & Record<string, unknown>;
  const titulo = typeof candidate.titulo === "string" ? candidate.titulo.trim() : "";
  const descripcion = typeof candidate.descripcion === "string" ? candidate.descripcion.trim() : "";
  const evidenciaVisible = typeof candidate.evidenciaVisible === "string" ? candidate.evidenciaVisible.trim() : "";
  const accionSugerida = typeof candidate.accionSugerida === "string" ? candidate.accionSugerida.trim() : "";
  const tipoRaw = typeof candidate.tipo === "string" ? candidate.tipo : "otro";
  const prioridadRaw = typeof candidate.prioridad === "string" ? candidate.prioridad : "baja";
  const confianzaRaw = Number(candidate.confianza ?? 0);

  if (!titulo || !descripcion || !evidenciaVisible || !accionSugerida) return null;

  const tipoNormalizado = normalizeToken(tipoRaw);
  const tipo: TipoHallazgoIA =
    tipoNormalizado === "condicion_insegura" ||
    tipoNormalizado === "acto_inseguro" ||
    tipoNormalizado === "documental" ||
    tipoNormalizado === "emergencia" ||
    tipoNormalizado === "otro"
      ? (tipoNormalizado as TipoHallazgoIA)
      : "otro";

  const prioridad: PrioridadHallazgo =
    prioridadRaw === "critica" || prioridadRaw === "alta" || prioridadRaw === "media" || prioridadRaw === "baja"
      ? prioridadRaw
      : confianzaRaw >= 85
        ? "critica"
        : confianzaRaw >= 70
          ? "alta"
          : confianzaRaw >= 50
            ? "media"
            : "baja";

  const confianza = Number.isFinite(confianzaRaw)
    ? Math.max(0, Math.min(100, Math.round(confianzaRaw)))
    : 0;

  return {
    titulo,
    descripcion,
    tipo,
    prioridad,
    confianza,
    evidenciaVisible,
    accionSugerida,
    requiereRevision: true,
  };
}

function normalizarSugerenciasHallazgoIA(raw: unknown): SugerenciaHallazgoIA[] {
  if (!raw || typeof raw !== "object") {
    return fallbackNoConcluyente();
  }

  const payload = raw as {
    sugerencias?: unknown;
    resultadoGeneral?: unknown;
  };
  const resultadoGeneral =
    typeof payload.resultadoGeneral === "string"
      ? normalizeToken(payload.resultadoGeneral)
      : "";

  if (resultadoGeneral === "sin_hallazgos_visibles") {
    return [];
  }
  if (resultadoGeneral === "no_concluyente") {
    return fallbackNoConcluyente();
  }

  const sugerenciasRaw = Array.isArray(payload.sugerencias) ? payload.sugerencias : [];
  const sugerencias = sugerenciasRaw
    .map((item) => normalizarSugerenciaHallazgoIA(item))
    .filter((item): item is SugerenciaHallazgoIA => item !== null)
    .slice(0, 5);

  if (sugerencias.length === 0) {
    return fallbackNoConcluyente();
  }

  const tieneConcluyente = sugerencias.some((item) => normalizeToken(item.titulo) !== "no concluyente");
  return tieneConcluyente ? sugerencias : fallbackNoConcluyente();
}

async function cargarImagenComoDataUrl(params: {
  archivoUrl: string;
  archivoTipo?: string | null;
}): Promise<string> {
  const { archivoUrl, archivoTipo } = params;

  if (archivoUrl.startsWith("data:")) {
    return archivoUrl;
  }

  if (/^https?:\/\//i.test(archivoUrl)) {
    const response = await fetch(archivoUrl);
    if (!response.ok) {
      throw new Error("No fue posible leer la imagen cargada.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = inferImageMimeType(archivoUrl, archivoTipo || response.headers.get("content-type"));
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  const normalizedPath = archivoUrl.startsWith("/") ? archivoUrl : `/${archivoUrl}`;
  const uploadsRoot = path.join(process.cwd(), "public");
  const absolutePath = path.join(uploadsRoot, normalizedPath);

  if (!absolutePath.startsWith(uploadsRoot)) {
    throw new Error("Ruta de imagen invalida.");
  }

  const buffer = Buffer.from(await readFile(absolutePath));
  const mimeType = inferImageMimeType(archivoUrl, archivoTipo);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function analizarFotoHallazgoIA(
  input: AnalisisFotoHallazgoIAInput,
): Promise<AnalisisFotoHallazgoIAResultado> {
  const context = await requirePermission("canManageCumplimiento");

  if (!input.archivoUrl?.trim()) {
    return { ok: false, error: "Debes adjuntar una imagen válida." };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "IA no configurada" };
  }

  const [empresa, centro, area] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: context.empresaId },
      select: { id: true, nombre: true },
    }),
    input.centroTrabajoId
      ? prisma.centroTrabajo.findFirst({
          where: { id: input.centroTrabajoId, empresaId: context.empresaId },
          select: { id: true, nombre: true },
        })
      : Promise.resolve(null),
    input.areaId
      ? prisma.area.findFirst({
          where: { id: input.areaId, empresaId: context.empresaId },
          select: { id: true, nombre: true },
        })
      : Promise.resolve(null),
  ]);

  if (!empresa) {
    return { ok: false, error: "Empresa no encontrada." };
  }
  if (input.centroTrabajoId && !centro) {
    return { ok: false, error: "Centro de trabajo no valido para la empresa activa." };
  }
  if (input.areaId && !area) {
    return { ok: false, error: "Area no valida para la empresa activa." };
  }

  try {
    const dataUrl = await cargarImagenComoDataUrl({
      archivoUrl: input.archivoUrl,
      archivoTipo: input.archivoTipo,
    });

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Actuas como asistente tecnico de prevencion de riesgos laborales en Chile. Analiza fotografias de lugares de trabajo para apoyar la deteccion preliminar de hallazgos. Identifica solo riesgos visibles en la imagen. No inventes datos, fechas, condiciones, nombres ni ubicaciones. Si una etiqueta, fecha o texto no es claramente legible, responde 'No concluyente' para ese punto. No identifiques personas. No emitas sanciones ni conclusiones legales definitivas. Tus respuestas son sugerencias tecnicas que requieren revision profesional antes de crear un hallazgo.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt({
                  empresaNombre: empresa.nombre,
                  centroNombre: centro?.nombre ?? null,
                  areaNombre: area?.nombre ?? null,
                  observacion: input.observacion?.trim() || null,
                }),
              },
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "auto" },
              },
            ],
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
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }

    return {
      ok: true,
      sugerencias: normalizarSugerenciasHallazgoIA(parsed),
      archivoUrl: input.archivoUrl,
      archivoNombre: input.archivoNombre ?? null,
    };
  } catch (error) {
    console.error("[cumplimiento][hallazgos][ia] fallo analisis foto", {
      empresaId: context.empresaId,
      error,
    });

    return {
      ok: true,
      sugerencias: fallbackNoConcluyente(),
      archivoUrl: input.archivoUrl,
      archivoNombre: input.archivoNombre ?? null,
    };
  }
}

export async function confirmarHallazgoDesdeFotoIA(
  input: ConfirmarHallazgoFotoIAInput,
): Promise<{ hallazgoId: string; evidenciaId: string; accionCorrectivaId: string }> {
  const context = await requireAuth();
  if (!input.archivoUrl.trim()) {
    throw new Error("La foto es obligatoria para confirmar el hallazgo.");
  }
  if (context.rol !== "SUPERADMIN") {
    const manageCumplimiento = await requirePermission("canManageCumplimiento");
    if (!manageCumplimiento) {
      throw new Error("No autorizado para crear hallazgos.");
    }
  }

  const [empresa, centro] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: context.empresaId },
      select: { id: true, nombre: true },
    }),
    input.centroTrabajoId
      ? prisma.centroTrabajo.findFirst({
          where: { id: input.centroTrabajoId, empresaId: context.empresaId },
          select: { id: true, nombre: true },
        })
      : Promise.resolve(null),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada.");
  }
  if (input.centroTrabajoId && !centro) {
    throw new Error("Centro de trabajo no valido para la empresa activa.");
  }

  const diasCompromiso =
    input.sugerencia.prioridad === "critica"
      ? 0
      : input.sugerencia.prioridad === "alta"
        ? 10
        : input.sugerencia.prioridad === "media"
          ? 15
          : 20;
  const fechaCompromiso = new Date(Date.now() + diasCompromiso * 86_400_000);
  const accionCorrectivaFinal =
    input.sugerencia.prioridad === "critica"
      ? accionCriticaInmediata(input.sugerencia.accionSugerida)
      : input.sugerencia.accionSugerida;
  const descripcionHallazgo = `${input.sugerencia.titulo}. ${input.sugerencia.descripcion}`.trim();
  const observacionFinal = [
    "Hallazgo sugerido por IA y confirmado por usuario.",
    input.observacion?.trim() || null,
    `Evidencia visible: ${input.sugerencia.evidenciaVisible}`,
    `Accion sugerida: ${accionCorrectivaFinal}`,
  ]
    .filter(Boolean)
    .join(" ");

  const created = await prisma.$transaction(async (tx) => {
    const hallazgo = await tx.hallazgoCumplimiento.create({
      data: {
        empresaId: context.empresaId,
        centroTrabajoId: centro?.id ?? null,
        trabajadorId: null,
        obligacionClave: null,
        tipo: input.sugerencia.tipo,
        prioridad: input.sugerencia.prioridad,
        descripcion: descripcionHallazgo,
        estado: "abierto",
        fechaCompromiso,
        creadoPorId: context.usuarioId,
      },
      select: { id: true },
    });

    const evidencia = await tx.evidenciaCumplimiento.create({
      data: {
        empresaId: context.empresaId,
        titulo: `Foto IA - ${input.sugerencia.titulo}`,
        tipo: "fotografia",
        estado: "valida",
        fechaEvidencia: new Date(),
        observacion: observacionFinal,
        archivoNombre: input.archivoNombre ?? null,
        archivoUrl: input.archivoUrl,
        archivoTipo: input.archivoTipo ?? null,
        hallazgoId: hallazgo.id,
        centroTrabajoId: centro?.id ?? null,
        creadoPorId: context.usuarioId,
      },
      select: { id: true },
    });

    const accionCorrectiva = await tx.evidenciaCumplimiento.create({
      data: {
        empresaId: context.empresaId,
        titulo: "Medida correctiva sugerida",
        tipo: "accion_correctiva",
        estado: "pendiente",
        fechaEvidencia: new Date(),
        observacion: accionCorrectivaFinal,
        hallazgoId: hallazgo.id,
        centroTrabajoId: centro?.id ?? null,
        creadoPorId: context.usuarioId,
      },
      select: { id: true },
    });

    return { hallazgoId: hallazgo.id, evidenciaId: evidencia.id, accionCorrectivaId: accionCorrectiva.id };
  });

  return created;
}
