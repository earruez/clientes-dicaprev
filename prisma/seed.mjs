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

  console.log(`Seed completado: ${requiredDocs.length} documentos requeridos.`);
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
