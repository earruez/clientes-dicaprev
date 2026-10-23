import { describe, expect, it } from "vitest";
import { validarRutChile } from "@/lib/rut";
import { normalizarNombreRequisitoContratista } from "@/lib/contratistas/estandarizar-requisitos";

describe("Nómina de contratistas", () => {
  it("acepta RUT válidos y rechaza dígitos verificadores erróneos", () => {
    expect(validarRutChile("12.345.678-5")).toBe(true);
    expect(validarRutChile("12345678-5")).toBe(true);
    expect(validarRutChile("12.345.678-9")).toBe(false);
    expect(validarRutChile("texto")).toBe(false);
  });

  it("conserva la misma etiqueta para RIOHS y Reglamento Interno del trabajador", () => {
    const estandar = "Entrega de Reglamento Interno de la empresa";
    expect(normalizarNombreRequisitoContratista("RIOHS", "trabajador")).toBe(estandar);
    expect(normalizarNombreRequisitoContratista("Reglamento Interno de Orden Higiene y Seguridad", "trabajador")).toBe(estandar);
    expect(normalizarNombreRequisitoContratista(estandar, "trabajador")).toBe(estandar);
    expect(normalizarNombreRequisitoContratista("RIOHS", "empresa")).toBe("Reglamento interno aplicable");
  });

  it("usa IRL y nombres canónicos del catálogo para F30 y F30-1", () => {
    expect(normalizarNombreRequisitoContratista("ODI", "trabajador")).toBe("Información de riesgos laborales (IRL)");
    expect(normalizarNombreRequisitoContratista("F30", "empresa")).toContain("F30");
    expect(normalizarNombreRequisitoContratista("F30-1", "empresa")).toContain("F30-1");
  });
});
