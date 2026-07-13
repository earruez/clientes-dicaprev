const CODIGOS_INDUCCION_A_TIPO_CONTROL: Record<string, string> = {
  IRL: "IRL_RIESGOS",
  ENTREGA_EPP: "ENTREGA_EPP",
  RECEPCION_RI: "REGLAMENTO_INTERNO_RECIBIDO",
  REGISTRO_INDUCCION: "CAPACITACION_INICIAL",
};

export function mapCodigoDocumentoInduccionACodigoControl(codigo: string): string | null {
  return CODIGOS_INDUCCION_A_TIPO_CONTROL[codigo.trim().toUpperCase()] ?? null;
}