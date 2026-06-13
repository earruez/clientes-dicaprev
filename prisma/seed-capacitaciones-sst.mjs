import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL no esta definida en .env");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Catálogo base de capacitaciones SST obligatorias según normativa chilena */
const CATALOGO_SST = [
  {
    codigo: "CAP-SST-001",
    nombre: "Inducción en Prevención de Riesgos",
    descripcion: "Inducción obligatoria al sistema de gestión de SST: riesgos generales, medidas preventivas, derechos y deberes.",
    categoria: "induccion",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-002",
    nombre: "Obligación de Informar (ODI) – Riesgos del Puesto de Trabajo",
    descripcion: "Información sobre riesgos específicos del puesto, agentes físicos/químicos/biológicos y medidas de control.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-003",
    nombre: "Uso Correcto de Equipos de Protección Personal (EPP)",
    descripcion: "Selección, uso, mantenimiento y limitaciones de EPP asignados. Verificación práctica de colocación.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-004",
    nombre: "Plan de Emergencia y Evacuación",
    descripcion: "Procedimientos de emergencia, rutas de evacuación, puntos de encuentro y uso de extintores.",
    categoria: "emergencia",
    modalidad: "presencial",
    duracionHoras: 3,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-005",
    nombre: "Primeros Auxilios Básicos",
    descripcion: "RCP básico, manejo de heridas, quemaduras, fracturas e intoxicaciones. Uso del botiquín y DEA.",
    categoria: "primeros_auxilios",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 24,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-006",
    nombre: "Ley Karin – Prevención del Acoso Laboral y Sexual",
    descripcion: "Marco legal Ley 21.643, protocolos de denuncia y prevención del acoso laboral, sexual y violencia.",
    categoria: "ley_karin",
    modalidad: "virtual",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: { todosTrabajadores: true },
  },
  {
    codigo: "CAP-SST-008",
    nombre: "Reglamento Interno de Orden, Higiene y Seguridad",
    descripcion: "Difusión del Reglamento Interno. Obligaciones, derechos y normas de higiene.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 1,
    vigenciaMeses: 24,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: { todosTrabajadores: true, cantidadMinTrabajadores: 10 },
  },
  {
    codigo: "CAP-SST-007",
    nombre: "Radiación UV – Protección Solar en el Trabajo",
    descripcion: "Riesgos de exposición UV, protector solar, ropa protectora y medidas de control ambiental.",
    categoria: "salud_ocupacional",
    modalidad: "e-learning",
    duracionHoras: 1,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: {
      areaKeywords: ["campo", "exterior", "construcción", "obras", "minería", "mina", "terreno", "forestal"],
      cargoKeywords: ["conductor", "chofer", "operador", "inspector", "supervisor de terreno", "técnico campo"],
    },
  },
  {
    codigo: "CAP-SST-009",
    nombre: "Prevención y Combate de Incendios",
    descripcion: "Clases de fuego, uso de extintores, activación de alarmas y coordinación con bomberos.",
    categoria: "incendio",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      areaKeywords: ["bodega", "almacén", "producción", "planta", "manufactura", "cocina", "combustible"],
      cargoKeywords: ["bodeguero", "operador", "supervisor", "jefe de bodega", "maestro", "soldador"],
    },
  },
  {
    codigo: "CAP-SST-010",
    nombre: "Trabajos en Altura Física (>1,8 m)",
    descripcion: "Riesgos de caída, detención de caídas, arnés y anclajes, acceso y descenso seguro.",
    categoria: "altura",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["altura", "andamio", "grúa", "gruero", "techumbre", "techador", "pintor", "electricista", "instalador", "montador", "carpintero"],
      areaKeywords: ["construcción", "obras", "montaje", "instalaciones"],
    },
  },
  {
    codigo: "CAP-SST-011",
    nombre: "Seguridad en Trabajos Eléctricos",
    descripcion: "Riesgos eléctricos, bloqueo LOTO, distancias de seguridad, EPP eléctrico y primeros auxilios.",
    categoria: "electrico",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["electricista", "técnico eléctrico", "electromecánico", "liniero", "instalador eléctrico"],
      areaKeywords: ["eléctrica", "mantenimiento eléctrico", "sala de máquinas"],
    },
  },
  {
    codigo: "CAP-SST-012",
    nombre: "Manejo Seguro de Sustancias Peligrosas (HSDS / Derecho a Saber)",
    descripcion: "Sistema GHS/SGA, lectura de HDS, almacenamiento, derrame y eliminación de residuos peligrosos.",
    categoria: "quimico",
    modalidad: "presencial",
    duracionHoras: 6,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["químico", "laboratorista", "operador de planta", "proceso", "maestro", "técnico"],
      areaKeywords: ["laboratorio", "planta química", "bodega de productos", "producción", "manufactura", "minería"],
    },
  },
  {
    codigo: "CAP-SST-013",
    nombre: "Manejo Manual de Cargas (MMC)",
    descripcion: "Técnicas de levantamiento seguro, límites legales (23 kg hombres / 20 kg mujeres), pausas activas.",
    categoria: "manejo_cargas",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["bodeguero", "operador", "reponedor", "estibador", "cargador", "despachador", "conductor", "mecánico", "maestro"],
      areaKeywords: ["bodega", "producción", "manufactura", "logística", "distribución", "almacén"],
    },
  },
  {
    codigo: "CAP-SST-014",
    nombre: "Prevención de Trastornos Músculo-Esqueléticos (TMERT)",
    descripcion: "Factores de riesgo ergonómico, movimientos repetitivos, posturas forzadas y medidas preventivas.",
    categoria: "ergonomia",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["digitador", "cajero", "operador de línea", "envasador", "reponedor", "costurero", "montador"],
      areaKeywords: ["producción", "manufactura", "envasado", "atención al cliente", "call center", "informática"],
    },
  },
  {
    codigo: "CAP-SST-015",
    nombre: "Manejo Defensivo y Seguridad Vial",
    descripcion: "Conducción preventiva, fatiga al volante, normas de tránsito laboral, revisión pre-operacional.",
    categoria: "conduccion",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["conductor", "chofer", "transportista", "repartidor", "mensajero", "maquinista", "gruero"],
    },
  },
  {
    codigo: "CAP-SST-016",
    nombre: "Política de Alcohol y Drogas en el Trabajo",
    descripcion: "Efectos del alcohol/drogas, política de la empresa, consecuencias legales y apoyo de salud.",
    categoria: "salud_ocupacional",
    modalidad: "e-learning",
    duracionHoras: 1,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["conductor", "chofer", "operador", "maquinista", "gruero", "minero"],
      areaKeywords: ["transporte", "producción", "mina", "construcción", "planta"],
    },
  },
  {
    codigo: "CAP-SST-017",
    nombre: "Prevención de Pérdida Auditiva por Ruido (PREXOR)",
    descripcion: "Efectos del ruido, protección auditiva, límites de exposición (85 dB) y audiometría periódica.",
    categoria: "ruido",
    modalidad: "presencial",
    duracionHoras: 3,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["operador", "mecánico", "soldador", "carpintero", "maestro", "perforador", "tronador", "maquinista"],
      areaKeywords: ["producción", "manufactura", "planta", "taller", "mina", "construcción", "bodega"],
    },
  },
  {
    codigo: "CAP-SST-018",
    nombre: "Prevención de Silicosis (PLANESI)",
    descripcion: "Riesgos de exposición a sílice cristalina, medidas de control, EPP respiratorio y vigilancia.",
    categoria: "silice",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["perforador", "tronador", "minero", "cantero", "albañil", "picapedrero"],
      areaKeywords: ["mina", "cantera", "túnel", "construcción subterránea", "perforación"],
    },
  },
  {
    codigo: "CAP-SST-019",
    nombre: "Formación Comité Paritario de Higiene y Seguridad (CPHS)",
    descripcion: "Funciones del CPHS, investigación de accidentes y planificación de actividades preventivas.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 16,
    vigenciaMeses: 36,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["prevencionista", "experto en prevención", "delegado seguridad"],
      cantidadMinTrabajadores: 25,
    },
  },
  {
    codigo: "CAP-SST-020",
    nombre: "Trabajo Seguro en Espacios Confinados",
    descripcion: "Identificación de espacios confinados, evaluación atmosférica, entrada/rescate y comunicación.",
    categoria: "prevencion_riesgos",
    modalidad: "presencial",
    duracionHoras: 8,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
    regla: {
      cargoKeywords: ["plomero", "gasfíter", "minero de interior", "operador de cámara", "operador de cisterna"],
      areaKeywords: ["mina", "subterráneo", "cámara frigorífica", "cisterna", "alcantarillado"],
    },
  },
  {
    codigo: "CAP-SST-021",
    nombre: "Precauciones Estándar y Control de Infecciones",
    descripcion: "Riesgo biológico, lavado de manos, EPP clínico, manejo de residuos hospitalarios y accidente cortopunzante.",
    categoria: "covid_biologico",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
    regla: {
      areaKeywords: ["urgencias", "pabellón", "hospitalización", "laboratorio", "clínico", "dental", "salud"],
      cargoKeywords: ["médico", "enfermero", "técnico en enfermería", "tens", "auxiliar de enfermería", "pabellonero", "paramédico", "tecnólogo médico"],
    },
  },
];

function matchesKeywords(name, keywords) {
  if (!keywords || keywords.length === 0) return false;
  const lower = name.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

async function seedEmpresa(empresa) {
  const cantidad = empresa.cantidadTrabajadores ?? 0;
  console.log(`\n  Empresa: ${empresa.nombre} (${cantidad} trabajadores)`);

  const cargos = await prisma.cargo.findMany({
    where: { empresaId: empresa.id },
    select: { id: true, nombre: true, areaId: true },
  });

  const areas = await prisma.area.findMany({
    where: { empresaId: empresa.id },
    select: { id: true, nombre: true },
  });

  let totalReglas = 0;

  for (const def of CATALOGO_SST) {
    if (def.regla.cantidadMinTrabajadores && cantidad < def.regla.cantidadMinTrabajadores) {
      continue;
    }

    const cap = await prisma.capacitacion.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: def.codigo } },
      update: {
        nombre: def.nombre,
        descripcion: def.descripcion,
        categoria: def.categoria,
        modalidad: def.modalidad,
        duracionHoras: def.duracionHoras,
        vigenciaMeses: def.vigenciaMeses,
        requiereEvaluacion: def.requiereEvaluacion,
        requiereFirma: def.requiereFirma,
        generaCertificado: def.generaCertificado,
        esObligatoria: def.esObligatoria,
        activa: true,
      },
      create: {
        empresaId: empresa.id,
        codigo: def.codigo,
        nombre: def.nombre,
        descripcion: def.descripcion,
        categoria: def.categoria,
        modalidad: def.modalidad,
        duracionHoras: def.duracionHoras,
        vigenciaMeses: def.vigenciaMeses,
        requiereEvaluacion: def.requiereEvaluacion,
        requiereFirma: def.requiereFirma,
        generaCertificado: def.generaCertificado,
        esObligatoria: def.esObligatoria,
        activa: true,
      },
    });

    const regla = def.regla;

    if (regla.todosTrabajadores) {
      // Una sola regla empresa-nivel sin cargo/área específica
      await prisma.reglaCapacitacionCargo.create({
        data: {
          empresaId: empresa.id,
          capacitacionId: cap.id,
          cargoId: null,
          areaId: null,
          obligatorio: true,
          periodicidad: def.vigenciaMeses > 0 ? "anual" : "unica",
          activo: true,
        },
      });
      totalReglas++;
      continue;
    }

    // Cargos que coinciden por nombre
    const cargosMatchCargo = regla.cargoKeywords
      ? cargos.filter((c) => matchesKeywords(c.nombre, regla.cargoKeywords))
      : [];

    // Cargos que pertenecen a áreas que coinciden
    const areasMatch = regla.areaKeywords
      ? areas.filter((a) => matchesKeywords(a.nombre, regla.areaKeywords))
      : [];
    const areaIds = new Set(areasMatch.map((a) => a.id));
    const cargosMatchArea = cargos.filter((c) => c.areaId && areaIds.has(c.areaId));

    const cargoIds = new Set([
      ...cargosMatchCargo.map((c) => c.id),
      ...cargosMatchArea.map((c) => c.id),
    ]);

    if (cargoIds.size === 0) continue;

    for (const cargoId of cargoIds) {
      await prisma.reglaCapacitacionCargo.create({
        data: {
          empresaId: empresa.id,
          capacitacionId: cap.id,
          cargoId,
          areaId: null,
          obligatorio: true,
          periodicidad: def.vigenciaMeses > 0 ? "anual" : "unica",
          activo: true,
        },
      });
      totalReglas++;
    }
  }

  console.log(`    → ${totalReglas} reglas de capacitación creadas`);
}

async function main() {
  console.log("Seeding capacitaciones SST obligatorias...\n");

  const empresas = await prisma.empresa.findMany({
    select: { id: true, nombre: true, cantidadTrabajadores: true },
  });

  if (empresas.length === 0) {
    console.log("No hay empresas. Ejecuta el seed principal primero.");
    return;
  }

  // Limpiar reglas existentes de tipo SST para re-seedear limpio
  const codigosSST = CATALOGO_SST.map((c) => c.codigo);
  const capsSST = await prisma.capacitacion.findMany({
    where: { codigo: { in: codigosSST } },
    select: { id: true },
  });
  const capIds = capsSST.map((c) => c.id);
  if (capIds.length > 0) {
    await prisma.reglaCapacitacionCargo.deleteMany({
      where: { capacitacionId: { in: capIds } },
    });
    console.log(`  Limpiadas ${capIds.length} capacitaciones SST previas.`);
  }

  for (const empresa of empresas) {
    await seedEmpresa(empresa);
  }

  console.log("\n✓ Seed capacitaciones SST completado.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
