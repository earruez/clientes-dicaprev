import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en .env");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const requiredDocs = [
  {
    nombre: "Reglamento Interno de Higiene y Seguridad",
    categoria: "sst",
    descripcion: "Reglamento interno de higiene y seguridad vigente.",
    obligatorio: true,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 1,
  },
  {
    nombre: "Reglamento Interno de Orden, Higiene y Seguridad",
    categoria: "sst",
    descripcion: "RIOHS actualizado y comunicado al personal.",
    obligatorio: true,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 2,
  },
  {
    nombre: "Certificado de afiliacion a mutualidad / ISL",
    categoria: "mutualidad_ley_16744",
    descripcion: "Certificado vigente de afiliacion a mutualidad o ISL.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 3,
  },
  {
    nombre: "Certificado F30",
    categoria: "laborales_previsionales",
    descripcion: "Certificado de cumplimiento laboral y previsional F30.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 4,
  },
  {
    nombre: "Certificado F30-1",
    categoria: "laborales_previsionales",
    descripcion: "Certificado F30-1 vigente.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 1,
    orden: 5,
  },
  {
    nombre: "Matriz IPER",
    categoria: "sst",
    descripcion: "Matriz de identificacion de peligros y evaluacion de riesgos.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 6,
  },
  {
    nombre: "Programa de trabajo preventivo / plan anual de prevencion",
    categoria: "sst",
    descripcion: "Plan anual de actividades preventivas.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 7,
  },
  {
    nombre: "Plan de emergencia",
    categoria: "sst",
    descripcion: "Plan de emergencia actualizado por centro de trabajo.",
    obligatorio: true,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 8,
  },
  {
    nombre: "Procedimiento de investigacion de accidentes",
    categoria: "sst",
    descripcion: "Procedimiento formal para investigacion de accidentes.",
    obligatorio: true,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 9,
  },
  {
    nombre: "Formato base de entrega de EPP",
    categoria: "plantillas_formatos",
    descripcion:
      "Plantilla corporativa para registrar entrega de elementos de proteccion personal. El registro firmado debe asociarse a cada trabajador en Control Documental.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 10,
  },
  {
    nombre: "Formato / matriz de capacitaciones obligatorias",
    categoria: "plantillas_formatos",
    descripcion:
      "Plantilla o matriz corporativa de control. Los certificados individuales deben asociarse a cada trabajador.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 11,
  },
  {
    nombre: "Constitucion Comite Paritario, si aplica",
    categoria: "sst",
    descripcion: "Documento de constitucion de Comite Paritario cuando corresponde.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 12,
  },
  {
    nombre: "Actas Comite Paritario, si aplica",
    categoria: "sst",
    descripcion: "Actas de sesiones del Comite Paritario cuando corresponde.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 13,
  },
  {
    nombre: "Designacion encargado/experto en prevencion, si aplica",
    categoria: "sst",
    descripcion: "Designacion formal de encargado o experto en prevencion.",
    obligatorio: false,
    requiereVencimiento: false,
    periodicidadMeses: null,
    orden: 14,
  },
  {
    nombre: "Documentos de protocolos aplicables: psicosocial, TMERT, MMC, UV, PREXOR si corresponde",
    categoria: "protocolos",
    descripcion: "Protocolos aplicables segun riesgo y rubro.",
    obligatorio: false,
    requiereVencimiento: true,
    periodicidadMeses: 12,
    orden: 15,
  },
];

const workerDocumentTypesBase = [
  {
    codigo: "CONTRATO_TRABAJO",
    nombre: "Contrato de trabajo",
    descripcion: "Contrato laboral firmado por trabajador y empleador.",
    requiereArchivo: true,
    requiereVencimiento: false,
    vigenciaDias: null,
    activo: true,
  },
  {
    codigo: "CEDULA_IDENTIDAD",
    nombre: "Cedula de identidad",
    descripcion: "Copia vigente de la cedula de identidad del trabajador.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 3650,
    activo: true,
  },
  {
    codigo: "REGLAMENTO_INTERNO_RECIBIDO",
    nombre: "Reglamento interno recibido",
    descripcion: "Constancia de recepcion del reglamento interno.",
    requiereArchivo: true,
    requiereVencimiento: false,
    vigenciaDias: null,
    activo: true,
  },
  {
    codigo: "ODI_RIESGOS",
    nombre: "Obligacion de informar riesgos ODI",
    descripcion: "Registro de ODI firmado por el trabajador.",
    requiereArchivo: true,
    requiereVencimiento: false,
    vigenciaDias: null,
    activo: true,
  },
  {
    codigo: "ENTREGA_EPP",
    nombre: "Entrega de EPP",
    descripcion: "Registro de entrega de elementos de proteccion personal.",
    requiereArchivo: true,
    requiereVencimiento: false,
    vigenciaDias: null,
    activo: true,
  },
  {
    codigo: "CAPACITACION_INICIAL",
    nombre: "Registro de capacitacion inicial",
    descripcion: "Evidencia de induccion/capacitacion inicial.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 365,
    activo: true,
  },
  {
    codigo: "EXAMEN_OCUPACIONAL",
    nombre: "Examen ocupacional",
    descripcion: "Examen ocupacional o preocupacional vigente.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 365,
    activo: true,
  },
  {
    codigo: "LICENCIA_HABILITANTE",
    nombre: "Licencia o certificacion habilitante",
    descripcion: "Licencia o certificacion vigente segun cargo.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 1825,
    activo: true,
  },
];

async function main() {
  await normalizarRequerimientosPlantillas();

  for (const doc of requiredDocs) {
    await prisma.documentoRequeridoEmpresa.upsert({
      where: {
        nombre_categoria: {
          nombre: doc.nombre,
          categoria: doc.categoria,
        },
      },
      create: {
        ...doc,
        activo: true,
      },
      update: {
        descripcion: doc.descripcion,
        obligatorio: doc.obligatorio,
        requiereVencimiento: doc.requiereVencimiento,
        periodicidadMeses: doc.periodicidadMeses,
        orden: doc.orden,
        activo: true,
      },
    });
  }

  const workerSeed = await seedWorkerDocumentControlBase();

  console.log(`Seed completado: ${requiredDocs.length} documentos requeridos.`);
  console.log(
    `Control documental trabajadores: ${workerSeed.tiposCreados} tipos creados, ${workerSeed.tiposActualizados} tipos actualizados, ${workerSeed.reglasCreadas} reglas creadas, ${workerSeed.reglasActualizadas} reglas actualizadas.`
  );
}

async function seedWorkerDocumentControlBase() {
  const empresas = await prisma.empresa.findMany({
    select: { id: true },
  });

  if (empresas.length === 0) {
    console.log("Control documental trabajadores: sin empresas, se omite seeding.");
    return {
      tiposCreados: 0,
      tiposActualizados: 0,
      reglasCreadas: 0,
      reglasActualizadas: 0,
    };
  }

  const counters = {
    tiposCreados: 0,
    tiposActualizados: 0,
    reglasCreadas: 0,
    reglasActualizadas: 0,
  };

  for (const empresa of empresas) {
    const tipoIdsByCode = new Map();

    for (const tipoBase of workerDocumentTypesBase) {
      const existing = await prisma.documentoTipoTrabajador.findUnique({
        where: {
          empresaId_codigo: {
            empresaId: empresa.id,
            codigo: tipoBase.codigo,
          },
        },
        select: { id: true },
      });

      const saved = await prisma.documentoTipoTrabajador.upsert({
        where: {
          empresaId_codigo: {
            empresaId: empresa.id,
            codigo: tipoBase.codigo,
          },
        },
        create: {
          empresaId: empresa.id,
          ...tipoBase,
        },
        update: {
          nombre: tipoBase.nombre,
          descripcion: tipoBase.descripcion,
          vigenciaDias: tipoBase.vigenciaDias,
          requiereVencimiento: tipoBase.requiereVencimiento,
          requiereArchivo: tipoBase.requiereArchivo,
          activo: true,
        },
        select: { id: true, codigo: true },
      });

      if (existing) counters.tiposActualizados += 1;
      else counters.tiposCreados += 1;

      tipoIdsByCode.set(saved.codigo, saved.id);
    }

    const [cargos, areas, centros] = await Promise.all([
      prisma.cargo.findMany({
        where: { empresaId: empresa.id, estado: "activo" },
        select: { id: true, nombre: true },
      }),
      prisma.area.findMany({
        where: { empresaId: empresa.id, estado: "activa" },
        select: { id: true, nombre: true },
      }),
      prisma.centroTrabajo.findMany({
        where: { empresaId: empresa.id, estado: "activo" },
        select: { id: true, nombre: true },
      }),
    ]);

    const generalCodes = [
      "CONTRATO_TRABAJO",
      "CEDULA_IDENTIDAD",
      "REGLAMENTO_INTERNO_RECIBIDO",
      "ODI_RIESGOS",
      "ENTREGA_EPP",
      "CAPACITACION_INICIAL",
      "EXAMEN_OCUPACIONAL",
    ];

    for (const code of generalCodes) {
      const tipoDocumentoId = tipoIdsByCode.get(code);
      if (!tipoDocumentoId) continue;

      const res = await upsertWorkerDocumentRule({
        empresaId: empresa.id,
        tipoDocumentoId,
        cargoId: null,
        areaId: null,
        centroTrabajoId: null,
        tipoContrato: null,
        obligatorio: true,
        activo: true,
      });

      if (res === "created") counters.reglasCreadas += 1;
      else counters.reglasActualizadas += 1;
    }

    const licenciaTipoId = tipoIdsByCode.get("LICENCIA_HABILITANTE");
    if (licenciaTipoId) {
      const cargoLicenciable = cargos.find((cargo) =>
        /(conductor|chofer|operador|maquinaria|camion|vehiculo)/i.test(cargo.nombre),
      );

      if (cargoLicenciable) {
        const res = await upsertWorkerDocumentRule({
          empresaId: empresa.id,
          tipoDocumentoId: licenciaTipoId,
          cargoId: cargoLicenciable.id,
          areaId: null,
          centroTrabajoId: null,
          tipoContrato: null,
          obligatorio: false,
          activo: true,
        });

        if (res === "created") counters.reglasCreadas += 1;
        else counters.reglasActualizadas += 1;
      }
    }

    const areaTerreno = areas.find((area) =>
      /(produccion|operacion|instalacion|terreno|obra)/i.test(area.nombre),
    );
    const eppTipoId = tipoIdsByCode.get("ENTREGA_EPP");
    if (areaTerreno && eppTipoId) {
      const res = await upsertWorkerDocumentRule({
        empresaId: empresa.id,
        tipoDocumentoId: eppTipoId,
        cargoId: null,
        areaId: areaTerreno.id,
        centroTrabajoId: null,
        tipoContrato: null,
        obligatorio: false,
        activo: true,
      });

      if (res === "created") counters.reglasCreadas += 1;
      else counters.reglasActualizadas += 1;
    }

    const examenTipoId = tipoIdsByCode.get("EXAMEN_OCUPACIONAL");
    if (centros.length > 0 && examenTipoId) {
      const res = await upsertWorkerDocumentRule({
        empresaId: empresa.id,
        tipoDocumentoId: examenTipoId,
        cargoId: null,
        areaId: null,
        centroTrabajoId: centros[0].id,
        tipoContrato: null,
        obligatorio: false,
        activo: true,
      });

      if (res === "created") counters.reglasCreadas += 1;
      else counters.reglasActualizadas += 1;
    }
  }

  return counters;
}

async function upsertWorkerDocumentRule(data) {
  const whereRule = {
    empresaId: data.empresaId,
    tipoDocumentoId: data.tipoDocumentoId,
    cargoId: data.cargoId,
    areaId: data.areaId,
    centroTrabajoId: data.centroTrabajoId,
    tipoContrato: data.tipoContrato,
  };

  const existing = await prisma.reglaDocumentoTrabajador.findFirst({
    where: whereRule,
    select: { id: true },
  });

  if (!existing) {
    await prisma.reglaDocumentoTrabajador.create({
      data,
    });
    return "created";
  }

  await prisma.reglaDocumentoTrabajador.update({
    where: { id: existing.id },
    data: {
      obligatorio: data.obligatorio,
      activo: data.activo,
    },
  });
  return "updated";
}

async function normalizarRequerimientosPlantillas() {
  await migrarDocumentoRequerido({
    oldNombre: "Registro de entrega de EPP",
    oldCategoria: "sst",
    newNombre: "Formato base de entrega de EPP",
    newCategoria: "plantillas_formatos",
    newDescripcion:
      "Plantilla corporativa para registrar entrega de elementos de proteccion personal. El registro firmado debe asociarse a cada trabajador en Control Documental.",
    obligatorio: false,
    orden: 10,
  });

  await migrarDocumentoRequerido({
    oldNombre: "Registro de capacitaciones obligatorias",
    oldCategoria: "sst",
    newNombre: "Formato / matriz de capacitaciones obligatorias",
    newCategoria: "plantillas_formatos",
    newDescripcion:
      "Plantilla o matriz corporativa de control. Los certificados individuales deben asociarse a cada trabajador.",
    obligatorio: false,
    orden: 11,
  });
}

async function migrarDocumentoRequerido(params) {
  const [oldDoc, newDoc] = await Promise.all([
    prisma.documentoRequeridoEmpresa.findFirst({
      where: {
        nombre: params.oldNombre,
        categoria: params.oldCategoria,
      },
      select: { id: true },
    }),
    prisma.documentoRequeridoEmpresa.findFirst({
      where: {
        nombre: params.newNombre,
        categoria: params.newCategoria,
      },
      select: { id: true },
    }),
  ]);

  if (!oldDoc) return;

  if (!newDoc) {
    await prisma.documentoRequeridoEmpresa.update({
      where: { id: oldDoc.id },
      data: {
        nombre: params.newNombre,
        categoria: params.newCategoria,
        descripcion: params.newDescripcion,
        obligatorio: params.obligatorio,
        requiereVencimiento: false,
        periodicidadMeses: null,
        orden: params.orden,
        activo: true,
      },
    });
    return;
  }

  await prisma.documentoEmpresa.updateMany({
    where: { documentoRequeridoId: oldDoc.id },
    data: { documentoRequeridoId: newDoc.id },
  });

  await prisma.documentoRequeridoEmpresa.update({
    where: { id: oldDoc.id },
    data: { activo: false },
  });

  await prisma.documentoRequeridoEmpresa.update({
    where: { id: newDoc.id },
    data: {
      descripcion: params.newDescripcion,
      obligatorio: params.obligatorio,
      orden: params.orden,
      activo: true,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
