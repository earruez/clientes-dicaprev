const DAY_MS = 1000 * 60 * 60 * 24;

export type TipoAlertaCumplimiento = "vencido" | "por_vencer" | "pendiente";
export type PrioridadAlerta = "alta" | "media" | "baja";

export type DocumentoRequeridoAlertaInput = {
  id: string;
  nombre: string;
  obligatorio: boolean;
  aplicaDesdeTrabajadores: number | null;
  aplicaHastaTrabajadores: number | null;
  activo: boolean;
};

export type DocumentoEmpresaAlertaInput = {
  id: string;
  documentoRequeridoId: string | null;
  archivoNombre: string | null;
  archivoUrl: string | null;
  fechaVencimiento: Date | null;
  updatedAt: Date;
};

export type AlertaCumplimiento = {
  id: string;
  tipo: TipoAlertaCumplimiento;
  documento: string;
  mensaje: string;
  prioridad: PrioridadAlerta;
  fecha: string;
};

function isAplicable(requerido: DocumentoRequeridoAlertaInput, totalTrabajadores: number) {
  if (requerido.aplicaDesdeTrabajadores !== null && totalTrabajadores < requerido.aplicaDesdeTrabajadores) {
    return false;
  }

  if (requerido.aplicaHastaTrabajadores !== null && totalTrabajadores > requerido.aplicaHastaTrabajadores) {
    return false;
  }

  return true;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function diasPara(fecha: Date, today: Date) {
  const a = new Date(today);
  const b = new Date(fecha);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.ceil((b.getTime() - a.getTime()) / DAY_MS);
}

export function getAlertasCumplimiento(
  requeridos: DocumentoRequeridoAlertaInput[],
  documentosEmpresa: DocumentoEmpresaAlertaInput[],
  totalTrabajadores: number,
  today = new Date(),
): AlertaCumplimiento[] {
  const latestByRequerido = new Map<string, DocumentoEmpresaAlertaInput>();

  for (const documento of documentosEmpresa) {
    if (!documento.documentoRequeridoId) continue;
    if (!latestByRequerido.has(documento.documentoRequeridoId)) {
      latestByRequerido.set(documento.documentoRequeridoId, documento);
    }
  }

  const alertas: AlertaCumplimiento[] = [];

  for (const requerido of requeridos) {
    if (!requerido.activo || !requerido.obligatorio) continue;
    if (!isAplicable(requerido, totalTrabajadores)) continue;

    const documento = latestByRequerido.get(requerido.id);
    const hasArchivo = Boolean(documento && (documento.archivoNombre || documento.archivoUrl));

    if (!documento || !hasArchivo) {
      alertas.push({
        id: `pendiente-${requerido.id}`,
        tipo: "pendiente",
        documento: requerido.nombre,
        mensaje: `${requerido.nombre}: pendiente de carga obligatoria.`,
        prioridad: "media",
        fecha: toIsoDate(today),
      });
      continue;
    }

    if (!documento.fechaVencimiento) {
      continue;
    }

    const dias = diasPara(documento.fechaVencimiento, today);
    if (dias < 0) {
      alertas.push({
        id: `vencido-${documento.id}`,
        tipo: "vencido",
        documento: requerido.nombre,
        mensaje: `${requerido.nombre}: documento vencido desde ${toIsoDate(documento.fechaVencimiento)}.`,
        prioridad: "alta",
        fecha: toIsoDate(documento.fechaVencimiento),
      });
      continue;
    }

    if (dias <= 30) {
      alertas.push({
        id: `por-vencer-${documento.id}`,
        tipo: "por_vencer",
        documento: requerido.nombre,
        mensaje: `${requerido.nombre}: vence en ${dias} día${dias === 1 ? "" : "s"}.`,
        prioridad: "media",
        fecha: toIsoDate(documento.fechaVencimiento),
      });
    }
  }

  const prioridadOrden: Record<PrioridadAlerta, number> = {
    alta: 0,
    media: 1,
    baja: 2,
  };

  return alertas.sort((a, b) => {
    const p = prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];
    if (p !== 0) return p;
    return a.fecha.localeCompare(b.fecha);
  });
}
