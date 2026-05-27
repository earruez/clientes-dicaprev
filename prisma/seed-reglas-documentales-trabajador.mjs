import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no esta definida en .env");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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
    codigo: "ODI_OBLIGACION_INFORMAR",
    nombre: "ODI / obligacion de informar",
    descripcion: "Constancia de obligacion de informar riesgos laborales y medidas preventivas.",
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

async function upsertWorkerDocumentRule(data) {
  const existing = await prisma.reglaDocumentoTrabajador.findFirst({
    where: {
      empresaId: data.empresaId,
      tipoDocumentoId: data.tipoDocumentoId,
      cargoId: data.cargoId,
      areaId: data.areaId,
      centroTrabajoId: data.centroTrabajoId,
      tipoContrato: data.tipoContrato,
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.reglaDocumentoTrabajador.create({ data });
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

async function seedForEmpresa(empresaId) {
  const counters = {
    tiposCreados: 0,
    tiposActualizados: 0,
    reglasCreadas: 0,
    reglasActualizadas: 0,
  };

  const tipoIdsByCode = new Map();

  for (const tipoBase of workerDocumentTypesBase) {
    const existing = await prisma.documentoTipoTrabajador.findUnique({
      where: {
        empresaId_codigo: {
          empresaId,
          codigo: tipoBase.codigo,
        },
      },
      select: { id: true },
    });

    const saved = await prisma.documentoTipoTrabajador.upsert({
      where: {
        empresaId_codigo: {
          empresaId,
          codigo: tipoBase.codigo,
        },
      },
      create: {
        empresaId,
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
      where: { empresaId, estado: "activo" },
      select: { id: true, nombre: true, esCritico: true, perfilSST: true, descripcion: true },
    }),
    prisma.area.findMany({
      where: { empresaId, estado: "activa" },
      select: { id: true, nombre: true },
    }),
    prisma.centroTrabajo.findMany({
      where: { empresaId, estado: "activo" },
      select: { id: true, nombre: true },
    }),
  ]);

  const generalCodes = [
    "CONTRATO_TRABAJO",
    "CEDULA_IDENTIDAD",
    "REGLAMENTO_INTERNO_RECIBIDO",
    "ODI_OBLIGACION_INFORMAR",
    "IRL_RIESGOS",
    "ENTREGA_EPP",
    "CAPACITACION_INICIAL",
  ];

  for (const code of generalCodes) {
    const tipoDocumentoId = tipoIdsByCode.get(code);
    if (!tipoDocumentoId) continue;

    const res = await upsertWorkerDocumentRule({
      empresaId,
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
        empresaId,
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
      empresaId,
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
      empresaId,
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
        empresaId,
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

  return counters;
}

async function main() {
  const empresaArg = process.argv.find((arg) => arg.startsWith("--empresaId="));
  const empresaId = empresaArg ? empresaArg.split("=")[1] : null;

  const empresas = empresaId
    ? await prisma.empresa.findMany({ where: { id: empresaId }, select: { id: true } })
    : await prisma.empresa.findMany({ select: { id: true } });

  if (empresas.length === 0) {
    console.log("Reglas documentales trabajador: sin empresas, se omite.");
    return;
  }

  const total = {
    tiposCreados: 0,
    tiposActualizados: 0,
    reglasCreadas: 0,
    reglasActualizadas: 0,
  };

  for (const empresa of empresas) {
    const counters = await seedForEmpresa(empresa.id);
    total.tiposCreados += counters.tiposCreados;
    total.tiposActualizados += counters.tiposActualizados;
    total.reglasCreadas += counters.reglasCreadas;
    total.reglasActualizadas += counters.reglasActualizadas;
  }

  console.log(
    `Reglas documentales trabajador seed: ${total.tiposCreados} tipos creados, ${total.tiposActualizados} tipos actualizados, ${total.reglasCreadas} reglas creadas, ${total.reglasActualizadas} reglas actualizadas.`,
  );
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed de reglas documentales trabajador:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
