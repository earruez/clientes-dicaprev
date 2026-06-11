import { describe, it, expect } from "vitest";
import { generarHashFirma } from "@/lib/firmas/hash";

// generarHashFirma es una función pura que usa crypto.createHash internamente.
// No tiene dependencias de Prisma ni de Next.js, por lo que se puede testar directamente.

const INPUT_BASE = {
  documentoId: "doc-123",
  token: "abc-token-xyz",
  timestamp: "2026-06-11T12:00:00.000Z",
  firmante: "Juan Pérez",
  rut: "12345678-9",
};

describe("generarHashFirma", () => {
  it("retorna un string hexadecimal de 64 caracteres (SHA-256)", () => {
    const hash = generarHashFirma(INPUT_BASE);
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("el mismo input siempre produce el mismo hash (determinista)", () => {
    const hash1 = generarHashFirma(INPUT_BASE);
    const hash2 = generarHashFirma(INPUT_BASE);
    expect(hash1).toBe(hash2);
  });

  it("inputs distintos producen hashes distintos", () => {
    const hash1 = generarHashFirma(INPUT_BASE);
    const hash2 = generarHashFirma({ ...INPUT_BASE, documentoId: "doc-999" });
    expect(hash1).not.toBe(hash2);
  });

  it("cambiar el token cambia el hash", () => {
    const hash1 = generarHashFirma(INPUT_BASE);
    const hash2 = generarHashFirma({ ...INPUT_BASE, token: "token-diferente" });
    expect(hash1).not.toBe(hash2);
  });

  it("cambiar el timestamp cambia el hash", () => {
    const hash1 = generarHashFirma(INPUT_BASE);
    const hash2 = generarHashFirma({
      ...INPUT_BASE,
      timestamp: "2026-06-12T00:00:00.000Z",
    });
    expect(hash1).not.toBe(hash2);
  });

  it("funciona con firmante y rut undefined/null (campos opcionales)", () => {
    const hashSinOpcionales = generarHashFirma({
      documentoId: "doc-123",
      token: "abc-token-xyz",
      timestamp: "2026-06-11T12:00:00.000Z",
    });
    const hashConNull = generarHashFirma({
      documentoId: "doc-123",
      token: "abc-token-xyz",
      timestamp: "2026-06-11T12:00:00.000Z",
      firmante: null,
      rut: null,
    });
    // Ambos deben ser hashes validos de 64 chars
    expect(hashSinOpcionales).toHaveLength(64);
    expect(hashConNull).toHaveLength(64);
    // undefined y null se tratan igual (ambos coalesced a "")
    expect(hashSinOpcionales).toBe(hashConNull);
  });

  it("el firmante afecta el hash", () => {
    const hashConFirmante = generarHashFirma(INPUT_BASE);
    const hashSinFirmante = generarHashFirma({
      ...INPUT_BASE,
      firmante: null,
    });
    expect(hashConFirmante).not.toBe(hashSinFirmante);
  });

  it("el rut afecta el hash", () => {
    const hashConRut = generarHashFirma(INPUT_BASE);
    const hashSinRut = generarHashFirma({ ...INPUT_BASE, rut: null });
    expect(hashConRut).not.toBe(hashSinRut);
  });
});
