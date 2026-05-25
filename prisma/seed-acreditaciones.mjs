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

const CATALOGO_EMPRESA = [
  { code: "RUT_EMPRESA", categoria: "empresa", aliases: ["rut_empresa", "rut empresa"] },
  { code: "ESCRITURA_CONSTITUCION", categoria: "empresa", aliases: ["escritura_de_constitucion_social", "escritura constitucion"] },
  { code: "CERTIFICADO_VIGENCIA_EMPRESA", categoria: "empresa", aliases: ["certificado_vigencia_empresa", "certificado de vigencia empresa", "certificado vigencia empresa"] },
  { code: "PATENTE_COMERCIAL", categoria: "empresa", aliases: ["patente_comercial_vigente", "patente comercial"] },
  { code: "F30", categoria: "empresa", aliases: ["certificado_f30", "f30"] },
  { code: "F30_1", categoria: "empresa", aliases: ["certificado_f30_1", "certificado_f30_1", "f30_1", "f30-1"] },
  { code: "NOMINA_TRABAJADORES", categoria: "empresa", aliases: ["nomina_de_trabajadores", "nomina trabajadores", "nomina de trabajadores"] },
  { code: "CERTIFICADO_MUTUAL", categoria: "empresa", aliases: ["certificado_mutual", "certificado mutual", "certificado_mutual_vigente"] },
  { code: "SEGURO_RESPONSABILIDAD_CIVIL", categoria: "empresa", aliases: ["seguro_responsabilidad_civil", "seguro responsabilidad civil"] },
  { code: "CONTRATO_ORDEN_COMPRA", categoria: "empresa", aliases: ["contrato_orden_compra", "orden_de_compra", "decreto_de_adjudicacion"] },
  { code: "RIOHS", categoria: "sst", aliases: ["riohs", "reglamento_interno_riohs", "reglamento_interno_de_higiene_y_seguridad"] },
  { code: "POLITICA_SST", categoria: "sst", aliases: ["politica_sst", "politica de sst"] },
  { code: "MATRIZ_IPER", categoria: "sst", aliases: ["matriz_iper", "miper", "matriz iper"] },
  { code: "PLAN_EMERGENCIA", categoria: "sst", aliases: ["plan_de_emergencia", "plan emergencia", "plan de emergencia"] },
  { code: "PROCEDIMIENTO_TRABAJO_SEGURO", categoria: "sst", aliases: ["procedimiento_de_trabajo_seguro", "procedimientos_criticos_de_trabajo", "procedimiento trabajo seguro"] },
  { code: "PROCEDIMIENTO_TRABAJO_ALTURA", categoria: "sst", aliases: ["procedimiento_trabajo_en_altura", "trabajo en altura"] },
  { code: "PROCEDIMIENTO_ELECTRICO", categoria: "sst", aliases: ["procedimiento_electrico", "procedimiento electrico", "procedimiento_eléctrico_bt_mt"] },
  { code: "PROCEDIMIENTO_BLOQUEO_ETIQUETADO", categoria: "sst", aliases: ["procedimiento_bloqueo_y_etiquetado", "loto", "bloqueo y etiquetado"] },
  { code: "PROGRAMA_PREVENCION", categoria: "sst", aliases: ["programa_de_prevencion", "programa de prevencion de riesgos"] },
  { code: "ENTREGA_EPP_EMPRESA", categoria: "sst", aliases: ["registro_entrega_epp_empresa", "registro entrega epp dielectrico", "entrega_epp_dielectrico"] },
];

const CATALOGO_TRABAJADOR = [
  { code: "CEDULA_IDENTIDAD", aliases: ["cedula_de_identidad", "cédula de identidad", "cedula identidad"] },
  { code: "CONTRATO_TRABAJO", aliases: ["contrato_de_trabajo", "contrato trabajo"] },
  { code: "ANEXO_CONTRATO", aliases: ["anexo_de_contrato", "anexo contrato"] },
  { code: "CERTIFICADO_AFP", aliases: ["certificado_afp"] },
  { code: "CERTIFICADO_SALUD", aliases: ["certificado_salud_fonasa_isapre", "certificado_salud", "certificado salud"] },
  { code: "ODI_FIRMADA", aliases: ["odi_firmada", "odi"] },
  { code: "ENTREGA_EPP", aliases: ["registro_entrega_epp", "entrega_epp"] },
  { code: "CAPACITACION_INDUCCION", aliases: ["induccion_faena", "capacitacion_induccion"] },
  { code: "CAPACITACION_ALTURA", aliases: ["capacitacion_trabajo_en_altura", "capacitacion trabajo en altura"] },
  { code: "CAPACITACION_RIESGO_ELECTRICO", aliases: ["capacitacion_riesgo_electrico"] },
  { code: "CAPACITACION_USO_EPP", aliases: ["capacitacion_uso_epp"] },
  { code: "LICENCIA_SEC", aliases: ["licencia_sec", "licencias_habilitantes_segun_tarea"] },
  { code: "LICENCIA_CONDUCIR", aliases: ["licencia_de_conducir", "licencia conductor"] },
  { code: "EXAMEN_OCUPACIONAL", aliases: ["examen_ocupacional", "examen_pre_ocupacional"] },
  { code: "EXAMEN_ALTURA", aliases: ["examen_altura_fisica", "examen ocupacional altura fisica"] },
  { code: "EXAMEN_ALTURA_GEOGRAFICA", aliases: ["examen_altura_geografica"] },
  { code: "LIQUIDACION_SUELDO", aliases: ["liquidacion_de_sueldo", "liquidacion sueldo"] },
  { code: "CERTIFICADO_ANTECEDENTES", aliases: ["certificado_de_antecedentes"] },
];

const EMPRESA_BY_CODE = new Map(CATALOGO_EMPRESA.map((item) => [item.code, item]));

function matchesAlias(normalizedName, aliases) {
  return aliases.some((aliasRaw) => {
    const alias = normalizeText(aliasRaw);
    return normalizedName === alias || normalizedName.includes(alias) || alias.includes(normalizedName);
  });
}

function resolveCatalogCode(req) {
  const normalizedName = normalizeText(req.nombre);

  if (req.titularTipo === "trabajador") {
    const match = CATALOGO_TRABAJADOR.find((item) => matchesAlias(normalizedName, item.aliases));
    return match?.code ?? null;
  }

  if (req.titularTipo === "empresa" || req.categoria === "empresa" || req.categoria === "sst") {
    if (normalizedName.includes("formato_mandante")) return null;
    const match = CATALOGO_EMPRESA.find((item) => matchesAlias(normalizedName, item.aliases));
    return match?.code ?? null;
  }

  return null;
}

function findDocumentoEmpresaByCode(code, docs) {
  const catalog = EMPRESA_BY_CODE.get(code);
  if (!catalog) return null;

  const expectedCategory = normalizeText(catalog.categoria);
  return (
    docs.find((doc) => {
      const sameCategory = normalizeText(doc.categoria) === expectedCategory;
      const normalizedName = normalizeText(doc.nombre);
      return sameCategory && matchesAlias(normalizedName, catalog.aliases);
    }) ?? null
  );
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
    const catalogCode = resolveCatalogCode(req);
    const codigoDocumento = req.codigoDocumento ?? catalogCode ?? buildCodigoDocumento(req);

    const matchDocumentoEmpresa = shouldMapEmpresa(req)
      ? (
          (catalogCode ? findDocumentoEmpresaByCode(catalogCode, catalogoEmpresa) : null)
          ?? catalogoEmpresa.find((doc) => {
            const sameName = normalizeText(doc.nombre) === normalizeText(req.nombre);
            const sameCategory = normalizeText(doc.categoria) === normalizeText(req.categoria)
              || normalizeText(req.categoria) === "sst";
            return sameName && sameCategory;
          })
          ?? null
        )
      : null;

    const matchDocumentoTrabajador = req.titularTipo === "trabajador"
      ? catalogoTrabajador.find((doc) => {
          const byCode = catalogCode
            ? normalizeText(doc.codigo) === normalizeText(catalogCode)
            : normalizeText(doc.codigo) === normalizeText(codigoDocumento);
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
