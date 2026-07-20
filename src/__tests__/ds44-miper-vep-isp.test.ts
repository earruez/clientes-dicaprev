import { describe, expect, it } from "vitest";
import { clasificarVepIsp, evaluarVepIsp } from "@/lib/ds44/miper-vep-isp";

describe("VEP ISP para riesgos de seguridad y emergencia", () => {
  it.each([[1, "tolerable"], [2, "tolerable"], [4, "moderado"], [8, "importante"], [16, "intolerable"]] as const)(
    "clasifica %s como %s",
    (nivel, clasificacion) => expect(clasificarVepIsp(nivel)).toBe(clasificacion),
  );

  it("calcula VEP con escala discreta 1/2/4", () => {
    expect(evaluarVepIsp(4, 2)).toEqual({ probabilidad: 4, severidad: 2, nivelRiesgo: 8, clasificacionRiesgo: "importante" });
  });

  it.each([[3, 2], [5, 1], [1, 0]])("rechaza valores ajenos a 1/2/4 (%s, %s)", (p, c) => {
    expect(() => evaluarVepIsp(p, c)).toThrow("1, 2 o 4");
  });
});
