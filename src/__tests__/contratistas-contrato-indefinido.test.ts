import { describe, expect, it } from "vitest";
import { MAX_ARCHIVO_PORTAL_BYTES, validarArchivoPortal, validarFechasPortal } from "@/lib/contratistas/validacion-carga";
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

describe("Portal contratistas: validaciones de carga", () => {
  it("acepta archivos de hasta 4,5 MB, pero rechaza uno mayor", () => {
    expect(MAX_ARCHIVO_PORTAL_BYTES).toBe(4_500_000);
    expect(validarArchivoPortal({ name: "contrato.pdf", type: "application/pdf", size: MAX_ARCHIVO_PORTAL_BYTES })).toBeNull();
    expect(validarArchivoPortal({ name: "contrato.pdf", type: "application/pdf", size: MAX_ARCHIVO_PORTAL_BYTES + 1 })).toContain("4,5 MB");
  });
  it("explica los formatos admitidos y archivos inválidos", () => {
    expect(validarArchivoPortal({ name: "contrato.exe", type: "application/octet-stream", size: 120 })).toContain("Tipo de archivo no permitido");
    expect(validarArchivoPortal({ name: "contrato.pdf", type: "application/pdf", size: 0 })).toContain("vacío");
    expect(validarArchivoPortal(null)).toContain("Selecciona");
  });
  it("informa la fecha obligatoria solo en documentos sujetos a vigencia", () => {
    expect(validarFechasPortal({ emision: "", vencimiento: "", vigenciaMeses: null })).toBeNull();
    expect(validarFechasPortal({ emision: "", vencimiento: "", vigenciaMeses: 24 })).toContain("Falta completar");
    expect(validarFechasPortal({ emision: "2026-11-05", vencimiento: "2026-11-04", vigenciaMeses: null })).toContain("anterior");
  });
});
