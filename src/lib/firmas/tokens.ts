import { randomBytes } from "crypto";

export function generarTokenFirma() {
  return randomBytes(24).toString("hex");
}
