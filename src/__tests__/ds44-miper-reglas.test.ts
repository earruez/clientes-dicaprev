import { describe, expect, it } from "vitest";
import { puedeTransicionarMiper, validarAprobacionMiper } from "@/lib/ds44/miper-reglas";

describe("ciclo de aprobación MIPER", () => {
  it("permite únicamente borrador → revisión → vigente → archivado", () => {
    expect(puedeTransicionarMiper("borrador", "en_revision")).toBe(true);
    expect(puedeTransicionarMiper("en_revision", "vigente")).toBe(true);
    expect(puedeTransicionarMiper("vigente", "archivado")).toBe(true);
    expect(puedeTransicionarMiper("borrador", "vigente")).toBe(false);
    expect(puedeTransicionarMiper("en_revision", "borrador")).toBe(false);
  });

  it("exige rol autorizado, revisión e ítems para aprobar", () => {
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 1, rol: "PREVENCIONISTA" })).not.toThrow();
    expect(() => validarAprobacionMiper({ estado: "borrador", cantidadItems: 1, rol: "PREVENCIONISTA" })).toThrow("en revisión");
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 0, rol: "PREVENCIONISTA" })).toThrow("al menos un ítem");
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 1, rol: "TRABAJADOR" })).toThrow("administración o prevención");
  });

  it.each([
    [{ responsableRegistrado: false }, "responsable de elaboración"],
    [{ respuestasNoSePendientes: 1 }, "No sé"],
    [{ riesgosPrioritariosSinControl: 1 }, "medida de control"],
    [{ evaluacionesEspecificasSinRespaldo: 1 }, "observación técnica"],
    [{ itemsIncompletos: 1 }, "Completa todos los ítems"],
  ] as const)("bloquea aprobación por pendientes formales", (restriccion, mensaje) => {
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 1, rol: "PREVENCIONISTA", ...restriccion })).toThrow(mensaje);
  });
});
