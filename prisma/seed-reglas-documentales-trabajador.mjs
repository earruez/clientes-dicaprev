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
  {
    codigo: "PREXOR_AUDIOMETRIA",
    nombre: "Evaluacion PREXOR / Audiometria",
    descripcion: "Evaluacion audiometrica requerida para trabajadores expuestos a ruido igual o mayor a 85 dB.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 365,
    activo: true,
  },
  {
    codigo: "PLANESI_SILICOSIS",
    nombre: "Evaluacion PLANESI / Silicosis",
    descripcion: "Evaluacion de salud requerida para trabajadores expuestos a silice cristalina.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 365,
    activo: true,
  },
  {
    codigo: "TMERT_EVALUACION",
    nombre: "Evaluacion TMERT",
    descripcion: "Evaluacion de trastornos musculoesqueleticos por movimientos repetitivos y riesgo ergonomico.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 730,
    activo: true,
  },
  {
    codigo: "DJ_ALCOHOL_DROGAS",
    nombre: "Declaracion Jurada Alcohol y Drogas",
    descripcion: "Declaracion jurada de abstinencia de alcohol y drogas, requerida para conductores, operadores y trabajos en altura.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 365,
    activo: true,
  },
  {
    codigo: "CONSTANCIA_CAPACITACION",
    nombre: "Constancia de Capacitacion",
    descripcion: "Registro de constancia de capacitacion segun programa anual de la empresa.",
    requiereArchivo: true,
    requiereVencimiento: true,
    vigenciaDias: 365,
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

// Detect if a cargo is critical based on name / perfilSST / descripcion keywords (DS44 high-risk roles)
function esCargoCritico(cargo) {
  if (cargo.esCritico) return true;
  const source = `${cargo.nombre ?? ""} ${cargo.perfilSST ?? ""} ${cargo.descripcion ?? ""}`.toLowerCase();
  return /(altura|electr|maquinaria|conductor|chofer|operador|soldad|faena|obra|minero|perforador|tronador|confinado|andamio|gruero|maquinista|izaje|explosiv|izadora)/i.test(
    source,
  );
}

async function seedForEmpresa(empresaId) {
  const counters = {
    tiposCreados: 0,
    tiposActualizados: 0,
    reglasCreadas: 0,
    reglasActualizadas: 0,
  };

  // Fetch empresa to get cantidadTrabajadores for DS44-based thresholds
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { id: true, cantidadTrabajadores: true },
  });

  const cantidadTrabajadores = empresa?.cantidadTrabajadores ?? 1;

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

  const [cargos, areas] = await Promise.all([
    prisma.cargo.findMany({
      where: { empresaId, estado: "activo" },
      select: { id: true, nombre: true, areaId: true, esCritico: true, perfilSST: true, descripcion: true },
    }),
    prisma.area.findMany({
      where: { empresaId, estado: "activa" },
      select: { id: true, nombre: true },
    }),
  ]);

  // Build a quick lookup of areaId -> area name
  const areaNameById = new Map(areas.map((a) => [a.id, a.nombre]));

  // ── DS44 threshold ≥1: always-required general codes ──────────────────── //
  const generalCodes = [
    "CONTRATO_TRABAJO",
    "CEDULA_IDENTIDAD",
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

  // ── DS44 threshold ≥10: Reglamento Interno obligatorio (DS44 art. 67) ─── //
  if (cantidadTrabajadores >= 10) {
    const reglamentoTipoId = tipoIdsByCode.get("REGLAMENTO_INTERNO_RECIBIDO");
    if (reglamentoTipoId) {
      const res = await upsertWorkerDocumentRule({
        empresaId,
        tipoDocumentoId: reglamentoTipoId,
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
  }

  // ── LICENCIA_HABILITANTE: apply to ALL cargos requiring license ────────── //
  const licenciaTipoId = tipoIdsByCode.get("LICENCIA_HABILITANTE");
  if (licenciaTipoId) {
    const cargosLicenciables = cargos.filter((cargo) =>
      /(conductor|chofer|operador|maquinaria|camion|vehiculo)/i.test(cargo.nombre),
    );

    for (const cargoLicenciable of cargosLicenciables) {
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

  // ── ENTREGA_EPP: also per area (operational/field areas) ──────────────── //
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

  // ── EXAMEN_OCUPACIONAL: per critical cargos (not per centro de trabajo) ── //
  const examenTipoId = tipoIdsByCode.get("EXAMEN_OCUPACIONAL");
  if (examenTipoId) {
    const cargosCriticos = cargos.filter(esCargoCritico);

    for (const cargo of cargosCriticos) {
      const res = await upsertWorkerDocumentRule({
        empresaId,
        tipoDocumentoId: examenTipoId,
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

  // ── Critical cargo docs (EPP + Capacitacion + Examen) ────────────────── //
  const cargoCriticoDocs = ["ENTREGA_EPP", "CAPACITACION_INICIAL", "EXAMEN_OCUPACIONAL"];
  const cargosCriticos = cargos.filter(esCargoCritico);

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

  // ── PREXOR_AUDIOMETRIA: noise-exposed cargos ──────────────────────────── //
  const prexorTipoId = tipoIdsByCode.get("PREXOR_AUDIOMETRIA");
  if (prexorTipoId) {
    const cargosProxor = cargos.filter((cargo) => {
      const areaNombre = (areaNameById.get(cargo.areaId) ?? "").toLowerCase();
      const cargoNombre = cargo.nombre.toLowerCase();
      const areaMatch = /(produccion|manufactura|planta|bodega|construccion|operaciones)/i.test(areaNombre);
      const cargoMatch = /(operador|mecanico|soldador|carpintero|maestro)/i.test(cargoNombre);
      return areaMatch || cargoMatch;
    });

    for (const cargo of cargosProxor) {
      const res = await upsertWorkerDocumentRule({
        empresaId,
        tipoDocumentoId: prexorTipoId,
        cargoId: cargo.id,
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

  // ── PLANESI_SILICOSIS: silica-exposed cargos ──────────────────────────── //
  const planesiTipoId = tipoIdsByCode.get("PLANESI_SILICOSIS");
  if (planesiTipoId) {
    const cargosPlanes = cargos.filter((cargo) => {
      const areaNombre = (areaNameById.get(cargo.areaId) ?? "").toLowerCase();
      const cargoNombre = cargo.nombre.toLowerCase();
      const areaMatch = /(construccion|mina|tunel|cantera)/i.test(areaNombre);
      const cargoMatch = /(perforador|tronador|minero)/i.test(cargoNombre);
      return areaMatch || cargoMatch;
    });

    for (const cargo of cargosPlanes) {
      const res = await upsertWorkerDocumentRule({
        empresaId,
        tipoDocumentoId: planesiTipoId,
        cargoId: cargo.id,
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

  // ── TMERT_EVALUACION: repetitive movement / ergonomic risk cargos ─────── //
  const tmertTipoId = tipoIdsByCode.get("TMERT_EVALUACION");
  if (tmertTipoId) {
    const cargosTmert = cargos.filter((cargo) => {
      const areaNombre = (areaNameById.get(cargo.areaId) ?? "").toLowerCase();
      const cargoNombre = cargo.nombre.toLowerCase();
      const areaMatch = /(produccion|manufactura|envasado|bodega|logistica|atencion)/i.test(areaNombre);
      const cargoMatch = /(digitador|cajero|operador de linea|envasador|reponedor)/i.test(cargoNombre);
      return areaMatch || cargoMatch;
    });

    for (const cargo of cargosTmert) {
      const res = await upsertWorkerDocumentRule({
        empresaId,
        tipoDocumentoId: tmertTipoId,
        cargoId: cargo.id,
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

  // ── DJ_ALCOHOL_DROGAS: high-risk / driving / height cargos ───────────── //
  const djTipoId = tipoIdsByCode.get("DJ_ALCOHOL_DROGAS");
  if (djTipoId) {
    const cargosDJ = cargos.filter((cargo) =>
      /(conductor|chofer|operador|maquinista|altura|andamio|gruero)/i.test(cargo.nombre),
    );

    for (const cargo of cargosDJ) {
      const res = await upsertWorkerDocumentRule({
        empresaId,
        tipoDocumentoId: djTipoId,
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

  // ── CONSTANCIA_CAPACITACION: applies to ALL workers (empresa-wide rule) ─ //
  const constanciaTipoId = tipoIdsByCode.get("CONSTANCIA_CAPACITACION");
  if (constanciaTipoId) {
    const res = await upsertWorkerDocumentRule({
      empresaId,
      tipoDocumentoId: constanciaTipoId,
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
