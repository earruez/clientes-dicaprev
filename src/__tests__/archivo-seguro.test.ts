import { describe, expect, it } from "vitest";
import { construirArchivoSeguroUrl, extraerNombreArchivoSeguro } from "@/lib/documentacion/archivo-seguro";

describe("Autorización de evidencias de cierre", () => {
  it("extrae el nombre real desde una URL privada de NextPrev", () => {
    const nombre = "b5d92c5b-93ff-4ca9-942b-115b080cfe00.jpg";
    expect(extraerNombreArchivoSeguro(construirArchivoSeguroUrl(nombre))).toBe(nombre);
  });

  it("acepta el nombre codificado generado por el módulo documental", () => {
    expect(extraerNombreArchivoSeguro("/api/dicaprev/documentacion/archivo/foto%2D1.png")).toBe("foto-1.png");
  });

  it("no acepta rutas externas, de otras APIs, ni path traversal", () => {
    expect(extraerNombreArchivoSeguro("https://externo.cl/imagen.jpg")).toBe(null);
    expect(extraerNombreArchivoSeguro("/api/otra-ruta/imagen.jpg")).toBe(null);
    expect(extraerNombreArchivoSeguro("/api/dicaprev/documentacion/archivo/../imagen.jpg")).toBe(null);
    expect(extraerNombreArchivoSeguro("/api/dicaprev/documentacion/archivo/%2E%2E%2Fimagen.jpg")).toBe(null);
  });

  it("permite evidencias solo textuales sin archivo", () => {
    expect(extraerNombreArchivoSeguro(null)).toBe(null);
    expect(extraerNombreArchivoSeguro(undefined)).toBe(null);
  });
});
