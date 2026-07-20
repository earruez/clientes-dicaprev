import { describe, expect, it } from "vitest";
import { clasificarRiesgoMiper, evaluarRiesgoMiper } from "@/lib/ds44/miper-evaluacion";

describe("evaluación de riesgo MIPER DS44", () => {
  it.each([
    [1, "bajo"],
    [4, "bajo"],
    [5, "medio"],
    [9, "medio"],
    [10, "alto"],
    [16, "alto"],
    [17, "critico"],
    [25, "critico"],
  ] as const)("clasifica el nivel %s como %s", (nivel, clasificacion) => {
    expect(clasificarRiesgoMiper(nivel)).toBe(clasificacion);
  });

  it("calcula nivel y clasificación desde probabilidad y severidad", () => {
    expect(evaluarRiesgoMiper(4, 5)).toEqual({
      probabilidad: 4,
      severidad: 5,
      nivelRiesgo: 20,
      clasificacionRiesgo: "critico",
    });
  });

  it.each([
    [0, 2],
    [6, 2],
    [2.5, 2],
    [2, 0],
    [2, 6],
    [2, 2.5],
  ])("rechaza valores fuera de la matriz 5x5 (%s, %s)", (probabilidad, severidad) => {
    expect(() => evaluarRiesgoMiper(probabilidad, severidad)).toThrow("entre 1 y 5");
  });
});
