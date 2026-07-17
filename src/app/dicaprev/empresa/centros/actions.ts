"use server";

import { getControlDocumentalTrabajadores } from "@/actions/trabajadores/documentos";
import { getWorkerDocSummary, getWorkerDocs } from "@/components/trabajadores-v2/documental/types";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type CentroTrabajoInput = {
  nombre: string;
  direccion: string;
  comuna: string;
  region: string;
  tipo: string;
  estado: string;
};

function normalizeText(value: string) {
  return value.trim();
}

function validateCentro(data: CentroTrabajoInput) {
  const nombre = normalizeText(data.nombre);
  const direccion = normalizeText(data.direccion);
  const comuna = normalizeText(data.comuna);
  const region = normalizeText(data.region);
  const tipo = normalizeText(data.tipo);
  const estado = normalizeText(data.estado);

  if (!nombre) throw new Error("El nombre es obligatorio");
  if (!comuna) throw new Error("La comuna es obligatoria");
  if (!region) throw new Error("La region es obligatoria");
  if (!tipo) throw new Error("El tipo es obligatorio");
  if (!estado) throw new Error("El estado es obligatorio");

  return {
    nombre,
    direccion,
    comuna,
    region,
    tipo,
    estado,
  };
}

function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeCentroKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function getCentrosTrabajo() {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const centros = await prisma.centroTrabajo.findMany({
    where: { empresaId },
    include: {
      trabajadores: {
        select: {
          id: true,
          estado: true,
          cargoId: true,
        },
      },
      posicionesDotacion: {
        select: {
          id: true,
          cantidad: true,
          estado: true,
          esCritica: true,
          cargoId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const documentalResumenPorCentro = new Map<
    string,
    {
      totalDocs: number;
      docsCumplidos: number;
      capsPendientes: number;
      docsVencidos: number;
    }
  >();

  try {
    const documental = await getControlDocumentalTrabajadores();

    for (const worker of documental.workers) {
      const centroKey = normalizeCentroKey(worker.centroTrabajo);
      if (!centroKey) continue;

      const docs = getWorkerDocs(
        worker,
        documental.reglas,
        documental.tipos,
        documental.documentos,
      );
      const summary = getWorkerDocSummary(docs);

      const capsPendientes = docs.filter((doc) => {
        if (doc.tipo.categoria !== "Capacitación") return false;
        return doc.estado !== "completo" && doc.estado !== "no_aplica";
      }).length;

      const current = documentalResumenPorCentro.get(centroKey) ?? {
        totalDocs: 0,
        docsCumplidos: 0,
        capsPendientes: 0,
        docsVencidos: 0,
      };

      current.totalDocs += summary.total;
      current.docsCumplidos += summary.cargados;
      current.capsPendientes += capsPendientes;
      current.docsVencidos += summary.vencidos;

      documentalResumenPorCentro.set(centroKey, current);
    }
  } catch {
    // If documental data is unavailable for this role/context, keep safe zero KPIs.
  }

  return centros.map((centro) => {
    const trabajadoresActivos = centro.trabajadores.filter((trabajador) => trabajador.estado !== "inactivo").length;
    const posicionesActivas = centro.posicionesDotacion.filter((posicion) => posicion.estado === "activa");
    const dotacionTotal = posicionesActivas.reduce((acc, posicion) => acc + posicion.cantidad, 0);
    const cargosTotal = new Set(posicionesActivas.map((posicion) => posicion.cargoId)).size;
    const alertasDs44 = posicionesActivas.filter((posicion) => posicion.esCritica).length;
    const resumenDoc = documentalResumenPorCentro.get(normalizeCentroKey(centro.nombre));

    const cumplimientoDocPct =
      resumenDoc && resumenDoc.totalDocs > 0
        ? clampPct((resumenDoc.docsCumplidos / resumenDoc.totalDocs) * 100)
        : 0;

    return {
      ...centro,
      cantidadTrabajadores: trabajadoresActivos,
      dotacionTotal,
      cargosTotal,
      cumplimientoDocPct,
      capacitacionesPendientes: resumenDoc?.capsPendientes ?? 0,
      vencimientos: resumenDoc?.docsVencidos ?? 0,
      alertasDs44,
    };
  });
}

export async function crearCentroTrabajo(data: CentroTrabajoInput) {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const payload = validateCentro(data);

  return prisma.centroTrabajo.create({
    data: {
      empresaId,
      nombre: payload.nombre,
      direccion: payload.direccion,
      comuna: payload.comuna,
      region: payload.region,
      tipo: payload.tipo,
      estado: payload.estado,
    },
  });
}

export async function actualizarCentroTrabajo(id: string, data: CentroTrabajoInput) {
  await requirePermission("canManageEmpresa");
  const payload = validateCentro(data);

  return prisma.centroTrabajo.update({
    where: { id },
    data: {
      nombre: payload.nombre,
      direccion: payload.direccion,
      comuna: payload.comuna,
      region: payload.region,
      tipo: payload.tipo,
      estado: payload.estado,
    },
  });
}

export async function desactivarCentroTrabajo(id: string) {
  await requirePermission("canManageEmpresa");
  return prisma.centroTrabajo.update({
    where: { id },
    data: { estado: "inactivo" },
  });
}
