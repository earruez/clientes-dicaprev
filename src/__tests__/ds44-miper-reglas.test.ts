import { describe, expect, it } from "vitest";
import { calcularPasoReanudacion, controlPrioritarioValido, evaluacionEspecificaTieneRespaldo, puedeTransicionarMiper, validarAprobacionMiper, validarVepCompletoParaTransicion } from "@/lib/ds44/miper-reglas";

describe("ciclo de aprobación MIPER", () => {
  it("permite únicamente borrador → revisión → vigente → archivado", () => {
    expect(puedeTransicionarMiper("borrador", "en_revision")).toBe(true);
    expect(puedeTransicionarMiper("en_revision", "vigente")).toBe(true);
    expect(puedeTransicionarMiper("vigente", "archivado")).toBe(true);
    expect(puedeTransicionarMiper("borrador", "vigente")).toBe(false);
    expect(puedeTransicionarMiper("en_revision", "borrador")).toBe(false);
  });

  it.each([["riesgos", 4, 5], ["evaluación", 5, 6], ["controles", 6, 7], ["resumen", 7, 8]] as const)("reanuda en %s después del paso %s", (_etapa, completado, pendiente) => {
    expect(calcularPasoReanudacion(completado)).toBe(pendiente);
  });

  it("no acepta controles descartados o incompletos para riesgos prioritarios", () => {
    const base = { estado: "pendiente", descripcion: "Instalar protección", responsableTrabajadorId: "trab-1", fechaCompromiso: "2026-08-01" };
    expect(controlPrioritarioValido(base)).toBe(true);
    expect(controlPrioritarioValido({ ...base, estado: "descartado" })).toBe(false);
    expect(controlPrioritarioValido({ ...base, responsableTrabajadorId: null })).toBe(false);
    expect(controlPrioritarioValido({ ...base, fechaCompromiso: null })).toBe(false);
    expect(controlPrioritarioValido({ ...base, descripcion: " " })).toBe(false);
  });

  it("exige respaldo completo según el estado de una evaluación específica", () => {
    expect(evaluacionEspecificaTieneRespaldo({ estadoEvaluacionEspecifica: "evaluado", magnitudExposicion: "82 dB", nivelRiesgoEspecifico: "Alto", observacionTecnica: "Medición PREXOR" })).toBe(true);
    expect(evaluacionEspecificaTieneRespaldo({ estadoEvaluacionEspecifica: "evaluado", magnitudExposicion: null, nivelRiesgoEspecifico: "Alto", observacionTecnica: "Medición PREXOR" })).toBe(false);
    expect(evaluacionEspecificaTieneRespaldo({ estadoEvaluacionEspecifica: "pendiente", magnitudExposicion: null, nivelRiesgoEspecifico: null, observacionTecnica: "Medición programada" })).toBe(true);
    expect(evaluacionEspecificaTieneRespaldo({ estadoEvaluacionEspecifica: "en_evaluacion", magnitudExposicion: null, nivelRiesgoEspecifico: null, observacionTecnica: " " })).toBe(false);
  });

  it("exige rol autorizado, revisión e ítems para aprobar", () => {
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 1, rol: "PREVENCIONISTA" })).not.toThrow();
    expect(() => validarAprobacionMiper({ estado: "borrador", cantidadItems: 1, rol: "PREVENCIONISTA" })).toThrow("en revisión");
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 0, rol: "PREVENCIONISTA" })).toThrow("al menos un ítem");
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 1, rol: "TRABAJADOR" })).toThrow("administración o prevención");
  });

  it("bloquea revisión y aprobación cuando existe VEP pendiente", () => {
    expect(() => validarVepCompletoParaTransicion(1, "en_revision")).toThrow("enviar la matriz a revisión");
    expect(() => validarVepCompletoParaTransicion(1, "vigente")).toThrow("aprobar la matriz");
    expect(() => validarVepCompletoParaTransicion(0, "en_revision")).not.toThrow();
  });

  it.each([
    [{ responsableRegistrado: false }, "responsable de elaboración"],
    [{ respuestasNoSePendientes: 1 }, "No sé"],
    [{ riesgosPrioritariosSinControl: 1 }, "medida de control"],
    [{ evaluacionesEspecificasSinRespaldo: 1 }, "observación técnica"],
    [{ evaluacionesVepPendientes: 1 }, "probabilidad y consecuencia"],
    [{ itemsIncompletos: 1 }, "Completa todos los ítems"],
  ] as const)("bloquea aprobación por pendientes formales", (restriccion, mensaje) => {
    expect(() => validarAprobacionMiper({ estado: "en_revision", cantidadItems: 1, rol: "PREVENCIONISTA", ...restriccion })).toThrow(mensaje);
  });
});
