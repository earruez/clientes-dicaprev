import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_VIGENCIA_MS = 10 * 60 * 1000;
export const OTP_REENVIO_MS = 60 * 1000;
export const OTP_INTENTOS_MAX = 5;

export function generarCodigoOtp(): string {
  return String(randomInt(100000, 1000000));
}
export function hashOtp(identificador: string, codigo: string): string {
  return createHash("sha256").update("nextprev-sst-otp-v1|" + identificador + "|" + codigo).digest("hex");
}
export function compararOtp(esperado: string | null | undefined, calculado: string): boolean {
  if (!esperado || !/^[a-f0-9]{64}$/.test(esperado) || !/^[a-f0-9]{64}$/.test(calculado)) return false;
  return timingSafeEqual(Uint8Array.from(Buffer.from(esperado, "hex")), Uint8Array.from(Buffer.from(calculado, "hex")));
}
export function otpVigente(vence: Date | null | undefined, intentos: number, ahora = Date.now()): boolean {
  return !!vence && vence.getTime() > ahora && intentos < OTP_INTENTOS_MAX;
}
export function puedeReenviarOtp(enviado: Date | null | undefined, ahora = Date.now()): boolean {
  return !enviado || enviado.getTime() + OTP_REENVIO_MS <= ahora;
}
export function validarFormatoCodigo(codigo: string): boolean {
  return /^[0-9]{6}$/.test(codigo);
}
