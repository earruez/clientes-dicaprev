import { describe, it, expect } from "vitest";
import {
  estadoMedidaHallazgo,
  requisitosCierreMedidas,
  ORIGEN_MEDIDA_EN_PROCESO,
} from "@/lib/hallazgos/medidas-correctivas";

describe("Hallazgos: varias medidas correctivas", () => {
  it("interpreta los estados independientes de cada medida", () => {
    expect(estadoMedidaHallazgo("pendiente")).toBe("pendiente");
    expect(estadoMedidaHallazgo("pendiente", ORIGEN_MEDIDA_EN_PROCESO)).toBe("en_proceso");
    expect(estadoMedidaHallazgo("valida")).toBe("completada");
    expect(estadoMedidaHallazgo("rechazada")).toBe("descartada");
  });

  it("no permite cerrar si hay medidas pendientes, aunque otra esté completada", () => {
    const result = requisitosCierreMedidas(["completada", "pendiente"], true);
    expect(result.permitido).toBe(false);
    expect(result.mensaje).toContain("todas las medidas");
  });

  it("no permite cerrar si una medida todavía está en proceso", () => {
    expect(requisitosCierreMedidas(["completada", "en_proceso"], true).permitido).toBe(false);
  });

  it("exige al menos una medida completada y una evidencia de cierre", () => {
    expect(requisitosCierreMedidas([], true).permitido).toBe(false);
    expect(requisitosCierreMedidas(["descartada"], true).permitido).toBe(false);
    expect(requisitosCierreMedidas(["completada"], false).permitido).toBe(false);
  });

  it("permite cerrar solo cuando todas están gestionadas", () => {
    expect(requisitosCierreMedidas(["completada", "completada"], true).permitido).toBe(true);
    expect(requisitosCierreMedidas(["completada", "descartada"], true).permitido).toBe(true);
  });
});
