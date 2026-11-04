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

  it("informa cuántas medidas impiden el cierre sin lanzar excepción", () => {
    const resultado = requisitosCierreMedidas(["completada", "pendiente", "en_proceso", "pendiente"], true);
    expect(resultado.permitido).toBe(false);
    expect(resultado.mensaje).toContain("2 pendientes");
    expect(resultado.mensaje).toContain("1 en proceso");
  });

  it("explica qué falta cuando no hay medidas o evidencia", () => {
    expect(requisitosCierreMedidas([], true).mensaje).toMatch(/Agrega al menos una medida/);
    expect(requisitosCierreMedidas(["completada"], false).mensaje).toMatch(/evidencia|comentario/);
  });

  it("permite cerrar solo cuando todas están gestionadas", () => {
    expect(requisitosCierreMedidas(["completada", "completada"], true).permitido).toBe(true);
    expect(requisitosCierreMedidas(["completada", "descartada"], true).permitido).toBe(true);
  });
});
