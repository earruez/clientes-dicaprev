import { describe, expect, it } from "vitest";
import {
  JERARQUIA_CONTROL_DS44, esNivelJerarquiaControlDs44,
  tituloMedidaJerarquiaControlDs44, leerJerarquiaControlDs44, nombreJerarquiaControlDs44,
} from "@/lib/hallazgos/jerarquia-control-ds44";

describe("Jerarquía de controles DS44 - medidas correctivas", () => {
  it("mantiene cuatro niveles estandarizados en orden legal", () => {
    expect(JERARQUIA_CONTROL_DS44.map((n) => n.orden)).toEqual([1, 2, 3, 4]);
    expect(JERARQUIA_CONTROL_DS44.map((n) => n.codigo)).toEqual([
      "eliminacion", "fuente", "administrativa", "epp",
    ]);
  });

  it.each(JERARQUIA_CONTROL_DS44)("persistencia reversible %s", (nivel) => {
    const titulo = tituloMedidaJerarquiaControlDs44(nivel.codigo);
    expect(leerJerarquiaControlDs44(titulo)).toBe(nivel.codigo);
    expect(nombreJerarquiaControlDs44(nivel.codigo)).toBe(nivel.nombre);
  });

  it("no interpreta medidas antiguas como clasificadas", () => {
    expect(leerJerarquiaControlDs44("Medida correctiva")).toBe(null);
    expect(leerJerarquiaControlDs44("Medida correctiva inicial")).toBe(null);
    expect(nombreJerarquiaControlDs44(null)).toMatch(/Sin clasificar/);
  });

  it("rechaza claves arbitrarias y evita clasificación libre", () => {
    expect(esNivelJerarquiaControlDs44("sustitucion")).toBe(false);
    expect(esNivelJerarquiaControlDs44("EPP")).toBe(false);
    expect(leerJerarquiaControlDs44("Medida correctiva DS44 · control_inventado")).toBe(null);
  });
});
