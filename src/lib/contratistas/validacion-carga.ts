import { validarArchivoDocumento, DOCUMENTO_TIPOS_LABEL } from "@/lib/documentacion/archivo-documento";
import { esRequisitoContratoLaboral, requiereFechaVencimientoDeclarada } from "@/lib/contratistas/requisitos";

export const MAX_ARCHIVO_PORTAL_BYTES = 4_500_000;
export const ARCHIVOS_PORTAL_FORMATOS = DOCUMENTO_TIPOS_LABEL;

/** Validación compartida por portal público y API, con el límite de 4,5 MB (4.500.000 bytes) para dejar margen al formulario en Vercel. */
export function validarArchivoPortal(file: { name: string; type: string; size: number } | null | undefined): string | null {
  if (!file) return "Selecciona un archivo para adjuntar.";
  if (!file.name.trim()) return "El archivo debe tener un nombre válido.";
  if (file.size <= 0) return "El archivo está vacío. Selecciona un documento con contenido.";
  if (file.size > MAX_ARCHIVO_PORTAL_BYTES) {
    return "El archivo pesa " + (file.size / 1_000_000).toFixed(2) + " MB y supera el máximo de 4,5 MB. Reduce el tamaño o elige otro archivo.";
  }
  const resultado = validarArchivoDocumento(file);
  return resultado.ok ? null : resultado.error || "Formato de archivo no admitido.";
}

export function validarFechasPortal(input: {
  emision: string;
  vencimiento: string;
  vigenciaMeses: number | null;
  nombreRequisito?: string;
  categoria?: string;
  tipoContrato?: string | null;
}): string | null {
  if (input.nombreRequisito && esRequisitoContratoLaboral({ nombre: input.nombreRequisito, categoria: input.categoria }) &&
    !["indefinido", "plazo_fijo", "obra_faena"].includes(input.tipoContrato || "")) {
    return "Falta seleccionar la modalidad del contrato: indefinido, plazo fijo u obra/faena.";
  }
  if (input.nombreRequisito && requiereFechaVencimientoDeclarada({
    nombre: input.nombreRequisito, categoria: input.categoria, tipoContrato: input.tipoContrato,
  }) && !input.vencimiento) {
    return "Falta completar la fecha de vencimiento de este documento. No se puede verificar su vigencia sin esa fecha.";
  }
  if (input.vigenciaMeses && !input.emision) {
    return "Falta completar la fecha de emisión o entrega: este requisito tiene una vigencia máxima.";
  }
  const fechaValida = (f: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
    const d = new Date(f + "T12:00:00.000Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === f;
  };
  if (input.emision && !fechaValida(input.emision)) return "La fecha de emisión no es válida.";
  if (input.vencimiento && !fechaValida(input.vencimiento)) return "La fecha de vencimiento no es válida.";
  if (input.emision && input.vencimiento && input.vencimiento < input.emision) {
    return "La fecha de vencimiento no puede ser anterior a la fecha de emisión.";
  }
  return null;
}
