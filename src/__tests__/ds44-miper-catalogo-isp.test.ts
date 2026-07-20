import { describe, expect, it } from "vitest";
import { CATALOGO_RIESGOS_ISP } from "@/lib/ds44/miper-catalogo-isp";

describe("catálogo de riesgos ISP Anexo C", () => {
  it("conserva las 66 codificaciones únicas del modelo ISP", () => {
    expect(CATALOGO_RIESGOS_ISP).toHaveLength(66);
    expect(new Set(CATALOGO_RIESGOS_ISP.map((item) => item.codigoIsp)).size).toBe(66);
  });

  it("reserva VEP para seguridad y emergencias", () => {
    for (const item of CATALOGO_RIESGOS_ISP) {
      const usaVep = item.categoria === "seguridad" || item.categoria === "emergencia";
      expect(item.metodologiaEvaluacion).toBe(usaVep ? "vep_isp" : "evaluacion_especifica");
    }
  });
});
