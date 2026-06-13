"use server";

import { type Prisma, type EstadoEntregaEpp } from "@prisma/client";
import {
  crearDocumentShell,
  PLANTILLA_ENTREGA_EPP,
  PLANTILLA_IRL,
  PLANTILLA_PTS,
  PLANTILLA_RECEPCION_RI,
  PLANTILLA_REGISTRO_INDUCCION,
  renderDocumentoComoMarkdown,
  type DocumentTemplateCode,
  type DocumentoPlantillaRenderizada,
} from "@/lib/documentacion/templates";
import { generarTokenFirma } from "@/lib/firmas/tokens";

type TxClient = Prisma.TransactionClient;

type GenerarDocumentosInduccionInput = {
  empresaId: string;
  trabajadorId: string;
  induccionId: string;
  generadoPor: string;
};

type ContextoPlantilla = {
  empresaNombre: string;
  empresaRut: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  trabajadorCargo: string;
  trabajadorArea: string;
  centroTrabajo: string;
  fechaTexto: string;
  fechaIso: string;
};

type DocumentoAConstruir = {
  codigo: DocumentTemplateCode;
  titulo: string;
  renderizado: DocumentoPlantillaRenderizada;
};

function riesgoPorCargo(cargo: string): string[] {
  const norm = cargo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (norm.includes("electric")) {
    return [
      "Contacto electrico",
      "Proyeccion de particulas",
      "Caidas de distinto nivel",
    ];
  }

  if (norm.includes("bodega") || norm.includes("logistic")) {
    return [
      "Manipulacion manual de cargas",
      "Golpes por objetos",
      "Caidas al mismo nivel",
    ];
  }

  if (norm.includes("supervisor") || norm.includes("jefe")) {
    return [
      "Riesgos psicosociales",
      "Accidentes de desplazamiento",
      "Caidas al mismo nivel",
    ];
  }

  return [
    "Golpes y cortes",
    "Sobreesfuerzo",
    "Caidas al mismo nivel",
  ];
}

async function existenProcedimientosPtsAplicables(
  tx: TxClient,
  params: {
    empresaId: string;
    cargoId: string | null;
    areaId: string | null;
    centroTrabajoId: string | null;
    tipoContrato: string | null;
  },
): Promise<boolean> {
  const andFilters: Prisma.ReglaDocumentoTrabajadorWhereInput[] = [];

  andFilters.push(
    params.cargoId
      ? { OR: [{ cargoId: null }, { cargoId: params.cargoId }] }
      : { cargoId: null },
  );

  andFilters.push(
    params.areaId
      ? { OR: [{ areaId: null }, { areaId: params.areaId }] }
      : { areaId: null },
  );

  andFilters.push(
    params.centroTrabajoId
      ? {
          OR: [
            { centroTrabajoId: null },
            { centroTrabajoId: params.centroTrabajoId },
          ],
        }
      : { centroTrabajoId: null },
  );

  andFilters.push(
    params.tipoContrato
      ? { OR: [{ tipoContrato: null }, { tipoContrato: params.tipoContrato }] }
      : { tipoContrato: null },
  );

  const count = await tx.reglaDocumentoTrabajador.count({
    where: {
      empresaId: params.empresaId,
      activo: true,
      AND: andFilters,
      tipoDocumento: {
        activo: true,
        OR: [
          { codigo: { contains: "PTS", mode: "insensitive" } },
          { nombre: { contains: "PTS", mode: "insensitive" } },
          { nombre: { contains: "procedimiento", mode: "insensitive" } },
        ],
      },
    },
  });

  return count > 0;
}

function crearShell(
  ctx: ContextoPlantilla,
  params: {
    codigoDocumento: string;
    version: string;
    titulo: string;
    generadoPor: string;
  },
) {
  return crearDocumentShell({
    titulo: params.titulo,
    codigoDocumento: params.codigoDocumento,
    version: params.version,
    fechaEmision: ctx.fechaTexto,
    empresaPrincipal: ctx.empresaNombre,
    empresaRut: ctx.empresaRut,
    centroTrabajo: ctx.centroTrabajo,
    trabajador: {
      nombre: ctx.trabajadorNombre,
      rut: ctx.trabajadorRut,
      cargo: ctx.trabajadorCargo,
      area: ctx.trabajadorArea,
    },
    declaracionFinal:
      "Declaro haber recibido la informacion del documento, comprender su contenido y comprometerme a cumplir las medidas indicadas.",
    firmas: [
      {
        rol: "Trabajador",
        nombre: ctx.trabajadorNombre,
        rut: ctx.trabajadorRut,
      },
      {
        rol: "Prevencionista / Responsable SST",
        nombre: "Por definir",
      },
    ],
    trazabilidad: {
      generadoEn: ctx.fechaIso,
      generadoPor: params.generadoPor,
      fuente: "manual",
    },
  });
}

function construirDocumentosBase(params: {
  ctx: ContextoPlantilla;
  generadoPor: string;
  tieneEntregaEpp: boolean;
  entregaEppItems: Array<{ nombre: string; cantidad: number }>;
  incluirPts: boolean;
}): DocumentoAConstruir[] {
  const { ctx, generadoPor, tieneEntregaEpp, entregaEppItems, incluirPts } = params;
  const documentos: DocumentoAConstruir[] = [];

  const riesgos = riesgoPorCargo(ctx.trabajadorCargo);

  documentos.push({
    codigo: "IRL",
    titulo: "Identificacion de Riesgos Laborales (IRL)",
    renderizado: PLANTILLA_IRL.construir(
      {
        actividad: `${ctx.trabajadorCargo} en ${ctx.centroTrabajo}`,
        riesgos: riesgos.map((item) => ({
          peligro: item,
          consecuencia: "Accidente o enfermedad profesional",
          medidaControl: "Aplicar procedimiento seguro, supervision y EPP obligatorio",
        })),
        protocolosAplicables: ["Protocolo de reporte de incidentes", "Procedimiento de emergencia"],
      },
      crearShell(ctx, {
        codigoDocumento: PLANTILLA_IRL.codigo,
        version: PLANTILLA_IRL.version,
        titulo: "Identificacion de Riesgos Laborales (IRL)",
        generadoPor,
      }),
    ),
  });

  documentos.push({
    codigo: "RECEPCION_RI",
    titulo: "Recepcion Reglamento Interno",
    renderizado: PLANTILLA_RECEPCION_RI.construir(
      {
        versionReglamento: "Vigente",
        fechaRecepcion: ctx.fechaTexto,
        resumenContenido: [
          "Obligaciones y prohibiciones del trabajador",
          "Medidas de seguridad y uso obligatorio de EPP",
          "Canales de reporte y protocolo de emergencias",
        ],
      },
      crearShell(ctx, {
        codigoDocumento: PLANTILLA_RECEPCION_RI.codigo,
        version: PLANTILLA_RECEPCION_RI.version,
        titulo: "Recepcion Reglamento Interno",
        generadoPor,
      }),
    ),
  });

  documentos.push({
    codigo: "REGISTRO_INDUCCION",
    titulo: "Registro de induccion",
    renderizado: PLANTILLA_REGISTRO_INDUCCION.construir(
      {
        fechaInduccion: ctx.fechaTexto,
        duracion: "60 minutos",
        temasTratados: [
          "Politica SST y responsabilidades",
          "Riesgos del cargo y controles",
          "Plan de emergencia y evacuacion",
          "Uso de EPP y reporte de incidentes",
        ],
        evaluacion: "Induccion realizada y comprendida por el trabajador.",
      },
      crearShell(ctx, {
        codigoDocumento: PLANTILLA_REGISTRO_INDUCCION.codigo,
        version: PLANTILLA_REGISTRO_INDUCCION.version,
        titulo: "Registro de induccion",
        generadoPor,
      }),
    ),
  });

  if (tieneEntregaEpp) {
    documentos.push({
      codigo: "ENTREGA_EPP",
      titulo: "Acta de Entrega de EPP",
      renderizado: PLANTILLA_ENTREGA_EPP.construir(
        {
          elementosEntregados: entregaEppItems.map((item) => ({
            elemento: item.nombre,
            cantidad: item.cantidad,
            estado: "Entregado",
            norma: "Segun especificacion interna",
          })),
          instruccionesUso: [
            "Usar el EPP durante toda la exposicion al riesgo",
            "Inspeccionar estado del EPP antes de iniciar la jornada",
            "Informar deterioro para reposicion inmediata",
          ],
        },
        crearShell(ctx, {
          codigoDocumento: PLANTILLA_ENTREGA_EPP.codigo,
          version: PLANTILLA_ENTREGA_EPP.version,
          titulo: "Acta de Entrega de EPP",
          generadoPor,
        }),
      ),
    });
  }

  if (incluirPts) {
    documentos.push({
      codigo: "PTS",
      titulo: "Procedimiento de Trabajo Seguro (PTS)",
      renderizado: PLANTILLA_PTS.construir(
        {
          nombreTarea: `${ctx.trabajadorCargo} - procedimiento aplicable`,
          actividades: [
            {
              actividad: "Preparacion del trabajo",
              peligro: "Exposicion a condiciones inseguras",
              control: "Check previo de herramientas y area de trabajo",
            },
            {
              actividad: "Ejecucion de la tarea",
              peligro: "Accidente por maniobra insegura",
              control: "Aplicar procedimiento y supervision",
            },
          ],
          permisosRequeridos: [
            "Autorizacion de supervisor",
            "Charla de seguridad vigente",
          ],
        },
        crearShell(ctx, {
          codigoDocumento: PLANTILLA_PTS.codigo,
          version: PLANTILLA_PTS.version,
          titulo: "Procedimiento de Trabajo Seguro (PTS)",
          generadoPor,
        }),
      ),
    });
  }

  return documentos;
}

export async function generarDocumentosInduccionDesdePlantillasTx(
  tx: TxClient,
  input: GenerarDocumentosInduccionInput,
): Promise<{ documentosGenerados: number }> {
  const induccionExistente = await tx.documentoInduccionGenerado.count({
    where: { induccionId: input.induccionId },
  });

  if (induccionExistente > 0) {
    return { documentosGenerados: induccionExistente };
  }

  const [empresa, trabajador, entregaEpp] = await Promise.all([
    tx.empresa.findUnique({
      where: { id: input.empresaId },
      select: { nombre: true, rut: true },
    }),
    tx.trabajador.findFirst({
      where: { id: input.trabajadorId, empresaId: input.empresaId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        rut: true,
        tipoContrato: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
      },
    }),
    tx.entregaEpp.findFirst({
      where: {
        empresaId: input.empresaId,
        trabajadorId: input.trabajadorId,
        estado: { in: ["pendiente_firma", "firmada"] as EstadoEntregaEpp[] },
      },
      orderBy: { fechaEntrega: "desc" },
      select: {
        detalles: {
          select: {
            nombre: true,
            cantidad: true,
          },
        },
      },
    }),
  ]);

  if (!empresa || !trabajador) {
    throw new Error("No se pudo resolver empresa/trabajador para generar documentos de induccion");
  }

  const incluirPts = await existenProcedimientosPtsAplicables(tx, {
    empresaId: input.empresaId,
    cargoId: trabajador.cargoId,
    areaId: trabajador.areaId,
    centroTrabajoId: trabajador.centroTrabajoId,
    tipoContrato: trabajador.tipoContrato,
  });

  const now = new Date();
  const ctx: ContextoPlantilla = {
    empresaNombre: empresa.nombre,
    empresaRut: empresa.rut ?? "-",
    trabajadorNombre: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
    trabajadorRut: trabajador.rut ?? "-",
    trabajadorCargo: trabajador.cargo?.nombre ?? "Sin cargo",
    trabajadorArea: trabajador.area?.nombre ?? "Sin area",
    centroTrabajo: trabajador.centroTrabajo?.nombre ?? "Sin centro de trabajo",
    fechaTexto: now.toLocaleDateString("es-CL"),
    fechaIso: now.toISOString(),
  };

  const documentos = construirDocumentosBase({
    ctx,
    generadoPor: input.generadoPor,
    tieneEntregaEpp: Boolean(entregaEpp && entregaEpp.detalles.length > 0),
    entregaEppItems:
      entregaEpp?.detalles.map((detalle) => ({
        nombre: detalle.nombre,
        cantidad: detalle.cantidad,
      })) ?? [],
    incluirPts,
  });

  for (const documento of documentos) {
    const contenidoMarkdown = renderDocumentoComoMarkdown(documento.renderizado);

    const creado = await tx.documentoInduccionGenerado.create({
      data: {
        empresaId: input.empresaId,
        trabajadorId: input.trabajadorId,
        induccionId: input.induccionId,
        tipo: documento.codigo,
        titulo: documento.titulo,
        contenidoMarkdown,
        estado: "pendiente",
      },
      select: {
        id: true,
        titulo: true,
        tipo: true,
      },
    });

    await tx.firmaDocumento.create({
      data: {
        empresaId: input.empresaId,
        trabajadorId: input.trabajadorId,
        documentoId: creado.id,
        documentoOrigen: "induccion",
        token: generarTokenFirma(),
        estado: "pendiente",
        tituloDocumento: creado.titulo,
        descripcion: `Induccion digital — ${creado.tipo}`,
        nombreFirmante: ctx.trabajadorNombre,
        rutFirmante: trabajador.rut ?? null,
        induccionId: input.induccionId,
      },
    });
  }

  return { documentosGenerados: documentos.length };
}
