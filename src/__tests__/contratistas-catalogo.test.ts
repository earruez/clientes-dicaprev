import { describe, expect, it } from "vitest";
import { CATALOGO_CONTRATISTAS, CATALOGO_EMPRESA, CATALOGO_FAENA, normalizarClaveDocumento } from "@/lib/contratistas/catalogo";

describe("Catálogo documental contratistas NextPrev", () => {
  it("separa documentos corporativos y de faena", () => {
    expect(CATALOGO_EMPRESA.length).toBeGreaterThan(5);
    expect(CATALOGO_FAENA.length).toBeGreaterThan(5);
    expect(CATALOGO_EMPRESA.every((doc) => doc.alcance === "empresa" && doc.categoria === "empresa")).toBe(true);
    expect(CATALOGO_FAENA.every((doc) => doc.alcance === "faena" && doc.categoria === "empresa")).toBe(true);
  });

  it("no repite claves de catálogo para el mismo ámbito", () => {
    const keys = CATALOGO_CONTRATISTAS.map((doc) => doc.alcance + ":" + doc.clave);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("F30-1 es periódico por contrato, no documentación permanente", () => {
    expect(CATALOGO_FAENA.some((doc) => doc.clave === "f301" && doc.requiereVencimiento)).toBe(true);
    expect(CATALOGO_EMPRESA.some((doc) => doc.clave === "f301")).toBe(false);
  });

  it("mantiene documento IRL sin utilizar la denominación anterior", () => {
    const item = CATALOGO_CONTRATISTAS.find((doc) => doc.clave === "irl");
    expect(item?.nombre).toContain("IRL");
    expect(item?.categoria).toBe("trabajador");
  });

  it("normaliza claves para documentos personalizados sin mezclar acentos", () => {
    expect(normalizarClaveDocumento("  Certificación de Equipos  ")).toBe("certificacion_de_equipos");
  });
});
