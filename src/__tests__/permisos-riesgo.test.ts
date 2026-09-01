import { describe, expect, it } from "vitest";
import { calcularFechaEstimadaResolucion, calcularNivelRiesgo } from "@/app/dicaprev/permisos/utils/calculos";

describe("riesgo de permisos municipales", () => {
  it("marca en riesgo una instalación anterior al plazo hábil de la municipalidad", () => {
    const fechaSolicitud = new Date("2026-08-31T12:00:00");
    const fechaInstalacion = new Date("2026-09-02T12:00:00");
    const fechaEstimadaResolucion = calcularFechaEstimadaResolucion(fechaSolicitud, 15, "HABILES");

    expect(fechaEstimadaResolucion?.toISOString().slice(0, 10)).toBe("2026-09-21");
    expect(calcularNivelRiesgo(fechaInstalacion, fechaEstimadaResolucion, 15, "HABILES")).toBe("EN_RIESGO");
  });
});
