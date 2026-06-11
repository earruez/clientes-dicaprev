import { createHash } from "crypto";

type GenerarHashFirmaInput = {
  documentoId: string;
  token: string;
  timestamp: string;
  firmante?: string | null;
  rut?: string | null;
};

export function generarHashFirma(input: GenerarHashFirmaInput) {
  const base = [
    input.documentoId,
    input.token,
    input.timestamp,
    input.firmante ?? "",
    input.rut ?? "",
  ].join("|");

  return createHash("sha256").update(base).digest("hex");
}
