#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MANDANTES_BASE = [
  { nombre: "Municipalidad de Ñuñoa", rut: "69.189.100-7", tipo: "municipalidad" },
  { nombre: "Constructora Altamira S.A.", rut: "76.801.234-5", tipo: "constructora" },
  { nombre: "Inmobiliaria Los Robles SpA", rut: "77.234.890-1", tipo: "privado" },
  { nombre: "Enel Distribución Chile", rut: "99.123.456-7", tipo: "empresa_electrica" },
  { nombre: "CGE Distribución", rut: "99.234.567-8", tipo: "empresa_electrica" },
];

const PLANTILLAS_BASE = [
  {
    nombre: "Municipalidades — Contrato de Obra",
    tipo: "municipal",
    descripcion: "Requisitos estandar para contratos con municipalidades de la RM.",
    origen: "nextprev",
    mandanteNombre: "Municipalidad de Ñuñoa",
    requisitos: [
      ["RUT Empresa", "empresa", "empresa", true, false, false, false],
      ["Escritura de Constitución Social", "empresa", "empresa", true, false, false, false],
      ["Certificado de Vigencia Empresa", "empresa", "empresa", true, false, true, false],
      ["Nómina de Trabajadores", "empresa", "empresa", true, false, false, false],
      ["Certificado Sin Deuda Tributaria (SII)", "empresa", "empresa", true, false, true, false],
      ["Cédula de Identidad (vigente)", "trabajador", "trabajador", true, false, true, false],
      ["Contrato de Trabajo", "trabajador", "trabajador", true, false, false, false],
      ["Liquidación de Remuneraciones (últimas 3)", "trabajador", "trabajador", true, true, false, false],
      ["Certificado de Afiliación AFP", "trabajador", "trabajador", true, false, true, false],
      ["Certificado ISAPRE / FONASA", "trabajador", "trabajador", true, false, true, false],
      ["ODI Firmada (Obligación de Informar)", "trabajador", "trabajador", true, false, false, false],
      ["Examen de Salud Ocupacional", "trabajador", "trabajador", false, false, true, false],
      ["Reglamento Interno RIOHS", "sst", "empresa", true, false, false, false],
      ["Certificado Mutual Vigente (ACHS/ISL)", "sst", "empresa", true, false, true, false],
      ["Seguro de Accidentes del Trabajo", "sst", "empresa", true, false, true, false],
    ],
  },
  {
    nombre: "Mandante General — Sector privado",
    tipo: "mandante_general",
    descripcion: "Requisitos genericos para contratos con empresas mandantes del sector privado.",
    origen: "nextprev",
    mandanteNombre: "Constructora Altamira S.A.",
    requisitos: [
      ["RUT Empresa", "empresa", "empresa", true, false, false, false],
      ["Nómina de Trabajadores", "empresa", "empresa", true, false, false, false],
      ["Cédula de Identidad (vigente)", "trabajador", "trabajador", true, false, true, false],
      ["Contrato de Trabajo", "trabajador", "trabajador", true, false, false, false],
      ["Certificado de Afiliación AFP", "trabajador", "trabajador", true, false, true, false],
      ["Certificado ISAPRE / FONASA", "trabajador", "trabajador", true, false, true, false],
      ["ODI Firmada", "trabajador", "trabajador", true, false, false, false],
      ["RIOHS Empresa", "sst", "empresa", true, false, false, false],
      ["Certificado Mutual Vigente", "sst", "empresa", true, false, true, false],
    ],
  },
  {
    nombre: "Enel — Empresa contratista eléctrica",
    tipo: "enel",
    descripcion: "Requisitos para empresas contratistas de distribuidoras electricas Enel.",
    origen: "nextprev",
    mandanteNombre: "Enel Distribución Chile",
    requisitos: [
      ["RUT Empresa", "empresa", "empresa", true, false, false, false],
      ["Nómina de Trabajadores (formato Enel)", "empresa", "empresa", true, false, false, false],
      ["Certificado Sin Deuda Tesorería", "empresa", "empresa", true, false, true, false],
      ["Certificado SENCE", "empresa", "empresa", false, false, false, false],
      ["Cédula de Identidad (vigente)", "trabajador", "trabajador", true, false, true, false],
      ["Contrato de Trabajo", "trabajador", "trabajador", true, false, false, false],
      ["Licencia Eléctrica SEC clase A o B", "trabajador", "trabajador", true, false, true, true],
      ["Certificado de Afiliación AFP", "trabajador", "trabajador", true, false, true, false],
      ["Registro Entrega EPP", "trabajador", "trabajador", true, false, false, false],
      ["Capacitación MAT (materiales peligrosos)", "trabajador", "trabajador", true, false, true, false],
      ["Licencia de conducir (clase B o sup.)", "trabajador", "trabajador", false, false, true, false],
      ["RIOHS Empresa", "sst", "empresa", true, false, false, false],
      ["Procedimiento Trabajo en Altura", "sst", "empresa", true, false, false, false],
      ["Certificado Mutual Vigente", "sst", "empresa", true, false, true, false],
      ["Revisión Técnica y Gases", "vehiculo", "vehiculo", true, false, true, false],
      ["SOAP Vigente", "vehiculo", "vehiculo", true, false, true, false],
      ["Permiso de Circulación", "vehiculo", "vehiculo", true, false, true, false],
    ],
  },
  {
    nombre: "CGE — Empresa contratista eléctrica",
    tipo: "cge",
    descripcion: "Requisitos para empresas contratistas de CGE Distribución.",
    origen: "nextprev",
    mandanteNombre: "CGE Distribución",
    requisitos: [
      ["RUT Empresa", "empresa", "empresa", true, false, false, false],
      ["Patente Comercial Vigente", "empresa", "empresa", true, false, true, false],
      ["Nómina de Trabajadores", "empresa", "empresa", true, false, false, false],
      ["Cédula de Identidad (vigente)", "trabajador", "trabajador", true, false, true, false],
      ["Licencia Eléctrica SEC", "trabajador", "trabajador", true, false, true, false],
      ["Contrato de Trabajo", "trabajador", "trabajador", true, false, false, false],
      ["Certificado AFP", "trabajador", "trabajador", true, false, true, false],
      ["Certificado Salud Previsional", "trabajador", "trabajador", true, false, true, false],
      ["RIOHS Empresa", "sst", "empresa", true, false, false, false],
      ["Certificado Mutual Vigente", "sst", "empresa", true, false, true, false],
      ["Revisión Técnica y Gases", "vehiculo", "vehiculo", true, false, true, false],
      ["SOAP Vigente", "vehiculo", "vehiculo", true, false, true, false],
    ],
  },
];

async function resolveEmpresa() {
  const byId = process.env.SEED_EMPRESA_ID;
  if (byId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: byId }, select: { id: true, nombre: true } });
    if (empresa) return empresa;
  }

  const firstEmpresa = await prisma.empresa.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, nombre: true } });
  if (!firstEmpresa) throw new Error("No existe una empresa para sembrar acreditaciones");
  return firstEmpresa;
}

async function main() {
  const empresa = await resolveEmpresa();
  console.log(`Seed acreditaciones en empresa: ${empresa.nombre} (${empresa.id})`);

  const mandantesByNombre = {};
  for (const m of MANDANTES_BASE) {
    const mandante = await prisma.mandanteAcreditacion.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: m.nombre } },
      create: { empresaId: empresa.id, ...m, activo: true },
      update: { rut: m.rut, tipo: m.tipo, activo: true },
    });
    mandantesByNombre[m.nombre] = mandante;
  }

  for (const base of PLANTILLAS_BASE) {
    const mandante = mandantesByNombre[base.mandanteNombre];
    const existing = await prisma.plantillaAcreditacion.findFirst({
      where: { empresaId: empresa.id, nombre: base.nombre },
      orderBy: { version: "desc" },
      select: { id: true, nombre: true },
    });

    const plantilla = existing
      ? await prisma.plantillaAcreditacion.update({
          where: { id: existing.id },
          data: {
            tipo: base.tipo,
            descripcion: base.descripcion,
            origen: base.origen,
            activa: true,
            mandanteId: mandante?.id,
          },
          select: { id: true, nombre: true },
        })
      : await prisma.plantillaAcreditacion.create({
          data: {
            empresaId: empresa.id,
            mandanteId: mandante?.id,
            nombre: base.nombre,
            tipo: base.tipo,
            descripcion: base.descripcion,
            origen: base.origen,
            activa: true,
            version: 1,
          },
          select: { id: true, nombre: true },
        });

    for (let i = 0; i < base.requisitos.length; i += 1) {
      const [nombreDocumento, categoria, aplicaA, obligatorio, permiteMultiples, requiereVencimiento, requiereRevisionManual] = base.requisitos[i];

      const existingReq = await prisma.requisitoPlantillaAcreditacion.findFirst({
        where: { plantillaId: plantilla.id, nombreDocumento, aplicaA },
        select: { id: true },
      });

      if (existingReq) {
        await prisma.requisitoPlantillaAcreditacion.update({
          where: { id: existingReq.id },
          data: {
            categoria,
            obligatorio,
            permiteMultiples,
            requiereVencimiento,
            requiereRevisionManual,
            orden: i + 1,
            activo: true,
          },
        });
      } else {
        await prisma.requisitoPlantillaAcreditacion.create({
          data: {
            plantillaId: plantilla.id,
            nombreDocumento,
            categoria,
            aplicaA,
            obligatorio,
            permiteMultiples,
            requiereVencimiento,
            requiereRevisionManual,
            orden: i + 1,
            activo: true,
          },
        });
      }
    }

    console.log(`Plantilla sincronizada: ${plantilla.nombre}`);
  }

  console.log("Seed acreditaciones completado");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
