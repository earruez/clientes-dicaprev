import { randomBytes } from "crypto";

/**
 * Genera un token seguro para cambio de contraseña
 */
export function generarTokenCambioContraseña(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Calcula la fecha de expiración (24 horas desde ahora)
 */
export function calcularFechaExpiracion(horas: number = 24): Date {
  const fecha = new Date();
  fecha.setHours(fecha.getHours() + horas);
  return fecha;
}

/**
 * Valida si un token ha expirado
 */
export function esTokenExpirado(fechaExpiracion: Date): boolean {
  return new Date() > fechaExpiracion;
}
