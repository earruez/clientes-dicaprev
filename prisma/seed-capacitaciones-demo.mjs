/**
 * seed-capacitaciones-demo.mjs
 *
 * Pobla el catálogo de capacitaciones y crea asignaciones demo para
 * empresas demo/preview. Idempotente: no duplica registros existentes.
 *
 * Uso:
 *   node prisma/seed-capacitaciones-demo.mjs
 *   node prisma/seed-capacitaciones-demo.mjs --empresa "Centros Comerciales SpA"
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL no está definida en .env");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ─── Catálogo base (espejo de CAPACITACIONES_CATALOGO_BASE en empresa-operativa.ts) ──
const CATALOGO_BASE = [
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

async function ensureCapacitacionesCatalogo(empresaId) {
  let creadas = 0;
  let actualizadas = 0;

  for (const cap of CATALOGO_BASE) {
    const existing = await prisma.capacitacion.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: cap.codigo } },
      select: { id: true },
    });

    await prisma.capacitacion.upsert({
      where: { empresaId_codigo: { empresaId, codigo: cap.codigo } },
      create: { empresaId, ...cap, activa: true },
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

    if (existing) actualizadas += 1;
    else creadas += 1;
  }

  return { creadas, actualizadas };
}

// ─── Asignaciones demo ───────────────────────────────────────────────────────

/**
 * Crea asignaciones demo para hasta maxTrabajadores trabajadores activos.
 * Distribución:
 *   - 3-4 trabajadores: múltiples pendientes
 *   - 2-3 trabajadores: en_progreso
 *   - 2-3 trabajadores: completadas/aprobadas (con generaCertificado para permitir descarga)
 *   - 1 trabajador: vencida
 */
async function seedAsignacionesDemo(empresaId) {
  const capacitaciones = await prisma.capacitacion.findMany({
    where: { empresaId, activa: true },
    orderBy: { codigo: "asc" },
    select: { id: true, codigo: true, nombre: true, generaCertificado: true },
  });

  if (capacitaciones.length === 0) {
    console.log("  → Sin capacitaciones disponibles para crear asignaciones.");
    return { creadas: 0, omitidas: 0 };
  }

  const trabajadores = await prisma.trabajador.findMany({
    where: { empresaId, estado: "activo" },
    orderBy: { createdAt: "asc" },
    take: 8,
    select: { id: true, nombres: true, apellidos: true },
  });

  if (trabajadores.length === 0) {
    console.log("  → Sin trabajadores activos para crear asignaciones.");
    return { creadas: 0, omitidas: 0 };
  }

  // Capacitaciones que generan certificado (para asignaciones aprobadas)
  const capConCertificado = capacitaciones.filter((c) => c.generaCertificado);
  // Capacitaciones sin certificado
  const capSinCertificado = capacitaciones.filter((c) => !c.generaCertificado);

  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const haceUnMes = new Date(hoy); haceUnMes.setMonth(hoy.getMonth() - 1);
  const haceDosMeses = new Date(hoy); haceDosMeses.setMonth(hoy.getMonth() - 2);
  const proxMes = new Date(hoy); proxMes.setMonth(hoy.getMonth() + 1);
  const proxAno = new Date(hoy); proxAno.setFullYear(hoy.getFullYear() + 1);
  const haceUnAnoMasDia = new Date(hoy); haceUnAnoMasDia.setFullYear(hoy.getFullYear() - 1); haceUnAnoMasDia.setDate(haceUnAnoMasDia.getDate() - 5);

  /** Planes: (trabajador index, capacitacion, estado, aprobado, fechaAsig, fechaInicio, fechaCompletada, fechaVencimiento, nota) */
  const planes = [];

  // ── Pendientes (trabajadores 0..3) ──────────────────────────────────────
  const pendientesCap = [
    capacitaciones[0],
    capacitaciones[1],
    capacitaciones[4 % capacitaciones.length],
  ].filter(Boolean);

  for (let i = 0; i < Math.min(4, trabajadores.length); i++) {
    for (const cap of pendientesCap) {
      planes.push({
        trabajadorIdx: i,
        capacitacionId: cap.id,
        estado: "pendiente",
        aprobado: null,
        nota: null,
        fechaAsignacion: haceUnMes,
        fechaVencimiento: proxMes,
      });
    }
  }

  // ── En progreso (trabajadores 1..2) ────────────────────────────────────
  if (trabajadores.length >= 2) {
    const enProgresoCap = [
      capacitaciones[2 % capacitaciones.length],
      capacitaciones[3 % capacitaciones.length],
    ].filter(Boolean);
    for (let i = 1; i < Math.min(3, trabajadores.length); i++) {
      for (const cap of enProgresoCap) {
        planes.push({
          trabajadorIdx: i,
          capacitacionId: cap.id,
          estado: "en_progreso",
          aprobado: null,
          nota: null,
          fechaAsignacion: haceDosMeses,
          fechaInicio: haceUnMes,
          fechaVencimiento: proxMes,
        });
      }
    }
  }

  // ── Completadas/aprobadas con certificado (trabajadores 0..2) ──────────
  for (let i = 0; i < Math.min(3, trabajadores.length); i++) {
    for (const cap of capConCertificado.slice(0, 2)) {
      planes.push({
        trabajadorIdx: i,
        capacitacionId: cap.id,
        estado: "completada",
        aprobado: true,
        nota: 6 + Math.round(Math.random() * 10) / 10,  // 6.0 - 7.0
        fechaAsignacion: haceDosMeses,
        fechaInicio: haceUnMes,
        fechaCompletada: ayer,
        fechaVencimiento: proxAno,
      });
    }
  }

  // ── Completada sin certificado (trabajador 3) ───────────────────────────
  if (trabajadores.length >= 4 && capSinCertificado.length > 0) {
    planes.push({
      trabajadorIdx: 3,
      capacitacionId: capSinCertificado[0].id,
      estado: "completada",
      aprobado: true,
      nota: null,
      fechaAsignacion: haceDosMeses,
      fechaInicio: haceUnMes,
      fechaCompletada: ayer,
      fechaVencimiento: proxAno,
    });
  }

  // ── Vencida (último trabajador disponible) ──────────────────────────────
  const vencidoIdx = Math.min(trabajadores.length - 1, 4);
  if (capConCertificado.length > 0) {
    planes.push({
      trabajadorIdx: vencidoIdx,
      capacitacionId: capConCertificado[0].id,
      estado: "vencida",
      aprobado: null,
      nota: null,
      fechaAsignacion: haceUnAnoMasDia,
      fechaVencimiento: haceDosMeses,
    });
  }

  // ── Crear asignaciones de forma idempotente ──────────────────────────────
  let creadas = 0;
  let omitidas = 0;

  for (const plan of planes) {
    const trabajador = trabajadores[plan.trabajadorIdx];
    if (!trabajador) continue;

    // Evitar duplicar: si ya existe una asignación no cancelada para este par
    const existing = await prisma.capacitacionAsignacion.findFirst({
      where: {
        empresaId,
        trabajadorId: trabajador.id,
        capacitacionId: plan.capacitacionId,
        estado: { not: "cancelada" },
      },
      select: { id: true },
    });

    if (existing) {
      omitidas += 1;
      continue;
    }

    await prisma.capacitacionAsignacion.create({
      data: {
        empresaId,
        trabajadorId: trabajador.id,
        capacitacionId: plan.capacitacionId,
        origen: "automatico",
        estado: plan.estado,
        aprobado: plan.aprobado,
        nota: plan.nota,
        fechaAsignacion: plan.fechaAsignacion,
        fechaInicio: plan.fechaInicio ?? null,
        fechaCompletada: plan.fechaCompletada ?? null,
        fechaVencimiento: plan.fechaVencimiento ?? null,
      },
    });

    creadas += 1;
  }

  return { creadas, omitidas };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const empresaNombreArg =
    args.find((a) => a.startsWith("--empresa="))?.split("=").slice(1).join("=") ??
    args[args.indexOf("--empresa") + 1] ??
    null;

  // Seleccionar empresas: si se pasó --empresa, usar solo esa; si no, usar la primera o búsqueda general
  let empresas;
  if (empresaNombreArg) {
    empresas = await prisma.empresa.findMany({
      where: { nombre: { contains: empresaNombreArg, mode: "insensitive" } },
      select: { id: true, nombre: true },
    });
  } else {
    // Por defecto: buscar empresa demo o primera empresa disponible
    empresas = await prisma.empresa.findMany({
      where: {
        OR: [
          { nombre: { contains: "Centros Comerciales", mode: "insensitive" } },
          { nombre: { contains: "Demo", mode: "insensitive" } },
        ],
      },
      select: { id: true, nombre: true },
      take: 3,
    });

    if (empresas.length === 0) {
      // Fallback: primera empresa activa
      empresas = await prisma.empresa.findMany({
        where: { activa: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, nombre: true },
      });
    }
  }

  if (empresas.length === 0) {
    console.error("No se encontraron empresas. Verifica la base de datos.");
    process.exit(1);
  }

  for (const empresa of empresas) {
    console.log(`\n── ${empresa.nombre} ──────────────────────────────────`);

    const catResult = await ensureCapacitacionesCatalogo(empresa.id);
    console.log(`  Catálogo: ${catResult.creadas} creadas, ${catResult.actualizadas} actualizadas.`);

    const asigResult = await seedAsignacionesDemo(empresa.id);
    console.log(`  Asignaciones demo: ${asigResult.creadas} creadas, ${asigResult.omitidas} omitidas (ya existían).`);
  }

  console.log("\n✓ Seed capacitaciones demo completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
