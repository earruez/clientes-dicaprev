import { describe, expect, it } from "vitest";
import { PLANTILLA_ACREDITACION_TRABAJADORES } from "@/lib/contratistas/plantilla-acreditacion-trabajadores";
import { estadoEfectivo, vencimientoEfectivoRequisito, vencimientoMaximoPorMeses } from "@/lib/contratistas/requisitos";

describe("Pauta de acreditación de trabajadores", () => {
  it("incluye 12 documentos por trabajador sin duplicados de nombre", () => {
    expect(PLANTILLA_ACREDITACION_TRABAJADORES).toHaveLength(12);
    expect(new Set(PLANTILLA_ACREDITACION_TRABAJADORES.map((r) => r.nombre)).size).toBe(12);
  });
  it("establece los límites específicos y las excepciones condicionales", () => {
    const porClave = Object.fromEntries(PLANTILLA_ACREDITACION_TRABAJADORES.map((r) => [r.clave, r]));
    expect(porClave["irl-ds44"].vigenciaMeses).toBe(24);
    expect(porClave["induccion-ingreso"].obligatorio).toBe(true);
    expect(porClave["difusion-pts"].obligatorio).toBe(true);
    expect(porClave["licencias-especificas"].condicional).toBe(true);
    expect(porClave["reglamento-interno"].vigenciaMeses).toBe(24);
    expect(porClave.epp.vigenciaMeses).toBe(12);
    expect(porClave.epp.condicional).toBe(true);
    expect(porClave["examen-oal"].obligatorio).toBe(false);
    expect(porClave["certificacion-cargo"].condicional).toBe(true);
  });
  it("calcula vigencia a partir de entrega respetando vencimiento anterior", () => {
    const emision = new Date("2025-02-28T12:00:00Z");
    expect(vencimientoMaximoPorMeses(emision, 12)?.toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(vencimientoEfectivoRequisito("2026-01-01T12:00:00Z", emision, 12)?.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
  it("marca como vencido un certificado aprobado cuando supera el plazo de la pauta", () => {
    expect(estadoEfectivo("aprobado", null, new Date("2020-01-01T12:00:00Z"), 24)).toBe("vencido");
    expect(estadoEfectivo("aprobado", null, null, 24)).toBe("vencido");
  });
});
