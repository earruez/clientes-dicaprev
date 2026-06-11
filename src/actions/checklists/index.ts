"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type CrearChecklistTemplateInput = {
  nombre: string;
  descripcion?: string;
  preguntas: { texto: string; obligatorio?: boolean }[];
};

export type EjecutarChecklistInput = {
  templateId: string;
  centroTrabajoId?: string;
  trabajadorId?: string;
  observaciones?: string;
  respuestas: {
    preguntaId: string;
    respuesta: "cumple" | "no_cumple" | "no_aplica";
    comentario?: string;
  }[];
};

export type ChecklistTemplateListItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  preguntasCount: number;
  createdAt: string;
};

export type ChecklistEjecucionListItem = {
  id: string;
  templateNombre: string;
  estado: "borrador" | "completada";
  fechaEjecucion: string;
  ejecutadoPor: string;
  centroTrabajo: string | null;
  trabajador: string | null;
  totalRespuestas: number;
  noCumpleCount: number;
  hallazgosGenerados: number;
};

export async function getChecklistTemplates(): Promise<ChecklistTemplateListItem[]> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const templates = await prisma.checklistTemplate.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      activo: true,
      createdAt: true,
      preguntas: { select: { id: true } },
    },
  });

  return templates.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion,
    activo: t.activo,
    preguntasCount: t.preguntas.length,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function crearChecklistTemplate(input: CrearChecklistTemplateInput) {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");

  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("El nombre de la plantilla es obligatorio");

  const preguntasLimpias = input.preguntas
    .map((p) => ({
      texto: p.texto.trim(),
      obligatorio: p.obligatorio ?? true,
    }))
    .filter((p) => Boolean(p.texto));

  if (!preguntasLimpias.length) {
    throw new Error("Debe ingresar al menos una pregunta válida");
  }

  const template = await prisma.checklistTemplate.create({
    data: {
      empresaId,
      nombre,
      descripcion: input.descripcion?.trim() || null,
      activo: true,
      creadoPorId: usuarioId,
      preguntas: {
        create: preguntasLimpias.map((p, idx) => ({
          texto: p.texto,
          orden: idx + 1,
          obligatorio: p.obligatorio,
        })),
      },
    },
    select: { id: true },
  });

  return { id: template.id };
}

export async function getTemplateParaEjecucion(templateId: string) {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, empresaId, activo: true },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      preguntas: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          texto: true,
          orden: true,
          obligatorio: true,
        },
      },
    },
  });

  if (!template) throw new Error("Plantilla no encontrada");
  return template;
}

export async function getOpcionesChecklist() {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const [centros, trabajadores] = await Promise.all([
    prisma.centroTrabajo.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.trabajador.findMany({
      where: { empresaId, estado: { not: "inactivo" } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        rut: true,
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);

  return {
    centros,
    trabajadores: trabajadores.map((t) => ({
      id: t.id,
      nombre: `${t.apellidos} ${t.nombres}`.trim(),
      rut: t.rut,
    })),
  };
}

export async function ejecutarChecklist(input: EjecutarChecklistInput) {
  const { empresaId, usuarioId } = await requirePermission("canManageCumplimiento");

  const template = await prisma.checklistTemplate.findFirst({
    where: {
      id: input.templateId,
      empresaId,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      preguntas: {
        select: {
          id: true,
          texto: true,
          obligatorio: true,
        },
      },
    },
  });

  if (!template) throw new Error("Plantilla no encontrada");

  const respuestasMap = new Map(input.respuestas.map((r) => [r.preguntaId, r]));

  for (const pregunta of template.preguntas) {
    const resp = respuestasMap.get(pregunta.id);
    if (pregunta.obligatorio && !resp) {
      throw new Error(`Falta respuesta en pregunta obligatoria: ${pregunta.texto}`);
    }
  }

  const ejecucion = await prisma.checklistEjecucion.create({
    data: {
      empresaId,
      templateId: template.id,
      ejecutadoPorId: usuarioId,
      centroTrabajoId: input.centroTrabajoId || null,
      trabajadorId: input.trabajadorId || null,
      estado: "completada",
      fechaEjecucion: new Date(),
      observaciones: input.observaciones?.trim() || null,
    },
    select: { id: true },
  });

  let hallazgosGenerados = 0;

  for (const pregunta of template.preguntas) {
    const respuestaInput = respuestasMap.get(pregunta.id);
    if (!respuestaInput) continue;

    const respuesta = await prisma.checklistRespuesta.create({
      data: {
        ejecucionId: ejecucion.id,
        preguntaId: pregunta.id,
        respuesta: respuestaInput.respuesta,
        comentario: respuestaInput.comentario?.trim() || null,
      },
      select: {
        id: true,
        respuesta: true,
        comentario: true,
      },
    });

    if (respuesta.respuesta === "no_cumple") {
      const compromiso = new Date();
      compromiso.setDate(compromiso.getDate() + 7);

      await prisma.hallazgoCumplimiento.create({
        data: {
          empresaId,
          centroTrabajoId: input.centroTrabajoId || null,
          trabajadorId: input.trabajadorId || null,
          checklistRespuestaId: respuesta.id,
          tipo: "checklist",
          prioridad: "media",
          descripcion:
            respuesta.comentario ||
            `No cumple: ${pregunta.texto}`,
          estado: "abierto",
          fechaCompromiso: compromiso,
          creadoPorId: usuarioId,
        },
      });

      hallazgosGenerados += 1;
    }
  }

  return {
    id: ejecucion.id,
    hallazgosGenerados,
  };
}

export async function getChecklistEjecuciones(): Promise<ChecklistEjecucionListItem[]> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const rows = await prisma.checklistEjecucion.findMany({
    where: { empresaId },
    orderBy: { fechaEjecucion: "desc" },
    select: {
      id: true,
      estado: true,
      fechaEjecucion: true,
      ejecutadoPor: { select: { nombre: true } },
      template: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
      trabajador: { select: { nombres: true, apellidos: true } },
      respuestas: {
        select: {
          id: true,
          respuesta: true,
          hallazgo: { select: { id: true } },
        },
      },
    },
  });

  return rows.map((r) => {
    const noCumple = r.respuestas.filter((x) => x.respuesta === "no_cumple").length;
    const hallazgos = r.respuestas.filter((x) => Boolean(x.hallazgo)).length;
    return {
      id: r.id,
      templateNombre: r.template.nombre,
      estado: r.estado,
      fechaEjecucion: r.fechaEjecucion.toISOString(),
      ejecutadoPor: r.ejecutadoPor.nombre,
      centroTrabajo: r.centroTrabajo?.nombre || null,
      trabajador: r.trabajador ? `${r.trabajador.nombres} ${r.trabajador.apellidos}`.trim() : null,
      totalRespuestas: r.respuestas.length,
      noCumpleCount: noCumple,
      hallazgosGenerados: hallazgos,
    };
  });
}
