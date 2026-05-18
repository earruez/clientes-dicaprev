import { calcularCumplimientoEmpresa } from "@/lib/documentacion/cumplimiento-empresa";
import {
  ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS,
} from "@/lib/documentacion/documento-empresa-duplicados";
import { prisma } from "@/lib/prisma";

export type SeveridadAlertaDocumental = "critica" | "alta" | "media" | "baja";
export type TipoAlertaDocumental = "faltante" | "incompleto" | "pendiente_firma" | "vencido" | "por_vencer";

export type AlertaDocumentalEmpresa = {
  key: string;
  empresaId: string;
  tipo: TipoAlertaDocumental;
  severidad: SeveridadAlertaDocumental;
  estado: "activa";
  titulo: string;
  descripcion: string;
  reglaId?: string;
  documentoId?: string;
  documentoNombre?: string;
  entidad: "empresa" | "trabajador";
  fechaReferencia?: string;
};

export type ResumenAlertasDocumentales = {
  critica: number;
  alta: number;
  media: number;
  baja: number;
  total: number;
};

export type AlertasDocumentalesEmpresaResultado = {
  empresaId: string;
  generadoEn: string;
  resumen: ResumenAlertasDocumentales;
  alertas: AlertaDocumentalEmpresa[];
};

const MS_DIA = 24 * 60 * 60 * 1000;

const ESTADOS_PENDIENTE_FIRMA = new Set([
  "pendiente",
  "pendiente_firma",
  "en_revision",
  "aprobado",
  "vigente",
]);

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function sortBySeveridad(alertas: AlertaDocumentalEmpresa[]) {
  const order: Record<SeveridadAlertaDocumental, number> = {
    critica: 1,
    alta: 2,
    media: 3,
    baja: 4,
  };

  return [...alertas].sort((a, b) => {
    const byLevel = order[a.severidad] - order[b.severidad];
    if (byLevel !== 0) return byLevel;
    const dateA = a.fechaReferencia ? new Date(a.fechaReferencia).getTime() : 0;
    const dateB = b.fechaReferencia ? new Date(b.fechaReferencia).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA;
    return a.titulo.localeCompare(b.titulo);
  });
}

export async function generarAlertasDocumentalesEmpresa(params: {
  empresaId: string;
  diasPorVencer?: number;
}): Promise<AlertasDocumentalesEmpresaResultado> {
  const diasPorVencer = Math.max(1, params.diasPorVencer ?? 30);
  const hoy = new Date();
  const hoyDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const limitePorVencer = new Date(hoyDate.getTime() + diasPorVencer * MS_DIA);

  const [cumplimiento, documentosEmpresa, documentosTrabajador] = await Promise.all([
    calcularCumplimientoEmpresa({ empresaId: params.empresaId }),
    prisma.documentoEmpresa.findMany({
      where: {
        empresaId: params.empresaId,
        estado: { notIn: [...ESTADOS_DOCUMENTO_EMPRESA_ARCHIVADOS] },
      },
      select: {
        id: true,
        nombre: true,
        estado: true,
        firmado: true,
        fechaVencimiento: true,
      },
    }),
    prisma.trabajadorDocumento.findMany({
      where: {
        empresaId: params.empresaId,
        esVigente: true,
      },
      select: {
        id: true,
        nombre: true,
        estado: true,
        firmado: true,
        fechaVencimiento: true,
        trabajador: {
          select: {
            nombres: true,
            apellidos: true,
          },
        },
      },
    }),
  ]);

  const dedupe = new Map<string, AlertaDocumentalEmpresa>();

  const pushAlerta = (alerta: AlertaDocumentalEmpresa) => {
    if (dedupe.has(alerta.key)) return;
    dedupe.set(alerta.key, alerta);
  };

  // 1) Alertas desde la matriz normativa/cumplimiento real (faltantes e incompletos)
  for (const detalle of cumplimiento.detalles) {
    if (!detalle.aplicable) continue;

    if (detalle.estado === "faltante") {
      pushAlerta({
        key: `${params.empresaId}::faltante::regla::${detalle.reglaId}`,
        empresaId: params.empresaId,
        tipo: "faltante",
        severidad: "critica",
        estado: "activa",
        titulo: "Documento faltante",
        descripcion: `[${detalle.codigo}] ${detalle.nombre}`,
        reglaId: detalle.reglaId,
        documentoNombre: detalle.nombre,
        entidad: detalle.entidad,
      });
    }

    if (detalle.estado === "incompleto") {
      pushAlerta({
        key: `${params.empresaId}::incompleto::regla::${detalle.reglaId}`,
        empresaId: params.empresaId,
        tipo: "incompleto",
        severidad: "alta",
        estado: "activa",
        titulo: "Documento incompleto",
        descripcion: `[${detalle.codigo}] ${detalle.nombre}`,
        reglaId: detalle.reglaId,
        documentoNombre: detalle.nombre,
        entidad: detalle.entidad,
      });
    }
  }

  const docsEmpresa = documentosEmpresa.map((doc) => ({
    id: doc.id,
    nombre: doc.nombre,
    estado: normalizeToken(doc.estado),
    firmado: doc.firmado,
    fechaVencimiento: doc.fechaVencimiento,
    entidad: "empresa" as const,
  }));

  const docsTrabajador = documentosTrabajador.map((doc) => ({
    id: doc.id,
    nombre: `${doc.nombre}${doc.trabajador ? ` (${[doc.trabajador.nombres, doc.trabajador.apellidos].filter(Boolean).join(" ")})` : ""}`,
    estado: normalizeToken(doc.estado),
    firmado: doc.firmado,
    fechaVencimiento: doc.fechaVencimiento,
    entidad: "trabajador" as const,
  }));

  const allDocs = [...docsEmpresa, ...docsTrabajador];

  // 2) Alertas por documento: pendiente firma, vencido, por vencer
  for (const doc of allDocs) {
    if (!doc.firmado && ESTADOS_PENDIENTE_FIRMA.has(doc.estado)) {
      pushAlerta({
        key: `${params.empresaId}::pendiente_firma::doc::${doc.id}`,
        empresaId: params.empresaId,
        tipo: "pendiente_firma",
        severidad: "media",
        estado: "activa",
        titulo: "Documento pendiente de firma",
        descripcion: doc.nombre,
        documentoId: doc.id,
        documentoNombre: doc.nombre,
        entidad: doc.entidad,
      });
    }

    if (!doc.fechaVencimiento) continue;

    const fvDate = new Date(
      doc.fechaVencimiento.getFullYear(),
      doc.fechaVencimiento.getMonth(),
      doc.fechaVencimiento.getDate(),
    );

    if (Number.isNaN(fvDate.getTime())) continue;

    const isVencido = doc.estado === "vencido" || fvDate.getTime() < hoyDate.getTime();

    if (isVencido) {
      pushAlerta({
        key: `${params.empresaId}::vencido::doc::${doc.id}`,
        empresaId: params.empresaId,
        tipo: "vencido",
        severidad: "critica",
        estado: "activa",
        titulo: "Documento vencido",
        descripcion: doc.nombre,
        documentoId: doc.id,
        documentoNombre: doc.nombre,
        entidad: doc.entidad,
        fechaReferencia: fvDate.toISOString(),
      });
      continue;
    }

    if (fvDate.getTime() <= limitePorVencer.getTime()) {
      pushAlerta({
        key: `${params.empresaId}::por_vencer::doc::${doc.id}`,
        empresaId: params.empresaId,
        tipo: "por_vencer",
        severidad: "baja",
        estado: "activa",
        titulo: "Documento por vencer",
        descripcion: doc.nombre,
        documentoId: doc.id,
        documentoNombre: doc.nombre,
        entidad: doc.entidad,
        fechaReferencia: fvDate.toISOString(),
      });
    }
  }

  const alertas = sortBySeveridad(Array.from(dedupe.values()));

  const resumen: ResumenAlertasDocumentales = {
    critica: alertas.filter((a) => a.severidad === "critica").length,
    alta: alertas.filter((a) => a.severidad === "alta").length,
    media: alertas.filter((a) => a.severidad === "media").length,
    baja: alertas.filter((a) => a.severidad === "baja").length,
    total: alertas.length,
  };

  return {
    empresaId: params.empresaId,
    generadoEn: new Date().toISOString(),
    resumen,
    alertas,
  };
}
