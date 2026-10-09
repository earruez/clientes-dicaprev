import { describe, expect, it } from "vitest";
import { REQUISITOS_EMPRESA, REQUISITOS_RECURSO, estadoEfectivo } from "@/lib/contratistas/requisitos";

describe("documentación de empresas contratistas", () => {
  it("mantiene aprobado un documento sin vencimiento", () => {
    expect(estadoEfectivo("aprobado", null)).toBe("aprobado");
  });

  it("marca vencido al documento aprobado de una fecha pasada", () => {
    expect(estadoEfectivo("aprobado", "2020-01-01T12:00:00.000Z")).toBe("vencido");
  });

  it("permite vigencia hasta el final de la fecha de vencimiento", () => {
    const hoy = new Date().toISOString().slice(0, 10);
    expect(estadoEfectivo("aprobado", `${hoy}T12:00:00.000Z`)).toBe("aprobado");
  });

  it("no oculta observaciones del revisor por estar vencido", () => {
    expect(estadoEfectivo("observado", "2020-01-01T12:00:00.000Z")).toBe("observado");
  });

  it("ofrece requisitos por empresa, trabajador, vehículo y maquinaria", () => {
    expect(REQUISITOS_EMPRESA.some((r) => r.clave === "miper")).toBe(true);
    expect(REQUISITOS_RECURSO.trabajador.some((r) => r.clave === "irl")).toBe(true);
    for (const clave of ["padron", "soap", "permiso", "revision", "gases"]) {
      expect(REQUISITOS_RECURSO.vehiculo.some((r) => r.clave === clave)).toBe(true);
    }
    expect(REQUISITOS_RECURSO.equipo.length).toBeGreaterThan(0);
  });
});
