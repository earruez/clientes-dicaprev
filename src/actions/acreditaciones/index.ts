"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/permissions";

type EstadoAcreditacion =
  | "en_preparacion"
  | "listo_para_enviar"
  | "enviado"
  | "observada"
  | "aprobado"
  | "rechazado"
  | "cerrada"
  | "vencido";

type UrgenciaFiltro = "alta" | "media" | "baja";

type OpsAcreditacion = {
  id: string;
  estado: string;
  mandanteId: string;
  mandante: { nombre: string };
  nombreProyecto: string | null;
  obraFaena: string | null;
  responsableId: string | null;
  responsable: { nombre: string } | null;
  documentos: Array<{ estado: string; fechaVencimiento: Date | null }>;
  trabajadores: unknown[];
  vehiculos: unknown[];
  fechaVencimiento: Date | null;
  updatedAt: Date;
  observaciones: string | null;
};

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

async function getEmpresaId(): Promise<string> {
  const context = await requireAuth();
  return context.empresaId;
}

async function getContext() {
  return requireAuth();
}

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function computeUrgencia(args: {
  estado: string;
  fechaVencimiento: Date | null;
  documentosVencidos: number;
  documentosFaltantes: number;
}) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const vencePronto = Boolean(args.fechaVencimiento && args.fechaVencimiento <= in7Days);

  if (args.estado === "rechazado" || args.estado === "observada" || args.estado === "vencido") {
    return "alta" as const;
  }
  if (args.documentosVencidos > 0 || vencePronto) {
    return "alta" as const;
  }
  if (args.documentosFaltantes > 0) {
    return "media" as const;
  }
  return "baja" as const;
}

function buildMotivo(args: {
  estado: string;
  fechaVencimiento: Date | null;
  documentosVencidos: number;
  documentosFaltantes: number;
}) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (args.estado === "rechazado") return "Rechazada por mandante";
  if (args.estado === "observada") return "Observaciones pendientes";
  if (args.estado === "vencido") return "Acreditacion vencida";
  if (args.documentosVencidos > 0) return "Documentos vencidos";
  if (args.fechaVencimiento && args.fechaVencimiento <= in7Days) return "Fecha limite proxima";
  if (args.documentosFaltantes > 0) return "Documentacion incompleta";
  return "Seguimiento operativo";
}

function mapAcreditacionRow(a: OpsAcreditacion) {
  const totalDocs = a.documentos.length;
  const completos = a.documentos.filter((d) => d.estado === "completo").length;
  const faltantes = a.documentos.filter((d) => d.estado === "faltante").length;
  const vencidos = a.documentos.filter((d) => d.estado === "vencido").length;
  const observados = a.documentos.filter((d) => d.estado === "rechazado" || d.estado === "en_revision").length;
  const progreso = totalDocs === 0 ? 0 : Math.round((completos / totalDocs) * 100);
  const urgencia = computeUrgencia({
    estado: a.estado,
    fechaVencimiento: a.fechaVencimiento,
    documentosVencidos: vencidos,
    documentosFaltantes: faltantes,
  });

  return {
    id: a.id,
    estado: a.estado,
    mandanteId: a.mandanteId,
    mandante: a.mandante.nombre,
    proyecto: a.nombreProyecto || a.obraFaena || "Sin proyecto",
    obraFaena: a.obraFaena,
    responsableId: a.responsableId,
    responsable: a.responsable?.nombre || "Sin asignar",
    trabajadores: a.trabajadores.length,
    vehiculos: a.vehiculos.length,
    faltantes,
    vencidos,
    observados,
    totalDocs,
    progreso,
    urgencia,
    motivo: buildMotivo({
      estado: a.estado,
      fechaVencimiento: a.fechaVencimiento,
      documentosVencidos: vencidos,
      documentosFaltantes: faltantes,
    }),
    fechaVencimiento: a.fechaVencimiento,
    updatedAt: a.updatedAt,
    observaciones: a.observaciones,
  };
}

// ─────────────────────────────────────────────────────────────────────
// ACREDITACIONES — LECTURA
// ─────────────────────────────────────────────────────────────────────

export async function getAcreditacionesResumen() {
  const empresaId = await getEmpresaId();

  const [acreditaciones, total, enPreparacion, listasEnviar, observadas, rechazadas] = await Promise.all([
    prisma.acreditacion.findMany({
      where: { empresaId },
      include: {
        mandante: true,
        plantilla: true,
        responsable: { select: { nombre: true } },
        documentos: { select: { estado: true, fechaVencimiento: true } },
        trabajadores: true,
        vehiculos: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.acreditacion.count({ where: { empresaId } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "en_preparacion" } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "listo_para_enviar" } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "observada" } }),
    prisma.acreditacion.count({ where: { empresaId, estado: "rechazado" } }),
  ]);

  const rows = acreditaciones.map(mapAcreditacionRow);
  const now = toDateOnly(new Date());
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const promedioAvance = rows.length > 0
    ? Math.round(rows.reduce((acc, row) => acc + row.progreso, 0) / rows.length)
    : 0;

  const vencenEstaSemana = rows.filter((row) => {
    if (!row.fechaVencimiento) return false;
    const d = toDateOnly(row.fechaVencimiento);
    return d >= now && d <= in7Days;
  }).length;

  const colaPrioritaria = rows
    .filter((row) => row.urgencia === "alta")
    .sort((a, b) => {
      const score = (r: typeof a) => {
        if (r.estado === "rechazado") return 100;
        if (r.estado === "observada") return 90;
        if (r.estado === "vencido") return 80;
        return r.vencidos > 0 ? 70 : 60;
      };
      return score(b) - score(a);
    })
    .slice(0, 5);

  return {
    kpis: {
      totalActivas: total,
      enPreparacion,
      listasParaEnviar: listasEnviar,
      observadasRechazadas: observadas + rechazadas,
      vencenEstaSemana,
      promedioAvance,
    },
    total,
    colaPrioritaria,
    rows,
    resumen: {
      totalDocumentos: rows.reduce((acc, row) => acc + row.totalDocs, 0),
      documentosFaltantes: rows.reduce((acc, row) => acc + row.faltantes, 0),
      documentosVencidos: rows.reduce((acc, row) => acc + row.vencidos, 0),
    },
  };
}

export async function getAcreditaciones(filters?: {
  estado?: EstadoAcreditacion;
  mandanteId?: string;
  responsableId?: string;
  search?: string;
  urgencia?: UrgenciaFiltro;
  soloObservaciones?: boolean;
  soloVencimientos?: boolean;
  skip?: number;
  take?: number;
}) {
  const empresaId = await getEmpresaId();

  const where: Prisma.AcreditacionWhereInput = { empresaId };

  if (filters?.estado) where.estado = filters.estado;
  if (filters?.mandanteId) where.mandanteId = filters.mandanteId;
  if (filters?.responsableId) where.responsableId = filters.responsableId;

  if (filters?.search && filters.search.trim().length > 0) {
    const search = filters.search.trim();
    where.OR = [
      { nombreProyecto: { contains: search, mode: "insensitive" } },
      { obraFaena: { contains: search, mode: "insensitive" } },
      { observaciones: { contains: search, mode: "insensitive" } },
      { mandante: { nombre: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [acreditaciones, totalBase] = await Promise.all([
    prisma.acreditacion.findMany({
      where,
      include: {
        mandante: true,
        plantilla: true,
        responsable: { select: { nombre: true } },
        documentos: { select: { estado: true, fechaVencimiento: true } },
        trabajadores: { include: { trabajador: true } },
        vehiculos: { include: { vehiculo: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 800,
    }),
    prisma.acreditacion.count({ where }),
  ]);

  let mapped = acreditaciones.map((a) => {
    const row = mapAcreditacionRow(a);
    return {
      ...a,
      trabajadores: a.trabajadores.map((t) => t.trabajador),
      vehiculos: a.vehiculos.map((v) => v.vehiculo),
      _ops: row,
    };
  });

  if (filters?.urgencia) {
    mapped = mapped.filter((item) => item._ops.urgencia === filters.urgencia);
  }
  if (filters?.soloObservaciones) {
    mapped = mapped.filter((item) => item.estado === "observada" || item.estado === "rechazado" || item._ops.observados > 0);
  }
  if (filters?.soloVencimientos) {
    mapped = mapped.filter((item) => item._ops.vencidos > 0 || item.estado === "vencido");
  }

  const skip = filters?.skip || 0;
  const take = filters?.take || 50;
  const sliced = mapped.slice(skip, skip + take);

  return {
    data: sliced,
    total: mapped.length,
    totalBase,
    hasMore: skip + take < mapped.length,
  };
}

export async function getAcreditacionById(id: string) {
  const empresaId = await getEmpresaId();

  const acreditacion = await prisma.acreditacion.findUnique({
    where: { id },
    include: {
      mandante: true,
      plantilla: {
        include: { requisitos: { orderBy: { orden: "asc" } } },
      },
      responsable: true,
      documentos: {
        include: { requisito: true },
        orderBy: { requisito: { orden: "asc" } },
      },
      trabajadores: { include: { trabajador: true } },
      vehiculos: { include: { vehiculo: true } },
      historial: {
        include: { usuario: { select: { nombre: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (acreditacion?.empresaId !== empresaId) throw new Error("Unauthorized");
  return acreditacion;
}

// ─────────────────────────────────────────────────────────────────────
// MANDANTES — LECTURA
// ─────────────────────────────────────────────────────────────────────

export async function getMandantesAcreditacion() {
  const empresaId = await getEmpresaId();

  return prisma.mandanteAcreditacion.findMany({
    where: { empresaId, activo: true },
    orderBy: { nombre: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────────────
// PLANTILLAS — LECTURA
// ─────────────────────────────────────────────────────────────────────

export async function getPlantillasAcreditacion(filtros?: { activas?: boolean; tipo?: string; search?: string }) {
  const empresaId = await getEmpresaId();

  return prisma.plantillaAcreditacion.findMany({
    where: {
      empresaId,
      ...(filtros?.activas !== undefined && { activa: filtros.activas }),
      ...(filtros?.tipo && { tipo: filtros.tipo }),
      ...(filtros?.search && {
        OR: [
          { nombre: { contains: filtros.search, mode: "insensitive" } },
          { descripcion: { contains: filtros.search, mode: "insensitive" } },
          { mandante: { nombre: { contains: filtros.search, mode: "insensitive" } } },
        ],
      }),
    },
    include: {
      mandante: true,
      requisitos: { orderBy: { orden: "asc" } },
      _count: { select: { requisitos: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPlantillaAcreditacionById(id: string) {
  const empresaId = await getEmpresaId();

  const plantilla = await prisma.plantillaAcreditacion.findUnique({
    where: { id },
    include: {
      mandante: true,
      requisitos: { orderBy: { orden: "asc" } },
    },
  });
  if (plantilla?.empresaId !== empresaId) throw new Error("Unauthorized");
  return plantilla;
}

// ─────────────────────────────────────────────────────────────────────
// PLANTILLAS — ESCRITURA
// ─────────────────────────────────────────────────────────────────────

export async function crearPlantillaAcreditacion(data: {
  nombre: string;
  tipo: string;
  descripcion: string;
  mandanteId?: string;
}) {
  const empresaId = await getEmpresaId();

  if (data.mandanteId) {
    const mandante = await prisma.mandanteAcreditacion.findFirst({
      where: { id: data.mandanteId, empresaId },
    });
    if (!mandante) throw new Error("Mandante not found or not authorized");
  }

  return prisma.plantillaAcreditacion.create({
    data: {
      nombre: data.nombre,
      tipo: data.tipo,
      descripcion: data.descripcion,
      empresa: { connect: { id: empresaId } },
      ...(data.mandanteId && { mandante: { connect: { id: data.mandanteId } } }),
      origen: "nextprev",
      activa: true,
      version: 1,
    },
    include: { mandante: true, requisitos: true },
  });
}

export async function duplicarPlantillaAcreditacion(id: string) {
  const empresaId = await getEmpresaId();

  const plantilla = await prisma.plantillaAcreditacion.findUnique({
    where: { id },
    include: { requisitos: true },
  });

  if (!plantilla || plantilla.empresaId !== empresaId) throw new Error("Plantilla not found or not authorized");

  const newPlantilla = await prisma.plantillaAcreditacion.create({
    data: {
      nombre: `${plantilla.nombre} (copia)`,
      tipo: plantilla.tipo,
      descripcion: plantilla.descripcion,
      origen: plantilla.origen,
      activa: false,
      version: plantilla.version + 1,
      empresaId,
      mandanteId: plantilla.mandanteId,
      requisitos: {
        create: plantilla.requisitos.map((r) => ({
          nombreDocumento: r.nombreDocumento,
          codigoDocumento: r.codigoDocumento,
          categoria: r.categoria,
          aplicaA: r.aplicaA,
          obligatorio: r.obligatorio,
          permiteMultiples: r.permiteMultiples,
          requiereVencimiento: r.requiereVencimiento,
          requiereRevisionManual: r.requiereRevisionManual,
          orden: r.orden,
          observacionAyuda: r.observacionAyuda,
          activo: r.activo,
        })),
      },
    },
    include: { mandante: true, requisitos: true },
  });

  return newPlantilla;
}

export async function activarDesactivarPlantillaAcreditacion(id: string, activa: boolean) {
  const empresaId = await getEmpresaId();

  const plantilla = await prisma.plantillaAcreditacion.findUnique({
    where: { id },
  });

  if (!plantilla || plantilla.empresaId !== empresaId) throw new Error("Plantilla not found or not authorized");

  return prisma.plantillaAcreditacion.update({
    where: { id },
    data: { activa },
    include: { mandante: true, requisitos: true },
  });
}

// ─────────────────────────────────────────────────────────────────────
// ACREDITACIONES — ESCRITURA
// ─────────────────────────────────────────────────────────────────────

export async function crearAcreditacion(data: {
  mandanteId: string;
  plantillaId: string;
  nombreProyecto?: string;
  obraFaena?: string;
  trabajadorIds?: string[];
  vehiculoIds?: string[];
}) {
  const context = await getContext();
  const empresaId = context.empresaId;
  const usuarioId = context.usuarioId;

  // Validaciones
  const mandante = await prisma.mandanteAcreditacion.findFirst({
    where: { id: data.mandanteId, empresaId },
  });
  if (!mandante) throw new Error("Mandante not found");

  const plantilla = await prisma.plantillaAcreditacion.findFirst({
    where: {
      id: data.plantillaId,
      empresaId,
      OR: [{ mandanteId: data.mandanteId }, { mandante: null }],
    },
    include: { requisitos: true },
  });
  if (!plantilla) throw new Error("Plantilla not found");

  const trabajadorIds = Array.from(new Set(data.trabajadorIds ?? []));
  const vehiculoIds = Array.from(new Set(data.vehiculoIds ?? []));

  if (trabajadorIds.length > 0) {
    const workers = await prisma.trabajador.count({
      where: { id: { in: trabajadorIds }, empresaId },
    });
    if (workers !== trabajadorIds.length) {
      throw new Error("Trabajadores invalidos para la empresa");
    }
  }

  if (vehiculoIds.length > 0) {
    const vehiculos = await prisma.vehiculo.count({
      where: { id: { in: vehiculoIds }, empresaId },
    });
    if (vehiculos !== vehiculoIds.length) {
      throw new Error("Vehiculos invalidos para la empresa");
    }
  }

  const trabajadoresData = trabajadorIds.length > 0
    ? await prisma.trabajador.findMany({
        where: { id: { in: trabajadorIds }, empresaId },
        select: { id: true, nombres: true, apellidos: true },
      })
    : [];

  const vehiculosData = vehiculoIds.length > 0
    ? await prisma.vehiculo.findMany({
        where: { id: { in: vehiculoIds }, empresaId },
        select: { id: true, patente: true, modelo: true },
      })
    : [];

  const documentosCreate: Array<{
    requisitoId: string;
    nombreDocumento: string;
    categoria: string;
    obligatorio: boolean;
    titularTipo: string;
    titularId?: string;
    titularNombre?: string;
    estado: "faltante";
  }> = [];

  for (const req of plantilla.requisitos) {
    if (!req.activo) continue;

    if (req.aplicaA === "empresa") {
      documentosCreate.push({
        requisitoId: req.id,
        nombreDocumento: req.nombreDocumento,
        categoria: req.categoria,
        obligatorio: req.obligatorio,
        titularTipo: "empresa",
        estado: "faltante",
      });
      continue;
    }

    if (req.aplicaA === "trabajador") {
      for (const trabajador of trabajadoresData) {
        documentosCreate.push({
          requisitoId: req.id,
          nombreDocumento: req.nombreDocumento,
          categoria: req.categoria,
          obligatorio: req.obligatorio,
          titularTipo: "trabajador",
          titularId: trabajador.id,
          titularNombre: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
          estado: "faltante",
        });
      }
      continue;
    }

    for (const vehiculo of vehiculosData) {
      documentosCreate.push({
        requisitoId: req.id,
        nombreDocumento: req.nombreDocumento,
        categoria: req.categoria,
        obligatorio: req.obligatorio,
        titularTipo: "vehiculo",
        titularId: vehiculo.id,
        titularNombre: `${vehiculo.modelo} (${vehiculo.patente})`,
        estado: "faltante",
      });
    }
  }

  // Crear acreditación
  const acreditacion = await prisma.acreditacion.create({
    data: {
      empresaId,
      mandanteId: data.mandanteId,
      plantillaId: data.plantillaId,
      nombreProyecto: data.nombreProyecto,
      obraFaena: data.obraFaena,
      estado: "en_preparacion",

      // Agregar trabajadores
      ...(trabajadorIds.length > 0 && {
        trabajadores: {
          create: trabajadorIds.map((wId) => ({
            trabajadorId: wId,
          })),
        },
      }),

      // Agregar vehículos
      ...(vehiculoIds.length > 0 && {
        vehiculos: {
          create: vehiculoIds.map((vId) => ({
            vehiculoId: vId,
          })),
        },
      }),

      // Crear documentos desde los requisitos de la plantilla
      documentos: {
        create: documentosCreate,
      },

      // Registrar en historial
      historial: {
        create: {
          accion: "crear",
          detalle: `Acreditación creada desde plantilla "${plantilla.nombre}"`,
          usuarioId: usuarioId,
        },
      },
    },
    include: {
      mandante: true,
      plantilla: true,
      documentos: true,
      trabajadores: { include: { trabajador: true } },
      vehiculos: { include: { vehiculo: true } },
    },
  });

  return acreditacion;
}

export async function actualizarEstadoAcreditacion(id: string, estado: EstadoAcreditacion, comentario?: string) {
  const context = await getContext();
  const empresaId = context.empresaId;

  const acreditacion = await prisma.acreditacion.findFirst({
    where: { id, empresaId },
  });

  if (!acreditacion) throw new Error("Acreditacion not found");

  const updated = await prisma.acreditacion.update({
    where: { id },
    data: {
      estado,
      historial: {
        create: {
          accion: "cambiar_estado",
          detalle: comentario,
          estadoAnterior: acreditacion.estado,
          estadoNuevo: estado,
          usuarioId: context.usuarioId,
        },
      },
    },
    include: {
      mandante: true,
      documentos: true,
      historial: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return updated;
}

export async function generarDocumentosAcreditacion(acreditacionId: string) {
  const empresaId = await getEmpresaId();

  const acreditacion = await prisma.acreditacion.findFirst({
    where: { id: acreditacionId, empresaId },
    include: {
      plantilla: { include: { requisitos: { where: { activo: true }, orderBy: { orden: "asc" } } } },
      trabajadores: { include: { trabajador: { select: { id: true, nombres: true, apellidos: true } } } },
      vehiculos: { include: { vehiculo: { select: { id: true, patente: true, modelo: true } } } },
    },
  });

  if (!acreditacion) throw new Error("Acreditacion not found");

  const expectedDocs: Array<{
    requisitoId: string;
    nombreDocumento: string;
    categoria: string;
    obligatorio: boolean;
    titularTipo: string;
    titularId: string | null;
    titularNombre: string | null;
  }> = [];

  for (const req of acreditacion.plantilla.requisitos) {
    if (req.aplicaA === "empresa") {
      expectedDocs.push({
        requisitoId: req.id,
        nombreDocumento: req.nombreDocumento,
        categoria: req.categoria,
        obligatorio: req.obligatorio,
        titularTipo: "empresa",
        titularId: null,
        titularNombre: null,
      });
      continue;
    }

    if (req.aplicaA === "trabajador") {
      for (const tw of acreditacion.trabajadores) {
        expectedDocs.push({
          requisitoId: req.id,
          nombreDocumento: req.nombreDocumento,
          categoria: req.categoria,
          obligatorio: req.obligatorio,
          titularTipo: "trabajador",
          titularId: tw.trabajador.id,
          titularNombre: `${tw.trabajador.nombres} ${tw.trabajador.apellidos}`.trim(),
        });
      }
      continue;
    }

    for (const tv of acreditacion.vehiculos) {
      expectedDocs.push({
        requisitoId: req.id,
        nombreDocumento: req.nombreDocumento,
        categoria: req.categoria,
        obligatorio: req.obligatorio,
        titularTipo: "vehiculo",
        titularId: tv.vehiculo.id,
        titularNombre: `${tv.vehiculo.modelo} (${tv.vehiculo.patente})`,
      });
    }
  }

  const existing = await prisma.documentoAcreditacion.findMany({
    where: { acreditacionId },
    select: { id: true, requisitoId: true, titularTipo: true, titularId: true },
  });

  const toKey = (doc: { requisitoId: string; titularTipo: string; titularId: string | null }) =>
    `${doc.requisitoId}::${doc.titularTipo}::${doc.titularId ?? "__null__"}`;

  const existingByKey = new Map(existing.map((doc) => [toKey(doc), doc]));
  const expectedKeys = new Set(expectedDocs.map((doc) => toKey(doc)));

  const creates = expectedDocs.filter((doc) => !existingByKey.has(toKey(doc))).map((doc) => ({
    acreditacionId,
    requisitoId: doc.requisitoId,
    titularTipo: doc.titularTipo,
    titularId: doc.titularId,
    titularNombre: doc.titularNombre,
    nombreDocumento: doc.nombreDocumento,
    categoria: doc.categoria,
    obligatorio: doc.obligatorio,
    estado: "faltante" as const,
  }));

  const deletes = existing
    .filter((doc) => !expectedKeys.has(toKey(doc)))
    .map((doc) => doc.id);

  const createResult = creates.length > 0
    ? await prisma.documentoAcreditacion.createMany({ data: creates })
    : { count: 0 };

  if (deletes.length > 0) {
    await prisma.documentoAcreditacion.deleteMany({ where: { id: { in: deletes } } });
  }

  return {
    created: createResult.count,
    totalEsperados: expectedDocs.length,
    eliminados: deletes.length,
  };
}
