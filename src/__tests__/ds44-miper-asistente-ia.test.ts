import { describe, expect, it } from "vitest";
import { sugerirTareasMiperConIa, validarSugerenciasRiesgosIa } from "@/lib/ds44/miper-asistente-ia";

const contexto = { cargoId: "cargo-1", nombre: "Supervisor", descripcion: null, perfilSst: null, riesgosClave: null };

describe("asistencia IA MIPER desacoplada", () => {
  it("permite continuar manualmente cuando no hay proveedor configurado", async () => {
    await expect(sugerirTareasMiperConIa(contexto)).resolves.toMatchObject({ disponible: false, resultado: { tareas: [] } });
  });

  it("acepta solo la respuesta JSON estricta esperada", async () => {
    await expect(sugerirTareasMiperConIa(contexto, async () => ({ tareas: [{ nombre: "Inspeccionar equipo", justificacion: "Actividad propia del cargo" }] }))).resolves.toMatchObject({ disponible: true });
    await expect(sugerirTareasMiperConIa(contexto, async () => ({ tareas: [{ nombre: "x", justificacion: "ok", campoInventado: true }] }))).rejects.toThrow();
  });

  it("impide que la IA introduzca códigos fuera del catálogo ISP", () => {
    expect(() => validarSugerenciasRiesgosIa({ riesgos: [{ tareaRef: "t1", codigoIsp: "ZZ9", consecuenciaSugerida: "Lesión", motivo: "Exposición confirmada", controlesSugeridos: [] }] })).toThrow("ajeno al catálogo ISP");
    expect(() => validarSugerenciasRiesgosIa({ riesgos: [{ tareaRef: "t1", codigoIsp: "A1", consecuenciaSugerida: "Lesión menor", motivo: "Desplazamiento confirmado", controlesSugeridos: ["Mantener vías despejadas"] }] })).not.toThrow();
  });
});
