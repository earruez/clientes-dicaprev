import { describe, expect, it } from "vitest";
import { estadoMedidaHallazgo, ORIGEN_MEDIDA_EN_PROCESO, requisitosCierreMedidas } from "@/lib/hallazgos/medidas-correctivas";

describe("Hallazgos: estados trazables de medidas correctivas", () => {
  it("mantiene en proceso sin sobrescribir la procedencia original", () => {
    expect(estadoMedidaHallazgo("pendiente", "foto_ia", "en_proceso")).toBe("en_proceso");
    expect(estadoMedidaHallazgo("pendiente", "manual", "pendiente")).toBe("pendiente");
  });

  it("respeta la última transición registrada por encima del marcador legado", () => {
    expect(estadoMedidaHallazgo("pendiente", ORIGEN_MEDIDA_EN_PROCESO)).toBe("en_proceso");
    expect(estadoMedidaHallazgo("pendiente", ORIGEN_MEDIDA_EN_PROCESO, "pendiente")).toBe("pendiente");
  });

  it("mantiene completadas y descartadas según estado documental", () => {
    expect(estadoMedidaHallazgo("valida", "foto_ia", "en_proceso")).toBe("completada");
    expect(estadoMedidaHallazgo("rechazada", "manual", "pendiente")).toBe("descartada");
  });

  it("exige terminar todas las medidas antes de cerrar un hallazgo", () => {
    expect(requisitosCierreMedidas(["completada", "en_proceso"], true).permitido).toBe(false);
    expect(requisitosCierreMedidas(["completada", "descartada"], true).permitido).toBe(true);
  });
});
