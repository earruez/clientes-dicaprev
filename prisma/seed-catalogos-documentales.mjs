import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DOCUMENTOS_EMPRESA_BASE = [
  { codigo: "RUT_EMPRESA", nombre: "RUT Empresa", categoria: "empresa", requiereVencimiento: false },
  { codigo: "ESCRITURA_CONSTITUCION", nombre: "Escritura de Constitución Social", categoria: "empresa", requiereVencimiento: false },
  { codigo: "CERTIFICADO_VIGENCIA_EMPRESA", nombre: "Certificado Vigencia Empresa", categoria: "empresa", requiereVencimiento: true },
  { codigo: "PATENTE_COMERCIAL", nombre: "Patente Comercial Vigente", categoria: "empresa", requiereVencimiento: true },
  { codigo: "F30", nombre: "Certificado F30", categoria: "empresa", requiereVencimiento: true },
  { codigo: "F30_1", nombre: "Certificado F30-1", categoria: "empresa", requiereVencimiento: true },
  { codigo: "NOMINA_TRABAJADORES", nombre: "Nómina de Trabajadores", categoria: "empresa", requiereVencimiento: false },
  { codigo: "CERTIFICADO_MUTUAL", nombre: "Certificado Mutual", categoria: "empresa", requiereVencimiento: true },
  { codigo: "SEGURO_RESPONSABILIDAD_CIVIL", nombre: "Seguro responsabilidad civil", categoria: "empresa", requiereVencimiento: true },
  { codigo: "CONTRATO_ORDEN_COMPRA", nombre: "Contrato / Orden de Compra / Decreto de adjudicación", categoria: "empresa", requiereVencimiento: false },
  { codigo: "RIOHS", nombre: "RIOHS", categoria: "sst", requiereVencimiento: false },
  { codigo: "POLITICA_SST", nombre: "Política SST", categoria: "sst", requiereVencimiento: false },
  { codigo: "MATRIZ_IPER", nombre: "Matriz IPER / MIPER", categoria: "sst", requiereVencimiento: true },
  { codigo: "PLAN_EMERGENCIA", nombre: "Plan de Emergencia", categoria: "sst", requiereVencimiento: true },
  { codigo: "PROCEDIMIENTO_TRABAJO_SEGURO", nombre: "Procedimiento de Trabajo Seguro", categoria: "sst", requiereVencimiento: false },
  { codigo: "PROCEDIMIENTO_TRABAJO_ALTURA", nombre: "Procedimiento trabajo en altura", categoria: "sst", requiereVencimiento: false },
  { codigo: "PROCEDIMIENTO_ELECTRICO", nombre: "Procedimiento eléctrico", categoria: "sst", requiereVencimiento: false },
  { codigo: "PROCEDIMIENTO_BLOQUEO_ETIQUETADO", nombre: "Procedimiento bloqueo y etiquetado", categoria: "sst", requiereVencimiento: false },
  { codigo: "PROGRAMA_PREVENCION", nombre: "Programa de prevención", categoria: "sst", requiereVencimiento: true },
  { codigo: "ENTREGA_EPP_EMPRESA", nombre: "Registro entrega EPP empresa", categoria: "sst", requiereVencimiento: false },
];

const DOCUMENTOS_TRABAJADOR_BASE = [
  { codigo: "CEDULA_IDENTIDAD", nombre: "Cédula de identidad vigente", requiereVencimiento: true, vigenciaDias: 3650 },
  { codigo: "CONTRATO_TRABAJO", nombre: "Contrato de trabajo", requiereVencimiento: false, vigenciaDias: null },
  { codigo: "ANEXO_CONTRATO", nombre: "Anexo de contrato", requiereVencimiento: false, vigenciaDias: null },
  { codigo: "CERTIFICADO_AFP", nombre: "Certificado AFP", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "CERTIFICADO_SALUD", nombre: "Certificado Salud FONASA / ISAPRE", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "ODI_FIRMADA", nombre: "ODI firmada", requiereVencimiento: false, vigenciaDias: null },
  { codigo: "ENTREGA_EPP", nombre: "Registro entrega EPP", requiereVencimiento: false, vigenciaDias: null },
  { codigo: "CAPACITACION_INDUCCION", nombre: "Capacitación inducción", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "CAPACITACION_ALTURA", nombre: "Capacitación trabajo en altura", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "CAPACITACION_RIESGO_ELECTRICO", nombre: "Capacitación riesgo eléctrico", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "CAPACITACION_USO_EPP", nombre: "Capacitación uso EPP", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "LICENCIA_SEC", nombre: "Licencia SEC", requiereVencimiento: true, vigenciaDias: 1825 },
  { codigo: "LICENCIA_CONDUCIR", nombre: "Licencia de conducir", requiereVencimiento: true, vigenciaDias: 1825 },
  { codigo: "EXAMEN_OCUPACIONAL", nombre: "Examen ocupacional", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "EXAMEN_ALTURA", nombre: "Examen altura física", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "EXAMEN_ALTURA_GEOGRAFICA", nombre: "Examen altura geográfica", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "LIQUIDACION_SUELDO", nombre: "Liquidación de sueldo", requiereVencimiento: false, vigenciaDias: null },
  { codigo: "CERTIFICADO_ANTECEDENTES", nombre: "Certificado de antecedentes", requiereVencimiento: true, vigenciaDias: 365 },
];

const DOCUMENTOS_VEHICULO_BASE = [
  { codigo: "PERMISO_CIRCULACION", nombre: "Permiso de circulación", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "SOAP", nombre: "SOAP vigente", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "REVISION_TECNICA", nombre: "Revisión técnica", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "GASES", nombre: "Certificado de gases", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "PADRON", nombre: "Padrón del vehículo", requiereVencimiento: false, vigenciaDias: null },
  { codigo: "CHECKLIST_VEHICULO", nombre: "Check list vehículo", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "SEGURO_VEHICULO", nombre: "Seguro vehículo", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "CERTIFICADO_MANTENCION", nombre: "Certificado de mantención", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "AUTORIZACION_USO_VEHICULO", nombre: "Autorización uso vehículo", requiereVencimiento: false, vigenciaDias: null },
];

async function seedDocumentoRequeridoEmpresa() {
  let created = 0;
  let updated = 0;

  for (let i = 0; i < DOCUMENTOS_EMPRESA_BASE.length; i += 1) {
    const doc = DOCUMENTOS_EMPRESA_BASE[i];
    const existing = await prisma.documentoRequeridoEmpresa.findUnique({
      where: { nombre_categoria: { nombre: doc.nombre, categoria: doc.categoria } },
      select: { id: true },
    });

    await prisma.documentoRequeridoEmpresa.upsert({
      where: { nombre_categoria: { nombre: doc.nombre, categoria: doc.categoria } },
      create: {
        nombre: doc.nombre,
        categoria: doc.categoria,
        descripcion: `Catálogo base ${doc.codigo}`,
        obligatorio: true,
        requiereVencimiento: doc.requiereVencimiento,
        periodicidadMeses: doc.requiereVencimiento ? 12 : null,
        orden: i + 1,
        activo: true,
      },
      update: {
        descripcion: `Catálogo base ${doc.codigo}`,
        obligatorio: true,
        requiereVencimiento: doc.requiereVencimiento,
        periodicidadMeses: doc.requiereVencimiento ? 12 : null,
        orden: i + 1,
        activo: true,
      },
    });

    if (existing) updated += 1;
    else created += 1;
  }

  return { created, updated };
}

async function seedDocumentoTipoTrabajador() {
  const empresas = await prisma.empresa.findMany({ select: { id: true, nombre: true } });
  let created = 0;
  let updated = 0;

  for (const empresa of empresas) {
    for (const doc of DOCUMENTOS_TRABAJADOR_BASE) {
      const existing = await prisma.documentoTipoTrabajador.findUnique({
        where: { empresaId_codigo: { empresaId: empresa.id, codigo: doc.codigo } },
        select: { id: true },
      });

      await prisma.documentoTipoTrabajador.upsert({
        where: { empresaId_codigo: { empresaId: empresa.id, codigo: doc.codigo } },
        create: {
          empresaId: empresa.id,
          codigo: doc.codigo,
          nombre: doc.nombre,
          descripcion: `Catálogo base ${doc.codigo}`,
          vigenciaDias: doc.vigenciaDias,
          requiereVencimiento: doc.requiereVencimiento,
          requiereArchivo: true,
          activo: true,
        },
        update: {
          nombre: doc.nombre,
          descripcion: `Catálogo base ${doc.codigo}`,
          vigenciaDias: doc.vigenciaDias,
          requiereVencimiento: doc.requiereVencimiento,
          requiereArchivo: true,
          activo: true,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    }
  }

  return { created, updated, empresas: empresas.length };
}

async function seedDocumentoTipoVehiculo() {
  const empresas = await prisma.empresa.findMany({ select: { id: true } });
  let created = 0;
  let updated = 0;

  for (const empresa of empresas) {
    for (const doc of DOCUMENTOS_VEHICULO_BASE) {
      const existing = await prisma.documentoTipoVehiculo.findUnique({
        where: { empresaId_codigo: { empresaId: empresa.id, codigo: doc.codigo } },
        select: { id: true },
      });

      await prisma.documentoTipoVehiculo.upsert({
        where: { empresaId_codigo: { empresaId: empresa.id, codigo: doc.codigo } },
        create: {
          empresaId: empresa.id,
          codigo: doc.codigo,
          nombre: doc.nombre,
          descripcion: `Catálogo base ${doc.codigo}`,
          vigenciaDias: doc.vigenciaDias,
          requiereVencimiento: doc.requiereVencimiento,
          requiereArchivo: true,
          activo: true,
        },
        update: {
          nombre: doc.nombre,
          descripcion: `Catálogo base ${doc.codigo}`,
          vigenciaDias: doc.vigenciaDias,
          requiereVencimiento: doc.requiereVencimiento,
          requiereArchivo: true,
          activo: true,
        },
      });

      if (existing) updated += 1;
      else created += 1;
    }
  }

  return { created, updated, empresas: empresas.length };
}

async function main() {
  const empresaDocs = await seedDocumentoRequeridoEmpresa();
  const workerDocs = await seedDocumentoTipoTrabajador();
  const vehicleDocs = await seedDocumentoTipoVehiculo();

  console.log(`DocumentoRequeridoEmpresa: ${empresaDocs.created} creados, ${empresaDocs.updated} actualizados.`);
  console.log(
    `DocumentoTipoTrabajador: ${workerDocs.created} creados, ${workerDocs.updated} actualizados (${workerDocs.empresas} empresas).`,
  );
  console.log(
    `DocumentoTipoVehiculo: ${vehicleDocs.created} creados, ${vehicleDocs.updated} actualizados (${vehicleDocs.empresas} empresas).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
