/**
 * seed-acreditaciones.mjs
 * Crea mandantes y plantillas base idempotentes para acreditaciones.
 * Run: node prisma/seed-acreditaciones.mjs
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildCodigoDocumento(req) {
  const categoria = normalizeText(req.categoria || "general") || "general";
  const aplicaA = normalizeText(req.titularTipo || "empresa") || "empresa";
  const nombre = normalizeText(req.nombre || "documento") || "documento";
  return `${categoria}_${aplicaA}_${nombre}`;
}

function shouldMapEmpresa(req) {
  return req.titularTipo === "empresa" || req.categoria === "empresa" || req.categoria === "sst";
}

async function upsertPlantilla({ empresaId, mandanteId, nombre, descripcion, tipo, requisitos }) {
  const plantilla = await prisma.plantillaAcreditacion.upsert({
    where: { empresaId_nombre_version: { empresaId, nombre, version: 1 } },
    update: { descripcion, tipo, activa: true },
    create: {
      nombre,
      descripcion,
      tipo,
      origen: "nextprev",
      activa: true,
      version: 1,
      empresa: { connect: { id: empresaId } },
      mandante: { connect: { id: mandanteId } },
    },
    select: { id: true, nombre: true },
  });

  // Upsert requisitos por nombre+categoria
  const [catalogoEmpresa, catalogoTrabajador] = await Promise.all([
    prisma.documentoRequeridoEmpresa.findMany({
      select: { id: true, nombre: true, categoria: true },
    }),
    prisma.documentoTipoTrabajador.findMany({
      where: { empresaId, activo: true },
      select: { id: true, nombre: true, codigo: true },
    }),
  ]);

  for (let i = 0; i < requisitos.length; i++) {
    const req = requisitos[i];
    const codigoDocumento = req.codigoDocumento ?? buildCodigoDocumento(req);

    const matchDocumentoEmpresa = shouldMapEmpresa(req)
      ? catalogoEmpresa.find((doc) => {
          const sameName = normalizeText(doc.nombre) === normalizeText(req.nombre);
          const sameCategory = normalizeText(doc.categoria) === normalizeText(req.categoria)
            || normalizeText(req.categoria) === "sst";
          return sameName && sameCategory;
        })
      : null;

    const matchDocumentoTrabajador = req.titularTipo === "trabajador"
      ? catalogoTrabajador.find((doc) => {
          const byCode = normalizeText(doc.codigo) === normalizeText(codigoDocumento);
          const byName = normalizeText(doc.nombre) === normalizeText(req.nombre);
          return byCode || byName;
        })
      : null;

    const existing = await prisma.requisitoPlantillaAcreditacion.findFirst({
      where: { plantillaId: plantilla.id, nombreDocumento: req.nombre, categoria: req.categoria },
    });

    if (!existing) {
      await prisma.requisitoPlantillaAcreditacion.create({
        data: {
          plantillaId: plantilla.id,
          nombreDocumento: req.nombre,
          codigoDocumento,
          documentoRequeridoEmpresaId: matchDocumentoEmpresa?.id ?? null,
          documentoTipoTrabajadorId: matchDocumentoTrabajador?.id ?? null,
          categoria: req.categoria,
          aplicaA: req.titularTipo ?? "empresa",
          obligatorio: req.obligatorio ?? true,
          orden: i + 1,
          activo: true,
        },
      });
    } else {
      await prisma.requisitoPlantillaAcreditacion.update({
        where: { id: existing.id },
        data: {
          codigoDocumento,
          documentoRequeridoEmpresaId: matchDocumentoEmpresa?.id ?? null,
          documentoTipoTrabajadorId: matchDocumentoTrabajador?.id ?? null,
          aplicaA: req.titularTipo ?? "empresa",
          obligatorio: req.obligatorio ?? true,
          orden: i + 1,
          activo: true,
        },
      });
    }
  }

  return plantilla;
}

// ── Definición de plantillas ──────────────────────────────────────────────────

const PLANTILLAS = [
  {
    mandante: { nombre: "Municipalidad", rut: null, tipo: "municipal" },
    nombre: "Municipalidad — Contrato de obra / servicio",
    descripcion: "Plantilla para contratos de obra o servicio con municipalidades y organismos públicos.",
    tipo: "contrato_obra",
    requisitos: [
      // Empresa
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Escritura de Constitución Social", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado de Vigencia Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Patente Comercial Vigente", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Nómina de Trabajadores", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Contrato / Orden de Compra / Decreto de adjudicación", categoria: "empresa", titularTipo: "empresa" },
      // SST
      { nombre: "Reglamento Interno RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Certificado Mutual Vigente", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Matriz IPER / MIPER", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Plan de Emergencia", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento de Trabajo Seguro", categoria: "sst", titularTipo: "empresa" },
      // Trabajador
      { nombre: "Cédula de Identidad vigente", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato de Trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Certificado AFP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Certificado Salud FONASA / ISAPRE", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI firmada", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Registro entrega EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Liquidación de sueldo (si aplica)", categoria: "trabajador", titularTipo: "trabajador", obligatorio: false },
      // Vehículo
      { nombre: "Permiso de Circulación", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "SOAP", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Revisión Técnica", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Gases", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Licencia de conductor", categoria: "vehiculo", titularTipo: "vehiculo" },
    ],
  },
  {
    mandante: { nombre: "Enel", rut: null, tipo: "enel" },
    nombre: "Enel — Contratista eléctrico",
    descripcion: "Plantilla para contratistas eléctricos que trabajan bajo mandato Enel.",
    tipo: "contrato_servicio",
    requisitos: [
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Vigencia Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Nómina de trabajadores formato mandante", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Mutual", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Seguro responsabilidad civil (si aplica)", categoria: "empresa", titularTipo: "empresa", obligatorio: false },
      { nombre: "RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Matriz IPER", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento trabajo en altura", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento eléctrico", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento bloqueo y etiquetado LOTO", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Plan de emergencia", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Registro entrega EPP dieléctrico", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Cédula de identidad", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato de trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI firmada", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Licencia SEC (si aplica)", categoria: "trabajador", titularTipo: "trabajador", obligatorio: false },
      { nombre: "Capacitación riesgo eléctrico", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Capacitación trabajo en altura", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Examen ocupacional altura física (si aplica)", categoria: "trabajador", titularTipo: "trabajador", obligatorio: false },
      { nombre: "Entrega EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Permiso de circulación", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "SOAP", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Revisión técnica", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Check list vehículo", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Licencia conductor", categoria: "vehiculo", titularTipo: "vehiculo" },
    ],
  },
  {
    mandante: { nombre: "CGE / Eléctrica Regional", rut: null, tipo: "cge" },
    nombre: "CGE — Contratista eléctrico regional",
    descripcion: "Plantilla genérica para contratistas eléctricos bajo mandato de distribuidora regional (CGE, Saesa, etc.).",
    tipo: "contrato_servicio",
    requisitos: [
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Vigencia Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Nómina de trabajadores", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Mutual", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Seguro responsabilidad civil (si aplica)", categoria: "empresa", titularTipo: "empresa", obligatorio: false },
      { nombre: "RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Matriz IPER", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento trabajo en altura", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento eléctrico BT/MT", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento bloqueo y etiquetado", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Plan de emergencia", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Cédula de identidad", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato de trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI firmada", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Licencia SEC (si aplica)", categoria: "trabajador", titularTipo: "trabajador", obligatorio: false },
      { nombre: "Capacitación riesgo eléctrico", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Capacitación trabajo en altura", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Entrega EPP dieléctrico", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Permiso de circulación", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "SOAP", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Revisión técnica", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Check list vehículo", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Licencia conductor", categoria: "vehiculo", titularTipo: "vehiculo" },
    ],
  },
  {
    mandante: { nombre: "Constructora / Inmobiliaria", rut: null, tipo: "contratista" },
    nombre: "Constructora — Obra privada",
    descripcion: "Plantilla para subcontratistas en obra privada (constructoras, inmobiliarias).",
    tipo: "contrato_obra",
    requisitos: [
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado vigencia empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Nómina trabajadores", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Mutual", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Matriz IPER", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Plan emergencia", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento trabajo en altura", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento uso herramientas eléctricas", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento izaje (si aplica)", categoria: "sst", titularTipo: "empresa", obligatorio: false },
      { nombre: "Cédula identidad", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Entrega EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Examen altura física (si aplica)", categoria: "trabajador", titularTipo: "trabajador", obligatorio: false },
      { nombre: "Capacitación trabajo en altura", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Capacitación uso EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "SOAP", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Revisión técnica", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Permiso circulación", categoria: "vehiculo", titularTipo: "vehiculo" },
    ],
  },
  {
    mandante: { nombre: "Mandante Privado General", rut: null, tipo: "mandante_general" },
    nombre: "Mandante privado — Servicio en terreno",
    descripcion: "Plantilla liviana para servicios en terreno bajo mandante privado general.",
    tipo: "contrato_servicio",
    requisitos: [
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Nómina trabajadores", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Mutual", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Matriz IPER básica", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Cédula identidad", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI firmada", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Entrega EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "SOAP (si aplica)", categoria: "vehiculo", titularTipo: "vehiculo", obligatorio: false },
      { nombre: "Revisión técnica (si aplica)", categoria: "vehiculo", titularTipo: "vehiculo", obligatorio: false },
      { nombre: "Permiso circulación (si aplica)", categoria: "vehiculo", titularTipo: "vehiculo", obligatorio: false },
    ],
  },
  {
    mandante: { nombre: "Empresa Minera", rut: null, tipo: "mineria" },
    nombre: "Minería — Ingreso a faena",
    descripcion: "Plantilla para contratistas que ingresan a faenas mineras. Incluye requisitos de inducción, salud ocupacional y permisos.",
    tipo: "ingreso_faena",
    requisitos: [
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Escritura de Constitución Social", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Vigencia Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Mutual", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Seguro responsabilidad civil", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Matriz IPER / MIPER", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimientos críticos de trabajo", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Plan de emergencia", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Programa de prevención de riesgos", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Cédula identidad", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato de trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI firmada", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Entrega EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Examen pre-ocupacional", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Examen altura geográfica (si aplica)", categoria: "trabajador", titularTipo: "trabajador", obligatorio: false },
      { nombre: "Inducción faena", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Licencias habilitantes según tarea", categoria: "trabajador", titularTipo: "trabajador", obligatorio: false },
      { nombre: "Permiso circulación", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "SOAP", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Revisión técnica", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Check list vehículo", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Certificado revisión faena (si aplica)", categoria: "vehiculo", titularTipo: "vehiculo", obligatorio: false },
    ],
  },
  {
    mandante: { nombre: "Empresa Sanitaria", rut: null, tipo: "sanitaria" },
    nombre: "Sanitaria — Trabajos en red / planta",
    descripcion: "Plantilla para contratistas en obras de red o planta sanitaria. Incluye espacios confinados, químicos y excavaciones.",
    tipo: "contrato_obra",
    requisitos: [
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Vigencia Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Nómina trabajadores", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Mutual", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Seguro responsabilidad civil", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Matriz IPER", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento espacios confinados", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento manejo productos químicos", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento excavaciones y zanjas", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Plan de emergencia", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Permisos sanitarios / municipales si aplica", categoria: "empresa", titularTipo: "empresa", obligatorio: false },
      { nombre: "Cédula identidad", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato de trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI firmada", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Entrega EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Capacitación espacios confinados", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Examen pre-ocupacional", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Permiso circulación", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "SOAP", categoria: "vehiculo", titularTipo: "vehiculo" },
      { nombre: "Revisión técnica", categoria: "vehiculo", titularTipo: "vehiculo" },
    ],
  },
  {
    mandante: { nombre: "Retail / Centro Comercial", rut: null, tipo: "contratista" },
    nombre: "Retail — Trabajos menores y mantención",
    descripcion: "Plantilla para trabajos de mantención, remodelación o servicios menores en retail y centros comerciales.",
    tipo: "contrato_servicio",
    requisitos: [
      { nombre: "RUT Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Vigencia Empresa", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado F30-1", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Nómina trabajadores", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Certificado Mutual", categoria: "empresa", titularTipo: "empresa" },
      { nombre: "Seguro responsabilidad civil (si aplica)", categoria: "empresa", titularTipo: "empresa", obligatorio: false },
      { nombre: "RIOHS", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Procedimiento de trabajo específico", categoria: "sst", titularTipo: "empresa" },
      { nombre: "Cédula identidad", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Contrato trabajo", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "ODI firmada", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "Entrega EPP", categoria: "trabajador", titularTipo: "trabajador" },
      { nombre: "SOAP (si aplica)", categoria: "vehiculo", titularTipo: "vehiculo", obligatorio: false },
      { nombre: "Revisión técnica (si aplica)", categoria: "vehiculo", titularTipo: "vehiculo", obligatorio: false },
      { nombre: "Permiso circulación (si aplica)", categoria: "vehiculo", titularTipo: "vehiculo", obligatorio: false },
    ],
  },
];

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const empresa = await prisma.empresa.findFirst({ select: { id: true, nombre: true } });
  if (!empresa) {
    console.error("❌ No se encontró ninguna empresa. Ejecuta primero el seed principal.");
    process.exit(1);
  }
  console.log(`\n📦 Empresa: ${empresa.nombre} (${empresa.id})\n`);

  for (const def of PLANTILLAS) {
    // Upsert mandante
    const mandante = await prisma.mandanteAcreditacion.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: def.mandante.nombre } },
      update: { tipo: def.mandante.tipo, activo: true },
      create: {
        nombre: def.mandante.nombre,
        rut: def.mandante.rut ?? "00.000.000-0",
        tipo: def.mandante.tipo,
        activo: true,
        empresa: { connect: { id: empresa.id } },
      },
      select: { id: true, nombre: true },
    });

    const plantilla = await upsertPlantilla({
      empresaId: empresa.id,
      mandanteId: mandante.id,
      nombre: def.nombre,
      descripcion: def.descripcion,
      tipo: def.tipo,
      requisitos: def.requisitos,
    });

    const nReq = def.requisitos.length;
    console.log(`  ✓ ${def.mandante.nombre} → "${plantilla.nombre}" (${nReq} requisitos)`);
  }

  console.log("\n✅ Seed de acreditaciones completado.\n");
}

main()
