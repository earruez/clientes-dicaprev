import { describe, expect, it } from "vitest";
import {
  generarCodigoOtp, hashOtp, compararOtp, otpVigente, puedeReenviarOtp,
  validarFormatoCodigo, OTP_INTENTOS_MAX, OTP_VIGENCIA_MS,
} from "@/lib/firmas-sst/otp";
import { crearConstanciaFirmaSst } from "@/lib/firmas-sst/constancia";

describe("Firma SST temporal: código OTP", () => {
  it("genera un código impredecible de seis dígitos y compara su hash", () => {
    const code = generarCodigoOtp();
    expect(validarFormatoCodigo(code)).toBe(true);
    const hash = hashOtp("firma-sst-1", code);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(compararOtp(hash, hashOtp("firma-sst-1", code))).toBe(true);
    expect(compararOtp(hash, hashOtp("firma-sst-2", code))).toBe(false);
    expect(compararOtp(hash, hashOtp("firma-sst-1", "000000"))).toBe(code === "000000");
    expect(compararOtp(null, hash)).toBe(false);
  });
  it("caduca tras 10 minutos y corta después de cinco intentos", () => {
    const ahora = Date.now();
    expect(otpVigente(new Date(ahora + OTP_VIGENCIA_MS), 0, ahora)).toBe(true);
    expect(otpVigente(new Date(ahora), 0, ahora)).toBe(false);
    expect(otpVigente(new Date(ahora + OTP_VIGENCIA_MS), OTP_INTENTOS_MAX, ahora)).toBe(false);
    expect(puedeReenviarOtp(new Date(ahora), ahora)).toBe(false);
    expect(puedeReenviarOtp(new Date(ahora - 60_001), ahora)).toBe(true);
  });
  it("rechaza formatos inválidos", () => {
    expect(validarFormatoCodigo("123456")).toBe(true);
    for (const code of ["12345", "1234567", "abc123", "123 456", "１２３４５６"]) {
      expect(validarFormatoCodigo(code)).toBe(false);
    }
  });
});

describe("Firma SST temporal: constancia documental", () => {
  it("genera un PDF con la identidad, el hash y el vínculo de verificación", () => {
    const pdf = crearConstanciaFirmaSst({
      empresa: "Empresa de Prueba SpA", rutEmpresa: "76.123.456-7",
      titulo: "Información de Riesgos Laborales", archivoOriginal: "irl.pdf",
      tipoEvidencia: "irl", modalidadContrato: "Plazo Fijo",
      fechaInicioContrato: "2026-11-05", fechaTerminoContrato: "2026-11-07",
      nombreFirmante: "Trabajador de prueba", rutFirmante: "12.345.678-5",
      correoParticular: "prueba@example.com",
      solicitadoAt: new Date("2026-11-05T10:00:00Z"), firmadoAt: new Date("2026-11-05T12:00:00Z"),
      correoValidadoAt: new Date("2026-11-05T11:59:00Z"),
      firmaTexto: "Trabajador de prueba", hashDocumento: "a".repeat(64), hashEvidencia: "b".repeat(64),
      ip: "127.0.0.1", userAgent: "test", verificacionUrl: "https://example.com/verificar-firma/" + "b".repeat(64),
    });
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("NextPrev");
  });
});
