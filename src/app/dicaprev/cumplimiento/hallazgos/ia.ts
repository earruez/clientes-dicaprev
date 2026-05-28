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
    "Analiza la imagen como apoyo para prevención de riesgos laborales en Chile.",
    "Identifica solo riesgos visibles.",
    "No inventes fechas ni datos que no sean legibles.",
    "Si una etiqueta no se puede leer, responde No concluyente.",
    "Devuelve sugerencias como borrador, siempre sujetas a revisión profesional.",
    "No identifiques personas ni hagas conclusiones legales.",
    "Si la imagen no permite concluir un riesgo visible claro, devuelve exactamente una sola sugerencia con titulo 'No concluyente'.",
    "Si el riesgo es un extintor y la fecha de mantencion/vencimiento es legible y está vencida, puedes sugerir el hallazgo; si no es legible, pide revisión manual y no afirmes vencimiento.",
    "Devuelve SOLO JSON valido con la forma {\"sugerencias\":[...]}.",
    "Cada sugerencia debe incluir: titulo, descripcion, tipo, prioridad, confianza, evidenciaVisible, accionSugerida, requiereRevision.",
    "La confianza debe ser un numero de 0 a 100.",
    "",
    `Empresa: ${params.empresaNombre}`,
    params.centroNombre ? `Centro: ${params.centroNombre}` : "Centro: no seleccionado",
    params.areaNombre ? `Area: ${params.areaNombre}` : "Area: no seleccionada",
    params.observacion ? `Observacion del usuario: ${params.observacion}` : "Observacion del usuario: no indicada",
  ].join("\n");
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

  const payload = raw as { sugerencias?: unknown };
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
              "Eres un asistente de prevencion de riesgos laborales para Chile. Identificas solo riesgos visibles. No identificas personas. No inventas datos. Si una etiqueta no se lee, respondes No concluyente. Devuelves solo JSON valido.",
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
): Promise<{ hallazgoId: string; evidenciaId: string }> {
  const context = await requireAuth();
  if (!input.archivoUrl.trim()) {
    throw new Error("La foto es obligatoria para confirmar el hallazgo.");
  }
  if (normalizeToken(input.sugerencia.titulo) === "no concluyente") {
    throw new Error("La sugerencia no es concluyente y no puede convertirse en hallazgo.");
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
      ? 5
      : input.sugerencia.prioridad === "alta"
        ? 10
        : input.sugerencia.prioridad === "media"
          ? 15
          : 20;
  const fechaCompromiso = new Date(Date.now() + diasCompromiso * 86_400_000);
  const descripcionHallazgo = `${input.sugerencia.titulo}. ${input.sugerencia.descripcion}`.trim();
  const observacionFinal = [
    "Hallazgo sugerido por IA y confirmado por usuario.",
    input.observacion?.trim() || null,
    `Evidencia visible: ${input.sugerencia.evidenciaVisible}`,
    `Accion sugerida: ${input.sugerencia.accionSugerida}`,
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

    return { hallazgoId: hallazgo.id, evidenciaId: evidencia.id };
  });

  return created;
}
