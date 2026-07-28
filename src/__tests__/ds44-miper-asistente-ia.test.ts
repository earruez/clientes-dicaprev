import { describe, expect, it, vi } from "vitest";
import { sugerirRiesgosMiperConIa, sugerirTareasMiperConIa, validarSugerenciasRiesgosIa } from "@/lib/ds44/miper-asistente-ia";
import {
  crearProveedorRiesgosMiperOpenAI,
  crearProveedorTareasMiperOpenAI,
  resolverModeloMiperOpenAI,
} from "@/lib/ds44/miper-asistente-openai.server";

const contexto = { cargoId: "cargo-1", nombre: "Supervisor", descripcion: null, perfilSst: null, riesgosClave: null };

function respuestaOpenAI(value: unknown): Response {
  return new Response(JSON.stringify({
    output: [{ content: [{ type: "output_text", text: typeof value === "string" ? value : JSON.stringify(value) }] }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("asistencia IA MIPER desacoplada", () => {
  it("permite continuar manualmente cuando no hay proveedor configurado", async () => {
    await expect(sugerirTareasMiperConIa(contexto)).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("acepta solo la respuesta JSON estricta esperada", async () => {
    await expect(sugerirTareasMiperConIa(contexto, async () => ({ tareas: [{ nombre: "Inspeccionar equipo", justificacion: "Actividad propia del cargo" }] }))).resolves.toMatchObject({ disponible: true });
    await expect(sugerirTareasMiperConIa(contexto, async () => ({ tareas: [{ nombre: "x", justificacion: "ok", campoInventado: true }] }))).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("impide que la IA introduzca códigos fuera del catálogo ISP", () => {
    expect(() => validarSugerenciasRiesgosIa({ riesgos: [{ tareaRef: "t1", codigoIsp: "ZZ9", consecuenciaSugerida: "Lesión", motivo: "Exposición confirmada", controlesSugeridos: [] }] })).toThrow("ajeno al catálogo ISP");
    expect(() => validarSugerenciasRiesgosIa({ riesgos: [{ tareaRef: "t1", codigoIsp: "A1", consecuenciaSugerida: "Lesión menor", motivo: "Desplazamiento confirmado", controlesSugeridos: [{ tipoControl: "eliminacion", descripcion: "Eliminar desniveles de la ruta" }] }] })).not.toThrow();
  });
});

describe("proveedor OpenAI de tareas MIPER", () => {
  it("usa Responses API con esquema estricto y acepta una respuesta válida", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return respuestaOpenAI({ tareas: [{ nombre: "Inspeccionar condiciones del área", justificacion: "La descripción indica supervisión en terreno" }] });
    });
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "clave-simulada", model: "modelo-prueba", fetchImpl: fetchMock });

    const resultado = await sugerirTareasMiperConIa(contexto, proveedor);

    expect(resultado).toMatchObject({ disponible: true, resultado: { tareas: [{ nombre: "Inspeccionar condiciones del área" }] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({ model: "modelo-prueba", store: false, text: { format: { type: "json_schema", strict: true } } });
    expect(request.text.format.schema.properties.tareas.maxItems).toBe(20);
    expect(request.input[1].content).toContain("no inventes riesgos");
    expect(request.input[1].content).toContain("no asignes códigos ISP");
  });

  it("mantiene fallback manual cuando falta la API key", async () => {
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "" });
    expect(proveedor).toBeUndefined();
    await expect(sugerirTareasMiperConIa(contexto, proveedor)).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("rechaza JSON inválido sin bloquear el flujo manual", async () => {
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "clave-simulada", fetchImpl: async () => respuestaOpenAI("no-es-json") });
    await expect(sugerirTareasMiperConIa(contexto, proveedor)).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("mantiene fallback ante una respuesta vacía", async () => {
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "clave-simulada", fetchImpl: async () => new Response(JSON.stringify({ output: [] }), { status: 200 }) });
    await expect(sugerirTareasMiperConIa(contexto, proveedor)).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("maneja errores HTTP de OpenAI sin exponer detalles técnicos", async () => {
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "clave-simulada", fetchImpl: async () => new Response("cuota", { status: 429 }) });
    const resultado = await sugerirTareasMiperConIa(contexto, proveedor);
    expect(resultado.disponible).toBe(false);
    expect(resultado.mensaje).toContain("no está disponible temporalmente");
    expect(resultado.mensaje).not.toContain("429");
  });

  it("cancela por timeout y conserva el fallback manual", async () => {
    const fetchTimeout = vi.fn((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Abortado", "AbortError")), { once: true });
    }));
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "clave-simulada", fetchImpl: fetchTimeout, timeoutMs: 5 });
    const resultado = await sugerirTareasMiperConIa(contexto, proveedor);
    expect(resultado).toMatchObject({ disponible: false, resultado: { tareas: [] } });
    expect(resultado.mensaje).toContain("tardó demasiado");
  });

  it("rechaza respuestas que superan el máximo de 20 tareas", async () => {
    const tareas = Array.from({ length: 21 }, (_, index) => ({ nombre: `Ejecutar actividad ${index + 1}`, justificacion: "Actividad informada para el cargo" }));
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "clave-simulada", fetchImpl: async () => respuestaOpenAI({ tareas }) });
    await expect(sugerirTareasMiperConIa(contexto, proveedor)).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("rechaza el nombre del cargo usado como tarea", async () => {
    const proveedor = crearProveedorTareasMiperOpenAI({ apiKey: "clave-simulada", fetchImpl: async () => respuestaOpenAI({ tareas: [{ nombre: "Supervisor", justificacion: "Nombre entregado" }] }) });
    await expect(sugerirTareasMiperConIa(contexto, proveedor)).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("respeta la prioridad de modelo específica, general y por defecto", () => {
    expect(resolverModeloMiperOpenAI({ OPENAI_MIPER_MODEL: "miper", OPENAI_MODEL: "general" })).toBe("miper");
    expect(resolverModeloMiperOpenAI({ OPENAI_MODEL: "general" })).toBe("general");
    expect(resolverModeloMiperOpenAI({})).toBe("gpt-5.6-sol");
  });
});

describe("proveedor OpenAI de riesgos MIPER", () => {
  it("limita la salida al catálogo ISP y mantiene toda sugerencia sin confirmar", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return respuestaOpenAI({
        riesgos: [{
          tareaRef: "tarea-1",
          codigoIsp: "B1",
          consecuenciaSugerida: "Lesión por atrapamiento",
          motivo: "La tarea considera operación de equipo",
          controlesSugeridos: [{ tipoControl: "ingenieria", descripcion: "Instalar resguardo físico en la zona móvil" }],
        }],
      });
    });
    const proveedor = crearProveedorRiesgosMiperOpenAI({
      apiKey: "clave-simulada",
      model: "modelo-prueba",
      fetchImpl: fetchMock,
    });
    const resultado = await sugerirRiesgosMiperConIa({
      cargo: "Operador",
      descripcionCargo: "Opera equipo",
      area: "Producción",
      centroTrabajo: "Planta",
      proceso: "Fabricación",
      tareas: [{ id: "tarea-1", nombre: "Operar equipo", esRutinaria: true, lugar: "Planta" }],
      antecedentes: [],
    }, proveedor);

    expect(resultado.disponible).toBe(true);
    expect(resultado.resultado.riesgos[0]).toMatchObject({ codigoIsp: "B1", tareaRef: "tarea-1" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).text.format.schema.properties.riesgos.items.properties.codigoIsp.enum).toContain("B1");
    expect(JSON.stringify(resultado.resultado)).not.toContain("confirmado");
  });
});
