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
    codigo: "IRL_RIESGOS",
    nombre: "Informacion de Riesgos Laborales (IRL)",
    descripcion: "Acta de Informacion sobre Riesgos Laborales firmada por el trabajador.",
    requiereArchivo: true,
    requiereVencimiento: false,
    vigenciaDias: null,
    activo: true,
  },
  {
    codigo: "ODI_OBLIGACION_INFORMAR",
    nombre: "ODI / obligacion de informar",
    descripcion: "Constancia de obligacion de informar riesgos laborales y medidas preventivas.",
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

const capacitacionesBase = [
  {
    codigo: "CAP-IRL-001",
    nombre: "Informacion de Riesgos Laborales (IRL)",
    descripcion: "Capacitacion sobre riesgos especificos del puesto de trabajo e IRL.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-EPP-001",
    nombre: "Uso correcto de EPP",
    descripcion: "Uso, mantenimiento y reposicion de elementos de proteccion personal.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
  },
  {
    codigo: "CAP-MMC-001",
    nombre: "Manejo manual de cargas",
    descripcion: "Tecnicas seguras para manipulacion manual de cargas y prevencion de lesiones.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 24,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
  },
  {
    codigo: "CAP-ALT-001",
    nombre: "Prevencion de caidas",
    descripcion: "Controles preventivos para trabajo en altura y prevencion de caidas a distinto nivel.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-EME-001",
    nombre: "Emergencias y evacuacion",
    descripcion: "Procedimientos de respuesta ante emergencia y rutas de evacuacion.",
    categoria: "emergencia",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
  },
  {
    codigo: "CAP-EXT-001",
    nombre: "Uso de extintores",
    descripcion: "Uso practico y seguro de extintores segun tipo de fuego.",
    categoria: "emergencia",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-PAU-001",
    nombre: "Primeros auxilios basicos",
    descripcion: "Conceptos y tecnicas basicas de primeros auxilios en faena.",
    categoria: "salud_ocupacional",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 24,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: false,
  },
  {
    codigo: "CAP-IND-001",
    nombre: "Induccion trabajador nuevo",
    descripcion: "Induccion inicial para nuevos ingresos sobre normas, riesgos y procedimientos.",
    categoria: "induccion",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-RPS-001",
    nombre: "Riesgos psicosociales",
    descripcion: "Sensibilizacion sobre factores de riesgo psicosocial y medidas preventivas.",
    categoria: "psicosocial",
    modalidad: "online",
    duracionHoras: 2,
    vigenciaMeses: null,
    requiereEvaluacion: false,
    requiereFirma: false,
    generaCertificado: false,
    esObligatoria: false,
  },
  {
    codigo: "CAP-OYA-001",
    nombre: "Orden y aseo en el lugar de trabajo",
    descripcion: "Buenas practicas de orden, limpieza y estandar 5S en areas de trabajo.",
    categoria: "sst",
    modalidad: "online",
    duracionHoras: 1,
    vigenciaMeses: null,
    requiereEvaluacion: false,
    requiereFirma: false,
    generaCertificado: false,
    esObligatoria: true,
  },
];

const planCapacitacionBase = [
  {
    codigo: "CAP-IRL-001",
    periodicidad: "anual",
    mesProgramado: 1,
    obligatorio: true,
    target: "general",
  },
  {
    codigo: "CAP-EPP-001",
    periodicidad: "anual",
    mesProgramado: 1,
    obligatorio: true,
    target: "area_terreno",
  },
  {
    codigo: "CAP-MMC-001",
    periodicidad: "anual",
    mesProgramado: 2,
    obligatorio: true,
    target: "area_terreno",
  },
  {
    codigo: "CAP-EME-001",
    periodicidad: "anual",
    mesProgramado: 3,
    obligatorio: true,
    target: "centro_principal",
  },
  {
    codigo: "CAP-EXT-001",
    periodicidad: "anual",
    mesProgramado: 3,
    obligatorio: true,
    target: "centro_principal",
  },
  {
    codigo: "CAP-PAU-001",
    periodicidad: "anual",
    mesProgramado: 4,
    obligatorio: false,
    target: "centro_principal",
  },
  {
    codigo: "CAP-RPS-001",
    periodicidad: "anual",
    mesProgramado: 6,
    obligatorio: false,
    target: "general",
  },
  {
    codigo: "CAP-OYA-001",
    periodicidad: "trimestral",
    mesProgramado: 1,
    obligatorio: true,
    target: "area_terreno",
  },
];

async function main() {
  await normalizarRequerimientosPlantillas();

  const capacitacionesSeed = await seedCapacitacionesBase();
  const planSeed = await seedPlanCapacitacionBase();

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
    `Capacitaciones base: ${capacitacionesSeed.creadas} creadas, ${capacitacionesSeed.actualizadas} actualizadas.`,
  );
  console.log(
    `Control documental trabajadores: ${workerSeed.tiposCreados} tipos creados, ${workerSeed.tiposActualizados} tipos actualizados, ${workerSeed.reglasCreadas} reglas creadas, ${workerSeed.reglasActualizadas} reglas actualizadas.`
  );
  console.log(
    `Plan de capacitacion: ${planSeed.reglasCreadas} reglas creadas, ${planSeed.reglasActualizadas} reglas actualizadas, ${planSeed.plantillasCreadas} plantillas creadas, ${planSeed.plantillasActualizadas} plantillas actualizadas, ${planSeed.itemsCreados} items creados, ${planSeed.itemsActualizados} items actualizados.`
  );
}

async function seedCapacitacionesBase() {
  const empresas = await prisma.empresa.findMany({
    select: { id: true },
  });

  if (empresas.length === 0) {
    console.log("Capacitaciones base: sin empresas, se omite seeding.");
    return { creadas: 0, actualizadas: 0 };
  }

  const counters = { creadas: 0, actualizadas: 0 };

  for (const empresa of empresas) {
    for (const cap of capacitacionesBase) {
      const existing = await prisma.capacitacion.findUnique({
        where: {
          empresaId_codigo: {
            empresaId: empresa.id,
            codigo: cap.codigo,
          },
        },
        select: { id: true },
      });

      await prisma.capacitacion.upsert({
        where: {
          empresaId_codigo: {
            empresaId: empresa.id,
            codigo: cap.codigo,
          },
        },
        create: {
          empresaId: empresa.id,
          ...cap,
          activa: true,
        },
        update: {
          nombre: cap.nombre,
          descripcion: cap.descripcion,
          categoria: cap.categoria,
          modalidad: cap.modalidad,
          duracionHoras: cap.duracionHoras,
          vigenciaMeses: cap.vigenciaMeses,
          requiereEvaluacion: cap.requiereEvaluacion,
          requiereFirma: cap.requiereFirma,
          generaCertificado: cap.generaCertificado,
          esObligatoria: cap.esObligatoria,
          activa: true,
        },
      });

      if (existing) counters.actualizadas += 1;
      else counters.creadas += 1;
    }
  }

  return counters;
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
        select: { id: true, nombre: true, esCritico: true, perfilSST: true, descripcion: true },
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
      "IRL_RIESGOS",
      "ODI_OBLIGACION_INFORMAR",
      "ENTREGA_EPP",
      "CAPACITACION_INICIAL",
      "EXAMEN_OCUPACIONAL"
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

    const cargoCriticoDocs = ["ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"];
    const cargosCriticos = cargos.filter((cargo) => {
      if (cargo.esCritico) return true;
      const source = `${cargo.nombre ?? ""} ${cargo.perfilSST ?? ""} ${cargo.descripcion ?? ""}`.toLowerCase();
      return /(ds44|riesgo|critico|altura|electr|maquinaria|conductor|operador|soldad|faena|obra)/i.test(source);
    });

    for (const cargo of cargosCriticos) {
      for (const code of cargoCriticoDocs) {
        const tipoDocumentoId = tipoIdsByCode.get(code);
        if (!tipoDocumentoId) continue;

        const res = await upsertWorkerDocumentRule({
          empresaId: empresa.id,
          tipoDocumentoId,
          cargoId: cargo.id,
          areaId: null,
          centroTrabajoId: null,
          tipoContrato: null,
          obligatorio: true,
          activo: true,
        });

        if (res === "created") counters.reglasCreadas += 1;
        else counters.reglasActualizadas += 1;
      }
    }
  }

  return counters;
}

async function seedPlanCapacitacionBase() {
  const empresas = await prisma.empresa.findMany({
    select: { id: true },
  });

  if (empresas.length === 0) {
    console.log("Plan de capacitacion: sin empresas, se omite seeding.");
    return {
      reglasCreadas: 0,
      reglasActualizadas: 0,
      plantillasCreadas: 0,
      plantillasActualizadas: 0,
      itemsCreados: 0,
      itemsActualizados: 0,
    };
  }

  const counters = {
    reglasCreadas: 0,
    reglasActualizadas: 0,
    plantillasCreadas: 0,
    plantillasActualizadas: 0,
    itemsCreados: 0,
    itemsActualizados: 0,
  };

  const capacitacionCodigos = planCapacitacionBase.map((item) => item.codigo);

  for (const empresa of empresas) {
    const [capacitaciones, cargos, areas, centros] = await Promise.all([
      prisma.capacitacion.findMany({
        where: {
          empresaId: empresa.id,
          codigo: { in: capacitacionCodigos },
        },
        select: { id: true, codigo: true },
      }),
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

    const capacitacionByCode = new Map(capacitaciones.map((cap) => [cap.codigo, cap]));
    const areaTerreno = areas.find((area) => /(produccion|operacion|instalacion|terreno|obra)/i.test(area.nombre));
    const centroPrincipal = centros[0] ?? null;

    const targetByKind = {
      general: { cargoId: null, areaId: null, centroTrabajoId: null },
      area_terreno: areaTerreno
        ? { cargoId: null, areaId: areaTerreno.id, centroTrabajoId: null }
        : { cargoId: null, areaId: null, centroTrabajoId: null },
      centro_principal: centroPrincipal
        ? { cargoId: null, areaId: null, centroTrabajoId: centroPrincipal.id }
        : { cargoId: null, areaId: null, centroTrabajoId: null },
    };

    for (const planItem of planCapacitacionBase) {
      const capacitacion = capacitacionByCode.get(planItem.codigo);
      if (!capacitacion) {
        continue;
      }

      const target = targetByKind[planItem.target] ?? targetByKind.general;

      const result = await upsertReglaCapacitacionCargo({
        empresaId: empresa.id,
        capacitacionId: capacitacion.id,
        cargoId: target.cargoId,
        areaId: target.areaId,
        centroTrabajoId: target.centroTrabajoId,
        tipoContrato: null,
        obligatorio: planItem.obligatorio,
        periodicidad: planItem.periodicidad,
        activo: true,
      });

      if (result === "created") counters.reglasCreadas += 1;
      else counters.reglasActualizadas += 1;
    }

    const plantillaResult = await upsertPlantillaPlanCapacitacion({
      empresaId: empresa.id,
      nombre: "Plan anual estándar SST",
      descripcion: "Plantilla base anual para el plan de capacitacion SST de la empresa.",
      tipoEmpresa: null,
      activa: true,
    });

    if (plantillaResult.status === "created") counters.plantillasCreadas += 1;
    else counters.plantillasActualizadas += 1;

    const plantilla = plantillaResult.record;
    const desiredItems = planCapacitacionBase
      .map((planItem) => {
        const capacitacion = capacitacionByCode.get(planItem.codigo);
        if (!capacitacion) return null;

        const target = targetByKind[planItem.target] ?? targetByKind.general;

        return {
          key: `${capacitacion.id}|${target.cargoId ?? ""}|${target.areaId ?? ""}|${target.centroTrabajoId ?? ""}|${planItem.periodicidad}|${planItem.mesProgramado ?? ""}`,
          data: {
            plantillaId: plantilla.id,
            capacitacionId: capacitacion.id,
            cargoId: target.cargoId,
            areaId: target.areaId,
            centroTrabajoId: target.centroTrabajoId,
            periodicidad: planItem.periodicidad,
            mesProgramado: planItem.mesProgramado,
            obligatorio: planItem.obligatorio,
            activo: true,
            observaciones: null,
          },
        };
      })
      .filter(Boolean);

    const existingItems = await prisma.plantillaPlanCapacitacionItem.findMany({
      where: { plantillaId: plantilla.id },
      select: {
        id: true,
        capacitacionId: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        periodicidad: true,
        mesProgramado: true,
      },
    });

    const existingByKey = new Map(
      existingItems.map((item) => [
        `${item.capacitacionId}|${item.cargoId ?? ""}|${item.areaId ?? ""}|${item.centroTrabajoId ?? ""}|${item.periodicidad}|${item.mesProgramado ?? ""}`,
        item,
      ]),
    );

    const desiredKeys = new Set(desiredItems.map((item) => item.key));

    for (const desired of desiredItems) {
      const existing = existingByKey.get(desired.key);

      if (existing) {
        await prisma.plantillaPlanCapacitacionItem.update({
          where: { id: existing.id },
          data: {
            obligatorio: desired.data.obligatorio,
            activo: desired.data.activo,
            observaciones: desired.data.observaciones,
            plantillaId: desired.data.plantillaId,
            capacitacionId: desired.data.capacitacionId,
            cargoId: desired.data.cargoId,
            areaId: desired.data.areaId,
            centroTrabajoId: desired.data.centroTrabajoId,
            periodicidad: desired.data.periodicidad,
            mesProgramado: desired.data.mesProgramado,
          },
        });
        counters.itemsActualizados += 1;
      } else {
        await prisma.plantillaPlanCapacitacionItem.create({
          data: desired.data,
        });
        counters.itemsCreados += 1;
      }
    }

    const itemsToDelete = existingItems.filter((item) => {
      const key = `${item.capacitacionId}|${item.cargoId ?? ""}|${item.areaId ?? ""}|${item.centroTrabajoId ?? ""}|${item.periodicidad}|${item.mesProgramado ?? ""}`;
      return !desiredKeys.has(key);
    });

    if (itemsToDelete.length > 0) {
      await prisma.plantillaPlanCapacitacionItem.deleteMany({
        where: { id: { in: itemsToDelete.map((item) => item.id) } },
      });
    }
  }

  return counters;
}

async function upsertReglaCapacitacionCargo(data) {
  const whereRule = {
    empresaId: data.empresaId,
    capacitacionId: data.capacitacionId,
    cargoId: data.cargoId,
    areaId: data.areaId,
    centroTrabajoId: data.centroTrabajoId,
    tipoContrato: data.tipoContrato,
  };

  const existing = await prisma.reglaCapacitacionCargo.findFirst({
    where: whereRule,
    select: { id: true },
  });

  if (!existing) {
    await prisma.reglaCapacitacionCargo.create({
      data,
    });
    return "created";
  }

  await prisma.reglaCapacitacionCargo.update({
    where: { id: existing.id },
    data: {
      obligatorio: data.obligatorio,
      periodicidad: data.periodicidad,
      activo: data.activo,
    },
  });
  return "updated";
}

async function upsertPlantillaPlanCapacitacion(data) {
  const existing = await prisma.plantillaPlanCapacitacion.findFirst({
    where: {
      empresaId: data.empresaId,
      nombre: data.nombre,
    },
    select: { id: true },
  });

  if (!existing) {
    const created = await prisma.plantillaPlanCapacitacion.create({
      data,
      select: { id: true },
    });
    return { status: "created", record: created };
  }

  const updated = await prisma.plantillaPlanCapacitacion.update({
    where: { id: existing.id },
    data: {
      descripcion: data.descripcion,
      tipoEmpresa: data.tipoEmpresa,
      activa: data.activa,
    },
    select: { id: true },
  });

  return { status: "updated", record: updated };
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
