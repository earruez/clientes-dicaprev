export type EstadoInforme = "vigente" | "por_vencer" | "vencido" | "pendiente" | "en_revision" | "no_aplica";

export type RequisitoInforme = {
  id: string;
  categoria: string;
  nombre: string;
  condicion: string;
};

export type DocumentoInforme = {
  id: string;
  requisitoId: string;
  estado: string;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  observacion?: string | null;
  versionNumero?: number;
  creadoEn?: string;
};

export type TrabajadorInformeInput = {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  area: string;
  centro: string;
  requisitos: RequisitoInforme[];
  documentos: DocumentoInforme[];
};

export type DetalleInforme = RequisitoInforme & {
  estado: EstadoInforme;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  dias: number | null;
  observacion: string | null;
};

export type FilaTrabajadorInforme = Omit<TrabajadorInformeInput, "requisitos" | "documentos"> & {
  detalles: DetalleInforme[];
  exigibles: number;
  vigente: number;
  porVencer: number;
  vencido: number;
  pendiente: number;
  enRevision: number;
  cumplimiento: number | null;
  estadoGeneral: string;
};

const APROBADOS = new Set(["aprobado", "completo", "validado", "firmado", "vigente"]);

function fechaMs(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizarEstadoDocumento(documento: DocumentoInforme | undefined, corte: Date): EstadoInforme {
  if (!documento) return "pendiente";
  const estado = documento.estado.trim().toLowerCase().replaceAll(" ", "_");
  if (estado === "no_aplica") return "no_aplica";
  if (["en_revision", "pendiente_revision", "cargado"].includes(estado)) return "en_revision";
  if (!APROBADOS.has(estado)) return "pendiente";
  if (!documento.fechaVencimiento) return "vigente";
  const dias = Math.ceil((fechaMs(documento.fechaVencimiento) - corte.getTime()) / 86_400_000);
  if (dias < 0) return "vencido";
  return dias <= 30 ? "por_vencer" : "vigente";
}

function escogerDocumento(documentos: DocumentoInforme[], requisitoId: string, corte: Date) {
  return documentos
    .filter((doc) => doc.requisitoId === requisitoId)
    .sort((a, b) => {
      const score = (doc: DocumentoInforme) => {
        const estado = normalizarEstadoDocumento(doc, corte);
        return estado === "vigente" || estado === "por_vencer" ? 2 : estado === "en_revision" ? 1 : 0;
      };
      return score(b) - score(a)
        || (b.versionNumero ?? 0) - (a.versionNumero ?? 0)
        || fechaMs(b.creadoEn) - fechaMs(a.creadoEn);
    })[0];
}

export function calcularFilaTrabajador(input: TrabajadorInformeInput, corte: Date): FilaTrabajadorInforme {
  const detalles = input.requisitos.map((requisito) => {
    const documento = escogerDocumento(input.documentos, requisito.id, corte);
    const estado = normalizarEstadoDocumento(documento, corte);
    const dias = documento?.fechaVencimiento
      ? Math.ceil((fechaMs(documento.fechaVencimiento) - corte.getTime()) / 86_400_000)
      : null;
    return {
      ...requisito,
      estado,
      fechaEmision: documento?.fechaEmision ?? null,
      fechaVencimiento: documento?.fechaVencimiento ?? null,
      dias,
      observacion: documento?.observacion?.trim() || null,
    };
  });
  const cuenta = (estado: EstadoInforme) => detalles.filter((item) => item.estado === estado).length;
  const noAplica = cuenta("no_aplica");
  const exigibles = detalles.length - noAplica;
  const vigente = cuenta("vigente");
  const porVencer = cuenta("por_vencer");
  const vencido = cuenta("vencido");
  const pendiente = cuenta("pendiente");
  const enRevision = cuenta("en_revision");
  const cumplimiento = exigibles ? Math.round(((vigente + porVencer) / exigibles) * 100) : null;
  const estadoGeneral = cumplimiento === null ? "Sin configurar" : cumplimiento === 100 ? "Completo" : "Incompleto";
  return { id: input.id, nombre: input.nombre, rut: input.rut, cargo: input.cargo, area: input.area, centro: input.centro, detalles, exigibles, vigente, porVencer, vencido, pendiente, enRevision, cumplimiento, estadoGeneral };
}

export function calcularInformeTrabajadores(inputs: TrabajadorInformeInput[], corte: Date) {
  const filas = inputs.map((input) => calcularFilaTrabajador(input, corte));
  const detalles = filas.flatMap((fila) => fila.detalles);
  const exigibles = detalles.filter((item) => item.estado !== "no_aplica").length;
  const cumplidos = detalles.filter((item) => item.estado === "vigente" || item.estado === "por_vencer").length;
  return {
    filas,
    resumen: {
      trabajadores: filas.length,
      completos: filas.filter((fila) => fila.cumplimiento === 100).length,
      cumplimiento: exigibles ? Math.round((cumplidos / exigibles) * 100) : null,
      vigente: detalles.filter((item) => item.estado === "vigente").length,
      porVencer: detalles.filter((item) => item.estado === "por_vencer").length,
      vencido: detalles.filter((item) => item.estado === "vencido").length,
      pendiente: detalles.filter((item) => item.estado === "pendiente").length,
      enRevision: detalles.filter((item) => item.estado === "en_revision").length,
      sinConfigurar: filas.filter((fila) => fila.cumplimiento === null).length,
    },
  };
}
