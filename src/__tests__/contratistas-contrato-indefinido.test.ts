import { describe, expect, it } from "vitest";
import {
  esRequisitoContratoLaboral, vigenciaMesesRequisito,
  vencimientoEfectivoRequisito, estadoVisibleRequisitoContratista,
} from "@/lib/contratistas/requisitos";

describe("Portal contratistas: contratos de trabajo indefinidos", () => {
  const contrato = {
    categoria: "trabajador",
    nombre: "Contrato de trabajo vigente y anexo de vinculación al proyecto",
    vigenciaMeses: 12,
  };
  it("no impone vencimiento automático incluso si la pauta heredada trae meses", () => {
    expect(esRequisitoContratoLaboral(contrato)).toBe(true);
    const vigencia = vigenciaMesesRequisito(contrato);
    expect(vigencia).toBeNull();
    expect(vencimientoEfectivoRequisito(null, null, vigencia)).toBeNull();
    expect(estadoVisibleRequisitoContratista("aprobado", "archivo.pdf", null, null, vigencia)).toBe("aprobado");
  });
  it("permite indicar fecha de término real si se trata de un contrato a plazo", () => {
    const vigencia = vigenciaMesesRequisito(contrato);
    expect(vencimientoEfectivoRequisito("2026-12-31", "2026-11-05", vigencia)?.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
  it("conserva la exigencia de antigüedad para certificados que sí tienen vigencia", () => {
    const vigente = { categoria: "trabajador", nombre: "Información de riesgos laborales (IRL)", vigenciaMeses: 24 };
    expect(vigenciaMesesRequisito(vigente)).toBe(24);
    expect(estadoVisibleRequisitoContratista("aprobado", "archivo.pdf", null, null, 24)).toBe("vencido");
  });
  it("no confunde contratos laborales con otros documentos", () => {
    expect(esRequisitoContratoLaboral({ categoria: "empresa", nombre: contrato.nombre })).toBe(false);
    expect(esRequisitoContratoLaboral({ categoria: "trabajador", nombre: "Constancia de capacitación" })).toBe(false);
    expect(esRequisitoContratoLaboral({ categoria: "trabajador", nombre: "Contrato laboral indefinido" })).toBe(true);
  });
});
