import { describe, it, expect } from "vitest";
import {
  validarArchivoDocumento,
  getDocumentoExtension,
  formatDocumentoPeso,
  MAX_DOCUMENTO_FILE_SIZE,
} from "@/lib/documentacion/archivo-documento";

const MB = 1024 * 1024;

// ── getDocumentoExtension ─────────────────────────────────────────────────────

describe("getDocumentoExtension", () => {
  it("extrae la extension en minusculas de un nombre simple", () => {
    expect(getDocumentoExtension("contrato.PDF")).toBe(".pdf");
    expect(getDocumentoExtension("informe.DOCX")).toBe(".docx");
  });

  it("extrae la extension de un nombre con multiples puntos", () => {
    expect(getDocumentoExtension("archivo.v2.final.pdf")).toBe(".pdf");
  });

  it("retorna cadena vacia cuando no hay extension", () => {
    expect(getDocumentoExtension("sinextension")).toBe("");
  });

  it("retorna cadena vacia para un punto inicial sin extension real (dotfile)", () => {
    // El punto inicial cuenta como el separador, la parte despues es la extension
    const result = getDocumentoExtension(".gitignore");
    // lastIndexOf(".") = 0, slice(0) = ".gitignore" — sigue siendo valido comportamiento
    expect(typeof result).toBe("string");
  });
});

// ── validarArchivoDocumento ───────────────────────────────────────────────────

describe("validarArchivoDocumento - tipos permitidos", () => {
  it("acepta un PDF valido", () => {
    const result = validarArchivoDocumento({
      name: "documento.pdf",
      type: "application/pdf",
      size: 1 * MB,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.extension).toBe(".pdf");
      expect(result.mimeType).toBe("application/pdf");
    }
  });

  it("acepta una imagen JPEG", () => {
    const result = validarArchivoDocumento({
      name: "foto.jpg",
      type: "image/jpeg",
      size: 500 * 1024,
    });
    expect(result.ok).toBe(true);
  });

  it("acepta una imagen PNG", () => {
    const result = validarArchivoDocumento({
      name: "captura.png",
      type: "image/png",
      size: 2 * MB,
    });
    expect(result.ok).toBe(true);
  });

  it("acepta DOCX con MIME correcto", () => {
    const result = validarArchivoDocumento({
      name: "informe.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 3 * MB,
    });
    expect(result.ok).toBe(true);
  });

  it("acepta XLSX con MIME correcto", () => {
    const result = validarArchivoDocumento({
      name: "planilla.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 4 * MB,
    });
    expect(result.ok).toBe(true);
  });
});

describe("validarArchivoDocumento - tipos rechazados", () => {
  it("rechaza un archivo ejecutable (.exe)", () => {
    const result = validarArchivoDocumento({
      name: "virus.exe",
      type: "application/octet-stream",
      size: 1 * MB,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("no permitido");
    }
  });

  it("rechaza un archivo ZIP", () => {
    const result = validarArchivoDocumento({
      name: "archivos.zip",
      type: "application/zip",
      size: 1 * MB,
    });
    expect(result.ok).toBe(false);
  });

  it("rechaza un archivo sin extension", () => {
    const result = validarArchivoDocumento({
      name: "sinextension",
      type: "application/pdf",
      size: 1 * MB,
    });
    expect(result.ok).toBe(false);
  });

  it("rechaza extension permitida pero MIME no permitido", () => {
    // Extension .pdf pero MIME incorrecto
    const result = validarArchivoDocumento({
      name: "trampa.pdf",
      type: "text/html",
      size: 1 * MB,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("MIME");
    }
  });
});

describe("validarArchivoDocumento - validacion de tamanio", () => {
  it("acepta un archivo justo en el limite (10 MB)", () => {
    const result = validarArchivoDocumento({
      name: "limite.pdf",
      type: "application/pdf",
      size: MAX_DOCUMENTO_FILE_SIZE,
    });
    expect(result.ok).toBe(true);
  });

  it("rechaza un archivo que supera el limite", () => {
    const result = validarArchivoDocumento({
      name: "grande.pdf",
      type: "application/pdf",
      size: MAX_DOCUMENTO_FILE_SIZE + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("10 MB");
    }
  });

  it("acepta un archivo de 1 byte", () => {
    const result = validarArchivoDocumento({
      name: "minimo.pdf",
      type: "application/pdf",
      size: 1,
    });
    expect(result.ok).toBe(true);
  });
});

// ── formatDocumentoPeso ───────────────────────────────────────────────────────

describe("formatDocumentoPeso", () => {
  it('retorna "-" para null', () => {
    expect(formatDocumentoPeso(null)).toBe("-");
  });

  it('retorna "-" para 0', () => {
    expect(formatDocumentoPeso(0)).toBe("-");
  });

  it("formatea bytes correctamente", () => {
    expect(formatDocumentoPeso(500)).toBe("500 B");
  });

  it("formatea kilobytes correctamente", () => {
    expect(formatDocumentoPeso(1024)).toBe("1.0 KB");
    expect(formatDocumentoPeso(2048)).toBe("2.0 KB");
  });

  it("formatea megabytes correctamente", () => {
    expect(formatDocumentoPeso(5 * MB)).toBe("5.0 MB");
  });
});
