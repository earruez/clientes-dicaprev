import type { DocumentoMatrizRow, EstadoDocumento } from "@/app/dicaprev/documentacion/types";
import type { ReglaDocumentalNextPrev, TamanoEmpresa } from "@/lib/documentacion/reglas-documentales";

const DAY_MS = 1000 * 60 * 60 * 24;

export type DocumentoCumplimientoBase = Pick<
  DocumentoMatrizRow,
  | "documentoEmpresaId"
  | "archivoNombre"
  | "archivoUrl"
  | "tieneVencimiento"
  | "fechaVencimiento"
  | "estado"
  | "aplicaDesdeTrabajadores"
  | "aplicaHastaTrabajadores"
  | "esAdicional"
>;

export function esDocumentoAplicable(documento: DocumentoCumplimientoBase, cantidadTrabajadores: number) {
  if (documento.esAdicional) return true;
  if (
    documento.aplicaDesdeTrabajadores !== null &&
    documento.aplicaDesdeTrabajadores !== undefined &&
    cantidadTrabajadores < documento.aplicaDesdeTrabajadores
  ) {
    return false;
  }

  if (
    documento.aplicaHastaTrabajadores !== null &&
    documento.aplicaHastaTrabajadores !== undefined &&
    cantidadTrabajadores > documento.aplicaHastaTrabajadores
  ) {
    return false;
  }

  return true;
}

export function calcularEstadoDocumento(
  documento: DocumentoCumplimientoBase,
  cantidadTrabajadores: number,
  today = new Date()
): EstadoDocumento {
  if (!esDocumentoAplicable(documento, cantidadTrabajadores)) {
    return "No aplica";
  }

  if (documento.estado === "No aplica") {
    return "No aplica";
  }

  const estadoActual = documento.estado;
  if (
    estadoActual === "En revisión" ||
    estadoActual === "en_revision" ||
    estadoActual === "Validado" ||
    estadoActual === "validado" ||
    estadoActual === "Enviado a firma" ||
    estadoActual === "enviado_firma" ||
    estadoActual === "Firmado" ||
    estadoActual === "firmado"
  ) {
    return estadoActual;
  }

  const tieneArchivo = Boolean(documento.documentoEmpresaId && (documento.archivoUrl || documento.archivoNombre));
  if (!tieneArchivo) {
    return "Pendiente de carga";
  }

  if (!documento.tieneVencimiento || !documento.fechaVencimiento) {
    return "Vigente";
  }

  const dueDate = new Date(documento.fechaVencimiento);
  const baseToday = new Date(today);
  baseToday.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - baseToday.getTime()) / DAY_MS);

  if (diffDays < 0) {
    return "Vencido";
  }

  if (diffDays <= 30) {
    return "Por vencer";
  }

  return "Vigente";
}

export function calcularVigenciaDocumento(
  documento: DocumentoCumplimientoBase,
  cantidadTrabajadores: number,
  today = new Date()
) {
  const estado = calcularEstadoDocumento(documento, cantidadTrabajadores, today);

  if (estado === "No aplica") return "no_aplica" as const;
  if (estado === "Pendiente de carga") return "pendiente" as const;
  if (!documento.tieneVencimiento || !documento.fechaVencimiento) return "sin_vencimiento" as const;
  if (estado === "Vencido") return "vencido" as const;
  if (estado === "Por vencer") return "por_vencer" as const;
  return "vigente" as const;
}

export function calcularMetricasDocumentos(documentos: DocumentoMatrizRow[]) {
  const aplicables = documentos.filter((doc) => doc.esAplicable);
  const vigentes = aplicables.filter((doc) => doc.estado === "Vigente" || doc.estado === "Firmado" || doc.estado === "firmado").length;
  const porVencer = aplicables.filter((doc) => doc.estado === "Por vencer").length;
  const vencidos = aplicables.filter((doc) => doc.estado === "Vencido").length;
  const pendientes = aplicables.filter((doc) => doc.estado === "Pendiente de carga").length;
  const noAplica = documentos.filter((doc) => doc.estado === "No aplica").length;
  const actualizadosMes = (() => {
    const now = new Date();
    return documentos.filter((doc) => {
      if (!doc.fechaActualizacion) return false;
      const date = new Date(doc.fechaActualizacion);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  })();

  return {
    total: documentos.length,
    aplicables: aplicables.length,
    vigentes,
    porVencer,
    vencidos,
    pendientes,
    noAplica,
    cumplimientoPct: aplicables.length > 0 ? Math.round((vigentes / aplicables.length) * 100) : 100,
    pendientesCarga: pendientes,
    actualizadosMes,
  };
}

type EmpresaCondicionesDocumento = {
  tipoEmpresa?: string | null;
  giro?: string | null;
  tamanoEmpresa?: string | null;
  cantidadTrabajadores?: number | null;
  riesgos?: string[] | null;
};

type TrabajadorCondicionesDocumento = {
  riesgos?: string[] | null;
  cargo?: {
    perfilSST?: string | null;
    descripcion?: string | null;
  } | null;
};

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeTamanoEmpresa(value?: string | null): TamanoEmpresa | null {
  if (!value) return null;
  const normalized = normalizeToken(value);
  if (normalized.includes("micro")) return "micro";
  if (normalized.includes("pequena") || normalized.includes("pequena") || normalized.includes("small")) return "pequena";
  if (normalized.includes("mediana") || normalized.includes("medium")) return "mediana";
  if (normalized.includes("grande") || normalized.includes("large")) return "grande";
  return null;
}

function inferIndustriaEmpresa(empresa: EmpresaCondicionesDocumento): string {
  const source = `${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""}`;
  const normalized = normalizeToken(source);

  if (normalized.includes("constru")) return "construccion";
  if (normalized.includes("manufact")) return "manufactura";
  if (normalized.includes("miner")) return "mineria";
  if (normalized.includes("agro")) return "agroindustria";
  if (normalized.includes("alimento")) return "alimentos";
  if (normalized.includes("logist") || normalized.includes("transport")) return "logistica_transporte";
  if (normalized.includes("salud") || normalized.includes("clinic") || normalized.includes("hospital")) return "salud";
  if (normalized.includes("comerc")) return "comercio";
  return "servicios";
}

function inferRiesgosDetectados(
  empresa: EmpresaCondicionesDocumento,
  trabajador?: TrabajadorCondicionesDocumento,
): string[] {
  const direct = [
    ...(empresa.riesgos ?? []),
    ...(trabajador?.riesgos ?? []),
  ]
    .map((item) => normalizeToken(item))
    .filter(Boolean);

  const source = normalizeToken(
    `${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""} ${trabajador?.cargo?.perfilSST ?? ""} ${trabajador?.cargo?.descripcion ?? ""}`,
  );

  const inferred: string[] = [];
  if (source.includes("ruido")) inferred.push("ruido");
  if (source.includes("silice") || source.includes("silica")) inferred.push("silice");
  if (source.includes("uv") || source.includes("radiacion")) inferred.push("uv");
  if (source.includes("tmert")) inferred.push("tmert");
  if (source.includes("psicosocial")) inferred.push("psicosocial");
  if (source.includes("mmc") || source.includes("manual de carga")) inferred.push("mmc");

  return Array.from(new Set([...direct, ...inferred]));
}

export function cumpleCondicionesDocumento(
  doc: ReglaDocumentalNextPrev,
  empresa: EmpresaCondicionesDocumento,
  trabajador?: TrabajadorCondicionesDocumento,
) {
  const industriaEmpresa = inferIndustriaEmpresa(empresa);
  const tamanoEmpresa = normalizeTamanoEmpresa(empresa.tamanoEmpresa);
  const riesgosDetectados = inferRiesgosDetectados(empresa, trabajador);

  const requiereTrabajador = normalizeToken(doc.entidadAplicable) === "trabajador";
  if (requiereTrabajador && !trabajador) return false;

  const industrias = doc.aplica.industrias.map((item) => normalizeToken(item));
  const industriasExcluidas = doc.aplica.industriasExcluidas.map((item) => normalizeToken(item));
  const tamanos = doc.aplica.tamanosEmpresa;
  const riesgosRegla = doc.aplica.riesgos.map((item) => normalizeToken(item));

  const industriaPermitida =
    industrias.length === 0 ||
    industrias.includes("todas") ||
    industrias.includes(industriaEmpresa);

  if (!industriaPermitida) return false;
  if (industriasExcluidas.includes(industriaEmpresa)) return false;

  if (tamanos.length > 0 && tamanoEmpresa && !tamanos.includes(tamanoEmpresa)) return false;

  const reglaRiesgoGenerica = riesgosRegla.length === 0 || riesgosRegla.includes("general") || riesgosRegla.includes("todos");
  if (!reglaRiesgoGenerica) {
    const coincideRiesgo = riesgosRegla.some((riesgo) => riesgosDetectados.includes(riesgo));
    if (!coincideRiesgo) return false;
  }

  return true;
}
