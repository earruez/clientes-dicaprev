"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type EstadoEvidencia = "pendiente" | "valida" | "rechazada" | "vencida";

export type EvidenciaRow = {
  id: string;
  origen: string;
  titulo: string;
  descripcion: string;
  relacionadoCon: string;
  estado: EstadoEvidencia;
  fecha: string;
  fechaValidacion: string | null;
  archivoUrl: string | null;
  archivoNombre: string | null;
};

export type EvidenciasDashboard = {
  total: number;
  validas: number;
  pendientes: number;
  rechazadasOVencidas: number;
  rows: EvidenciaRow[];
  opciones: {
    hallazgos: Array<{ id: string; label: string }>;
    obligaciones: Array<{ clave: string; label: string }>;
  };
};

export type CrearEvidenciaInput = {
  titulo: string;
  descripcion: string;
  origen: string;
  archivoUrl?: string | null;
  archivoNombre?: string | null;
  hallazgoId?: string | null;
  obligacionClave?: string | null;
};

export type RevisarEvidenciaInput = {
  evidenciaId: string;
  estado: "valida" | "rechazada";
  observacionRevision?: string;
};

function normalizeEstado(value: string | null | undefined): EstadoEvidencia {
  const token = (value ?? "").trim().toLowerCase();
  if (token === "valida") return "valida";
  if (token === "rechazada") return "rechazada";
  if (token === "vencida") return "vencida";
  return "pendiente";
}

function toDisplayOrigen(value: string | null | undefined): string {
  const token = (value ?? "").trim();
  if (!token) return "manual";
  return token.replace(/_/g, " ");
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isOrigenAutoValidable(value: string | null | undefined): boolean {
  const token = normalizeToken(value);
  if (!token) return false;
  return ["firma", "firmado", "documento_firmado", "epp_firmado", "entrega_epp"].some((key) => token.includes(key));
}

function isDs44EvidencePersistenceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const prismaError = error as Error & { code?: string };
  if (prismaError.code === "P2021" || prismaError.code === "P2022") return true;
  return error.message.toLowerCase().includes("ds44planaccionid");
}

function resolveEstadoEvidencia(input: {
  estado: string | null | undefined;
  origen: string | null | undefined;
  hallazgoEstado: string | null | undefined;
  documentoTrabajadorFirmado: boolean | null | undefined;
  documentoEmpresaFirmado: boolean | null | undefined;
  entregaEppEstado: string | null | undefined;
}): EstadoEvidencia {
  const estadoActual = normalizeEstado(input.estado);
  if (estadoActual === "rechazada" || estadoActual === "vencida") return estadoActual;

  const hallazgoCerrado = normalizeToken(input.hallazgoEstado) === "cerrado";
  const documentoFirmado = Boolean(input.documentoTrabajadorFirmado) || Boolean(input.documentoEmpresaFirmado);
  const eppFirmado = normalizeToken(input.entregaEppEstado) === "firmada";
  const origenAuto = isOrigenAutoValidable(input.origen);

  if (hallazgoCerrado || documentoFirmado || eppFirmado || origenAuto) {
    return "valida";
  }

  return estadoActual;
}

function buildRelacionadoCon(input: {
  hallazgoDescripcion: string | null;
  obligacionClave: string | null;
  checklistNombre: string | null;
  documentoTrabajadorNombre: string | null;
  documentoEmpresaNombre: string | null;
  entregaEppId: string | null;
  ds44AccionSugerida: string | null;
}): string {
  if (input.hallazgoDescripcion) return `Hallazgo: ${input.hallazgoDescripcion}`;
  if (input.obligacionClave) return `Obligación: ${input.obligacionClave}`;
  if (input.checklistNombre) return `Checklist: ${input.checklistNombre}`;
  if (input.documentoTrabajadorNombre) return `Doc. trabajador: ${input.documentoTrabajadorNombre}`;
  if (input.documentoEmpresaNombre) return `Doc. empresa: ${input.documentoEmpresaNombre}`;
  if (input.entregaEppId) return `Entrega EPP: ${input.entregaEppId}`;
  if (input.ds44AccionSugerida) return `DS44: ${input.ds44AccionSugerida}`;
  return "Sin vínculo";
}

export async function getEvidenciasDashboard(): Promise<EvidenciasDashboard> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const [rows, hallazgos, obligaciones] = await Promise.all([
    prisma.evidenciaCumplimiento.findMany({
      where: { empresaId },
      include: {
        hallazgo: { select: { descripcion: true, estado: true } },
        checklistEjecucion: {
          include: {
            template: { select: { nombre: true } },
          },
        },
        documentoTrabajador: { select: { nombre: true, firmado: true } },
        documentoEmpresa: { select: { nombre: true, firmado: true } },
        entregaEpp: { select: { estado: true } },
        ds44PlanAccion: { select: { preguntaClave: true, accionSugerida: true, prioridad: true } },
      },
      orderBy: { createdAt: "desc" },
    }).catch((error: unknown) => {
      if (!isDs44EvidencePersistenceUnavailable(error)) throw error;
      return prisma.evidenciaCumplimiento.findMany({
        where: { empresaId },
        select: {
          id: true,
          origen: true,
          titulo: true,
          descripcion: true,
          estado: true,
          obligacionClave: true,
          entregaEppId: true,
          createdAt: true,
          validadoAt: true,
          archivoUrl: true,
          archivoNombre: true,
          hallazgo: { select: { descripcion: true, estado: true } },
          checklistEjecucion: { include: { template: { select: { nombre: true } } } },
          documentoTrabajador: { select: { nombre: true, firmado: true } },
          documentoEmpresa: { select: { nombre: true, firmado: true } },
          entregaEpp: { select: { estado: true } },
        },
        orderBy: { createdAt: "desc" },
      }).then((fallbackRows) => fallbackRows.map((row) => ({ ...row, ds44PlanAccion: null })));
    }),
    prisma.hallazgoCumplimiento.findMany({
      where: { empresaId },
      select: { id: true, descripcion: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.obligacionEmpresaEstado.findMany({
      where: { empresaId },
      select: { obligacionClave: true },
      orderBy: { obligacionClave: "asc" },
    }),
  ]);

  const mappedRows: EvidenciaRow[] = rows.map((row) => {
    const estadoResuelto = resolveEstadoEvidencia({
      estado: row.estado,
      origen: row.origen,
      hallazgoEstado: row.hallazgo?.estado ?? null,
      documentoTrabajadorFirmado: row.documentoTrabajador?.firmado,
      documentoEmpresaFirmado: row.documentoEmpresa?.firmado,
      entregaEppEstado: row.entregaEpp?.estado ?? null,
    });

    return {
      id: row.id,
      origen: toDisplayOrigen(row.origen),
      titulo: row.titulo,
      descripcion: row.descripcion,
      relacionadoCon: buildRelacionadoCon({
        hallazgoDescripcion: row.hallazgo?.descripcion ?? null,
        obligacionClave: row.obligacionClave,
        checklistNombre: row.checklistEjecucion?.template?.nombre ?? null,
        documentoTrabajadorNombre: row.documentoTrabajador?.nombre ?? null,
        documentoEmpresaNombre: row.documentoEmpresa?.nombre ?? null,
        entregaEppId: row.entregaEppId,
        ds44AccionSugerida: row.ds44PlanAccion?.accionSugerida ?? null,
      }),
      estado: estadoResuelto,
      fecha: row.createdAt.toISOString(),
      fechaValidacion: row.validadoAt ? row.validadoAt.toISOString() : null,
      archivoUrl: row.archivoUrl,
      archivoNombre: row.archivoNombre,
    };
  });

  const total = mappedRows.length;
  const validas = mappedRows.filter((r) => r.estado === "valida").length;
  const pendientes = mappedRows.filter((r) => r.estado === "pendiente").length;
  const rechazadasOVencidas = mappedRows.filter((r) => r.estado === "rechazada" || r.estado === "vencida").length;

  return {
    total,
    validas,
    pendientes,
    rechazadasOVencidas,
    rows: mappedRows,
    opciones: {
      hallazgos: hallazgos.map((h) => ({ id: h.id, label: h.descripcion })),
      obligaciones: obligaciones.map((o) => ({ clave: o.obligacionClave, label: o.obligacionClave })),
    },
  };
}

export async function crearEvidenciaManual(input: CrearEvidenciaInput): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");

  const titulo = input.titulo.trim();
  const descripcion = input.descripcion.trim();
  if (!titulo) throw new Error("El titulo es obligatorio.");
  if (!descripcion) throw new Error("La descripcion es obligatoria.");
  if (!input.hallazgoId && !input.obligacionClave) {
    throw new Error("Debes vincular la evidencia a un hallazgo u obligación.");
  }

  if (input.hallazgoId) {
    const hallazgo = await prisma.hallazgoCumplimiento.findFirst({
      where: { id: input.hallazgoId, empresaId },
      select: { id: true },
    });
    if (!hallazgo) throw new Error("Hallazgo no válido para la empresa activa.");
  }

  const created = await prisma.evidenciaCumplimiento.create({
    data: {
      empresaId,
      titulo,
      descripcion,
      origen: input.origen?.trim() || "manual",
      tipo: "registro",
      estado: "pendiente",
      fechaEvidencia: new Date(),
      hallazgoId: input.hallazgoId ?? null,
      obligacionClave: input.obligacionClave ?? null,
      archivoUrl: input.archivoUrl ?? null,
      archivoNombre: input.archivoNombre ?? null,
      creadoPorId: usuarioId,
    },
    select: { id: true },
  });

  await prisma.evidenciaCumplimientoHistorial.create({
    data: {
      evidenciaId: created.id,
      usuarioId,
      accion: "crear",
      detalle: "Evidencia manual creada",
      estadoNuevo: "pendiente",
    },
  });

  return created;
}

export async function revisarEvidencia(input: RevisarEvidenciaInput): Promise<void> {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");

  const evidencia = await prisma.evidenciaCumplimiento.findFirst({
    where: { id: input.evidenciaId, empresaId },
    select: {
      id: true,
      estado: true,
      origen: true,
      hallazgo: { select: { estado: true } },
      documentoTrabajador: { select: { firmado: true } },
      documentoEmpresa: { select: { firmado: true } },
      entregaEpp: { select: { estado: true } },
    },
  });

  if (!evidencia) {
    throw new Error("Evidencia no encontrada para la empresa activa.");
  }

  const estadoResuelto = resolveEstadoEvidencia({
    estado: evidencia.estado,
    origen: evidencia.origen,
    hallazgoEstado: evidencia.hallazgo?.estado ?? null,
    documentoTrabajadorFirmado: evidencia.documentoTrabajador?.firmado,
    documentoEmpresaFirmado: evidencia.documentoEmpresa?.firmado,
    entregaEppEstado: evidencia.entregaEpp?.estado ?? null,
  });

  if (estadoResuelto !== "pendiente") {
    throw new Error("Esta evidencia ya está resuelta y no requiere revisión adicional.");
  }

  const observacionRevision = input.observacionRevision?.trim() || null;

  await prisma.evidenciaCumplimiento.update({
    where: { id: evidencia.id },
    data: {
      estado: input.estado,
      validadoPorId: usuarioId,
      validadoAt: new Date(),
      observacionRevision,
    },
  });

  await prisma.evidenciaCumplimientoHistorial.create({
    data: {
      evidenciaId: evidencia.id,
      usuarioId,
      accion: input.estado === "valida" ? "validar" : "rechazar",
      detalle: observacionRevision,
      estadoAnterior: evidencia.estado,
      estadoNuevo: input.estado,
    },
  });
}
