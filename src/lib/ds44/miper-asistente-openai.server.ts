import {
  ErrorProveedorTareasMiperIa,
  type ContextoCargoMiperIa,
  type ContextoRiesgosMiperIa,
  type ProveedorRiesgosMiperIa,
  type ProveedorTareasMiperIa,
} from "./miper-asistente-ia";
import { CATALOGO_RIESGOS_ISP } from "./miper-catalogo-isp";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODELO_POR_DEFECTO = "gpt-5.6-sol";
const TIMEOUT_MS = 15_000;

type FetchOpenAI = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type ConfiguracionProveedorOpenAI = {
  apiKey?: string | null;
  model?: string | null;
  fetchImpl?: FetchOpenAI;
  timeoutMs?: number;
};

const esquemaRespuesta = {
  type: "object",
  properties: {
    tareas: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", minLength: 3, maxLength: 300 },
          justificacion: { type: "string", minLength: 3, maxLength: 500 },
        },
        required: ["nombre", "justificacion"],
        additionalProperties: false,
      },
    },
  },
  required: ["tareas"],
  additionalProperties: false,
} as const;

function valorConfigurado(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function resolverModeloMiperOpenAI(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  return valorConfigurado(env.OPENAI_MIPER_MODEL)
    ?? valorConfigurado(env.OPENAI_MODEL)
    ?? MODELO_POR_DEFECTO;
}

function serializarRiesgosClave(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No informados";
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    return serialized.slice(0, 3_000);
  } catch {
    return "No informados";
  }
}

function construirPrompt(contexto: ContextoCargoMiperIa): string {
  return [
    `Nombre del cargo: ${contexto.nombre}`,
    `Descripción del cargo: ${contexto.descripcion?.trim() || "No informada"}`,
    `Perfil SST: ${contexto.perfilSst?.trim() || "No informado"}`,
    `Riesgos clave proporcionados: ${serializarRiesgosClave(contexto.riesgosClave)}`,
    `Área: ${contexto.area?.trim() || "No informada"}`,
    `Centro de trabajo: ${contexto.centroTrabajo?.trim() || "No informado"}`,
    "Sugiere hasta 20 tareas laborales concretas, breves y observables propias de este cargo.",
    "Usa exclusivamente la información proporcionada.",
    "No copies el nombre del cargo como tarea, no crees cargos nuevos, no inventes riesgos, no asignes códigos ISP y no evalúes riesgos.",
    "Cada justificación debe explicar brevemente qué dato proporcionado sustenta la tarea.",
  ].join("\n");
}

const esquemaRespuestaRiesgos = {
  type: "object",
  properties: {
    riesgos: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        properties: {
          tareaRef: { type: "string", minLength: 1, maxLength: 100 },
          codigoIsp: { type: "string", enum: CATALOGO_RIESGOS_ISP.map((item) => item.codigoIsp) },
          consecuenciaSugerida: { type: "string", minLength: 3, maxLength: 500 },
          motivo: { type: "string", minLength: 3, maxLength: 500 },
          controlesSugeridos: {
            type: "array",
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                tipoControl: { type: "string", enum: ["eliminacion", "sustitucion", "ingenieria", "administrativo", "epp"] },
                descripcion: { type: "string", minLength: 3, maxLength: 500 },
              },
              required: ["tipoControl", "descripcion"],
              additionalProperties: false,
            },
          },
        },
        required: ["tareaRef", "codigoIsp", "consecuenciaSugerida", "motivo", "controlesSugeridos"],
        additionalProperties: false,
      },
    },
  },
  required: ["riesgos"],
  additionalProperties: false,
} as const;

function construirPromptRiesgos(contexto: ContextoRiesgosMiperIa): string {
  const catalogo = CATALOGO_RIESGOS_ISP.map((item) => ({
    codigoIsp: item.codigoIsp,
    familia: item.familia,
    riesgo: item.riesgoEspecifico,
    metodologia: item.metodologiaEvaluacion,
    protocolo: item.protocoloAplicable,
  }));
  return [
    `Cargo: ${contexto.cargo}`,
    `Descripción: ${contexto.descripcionCargo || "No informada"}`,
    `Área: ${contexto.area}`,
    `Centro: ${contexto.centroTrabajo}`,
    `Proceso: ${contexto.proceso || "No informado"}`,
    `Tareas: ${JSON.stringify(contexto.tareas)}`,
    `Antecedentes: ${JSON.stringify(contexto.antecedentes)}`,
    `Catálogo ISP permitido: ${JSON.stringify(catalogo)}`,
    "Sugiere solo riesgos probables sustentados por las tareas y el contexto.",
    "Usa tareaRef con el id exacto recibido y códigos exclusivamente del catálogo entregado.",
    "No confirmes ni evalúes riesgos. Probabilidad, consecuencia VEP y nivel quedan pendientes.",
    "Sugiere controles en orden de preferencia: eliminación, sustitución/ingeniería, administrativos y EPP.",
  ].join("\n");
}

function extraerTextoRespuesta(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text.trim();
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => String(item.text))
    .join("")
    .trim();
}

function codigoErrorHttp(status: number): "autenticacion" | "cuota" | "http" {
  if (status === 401 || status === 403) return "autenticacion";
  if (status === 429) return "cuota";
  return "http";
}

export function crearProveedorTareasMiperOpenAI(
  config: ConfiguracionProveedorOpenAI,
): ProveedorTareasMiperIa | undefined {
  const apiKey = valorConfigurado(config.apiKey);
  if (!apiKey) return undefined;

  const model = valorConfigurado(config.model) ?? MODELO_POR_DEFECTO;
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? TIMEOUT_MS;

  return async (contexto) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 2_500,
          input: [
            {
              role: "system",
              content: "Eres un asistente de seguridad y salud en el trabajo. Sugieres únicamente tareas laborales para revisión humana y respondes solo con el esquema JSON solicitado.",
            },
            { role: "user", content: construirPrompt(contexto) },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "sugerencias_tareas_miper",
              strict: true,
              schema: esquemaRespuesta,
            },
          },
        }),
      });

      if (!response.ok) throw new ErrorProveedorTareasMiperIa(codigoErrorHttp(response.status));

      const content = extraerTextoRespuesta(await response.json());
      if (!content) throw new ErrorProveedorTareasMiperIa("respuesta_vacia");
      try {
        return JSON.parse(content) as unknown;
      } catch {
        throw new ErrorProveedorTareasMiperIa("json_invalido");
      }
    } catch (error) {
      if (error instanceof ErrorProveedorTareasMiperIa) throw error;
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw new ErrorProveedorTareasMiperIa("timeout");
      }
      throw new ErrorProveedorTareasMiperIa("http");
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function obtenerProveedorTareasMiperOpenAI(): ProveedorTareasMiperIa | undefined {
  return crearProveedorTareasMiperOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: resolverModeloMiperOpenAI(),
  });
}

export function crearProveedorRiesgosMiperOpenAI(
  config: ConfiguracionProveedorOpenAI,
): ProveedorRiesgosMiperIa | undefined {
  const apiKey = valorConfigurado(config.apiKey);
  if (!apiKey) return undefined;
  const model = valorConfigurado(config.model) ?? MODELO_POR_DEFECTO;
  const fetchImpl = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? TIMEOUT_MS;

  return async (contexto) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 8_000,
          input: [
            {
              role: "system",
              content: "Eres apoyo técnico para identificar peligros laborales. Solo propones riesgos del catálogo ISP proporcionado y toda sugerencia queda pendiente de confirmación humana.",
            },
            { role: "user", content: construirPromptRiesgos(contexto) },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "sugerencias_riesgos_miper",
              strict: true,
              schema: esquemaRespuestaRiesgos,
            },
          },
        }),
      });
      if (!response.ok) throw new ErrorProveedorTareasMiperIa(codigoErrorHttp(response.status));
      const content = extraerTextoRespuesta(await response.json());
      if (!content) throw new ErrorProveedorTareasMiperIa("respuesta_vacia");
      try {
        return JSON.parse(content) as unknown;
      } catch {
        throw new ErrorProveedorTareasMiperIa("json_invalido");
      }
    } catch (error) {
      if (error instanceof ErrorProveedorTareasMiperIa) throw error;
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw new ErrorProveedorTareasMiperIa("timeout");
      }
      throw new ErrorProveedorTareasMiperIa("http");
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function obtenerProveedorRiesgosMiperOpenAI(): ProveedorRiesgosMiperIa | undefined {
  return crearProveedorRiesgosMiperOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: resolverModeloMiperOpenAI(),
  });
}
