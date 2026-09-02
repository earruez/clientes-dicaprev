import { createHash, randomBytes } from "crypto";

/** Genera un token aleatorio que solo se entrega al usuario. */
export function generarTokenCambioContraseña(): string {
  return randomBytes(32).toString("hex");
}

/** Persiste únicamente un hash SHA-256 del token para reducir impacto ante fuga de BD. */
export function hashTokenCambioContraseña(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function calcularFechaExpiracion(horas: number = 24): Date {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + horas);
  return fecha;
}

export function esTokenExpirado(fechaExpiracion: Date): boolean {
  return new Date() > fechaExpiracion;
}
