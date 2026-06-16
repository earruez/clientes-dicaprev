/**
 * seed-demo-comercial.mjs
 * Crea empresa demo "Centros Comerciales SpA" con datos ficticios para presentación.
 * Idempotente: se puede ejecutar múltiples veces sin crear duplicados.
 *
 * Usage: node prisma/seed-demo-comercial.mjs
 * O con npm: npm run seed:demo-comercial
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { scryptSync, randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL o DATABASE_URL_UNPOOLED no configurado");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Hash Password (compatible con password-hash.ts) ─────────────────────────
function hashPassword(password) {
  const SCRYPT_KEYLEN = 64;
  const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt}$${derivedKey.toString("hex")}`;
}

// ─── Data Structure ─────────────────────────────────────────────────────────

const DEMO_DATA = {
  empresa: {
    nombre: "Centros Comerciales SpA",
    rut: "XX.XXX.XXX-X (Demo)",
    razonSocial: "Centros Comerciales SpA",
    giro: "Administración y operación de centros comerciales",
    tipoEmpresa: "comercial",
    tamanoEmpresa: "mediana",
    ciudad: "Santiago",
    region: "Metropolitana",
    correo: "admin@centrosasdemo.cl",
  },
  usuario: {
    email: "admin.centros@nextprev.cl",
    nombre: "Administrador Centros Demo",
    password: "Demo2026",
    rol: "ADMIN_EMPRESA",
  },
  centros: [
    { nombre: "Oficina Central", tipo: "Administración", direccion: "Av. Principal 100, Santiago", comuna: "Santiago", region: "Metropolitana" },
    { nombre: "Centro Comercial Norte", tipo: "Centro Comercial", direccion: "Av. América 5000, Santiago", comuna: "Renca", region: "Metropolitana" },
    { nombre: "Centro Comercial Oriente", tipo: "Centro Comercial", direccion: "Av. Apoquindo 6500, Santiago", comuna: "Las Condes", region: "Metropolitana" },
    { nombre: "Strip Center Sur", tipo: "Centro Comercial", direccion: "Av. Libertadores 8000, Santiago", comuna: "Puente Alto", region: "Metropolitana" },
    { nombre: "Bodega y Mantención", tipo: "Bodega", direccion: "Av. Industrial 2000, Santiago", comuna: "Maipú", region: "Metropolitana" },
  ],
  areas: [
    { nombre: "Administración", descripcion: "Equipo administrativo y gestión" },
    { nombre: "Operaciones", descripcion: "Operaciones de centros comerciales" },
    { nombre: "Mantención", descripcion: "Servicios de mantención e infraestructura" },
    { nombre: "Seguridad", descripcion: "Personal de seguridad y vigilancia" },
    { nombre: "Prevención de Riesgos", descripcion: "Equipo de prevención de riesgos" },
    { nombre: "Atención a Locatarios", descripcion: "Soporte a locatarios" },
    { nombre: "Servicios Generales", descripcion: "Servicios generales y aseo" },
  ],
  cargos: [
    { nombre: "Administrador de Centro Comercial", esCritico: true, areaIdx: 0 },
    { nombre: "Supervisor de Operaciones", esCritico: true, areaIdx: 1 },
    { nombre: "Técnico de Mantención", esCritico: false, areaIdx: 2 },
    { nombre: "Guardia de Seguridad", esCritico: false, areaIdx: 3 },
    { nombre: "Prevencionista de Riesgos", esCritico: true, areaIdx: 4 },
    { nombre: "Auxiliar de Aseo", esCritico: false, areaIdx: 6 },
    { nombre: "Coordinador de Locatarios", esCritico: false, areaIdx: 5 },
  ],
  trabajadores: [
    { nombres: "Carlos", apellidos: "Rodríguez Martínez", rut: "25.123.456-7", cargoIdx: 0, centroIdx: 0, estado: "activo" },
    { nombres: "María", apellidos: "González López", rut: "26.234.567-8", cargoIdx: 1, centroIdx: 1, estado: "activo" },
    { nombres: "Jorge", apellidos: "Silva Pérez", rut: "27.345.678-9", cargoIdx: 2, centroIdx: 4, estado: "activo" },
    { nombres: "Andrés", apellidos: "Moreno Sánchez", rut: "28.456.789-0", cargoIdx: 3, centroIdx: 1, estado: "activo" },
    { nombres: "Patricia", apellidos: "Herrera Ramírez", rut: "29.567.890-1", cargoIdx: 4, centroIdx: 0, estado: "activo" },
    { nombres: "Luis", apellidos: "Paredes García", rut: "30.678.901-2", cargoIdx: 5, centroIdx: 2, estado: "activo" },
    { nombres: "Sandra", apellidos: "Valenzuela Núñez", rut: "31.789.012-3", cargoIdx: 1, centroIdx: 2, estado: "activo" },
    { nombres: "Roberto", apellidos: "Mendoza Flores", rut: "32.890.123-4", cargoIdx: 3, centroIdx: 3, estado: "activo" },
    { nombres: "Claudia", apellidos: "Castillo Díaz", rut: "33.901.234-5", cargoIdx: 2, centroIdx: 4, estado: "activo" },
    { nombres: "Ricardo", apellidos: "Aguilar Vásquez", rut: "34.012.345-6", cargoIdx: 6, centroIdx: 0, estado: "activo" },
    { nombres: "Valentina", apellidos: "Fernández Rojas", rut: "35.123.456-7", cargoIdx: 3, centroIdx: 2, estado: "activo" },
    { nombres: "Fernando", apellidos: "Espinoza Valdés", rut: "36.234.567-8", cargoIdx: 5, centroIdx: 1, estado: "activo" },
    { nombres: "Lorena", apellidos: "Barrera Gutiérrez", rut: "37.345.678-9", cargoIdx: 4, centroIdx: 0, estado: "activo" },
    { nombres: "Sergio", apellidos: "Cabrera López", rut: "38.456.789-0", cargoIdx: 2, centroIdx: 3, estado: "activo" },
    { nombres: "Natalia", apellidos: "Araya Soto", rut: "39.567.890-1", cargoIdx: 5, centroIdx: 3, estado: "activo" },
    { nombres: "Pablo", apellidos: "Cortés Jiménez", rut: "40.678.901-2", cargoIdx: 3, centroIdx: 3, estado: "activo" },
    { nombres: "Marcela", apellidos: "Díaz Morales", rut: "41.789.012-3", cargoIdx: 1, centroIdx: 3, estado: "activo" },
    { nombres: "Héctor", apellidos: "Navarro Torres", rut: "42.890.123-4", cargoIdx: 6, centroIdx: 1, estado: "activo" },
  ],
  eppItems: [
    { nombre: "Casco de Seguridad", codigo: "CSC-001" },
    { nombre: "Guantes de Protección", codigo: "GUA-001" },
    { nombre: "Lentes de Seguridad", codigo: "LEN-001" },
    { nombre: "Zapatos de Seguridad", codigo: "ZAP-001" },
    { nombre: "Chaleco Reflectante", codigo: "CHA-001" },
  ],
  contratistas: [
    { nombre: "Aseo Integral Demo SpA", rut: "76.543.210-1", razonSocial: "Aseo Integral Demo SpA" },
    { nombre: "Seguridad Privada Demo SpA", rut: "77.654.321-2", razonSocial: "Seguridad Privada Demo SpA" },
    { nombre: "Mantención Eléctrica Demo SpA", rut: "78.765.432-3", razonSocial: "Mantención Eléctrica Demo SpA" },
  ],
  checklists: [
    { nombre: "Inspección Zonas Comunes", preguntas: ["¿Suelos limpios?", "¿Iluminación correcta?", "¿Escaleras seguras?", "¿Puertas de emergencia accesibles?", "¿No hay obstáculos?"] },
    { nombre: "Inspección Salas Eléctricas", preguntas: ["¿Puertas cerradas?", "¿Señalética visible?", "¿Equipos operativos?", "¿Sin derrames?", "¿Orden general?"] },
    { nombre: "Inspección Patio de Comidas", preguntas: ["¿Aseos limpios?", "¿Orden general?", "¿Equipos funcionando?", "¿Basureros disponibles?", "¿Sin plagas?"] },
    { nombre: "Inspección Bodegas", preguntas: ["¿Estructuras seguras?", "¿Cargas aseguradas?", "¿Equipos de manipuleo?", "¿Señalética clara?", "¿Acceso controlado?"] },
    { nombre: "Inspección Estacionamientos", preguntas: ["¿Iluminación adecuada?", "¿Suelos sin daños?", "¿Señalización visible?", "¿Cámaras funcionando?", "¿Orden general?"] },
  ],
  planTrabajo2026: [
    { actividad: "Inspección de salas eléctricas", normativa: "DS 40", categoria: "Infraestructura", periodicidad: "trimestral", responsable: "Supervisor de Operaciones", centroContratista: "Centro Comercial Norte" },
    { actividad: "Capacitación de emergencia", normativa: "DS 40", categoria: "Capacitación", periodicidad: "semestral", responsable: "Prevencionista de Riesgos", centroContratista: "Todas las sedes" },
    { actividad: "Simulacro de evacuación", normativa: "DS 40", categoria: "Procedimiento", periodicidad: "semestral", responsable: "Supervisor de Operaciones", centroContratista: "Todas las sedes" },
    { actividad: "Revisión de extintores", normativa: "DS 40", categoria: "Equipamiento", periodicidad: "mensual", responsable: "Técnico de Mantención", centroContratista: "Todas las sedes" },
    { actividad: "Control de contratistas", normativa: "DS 44", categoria: "Contratación", periodicidad: "continua", responsable: "Administrador de Centro", centroContratista: "Todas las sedes" },
    { actividad: "Inspección de zonas comunes", normativa: "DS 40", categoria: "Inspección", periodicidad: "semanal", responsable: "Supervisor de Operaciones", centroContratista: "Centros Comerciales" },
  ],
  documentosEmpresa: [
    { nombre: "Reglamento Interno", categoria: "gestion", tipo: "REGLAMENTO_INTERNO", requiereVencimiento: false },
    { nombre: "Política SST", categoria: "gestion", tipo: "POLITICA_SST", requiereVencimiento: false },
    { nombre: "Plan de emergencia", categoria: "emergencias", tipo: "PLAN_EMERGENCIA", requiereVencimiento: true },
    { nombre: "Matriz IPER / MIPER", categoria: "riesgos", tipo: "MATRIZ_IPER", requiereVencimiento: true },
    { nombre: "Programa de prevención", categoria: "gestion", tipo: "PROGRAMA_PREVENCION", requiereVencimiento: true },
    { nombre: "Acta Comité Paritario", categoria: "comite", tipo: "ACTA_COMITE_PARITARIO", requiereVencimiento: false },
    { nombre: "Formato entrega EPP", categoria: "epp", tipo: "FORMATO_ENTREGA_EPP", requiereVencimiento: false },
    { nombre: "Procedimiento de emergencias", categoria: "emergencias", tipo: "PROCEDIMIENTO_EMERGENCIAS", requiereVencimiento: false },
    { nombre: "Registro de capacitaciones", categoria: "capacitacion", tipo: "REGISTRO_CAPACITACIONES", requiereVencimiento: true },
    { nombre: "Documentación contratistas", categoria: "contratistas", tipo: "DOCUMENTACION_CONTRATISTAS", requiereVencimiento: true },
  ],
  documentosTrabajadorBase: [
    { tipo: "CONTRATO_TRABAJO", nombre: "Contrato de trabajo", requiereVencimiento: false },
    { tipo: "CEDULA_IDENTIDAD", nombre: "Cédula de identidad", requiereVencimiento: true },
    { tipo: "IRL", nombre: "IRL - Informe de Riesgos Laborales", requiereVencimiento: true },
    { tipo: "REGLAMENTO_INTERNO", nombre: "Reglamento interno firmado", requiereVencimiento: false },
    { tipo: "ENTREGA_EPP", nombre: "Entrega de EPP", requiereVencimiento: true },
    { tipo: "CAPACITACION_INICIAL", nombre: "Capacitación inicial", requiereVencimiento: true },
    { tipo: "EXAMEN_OCUPACIONAL", nombre: "Examen ocupacional", requiereVencimiento: true },
    { tipo: "LICENCIA_HABILITANTE", nombre: "Licencia habilitante", requiereVencimiento: true },
  ],
};

const DOCUMENTOS_EMPRESA_VINCULOS = new Map([
  ["Reglamento Interno", { nombre: "Reglamento Interno de Orden, Higiene y Seguridad", categoria: "sst" }],
  ["Política SST", { nombre: "Política SST", categoria: "sst" }],
  ["Plan de emergencia", { nombre: "Plan de emergencia", categoria: "sst" }],
  ["Matriz IPER / MIPER", { nombre: "Matriz IPER", categoria: "sst" }],
  ["Programa de prevención", { nombre: "Programa de trabajo preventivo / plan anual de prevención", categoria: "sst" }],
  ["Acta Comité Paritario", { nombre: "Actas Comité Paritario, si aplica", categoria: "sst" }],
  ["Formato entrega EPP", { nombre: "Formato base de entrega de EPP", categoria: "plantillas_formatos" }],
  ["Procedimiento de emergencias", { nombre: "Procedimiento de emergencias", categoria: "protocolos" }],
  ["Registro de capacitaciones", { nombre: "Formato / matriz de capacitaciones obligatorias", categoria: "plantillas_formatos" }],
  ["Documentación contratistas", { nombre: "Documentación contratistas", categoria: "legales_empresa" }],
]);

const VEHICULOS_EQUIPOS_DEMO = [
  {
    nombre: "Camioneta mantención 1",
    patente: "KXTR-21",
    codigoInterno: "VEH-001",
    tipo: "camioneta",
    marca: "Toyota",
    modelo: "Hilux",
    anio: 2022,
    estado: "operativo",
    centroIdx: 4,
    responsable: "Jorge Silva Pérez",
    kilometraje: 48200,
    observaciones: "Unidad asignada al equipo de mantención general.",
  },
  {
    nombre: "Camioneta supervisión operaciones",
    patente: "PLNV-38",
    codigoInterno: "VEH-002",
    tipo: "camioneta",
    marca: "Mitsubishi",
    modelo: "L200",
    anio: 2021,
    estado: "operativo",
    centroIdx: 1,
    responsable: "María González López",
    kilometraje: 62110,
    observaciones: "Movilización de supervisión para centros comerciales.",
  },
  {
    nombre: "Grúa horquilla bodega",
    patente: "EQP-001",
    codigoInterno: "EQ-001",
    tipo: "equipo",
    marca: "Toyota",
    modelo: "8FG",
    anio: 2020,
    estado: "mantencion",
    centroIdx: 4,
    responsable: "Sergio Cabrera López",
    kilometraje: 3150,
    observaciones: "Equipo de izaje en bodega central.",
  },
  {
    nombre: "Carro eléctrico de mantención",
    patente: "EQP-002",
    codigoInterno: "EQ-002",
    tipo: "equipo",
    marca: "Club Car",
    modelo: "Carryall 500",
    anio: 2023,
    estado: "operativo",
    centroIdx: 2,
    responsable: "Patricia Herrera Ramírez",
    kilometraje: 940,
    observaciones: "Soporte de desplazamiento para mantención en mall.",
  },
  {
    nombre: "Hidrolavadora industrial",
    patente: "EQP-003",
    codigoInterno: "EQ-003",
    tipo: "equipo",
    marca: "Karcher",
    modelo: "HD 9/20",
    anio: 2022,
    estado: "operativo",
    centroIdx: 3,
    responsable: "Natalia Araya Soto",
    kilometraje: 220,
    observaciones: "Limpieza profunda en áreas comunes.",
  },
  {
    nombre: "Generador eléctrico emergencia",
    patente: "EQP-004",
    codigoInterno: "EQ-004",
    tipo: "equipo",
    marca: "Hyundai",
    modelo: "DHY 18KSE",
    anio: 2019,
    estado: "operativo",
    centroIdx: 0,
    responsable: "Fernando Espinoza Valdés",
    kilometraje: 410,
    observaciones: "Respaldo eléctrico para contingencias críticas.",
  },
  {
    nombre: "Plataforma alza hombre",
    patente: "EQP-005",
    codigoInterno: "EQ-005",
    tipo: "equipo",
    marca: "JLG",
    modelo: "E400AN",
    anio: 2018,
    estado: "mantencion",
    centroIdx: 1,
    responsable: "Ricardo Aguilar Vásquez",
    kilometraje: 1870,
    observaciones: "Trabajo en altura para luminarias y señalética.",
  },
  {
    nombre: "Equipo de limpieza industrial",
    patente: "EQP-006",
    codigoInterno: "EQ-006",
    tipo: "equipo",
    marca: "Tennant",
    modelo: "T7",
    anio: 2020,
    estado: "baja",
    centroIdx: 3,
    responsable: "Luis Paredes García",
    kilometraje: 2810,
    observaciones: "Equipo en retiro por renovación programada.",
  },
];

const DOCUMENTOS_VEHICULO_DEMO = [
  { codigo: "REVISION_TECNICA", nombre: "Revisión técnica", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "CERTIFICADO_MANTENCION", nombre: "Mantención preventiva", requiereVencimiento: true, vigenciaDias: 180 },
  { codigo: "SEGURO_VEHICULO", nombre: "Seguro", requiereVencimiento: true, vigenciaDias: 365 },
  { codigo: "PERMISO_CIRCULACION", nombre: "Permiso circulación", requiereVencimiento: true, vigenciaDias: 365 },
];

const MANDANTES_ACREDITACION_DEMO = [
  { nombre: "Grupo Patio Demo", rut: "77.111.222-3", tipo: "privado" },
  { nombre: "Mall Operadora Norte", rut: "77.222.333-4", tipo: "constructora" },
  { nombre: "Administración Strip Center Sur", rut: "77.333.444-5", tipo: "mandante" },
];

const PLANTILLAS_ACREDITACION_DEMO = [
  {
    nombre: "Acreditación contratista mantención",
    tipo: "mandante_general",
    descripcion: "Control documental para contratistas de mantención e infraestructura.",
    mandante: "Mall Operadora Norte",
    requisitos: [
      { nombreDocumento: "F30", categoria: "empresa", aplicaA: "empresa", obligatorio: true, documentoRequeridoEmpresaNombre: "Certificado F30" },
      { nombreDocumento: "F30-1", categoria: "empresa", aplicaA: "empresa", obligatorio: true, documentoRequeridoEmpresaNombre: "Certificado F30-1" },
      { nombreDocumento: "Certificado mutualidad", categoria: "empresa", aplicaA: "empresa", obligatorio: true, documentoRequeridoEmpresaNombre: "Certificado de afiliación a mutualidad / ISL" },
      { nombreDocumento: "Contrato trabajadores", categoria: "trabajador", aplicaA: "trabajador", obligatorio: true, documentoTipoTrabajadorCodigo: "CONTRATO_TRABAJO" },
      { nombreDocumento: "IRL - Informe de Riesgos Laborales", categoria: "trabajador", aplicaA: "trabajador", obligatorio: true, documentoTipoTrabajadorCodigo: "IRL" },
      { nombreDocumento: "Revisión técnica", categoria: "vehiculo", aplicaA: "vehiculo", obligatorio: true, documentoTipoVehiculoCodigo: "REVISION_TECNICA" },
    ],
  },
  {
    nombre: "Acreditación empresa de aseo",
    tipo: "mandante_general",
    descripcion: "Checklist documental para empresas de aseo en centros comerciales.",
    mandante: "Grupo Patio Demo",
    requisitos: [
      { nombreDocumento: "Reglamento interno", categoria: "empresa", aplicaA: "empresa", obligatorio: true, documentoRequeridoEmpresaNombre: "Reglamento Interno de Orden, Higiene y Seguridad" },
      { nombreDocumento: "Entrega EPP", categoria: "trabajador", aplicaA: "trabajador", obligatorio: true, documentoTipoTrabajadorCodigo: "ENTREGA_EPP" },
      { nombreDocumento: "Certificado antecedentes", categoria: "trabajador", aplicaA: "trabajador", obligatorio: false, documentoTipoTrabajadorCodigo: "CERT_ANTECEDENTES" },
      { nombreDocumento: "Seguro", categoria: "vehiculo", aplicaA: "vehiculo", obligatorio: true, documentoTipoVehiculoCodigo: "SEGURO_VEHICULO" },
    ],
  },
  {
    nombre: "Acreditación guardias de seguridad",
    tipo: "mandante_general",
    descripcion: "Acreditación operativa para equipos de seguridad privada.",
    mandante: "Administración Strip Center Sur",
    requisitos: [
      { nombreDocumento: "F30", categoria: "empresa", aplicaA: "empresa", obligatorio: true, documentoRequeridoEmpresaNombre: "Certificado F30" },
      { nombreDocumento: "Contrato trabajadores", categoria: "trabajador", aplicaA: "trabajador", obligatorio: true, documentoTipoTrabajadorCodigo: "CONTRATO_TRABAJO" },
      { nombreDocumento: "IRL - Informe de Riesgos Laborales", categoria: "trabajador", aplicaA: "trabajador", obligatorio: true, documentoTipoTrabajadorCodigo: "IRL" },
      { nombreDocumento: "Entrega EPP", categoria: "trabajador", aplicaA: "trabajador", obligatorio: true, documentoTipoTrabajadorCodigo: "ENTREGA_EPP" },
    ],
  },
  {
    nombre: "Acreditación trabajos eléctricos",
    tipo: "mandante_general",
    descripcion: "Control de cumplimiento para tareas eléctricas y trabajo en altura.",
    mandante: "Mall Operadora Norte",
    requisitos: [
      { nombreDocumento: "F30-1", categoria: "empresa", aplicaA: "empresa", obligatorio: true, documentoRequeridoEmpresaNombre: "Certificado F30-1" },
      { nombreDocumento: "Reglamento interno", categoria: "empresa", aplicaA: "empresa", obligatorio: true, documentoRequeridoEmpresaNombre: "Reglamento Interno de Orden, Higiene y Seguridad" },
      { nombreDocumento: "Certificado antecedentes", categoria: "trabajador", aplicaA: "trabajador", obligatorio: true, documentoTipoTrabajadorCodigo: "CERT_ANTECEDENTES" },
      { nombreDocumento: "Permiso circulación", categoria: "vehiculo", aplicaA: "vehiculo", obligatorio: true, documentoTipoVehiculoCodigo: "PERMISO_CIRCULACION" },
      { nombreDocumento: "Mantención preventiva", categoria: "vehiculo", aplicaA: "vehiculo", obligatorio: true, documentoTipoVehiculoCodigo: "CERTIFICADO_MANTENCION" },
    ],
  },
];

const SOLICITUDES_ACREDITACION_DEMO = [
  {
    nombreProyecto: "Borrador mantención Patio",
    obraFaena: "Centro Comercial Norte",
    estado: "en_preparacion",
    mandante: "Grupo Patio Demo",
    plantilla: "Acreditación contratista mantención",
    contratista: "Mantención Eléctrica Demo SpA",
    trabajadorRuts: ["27.345.678-9", "38.456.789-0"],
    vehiculos: ["EQP-001", "EQP-005"],
  },
  {
    nombreProyecto: "Revisión operativa aseo norte",
    obraFaena: "Centro Comercial Norte",
    estado: "enviado",
    mandante: "Grupo Patio Demo",
    plantilla: "Acreditación empresa de aseo",
    contratista: "Aseo Integral Demo SpA",
    trabajadorRuts: ["30.678.901-2", "39.567.890-1"],
    vehiculos: ["EQP-003", "EQP-006"],
  },
  {
    nombreProyecto: "Observada seguridad strip center",
    obraFaena: "Strip Center Sur",
    estado: "observada",
    mandante: "Administración Strip Center Sur",
    plantilla: "Acreditación guardias de seguridad",
    contratista: "Seguridad Privada Demo SpA",
    trabajadorRuts: ["28.456.789-0", "32.890.123-4", "40.678.901-2"],
    vehiculos: ["PLNV-38"],
  },
  {
    nombreProyecto: "Aprobada mantención eléctrica anual",
    obraFaena: "Centro Comercial Oriente",
    estado: "aprobado",
    mandante: "Mall Operadora Norte",
    plantilla: "Acreditación trabajos eléctricos",
    contratista: "Mantención Eléctrica Demo SpA",
    trabajadorRuts: ["27.345.678-9", "34.012.345-6", "38.456.789-0"],
    vehiculos: ["KXTR-21", "EQP-004"],
  },
  {
    nombreProyecto: "Rechazada servicio guardias nocturnos",
    obraFaena: "Centro Comercial Norte",
    estado: "rechazado",
    mandante: "Mall Operadora Norte",
    plantilla: "Acreditación guardias de seguridad",
    contratista: "Seguridad Privada Demo SpA",
    trabajadorRuts: ["28.456.789-0", "35.123.456-7"],
    vehiculos: ["PLNV-38"],
  },
  {
    nombreProyecto: "Vencida aseo trimestral histórico",
    obraFaena: "Strip Center Sur",
    estado: "vencido",
    mandante: "Administración Strip Center Sur",
    plantilla: "Acreditación empresa de aseo",
    contratista: "Aseo Integral Demo SpA",
    trabajadorRuts: ["30.678.901-2", "39.567.890-1"],
    vehiculos: ["EQP-003"],
  },
];

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function estadoDocumentoDemo(estadoAcreditacion, index) {
  if (estadoAcreditacion === "en_preparacion") return "faltante";
  if (estadoAcreditacion === "listo_para_enviar") return index % 3 === 0 ? "faltante" : "completo";
  if (estadoAcreditacion === "enviado") return index % 4 === 0 ? "faltante" : "completo";
  if (estadoAcreditacion === "observada") return index % 2 === 0 ? "en_revision" : "faltante";
  if (estadoAcreditacion === "aprobado") return "completo";
  if (estadoAcreditacion === "rechazado") return index % 2 === 0 ? "rechazado" : "faltante";
  if (estadoAcreditacion === "vencido") return index % 2 === 0 ? "vencido" : "completo";
  return "faltante";
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seedDemo() {
  console.log("\n🚀 Iniciando seed de empresa demo Centros Comerciales...\n");

  try {
    // ────── 1. EMPRESA ──────────────────────────────────────────────────────
    console.log("1️⃣ Creando/verificando empresa...");
    let empresa = await prisma.empresa.findFirst({
      where: { nombre: DEMO_DATA.empresa.nombre },
    });

    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nombre: DEMO_DATA.empresa.nombre,
          rut: DEMO_DATA.empresa.rut,
          razonSocial: DEMO_DATA.empresa.razonSocial,
          giro: DEMO_DATA.empresa.giro,
          tipoEmpresa: DEMO_DATA.empresa.tipoEmpresa,
          tamanoEmpresa: DEMO_DATA.empresa.tamanoEmpresa,
          ciudad: DEMO_DATA.empresa.ciudad,
          region: DEMO_DATA.empresa.region,
          correo: DEMO_DATA.empresa.correo,
          activa: true,
        },
      });
      console.log(`   ✓ Empresa creada: ${empresa.nombre} (${empresa.id})`);
    } else {
      console.log(`   ↷ Empresa ya existe: ${empresa.nombre}`);
    }

    // ────── 2. USUARIO DEMO CLIENTE ─────────────────────────────────────────
    console.log("2️⃣ Creando/verificando usuario demo cliente...");
    let usuario = await prisma.usuario.findUnique({
      where: { email: DEMO_DATA.usuario.email },
    });

    if (!usuario) {
      const passwordHash = hashPassword(DEMO_DATA.usuario.password);
      usuario = await prisma.usuario.create({
        data: {
          nombre: DEMO_DATA.usuario.nombre,
          email: DEMO_DATA.usuario.email,
          rol: DEMO_DATA.usuario.rol,
          passwordHash,
          activo: true,
          empresaId: empresa.id,
        },
      });
      console.log(`   ✓ Usuario creado: ${usuario.email}`);
    } else {
      console.log(`   ↷ Usuario ya existe: ${usuario.email}`);
      // Asegurar que esté activo y vinculado a la empresa
      if (!usuario.activo || usuario.empresaId !== empresa.id) {
        usuario = await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            activo: true,
            empresaId: empresa.id,
          },
        });
        console.log(`   ✓ Usuario actualizado`);
      }
    }

    // ────── 3. ASOCIACIÓN USUARIO-EMPRESA ───────────────────────────────────
    console.log("3️⃣ Verificando asociación usuario-empresa...");
    const usuarioEmpresa = await prisma.usuarioEmpresa.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
        },
      },
    });

    if (!usuarioEmpresa) {
      await prisma.usuarioEmpresa.create({
        data: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
          rol: DEMO_DATA.usuario.rol,
          activo: true,
        },
      });
      console.log(`   ✓ Usuario-Empresa asociado`);
    } else {
      console.log(`   ↷ Asociación ya existe`);
      if (!usuarioEmpresa.activo) {
        await prisma.usuarioEmpresa.update({
          where: { id: usuarioEmpresa.id },
          data: { activo: true },
        });
        console.log(`   ✓ Asociación reactivada`);
      }
    }

    // ────── 4. CREAR MÓDULOS EMPRESARIALES ──────────────────────────────────
    console.log("4️⃣ Creando/verificando módulos de empresa...");
    const modulos = [
      "trabajadores",
      "documentacion",
      "capacitacion",
      "cumplimiento",
      "acreditaciones",
      "epp",
      "contratistas",
      "plandetrabajo",
      "checklists",
      "accidentes",
    ];

    for (const modulo of modulos) {
      const existe = await prisma.empresaModulo.findUnique({
        where: {
          empresaId_modulo: {
            empresaId: empresa.id,
            modulo,
          },
        },
      });

      if (!existe) {
        await prisma.empresaModulo.create({
          data: {
            empresaId: empresa.id,
            modulo,
            activo: true,
          },
        });
        console.log(`   ✓ Módulo: ${modulo}`);
      }
    }

    // ────── 5. CENTROS DE TRABAJO ───────────────────────────────────────────
    console.log("5️⃣ Creando/verificando centros de trabajo...");
    const centros = [];
    for (const centro of DEMO_DATA.centros) {
      let c = await prisma.centroTrabajo.findFirst({
        where: { empresaId: empresa.id, nombre: centro.nombre },
      });

      if (!c) {
        c = await prisma.centroTrabajo.create({
          data: {
            empresaId: empresa.id,
            nombre: centro.nombre,
            tipo: centro.tipo,
            direccion: centro.direccion,
            comuna: centro.comuna,
            region: centro.region,
            estado: "activo",
          },
        });
        console.log(`   ✓ Centro: ${c.nombre}`);
      } else {
        console.log(`   ↷ Centro ya existe: ${c.nombre}`);
      }
      centros.push(c);
    }

    // ────── 6. ÁREAS ───────────────────────────────────────────────────────
    console.log("6️⃣ Creando/verificando áreas...");
    const areas = [];
    for (const area of DEMO_DATA.areas) {
      let a = await prisma.area.findFirst({
        where: { empresaId: empresa.id, nombre: area.nombre },
      });

      if (!a) {
        a = await prisma.area.create({
          data: {
            empresaId: empresa.id,
            nombre: area.nombre,
            descripcion: area.descripcion,
            estado: "activa",
          },
        });
        console.log(`   ✓ Área: ${a.nombre}`);
      }
      areas.push(a);
    }

    // ────── 7. CARGOS ──────────────────────────────────────────────────────
    console.log("7️⃣ Creando/verificando cargos...");
    const cargos = [];
    for (const cargo of DEMO_DATA.cargos) {
      let c = await prisma.cargo.findFirst({
        where: { empresaId: empresa.id, nombre: cargo.nombre },
      });

      if (!c) {
        c = await prisma.cargo.create({
          data: {
            empresaId: empresa.id,
            nombre: cargo.nombre,
            areaId: areas[cargo.areaIdx]?.id || null,
            esCritico: cargo.esCritico,
            estado: "activo",
          },
        });
        console.log(`   ✓ Cargo: ${c.nombre}`);
      }
      cargos.push(c);
    }

    // ────── 8. TRABAJADORES ────────────────────────────────────────────────
    console.log("8️⃣ Creando/verificando trabajadores...");
    const trabajadores = [];
    for (const trab of DEMO_DATA.trabajadores) {
      let t = await prisma.trabajador.findFirst({
        where: { empresaId: empresa.id, rut: trab.rut },
      });

      if (!t) {
        t = await prisma.trabajador.create({
          data: {
            empresaId: empresa.id,
            nombres: trab.nombres,
            apellidos: trab.apellidos,
            rut: trab.rut,
            cargoId: cargos[trab.cargoIdx]?.id || null,
            centroTrabajoId: centros[trab.centroIdx]?.id || null,
            areaId: areas[DEMO_DATA.cargos[trab.cargoIdx]?.areaIdx]?.id || null,
            estado: trab.estado,
            fechaIngreso: new Date("2025-06-15"),
            fechaNacimiento: new Date(`1980-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`),
            tipoContrato: "indefinido",
            email: `${trab.nombres.toLowerCase()}.${trab.apellidos.toLowerCase()}@centrosasdemo.cl`.replace(" ", ""),
          },
        });
        console.log(`   ✓ Trabajador: ${trab.nombres} ${trab.apellidos}`);
      } else if (t.estado !== trab.estado) {
        t = await prisma.trabajador.update({
          where: { id: t.id },
          data: {
            estado: trab.estado,
          },
        });
      }
      trabajadores.push(t);
    }

    // ────── 8.5 TIPOS DOCUMENTALES + REGLAS ───────────────────────────────
    console.log("8️⃣.5️⃣ Creando/verificando tipos y reglas documentales...");
    const tiposDocumentales = [];
    for (const doc of DEMO_DATA.documentosTrabajadorBase) {
      let tipoDoc = await prisma.documentoTipoTrabajador.findFirst({
        where: {
          empresaId: empresa.id,
          codigo: doc.tipo,
        },
      });

      if (!tipoDoc) {
        tipoDoc = await prisma.documentoTipoTrabajador.create({
          data: {
            empresaId: empresa.id,
            nombre: doc.nombre,
            codigo: doc.tipo,
            descripcion: `Documento demo: ${doc.nombre}`,
            vigenciaDias: doc.requiereVencimiento ? 365 : null,
            requiereVencimiento: doc.requiereVencimiento,
            requiereArchivo: true,
            activo: true,
          },
        });
      }

      tiposDocumentales.push(tipoDoc);

      const regla = await prisma.reglaDocumentoTrabajador.findFirst({
        where: {
          empresaId: empresa.id,
          tipoDocumentoId: tipoDoc.id,
          cargoId: null,
          areaId: null,
          centroTrabajoId: null,
          tipoContrato: null,
        },
      });

      if (!regla) {
        await prisma.reglaDocumentoTrabajador.create({
          data: {
            empresaId: empresa.id,
            tipoDocumentoId: tipoDoc.id,
            obligatorio: true,
            activo: true,
          },
        });
      }
    }

    // ────── 8.6 DOCUMENTOS EMPRESA ────────────────────────────────────────
    console.log("8️⃣.6️⃣ Creando/verificando documentos de empresa...");
    const estadosEmpresa = ["Vigente", "En revisión", "Vencido", "Validado", "Enviado a firma"];
    for (let i = 0; i < DEMO_DATA.documentosEmpresa.length; i++) {
      const doc = DEMO_DATA.documentosEmpresa[i];
      const estado = estadosEmpresa[i % estadosEmpresa.length];
      const fechaEmision = new Date("2025-01-15");
      const fechaVencimiento = new Date("2026-12-31");
      const vinculo = DOCUMENTOS_EMPRESA_VINCULOS.get(doc.nombre);

      const requerido = vinculo
        ? await prisma.documentoRequeridoEmpresa.upsert({
            where: {
              nombre_categoria: {
                nombre: vinculo.nombre,
                categoria: vinculo.categoria,
              },
            },
            update: {
              descripcion: `Documento demo vinculado a ${doc.nombre}`,
              obligatorio: true,
              requiereVencimiento: doc.requiereVencimiento,
              periodicidadMeses: doc.requiereVencimiento ? 12 : null,
              orden: i + 1,
              activo: true,
            },
            create: {
              nombre: vinculo.nombre,
              categoria: vinculo.categoria,
              descripcion: `Documento demo vinculado a ${doc.nombre}`,
              obligatorio: true,
              requiereVencimiento: doc.requiereVencimiento,
              periodicidadMeses: doc.requiereVencimiento ? 12 : null,
              orden: i + 1,
              activo: true,
            },
          })
        : null;

      const existe = await prisma.documentoEmpresa.findFirst({
        where: {
          empresaId: empresa.id,
          nombre: doc.nombre,
        },
      });

      if (!existe) {
        await prisma.documentoEmpresa.create({
          data: {
            empresaId: empresa.id,
            subidoPorId: usuario.id,
            nombre: doc.nombre,
            categoria: doc.categoria,
            tipo: doc.tipo,
            estado,
            tieneVencimiento: doc.requiereVencimiento,
            fechaEmision,
            fechaVencimiento: doc.requiereVencimiento ? (estado === "vencido" ? new Date("2024-01-01") : fechaVencimiento) : null,
            archivoNombre: "demo-documento.pdf",
            archivoNombreOriginal: "demo-documento.pdf",
            archivoUrl: "/demo/documentos/demo-documento.pdf",
            archivoTipo: "application/pdf",
            archivoPeso: 153600,
            observaciones: estado === "En revisión" ? "Documento demo en revisión" : null,
            creadoPorEmail: usuario.email,
            documentoRequeridoId: requerido?.id ?? null,
          },
        });
      } else {
        await prisma.documentoEmpresa.update({
          where: { id: existe.id },
          data: {
            estado,
            archivoNombre: existe.archivoNombre || "demo-documento.pdf",
            archivoNombreOriginal: existe.archivoNombreOriginal || "demo-documento.pdf",
            archivoUrl: existe.archivoUrl || "/demo/documentos/demo-documento.pdf",
            archivoTipo: existe.archivoTipo || "application/pdf",
            archivoPeso: existe.archivoPeso || 153600,
            documentoRequeridoId: requerido?.id ?? existe.documentoRequeridoId,
          },
        });
      }
    }

    // ────── 9. DOCUMENTOS DE TRABAJADORES ───────────────────────────────────
    console.log("9️⃣ Creando/verificando documentos de trabajadores...");
    const estadosDoc = ["completo", "pendiente", "vencido", "rechazado", "en_revision"];

    for (let i = 0; i < trabajadores.length; i++) {
      const trab = trabajadores[i];
      const docsTrabajador = DEMO_DATA.documentosTrabajadorBase.filter((doc) => {
        if (doc.tipo !== "LICENCIA_HABILITANTE") return true;
        const cargoNombre = DEMO_DATA.cargos[DEMO_DATA.trabajadores[i].cargoIdx]?.nombre || "";
        return cargoNombre.includes("Guardia") || cargoNombre.includes("Técnico") || cargoNombre.includes("Supervisor");
      });

      for (let j = 0; j < docsTrabajador.length; j++) {
        const existe = await prisma.trabajadorDocumento.findFirst({
          where: {
            empresaId: empresa.id,
            trabajadorId: trab.id,
            tipo: docsTrabajador[j].tipo,
          },
        });

        const estado = estadosDoc[(i + j) % estadosDoc.length];
        const fechaVencimiento = new Date();
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + ((i + j) % 12) + 1);

        if (!existe) {
          await prisma.trabajadorDocumento.create({
            data: {
              empresaId: empresa.id,
              trabajadorId: trab.id,
              nombre: docsTrabajador[j].nombre,
              tipo: docsTrabajador[j].tipo,
              categoria: "documentos_generales",
              estado,
              tieneVencimiento: docsTrabajador[j].requiereVencimiento,
              archivoNombre: "demo-documento.pdf",
              archivoNombreOriginal: "demo-documento.pdf",
              archivoUrl: "/demo/documentos/demo-documento.pdf",
              archivoTipo: "application/pdf",
              archivoPeso: 102400,
              observaciones: estado === "rechazado" ? "Documento demo con observaciones" : null,
              fechaEmision: new Date("2025-06-01"),
              fechaVencimiento: docsTrabajador[j].requiereVencimiento
                ? (estado === "vencido" ? new Date("2024-01-01") : fechaVencimiento)
                : null,
              subidoPorId: usuario.id,
              creadoPorEmail: usuario.email,
            },
          });
        } else {
          await prisma.trabajadorDocumento.update({
            where: { id: existe.id },
            data: {
              nombre: existe.nombre || docsTrabajador[j].nombre,
              estado,
              archivoNombre: existe.archivoNombre || "demo-documento.pdf",
              archivoUrl: existe.archivoUrl || "/demo/documentos/demo-documento.pdf",
              archivoTipo: existe.archivoTipo || "application/pdf",
            },
          });
        }
      }
    }
    console.log(`   ✓ Documentos creados/verificados`);

    // ────── 10. INDUCCIONES ─────────────────────────────────────────────────
    console.log("🔟 Creando/verificando inducciones...");
    const estadosInduccion = ["pendiente", "en_progreso", "completada", "pendiente"];

    for (let i = 0; i < Math.floor(trabajadores.length * 0.8); i++) {
      const trab = trabajadores[i];
      const existe = await prisma.induccionTrabajador.findFirst({
        where: { trabajadorId: trab.id },
      });

      if (!existe) {
        const estado = estadosInduccion[Math.floor(Math.random() * estadosInduccion.length)];
        const token = `induction_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        await prisma.induccionTrabajador.create({
          data: {
            empresaId: empresa.id,
            trabajadorId: trab.id,
            token,
            estado,
            creadoPorId: usuario.id,
            fechaInicio: new Date(),
            fechaTermino: estado === "completada" ? new Date() : null,
          },
        });
      }
    }
    console.log(`   ✓ Inducciones creadas/verificadas`);

    // ────── 11. EPP ITEMS ────────────────────────────────────────────────────
    console.log("1️⃣1️⃣ Creando/verificando items EPP...");
    const eppItems = [];
    for (const item of DEMO_DATA.eppItems) {
      let e = await prisma.eppItem.findFirst({
        where: { empresaId: empresa.id, nombre: item.nombre },
      });

      if (!e) {
        e = await prisma.eppItem.create({
          data: {
            empresaId: empresa.id,
            nombre: item.nombre,
            codigo: item.codigo,
            activo: true,
          },
        });
        console.log(`   ✓ Item EPP: ${e.nombre}`);
      }
      eppItems.push(e);
    }

    // ────── 12. ENTREGAS EPP ────────────────────────────────────────────────
    console.log("1️⃣2️⃣ Creando/verificando entregas EPP...");
    for (let i = 0; i < Math.floor(trabajadores.length * 0.7); i++) {
      const trab = trabajadores[i];
      const existe = await prisma.entregaEpp.findFirst({
        where: { trabajadorId: trab.id },
      });

      if (!existe) {
        const estados = ["pendiente_firma", "firmada", "cancelada"];
        const estado = estados[Math.floor(Math.random() * estados.length)];

        const entrega = await prisma.entregaEpp.create({
          data: {
            empresaId: empresa.id,
            trabajadorId: trab.id,
            estado,
            creadoPorId: usuario.id,
            fechaEntrega: new Date(),
          },
        });

        // Agregar 2-3 items de EPP por entrega
        for (let j = 0; j < 3; j++) {
          await prisma.entregaEppDetalle.create({
            data: {
              entregaId: entrega.id,
              eppItemId: eppItems[j]?.id || null,
              nombre: eppItems[j]?.nombre || "Equipo de protección",
              cantidad: Math.floor(Math.random() * 3) + 1,
              talla: j === 3 ? ["S", "M", "L"][Math.floor(Math.random() * 3)] : null,
            },
          });
        }
      }
    }
    console.log(`   ✓ Entregas EPP creadas/verificadas`);

    // ────── 12.5 VEHÍCULOS Y EQUIPOS ──────────────────────────────────────
    console.log("1️⃣2️⃣.5️⃣ Creando/verificando vehículos y equipos...");
    const tiposVehiculo = new Map();
    for (const tipoDoc of DOCUMENTOS_VEHICULO_DEMO) {
      const tipo = await prisma.documentoTipoVehiculo.upsert({
        where: {
          empresaId_codigo: {
            empresaId: empresa.id,
            codigo: tipoDoc.codigo,
          },
        },
        update: {
          nombre: tipoDoc.nombre,
          descripcion: `Documento demo ${tipoDoc.nombre}`,
          requiereVencimiento: tipoDoc.requiereVencimiento,
          vigenciaDias: tipoDoc.vigenciaDias,
          requiereArchivo: true,
          activo: true,
        },
        create: {
          empresaId: empresa.id,
          codigo: tipoDoc.codigo,
          nombre: tipoDoc.nombre,
          descripcion: `Documento demo ${tipoDoc.nombre}`,
          requiereVencimiento: tipoDoc.requiereVencimiento,
          vigenciaDias: tipoDoc.vigenciaDias,
          requiereArchivo: true,
          activo: true,
        },
      });
      tiposVehiculo.set(tipoDoc.codigo, tipo);
    }

    const vehiculosCreados = [];
    const estadoDocVehiculoDemo = ["completo", "completo", "en_revision", "vencido", "pendiente"];

    for (let i = 0; i < VEHICULOS_EQUIPOS_DEMO.length; i++) {
      const item = VEHICULOS_EQUIPOS_DEMO[i];
      const centroId = centros[item.centroIdx]?.id || null;
      let vehiculo = await prisma.vehiculo.findFirst({
        where: {
          empresaId: empresa.id,
          patente: item.patente,
        },
      });

      if (!vehiculo) {
        vehiculo = await prisma.vehiculo.create({
          data: {
            empresaId: empresa.id,
            centroTrabajoId: centroId,
            patente: item.patente,
            codigoInterno: item.codigoInterno,
            tipo: item.tipo,
            marca: item.marca,
            modelo: item.modelo,
            anio: item.anio,
            estado: item.estado,
            responsable: item.responsable,
            proximaRevision: toIsoDate(daysFromNow((i + 1) * 20)),
            kilometraje: item.kilometraje,
            observaciones: `${item.nombre}. ${item.observaciones}`,
          },
        });
      } else {
        vehiculo = await prisma.vehiculo.update({
          where: { id: vehiculo.id },
          data: {
            centroTrabajoId: centroId,
            codigoInterno: item.codigoInterno,
            tipo: item.tipo,
            marca: item.marca,
            modelo: item.modelo,
            anio: item.anio,
            estado: item.estado,
            responsable: item.responsable,
            proximaRevision: vehiculo.proximaRevision || toIsoDate(daysFromNow((i + 1) * 20)),
            kilometraje: item.kilometraje,
            observaciones: `${item.nombre}. ${item.observaciones}`,
          },
        });
      }

      vehiculosCreados.push(vehiculo);

      for (let d = 0; d < DOCUMENTOS_VEHICULO_DEMO.length; d++) {
        const docBase = DOCUMENTOS_VEHICULO_DEMO[d];
        const estadoDoc = estadoDocVehiculoDemo[(i + d) % estadoDocVehiculoDemo.length];
        const fechaEmision = daysFromNow(-90 + d * 7);
        const fechaVencimiento = estadoDoc === "vencido" ? daysFromNow(-15) : daysFromNow(90 + d * 40);

        await prisma.vehiculoDocumento.upsert({
          where: {
            vehiculoId_tipo: {
              vehiculoId: vehiculo.id,
              tipo: docBase.codigo,
            },
          },
          update: {
            empresaId: empresa.id,
            tipoDocumentoId: tiposVehiculo.get(docBase.codigo)?.id || null,
            estado: estadoDoc,
            subido: estadoDoc !== "pendiente",
            vencimiento: toIsoDate(fechaVencimiento),
            fechaEmision,
            fechaVencimiento,
            archivoNombre: estadoDoc === "pendiente" ? null : `${docBase.codigo.toLowerCase()}-${vehiculo.patente}.pdf`,
            archivoNombreOriginal: estadoDoc === "pendiente" ? null : `${docBase.codigo.toLowerCase()}-${vehiculo.patente}.pdf`,
            archivoUrl: estadoDoc === "pendiente" ? null : `/demo/vehiculos/${docBase.codigo.toLowerCase()}-${vehiculo.patente}.pdf`,
            archivoTipo: estadoDoc === "pendiente" ? null : "application/pdf",
            archivoPeso: estadoDoc === "pendiente" ? null : 184320,
            observaciones: estadoDoc === "en_revision" ? "Documento en revisión por control interno" : null,
            subidoPorId: estadoDoc === "pendiente" ? null : usuario.id,
          },
          create: {
            empresaId: empresa.id,
            vehiculoId: vehiculo.id,
            tipoDocumentoId: tiposVehiculo.get(docBase.codigo)?.id || null,
            tipo: docBase.codigo,
            estado: estadoDoc,
            subido: estadoDoc !== "pendiente",
            vencimiento: toIsoDate(fechaVencimiento),
            fechaEmision,
            fechaVencimiento,
            archivoNombre: estadoDoc === "pendiente" ? null : `${docBase.codigo.toLowerCase()}-${vehiculo.patente}.pdf`,
            archivoNombreOriginal: estadoDoc === "pendiente" ? null : `${docBase.codigo.toLowerCase()}-${vehiculo.patente}.pdf`,
            archivoUrl: estadoDoc === "pendiente" ? null : `/demo/vehiculos/${docBase.codigo.toLowerCase()}-${vehiculo.patente}.pdf`,
            archivoTipo: estadoDoc === "pendiente" ? null : "application/pdf",
            archivoPeso: estadoDoc === "pendiente" ? null : 184320,
            observaciones: estadoDoc === "en_revision" ? "Documento en revisión por control interno" : null,
            subidoPorId: estadoDoc === "pendiente" ? null : usuario.id,
          },
        });
      }

      const mantencionFecha = toIsoDate(daysFromNow(-15 - i * 2));
      const mantencionEstado = i % 3 === 0 ? "completada" : i % 3 === 1 ? "programada" : "pendiente";
      const mantencionExistente = await prisma.vehiculoMantencion.findFirst({
        where: {
          vehiculoId: vehiculo.id,
          tipo: "mantencion_preventiva",
          fecha: mantencionFecha,
        },
      });

      if (!mantencionExistente) {
        await prisma.vehiculoMantencion.create({
          data: {
            vehiculoId: vehiculo.id,
            tipo: "mantencion_preventiva",
            fecha: mantencionFecha,
            estado: mantencionEstado,
            kilometraje: item.kilometraje,
            observaciones: `Mantención demo para ${item.nombre}`,
          },
        });
      }
    }
    console.log(`   ✓ Vehículos/equipos creados/verificados: ${vehiculosCreados.length}`);

    // ────── 13. CONTRATISTAS ────────────────────────────────────────────────
    console.log("1️⃣3️⃣ Creando/verificando contratistas...");
    const contratistasCreados = [];
    for (const cont of DEMO_DATA.contratistas) {
      let c = await prisma.contratista.findFirst({
        where: { empresaId: empresa.id, nombre: cont.nombre },
      });

      if (!c) {
        c = await prisma.contratista.create({
          data: {
            empresaId: empresa.id,
            nombre: cont.nombre,
            rut: cont.rut,
            razonSocial: cont.razonSocial,
            email: `contacto@${cont.nombre.toLowerCase().replace(/\s/g, "")}demo.cl`,
            activo: true,
          },
        });
        console.log(`   ✓ Contratista: ${c.nombre}`);
      }
      contratistasCreados.push(c);

      // Agregar documentos de contratista
      const tiposDocCont = ["CONTRATO", "CERTIFICADO_VIGENCIA", "POLIZA_SEGUROS"];
      for (const tipo of tiposDocCont) {
        const existeDoc = await prisma.contratistaDocumento.findFirst({
          where: {
            contratistaId: c.id,
            tipo,
          },
        });

        if (!existeDoc) {
          const estados = ["aprobado", "en_revision", "pendiente", "vencido", "rechazado"];
          const estado = estados[Math.floor(Math.random() * estados.length)];

          await prisma.contratistaDocumento.create({
            data: {
              contratistaId: c.id,
              empresaId: empresa.id,
              nombre: tipo,
              tipo,
              estado,
              fechaEmision: new Date("2025-06-01"),
              fechaVencimiento: estado === "vencido" ? new Date("2024-01-01") : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }

    // ────── 13.5 ACREDITACIONES ───────────────────────────────────────────
    console.log("1️⃣3️⃣.5️⃣ Creando/verificando acreditaciones demo...");

    const tiposTrabajadorAcreditacionNecesarios = [
      { codigo: "CONTRATO_TRABAJO", nombre: "Contrato de trabajo", requiereVencimiento: false },
      { codigo: "ENTREGA_EPP", nombre: "Entrega de EPP", requiereVencimiento: true },
      { codigo: "IRL", nombre: "IRL - Informe de Riesgos Laborales", requiereVencimiento: true },
      { codigo: "CERT_ANTECEDENTES", nombre: "Certificado antecedentes", requiereVencimiento: true },
    ];

    const tiposTrabajadorAcreditacion = new Map();
    for (const tipo of tiposTrabajadorAcreditacionNecesarios) {
      const tipoDoc = await prisma.documentoTipoTrabajador.upsert({
        where: {
          empresaId_codigo: {
            empresaId: empresa.id,
            codigo: tipo.codigo,
          },
        },
        update: {
          nombre: tipo.nombre,
          descripcion: `Tipo documental demo para ${tipo.nombre}`,
          requiereVencimiento: tipo.requiereVencimiento,
          vigenciaDias: tipo.requiereVencimiento ? 365 : null,
          requiereArchivo: true,
          activo: true,
        },
        create: {
          empresaId: empresa.id,
          codigo: tipo.codigo,
          nombre: tipo.nombre,
          descripcion: `Tipo documental demo para ${tipo.nombre}`,
          requiereVencimiento: tipo.requiereVencimiento,
          vigenciaDias: tipo.requiereVencimiento ? 365 : null,
          requiereArchivo: true,
          activo: true,
        },
      });
      tiposTrabajadorAcreditacion.set(tipo.codigo, tipoDoc);
    }

    const mandantesByNombre = new Map();
    for (const mandante of MANDANTES_ACREDITACION_DEMO) {
      const item = await prisma.mandanteAcreditacion.upsert({
        where: {
          empresaId_nombre: {
            empresaId: empresa.id,
            nombre: mandante.nombre,
          },
        },
        update: {
          rut: mandante.rut,
          tipo: mandante.tipo,
          activo: true,
        },
        create: {
          empresaId: empresa.id,
          nombre: mandante.nombre,
          rut: mandante.rut,
          tipo: mandante.tipo,
          activo: true,
        },
      });
      mandantesByNombre.set(mandante.nombre, item);
    }

    const reqEmpresaNombres = Array.from(
      new Set(
        PLANTILLAS_ACREDITACION_DEMO.flatMap((plantilla) =>
          plantilla.requisitos
            .map((req) => req.documentoRequeridoEmpresaNombre)
            .filter((value) => Boolean(value)),
        ),
      ),
    );

    const requeridosEmpresa = await prisma.documentoRequeridoEmpresa.findMany({
      where: {
        nombre: { in: reqEmpresaNombres },
      },
    });
    const requeridoEmpresaByNombre = new Map(requeridosEmpresa.map((item) => [item.nombre, item]));

    const tiposVehiculoByCodigo = new Map(
      (await prisma.documentoTipoVehiculo.findMany({
        where: {
          empresaId: empresa.id,
          codigo: { in: DOCUMENTOS_VEHICULO_DEMO.map((item) => item.codigo) },
        },
      })).map((item) => [item.codigo, item]),
    );

    const plantillasByNombre = new Map();
    for (const plantillaDemo of PLANTILLAS_ACREDITACION_DEMO) {
      const mandante = mandantesByNombre.get(plantillaDemo.mandante);
      let plantilla = await prisma.plantillaAcreditacion.findFirst({
        where: {
          empresaId: empresa.id,
          nombre: plantillaDemo.nombre,
          version: 1,
        },
      });

      if (!plantilla) {
        plantilla = await prisma.plantillaAcreditacion.create({
          data: {
            empresaId: empresa.id,
            mandanteId: mandante?.id ?? null,
            nombre: plantillaDemo.nombre,
            tipo: plantillaDemo.tipo,
            descripcion: plantillaDemo.descripcion,
            origen: "nextprev",
            activa: true,
            version: 1,
          },
        });
      } else {
        plantilla = await prisma.plantillaAcreditacion.update({
          where: { id: plantilla.id },
          data: {
            mandanteId: mandante?.id ?? null,
            tipo: plantillaDemo.tipo,
            descripcion: plantillaDemo.descripcion,
            activa: true,
          },
        });
      }

      const requisitosActuales = await prisma.requisitoPlantillaAcreditacion.findMany({
        where: { plantillaId: plantilla.id },
      });

      for (let r = 0; r < plantillaDemo.requisitos.length; r++) {
        const req = plantillaDemo.requisitos[r];
        const codigoDocumento = `${req.aplicaA}_${req.nombreDocumento}`.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
        const existente = requisitosActuales.find((item) => item.codigoDocumento === codigoDocumento);

        const payload = {
          nombreDocumento: req.nombreDocumento,
          codigoDocumento,
          categoria: req.categoria,
          aplicaA: req.aplicaA,
          obligatorio: req.obligatorio,
          requiereVencimiento: true,
          requiereRevisionManual: req.aplicaA !== "empresa",
          orden: r + 1,
          activo: true,
          documentoRequeridoEmpresaId: req.documentoRequeridoEmpresaNombre
            ? (requeridoEmpresaByNombre.get(req.documentoRequeridoEmpresaNombre)?.id ?? null)
            : null,
          documentoTipoTrabajadorId: req.documentoTipoTrabajadorCodigo
            ? (tiposTrabajadorAcreditacion.get(req.documentoTipoTrabajadorCodigo)?.id ?? null)
            : null,
          documentoTipoVehiculoId: req.documentoTipoVehiculoCodigo
            ? (tiposVehiculoByCodigo.get(req.documentoTipoVehiculoCodigo)?.id ?? null)
            : null,
        };

        if (existente) {
          await prisma.requisitoPlantillaAcreditacion.update({
            where: { id: existente.id },
            data: payload,
          });
        } else {
          await prisma.requisitoPlantillaAcreditacion.create({
            data: {
              plantillaId: plantilla.id,
              ...payload,
            },
          });
        }
      }

      const plantillaConRequisitos = await prisma.plantillaAcreditacion.findUnique({
        where: { id: plantilla.id },
        include: {
          requisitos: {
            where: { activo: true },
            orderBy: { orden: "asc" },
          },
        },
      });

      plantillasByNombre.set(plantillaDemo.nombre, plantillaConRequisitos);
    }

    const trabajadoresByRut = new Map(trabajadores.map((item) => [item.rut, item]));
    const vehiculosByPatente = new Map(
      (await prisma.vehiculo.findMany({
        where: {
          empresaId: empresa.id,
          patente: { in: VEHICULOS_EQUIPOS_DEMO.map((item) => item.patente) },
        },
      })).map((item) => [item.patente, item]),
    );
    const contratistasByNombre = new Map(contratistasCreados.map((item) => [item.nombre, item]));

    const acreditacionesDemo = [];
    for (const solicitud of SOLICITUDES_ACREDITACION_DEMO) {
      const mandante = mandantesByNombre.get(solicitud.mandante);
      const plantilla = plantillasByNombre.get(solicitud.plantilla);
      if (!mandante || !plantilla) continue;

      const contratista = solicitud.contratista ? contratistasByNombre.get(solicitud.contratista) : null;
      const trabajadoresSolicitud = solicitud.trabajadorRuts
        .map((rut) => trabajadoresByRut.get(rut))
        .filter((value) => Boolean(value));
      const vehiculosSolicitud = solicitud.vehiculos
        .map((patente) => vehiculosByPatente.get(patente))
        .filter((value) => Boolean(value));

      const fechaEnvio = ["enviado", "observada", "aprobado", "rechazado", "vencido"].includes(solicitud.estado)
        ? daysFromNow(-25)
        : null;
      const fechaRespuesta = ["observada", "aprobado", "rechazado", "vencido"].includes(solicitud.estado)
        ? daysFromNow(-12)
        : null;
      const fechaVencimiento = solicitud.estado === "vencido" ? daysFromNow(-3) : daysFromNow(65);

      let acreditacion = await prisma.acreditacion.findFirst({
        where: {
          empresaId: empresa.id,
          nombreProyecto: solicitud.nombreProyecto,
        },
      });

      if (!acreditacion) {
        acreditacion = await prisma.acreditacion.create({
          data: {
            empresaId: empresa.id,
            mandanteId: mandante.id,
            plantillaId: plantilla.id,
            contratistaId: contratista?.id ?? null,
            responsableId: usuario.id,
            nombreProyecto: solicitud.nombreProyecto,
            obraFaena: solicitud.obraFaena,
            estado: solicitud.estado,
            observaciones: `Solicitud demo ${solicitud.estado}`,
            fechaEnvio,
            fechaRespuesta,
            fechaVencimiento,
          },
        });
      } else {
        acreditacion = await prisma.acreditacion.update({
          where: { id: acreditacion.id },
          data: {
            mandanteId: mandante.id,
            plantillaId: plantilla.id,
            contratistaId: contratista?.id ?? null,
            responsableId: usuario.id,
            obraFaena: solicitud.obraFaena,
            estado: solicitud.estado,
            observaciones: `Solicitud demo ${solicitud.estado}`,
            fechaEnvio,
            fechaRespuesta,
            fechaVencimiento,
          },
        });
      }

      acreditacionesDemo.push(acreditacion);

      for (const trabajador of trabajadoresSolicitud) {
        await prisma.acreditacionTrabajador.upsert({
          where: {
            acreditacionId_trabajadorId: {
              acreditacionId: acreditacion.id,
              trabajadorId: trabajador.id,
            },
          },
          update: {},
          create: {
            acreditacionId: acreditacion.id,
            trabajadorId: trabajador.id,
          },
        });
      }

      for (const vehiculo of vehiculosSolicitud) {
        await prisma.acreditacionVehiculo.upsert({
          where: {
            acreditacionId_vehiculoId: {
              acreditacionId: acreditacion.id,
              vehiculoId: vehiculo.id,
            },
          },
          update: {},
          create: {
            acreditacionId: acreditacion.id,
            vehiculoId: vehiculo.id,
          },
        });
      }

      const requisitos = plantilla.requisitos ?? [];
      for (let r = 0; r < requisitos.length; r++) {
        const requisito = requisitos[r];
        const titulares = requisito.aplicaA === "empresa"
          ? [{ tipo: "empresa", id: null, nombre: empresa.nombre }]
          : requisito.aplicaA === "trabajador"
            ? trabajadoresSolicitud.map((trabajador) => ({
                tipo: "trabajador",
                id: trabajador.id,
                nombre: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
              }))
            : vehiculosSolicitud.map((vehiculo) => ({
                tipo: "vehiculo",
                id: vehiculo.id,
                nombre: `${vehiculo.patente} ${vehiculo.marca} ${vehiculo.modelo}`.trim(),
              }));

        for (let t = 0; t < titulares.length; t++) {
          const titular = titulares[t];
          const estadoDoc = estadoDocumentoDemo(solicitud.estado, r + t);
          const tieneArchivo = estadoDoc !== "faltante";
          const fechaDocVencimiento = estadoDoc === "vencido" ? daysFromNow(-5) : daysFromNow(120 + r * 10);

          const existente = await prisma.documentoAcreditacion.findFirst({
            where: {
              acreditacionId: acreditacion.id,
              requisitoId: requisito.id,
              titularTipo: titular.tipo,
              titularId: titular.id,
            },
          });

          const payload = {
            nombreDocumento: requisito.nombreDocumento,
            categoria: requisito.categoria,
            obligatorio: requisito.obligatorio,
            titularTipo: titular.tipo,
            titularId: titular.id,
            titularNombre: titular.nombre,
            estado: estadoDoc,
            archivoUrl: tieneArchivo ? `/demo/acreditaciones/${acreditacion.id}/${requisito.codigoDocumento || requisito.id}.pdf` : null,
            archivoNombre: tieneArchivo ? `${(requisito.codigoDocumento || requisito.id).toLowerCase()}.pdf` : null,
            fechaEmision: tieneArchivo ? daysFromNow(-35) : null,
            fechaVencimiento: tieneArchivo ? fechaDocVencimiento : null,
            fuenteTipo: tieneArchivo ? "manual" : null,
            fuenteId: null,
            observaciones: estadoDoc === "en_revision" ? "Documento observado para corrección" : null,
          };

          if (existente) {
            await prisma.documentoAcreditacion.update({
              where: { id: existente.id },
              data: payload,
            });
          } else {
            await prisma.documentoAcreditacion.create({
              data: {
                acreditacionId: acreditacion.id,
                requisitoId: requisito.id,
                ...payload,
              },
            });
          }
        }
      }

      const eventos = [
        { accion: "crear", detalle: "demo-seed: solicitud creada", estadoAnterior: null, estadoNuevo: "en_preparacion", dias: 30 },
        { accion: "agregar_documento", detalle: "demo-seed: documentos cargados", estadoAnterior: "en_preparacion", estadoNuevo: "listo_para_enviar", dias: 24 },
      ];

      if (["enviado", "observada", "aprobado", "rechazado", "vencido"].includes(solicitud.estado)) {
        eventos.push({ accion: "enviar", detalle: "demo-seed: solicitud enviada", estadoAnterior: "listo_para_enviar", estadoNuevo: "enviado", dias: 21 });
      }
      if (["observada", "aprobado", "rechazado"].includes(solicitud.estado)) {
        eventos.push({ accion: "observar", detalle: "demo-seed: observación enviada", estadoAnterior: "enviado", estadoNuevo: "observada", dias: 16 });
      }
      if (["aprobado"].includes(solicitud.estado)) {
        eventos.push({ accion: "corregir", detalle: "demo-seed: corrección recibida", estadoAnterior: "observada", estadoNuevo: "enviado", dias: 12 });
        eventos.push({ accion: "aprobar", detalle: "demo-seed: solicitud aprobada", estadoAnterior: "enviado", estadoNuevo: "aprobado", dias: 8 });
      }
      if (["rechazado"].includes(solicitud.estado)) {
        eventos.push({ accion: "rechazar", detalle: "demo-seed: solicitud rechazada", estadoAnterior: "observada", estadoNuevo: "rechazado", dias: 9 });
      }
      if (["vencido"].includes(solicitud.estado)) {
        eventos.push({ accion: "cerrar", detalle: "demo-seed: solicitud vencida", estadoAnterior: "enviado", estadoNuevo: "vencido", dias: 3 });
      }

      for (const evento of eventos) {
        const existente = await prisma.historialAcreditacion.findFirst({
          where: {
            acreditacionId: acreditacion.id,
            accion: evento.accion,
            detalle: evento.detalle,
          },
        });

        if (!existente) {
          await prisma.historialAcreditacion.create({
            data: {
              acreditacionId: acreditacion.id,
              usuarioId: usuario.id,
              accion: evento.accion,
              detalle: evento.detalle,
              estadoAnterior: evento.estadoAnterior,
              estadoNuevo: evento.estadoNuevo,
              createdAt: daysFromNow(-evento.dias),
            },
          });
        }
      }
    }

    console.log(`   ✓ Mandantes demo: ${MANDANTES_ACREDITACION_DEMO.length}`);
    console.log(`   ✓ Plantillas demo: ${PLANTILLAS_ACREDITACION_DEMO.length}`);
    console.log(`   ✓ Solicitudes demo: ${SOLICITUDES_ACREDITACION_DEMO.length}`);

    // ────── 14. CHECKLISTS ──────────────────────────────────────────────────
    console.log("1️⃣4️⃣ Creando/verificando templates de checklists...");
    const checklistsCreados = [];
    for (const checklist of DEMO_DATA.checklists) {
      let ch = await prisma.checklistTemplate.findFirst({
        where: { empresaId: empresa.id, nombre: checklist.nombre },
      });

      if (!ch) {
        ch = await prisma.checklistTemplate.create({
          data: {
            empresaId: empresa.id,
            nombre: checklist.nombre,
            creadoPorId: usuario.id,
            activo: true,
          },
        });

        // Agregar preguntas
        for (let i = 0; i < checklist.preguntas.length; i++) {
          await prisma.checklistPregunta.create({
            data: {
              templateId: ch.id,
              texto: checklist.preguntas[i],
              orden: i + 1,
              obligatorio: true,
            },
          });
        }

        console.log(`   ✓ Checklist: ${ch.nombre}`);
      }
      checklistsCreados.push(ch);
    }

    // ────── 15. EJECUCIONES DE CHECKLISTS ────────────────────────────────────
    console.log("1️⃣5️⃣ Creando/verificando ejecuciones de checklists...");
    for (let i = 0; i < checklistsCreados.length; i++) {
      const checklist = checklistsCreados[i];
      const preguntas = await prisma.checklistPregunta.findMany({ where: { templateId: checklist.id } });

      const cantidadActual = await prisma.checklistEjecucion.count({
        where: {
          empresaId: empresa.id,
          templateId: checklist.id,
        },
      });

      // Mantener exactamente 2 ejecuciones demo por checklist sin duplicar en re-ejecuciones
      for (let j = cantidadActual; j < 2; j++) {
          const ejecucion = await prisma.checklistEjecucion.create({
            data: {
              empresaId: empresa.id,
              templateId: checklist.id,
              ejecutadoPorId: usuario.id,
              centroTrabajoId: centros[i % centros.length]?.id || null,
              estado: "completada",
              observaciones: "Ejecución demo comercial",
              fechaEjecucion: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            },
          });

          // Agregar respuestas
          for (const pregunta of preguntas) {
            const respuestas = ["cumple", "no_cumple", "no_aplica"];
            const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];

            await prisma.checklistRespuesta.create({
              data: {
                ejecucionId: ejecucion.id,
                preguntaId: pregunta.id,
                respuesta,
                comentario: respuesta === "no_cumple" ? "Requiere seguimiento" : null,
              },
            });
          }
      }
    }
    console.log(`   ✓ Ejecuciones de checklists creadas/verificadas`);

    // ────── 16. HALLAZGOS ────────────────────────────────────────────────────
    console.log("1️⃣6️⃣ Creando/verificando hallazgos...");
    const tiposHallazgo = ["documental", "estructural", "evidencia", "comite_paritario", "procedimiento"];
    const prioridades = ["baja", "media", "alta", "critica"];
    const estadosHallazgo = ["abierto", "en_seguimiento", "resuelto"];

    for (let i = 0; i < 5; i++) {
      const existe = await prisma.hallazgoCumplimiento.findFirst({
        where: {
          empresaId: empresa.id,
          centroTrabajoId: centros[i % centros.length]?.id,
          tipo: tiposHallazgo[i % tiposHallazgo.length],
        },
      });

      if (!existe) {
        const fechaCompromiso = new Date();
        fechaCompromiso.setDate(fechaCompromiso.getDate() + Math.floor(Math.random() * 30) + 5);

        await prisma.hallazgoCumplimiento.create({
          data: {
            empresaId: empresa.id,
            centroTrabajoId: centros[i % centros.length]?.id || null,
            tipo: tiposHallazgo[i % tiposHallazgo.length],
            prioridad: prioridades[Math.floor(Math.random() * prioridades.length)],
            descripcion: `Hallazgo demo #${i + 1}: ${tiposHallazgo[i % tiposHallazgo.length]}`,
            estado: estadosHallazgo[Math.floor(Math.random() * estadosHallazgo.length)],
            fechaCompromiso,
            creadoPorId: usuario.id,
          },
        });
      }
    }
    console.log(`   ✓ Hallazgos creados/verificados`);

    // ────── 17. ACCIDENTES ───────────────────────────────────────────────────
    console.log("1️⃣7️⃣ Creando/verificando accidentes e investigaciones...");
    for (let i = 0; i < 2; i++) {
      const existe = await prisma.accidenteInvestigacion.findFirst({
        where: {
          empresaId: empresa.id,
          tipo: i === 0 ? "incidente" : "accidente",
        },
      });

      if (!existe) {
        const accidente = await prisma.accidenteInvestigacion.create({
          data: {
            empresaId: empresa.id,
            trabajadorId: trabajadores[i]?.id || trabajadores[0].id,
            centroTrabajoId: centros[0].id,
            creadoPorId: usuario.id,
            fechaAccidente: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            tipo: i === 0 ? "incidente" : "accidente",
            gravedad: i === 0 ? "leve" : "moderado",
            descripcion: i === 0 ? "Incidente demo sin lesiones" : "Accidente demo con investigación",
            causaProbable: "Causas ficticias para demo",
            estado: i === 0 ? "cerrada" : "en_investigacion",
            fechaCierre: i === 0 ? new Date() : null,
          },
        });

        // Agregar una acción correctiva
        await prisma.accidenteAccionCorrectiva.create({
          data: {
            empresaId: empresa.id,
            investigacionId: accidente.id,
            descripcion: "Acción correctiva demo",
            responsableId: usuario.id,
            plazo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            estado: i === 0 ? "completada" : "en_proceso",
            fechaCierre: i === 0 ? new Date() : null,
          },
        });
      }
    }
    console.log(`   ✓ Accidentes e investigaciones creados/verificados`);

    // ────── 18. PLAN DE TRABAJO ANUAL ───────────────────────────────────────
    console.log("1️⃣8️⃣ Creando/verificando plan de trabajo anual...");
    let plan = await prisma.planTrabajo.findFirst({
      where: { empresaId: empresa.id, anio: 2026 },
    });

    if (!plan) {
      plan = await prisma.planTrabajo.create({
        data: {
          empresaId: empresa.id,
          anio: 2026,
          estadoPlan: "aprobado",
          version: 1,
          aprobadoPor: usuario.nombre,
          aprobadoEn: new Date(),
        },
      });
      console.log(`   ✓ Plan de trabajo 2026 creado`);

      // Agregar actividades
      for (let i = 0; i < DEMO_DATA.planTrabajo2026.length; i++) {
        const actividad = DEMO_DATA.planTrabajo2026[i];
        const estados = {
          programada: 0.2,
          "en ejecución": 0.4,
          completada: 0.3,
          vencida: 0.1,
        };

        const estadoKeys = Object.keys(estados);
        const rand = Math.random();
        let estado = "programada";
        let acc = 0;
        for (const key of estadoKeys) {
          acc += estados[key];
          if (rand <= acc) {
            estado = key;
            break;
          }
        }

        await prisma.actividadPlanTrabajo.create({
          data: {
            planId: plan.id,
            actividad: actividad.actividad,
            normativa: actividad.normativa,
            categoria: actividad.categoria,
            periodicidad: actividad.periodicidad,
            responsable: actividad.responsable,
            centroContratista: actividad.centroContratista,
            estado,
            orden: i + 1,
          },
        });
      }

      console.log(`   ✓ ${DEMO_DATA.planTrabajo2026.length} actividades creadas`);
    } else {
      console.log(`   ↷ Plan de trabajo 2026 ya existe`);
    }

    const acreditacionDemoIds = acreditacionesDemo.map((item) => item.id);
    const [vehiculosDemoCount, plantillasDemoCount, solicitudesDemoCount, historialDemoCount, documentosDemoCount] = await Promise.all([
      prisma.vehiculo.count({
        where: {
          empresaId: empresa.id,
          patente: { in: VEHICULOS_EQUIPOS_DEMO.map((item) => item.patente) },
        },
      }),
      prisma.plantillaAcreditacion.count({
        where: {
          empresaId: empresa.id,
          nombre: { in: PLANTILLAS_ACREDITACION_DEMO.map((item) => item.nombre) },
        },
      }),
      prisma.acreditacion.count({
        where: {
          empresaId: empresa.id,
          nombreProyecto: { in: SOLICITUDES_ACREDITACION_DEMO.map((item) => item.nombreProyecto) },
        },
      }),
      prisma.historialAcreditacion.count({
        where: {
          acreditacionId: { in: acreditacionDemoIds.length > 0 ? acreditacionDemoIds : ["__none__"] },
        },
      }),
      prisma.documentoAcreditacion.count({
        where: {
          acreditacionId: { in: acreditacionDemoIds.length > 0 ? acreditacionDemoIds : ["__none__"] },
        },
      }),
    ]);

    console.log("\n✅ Seed de empresa demo completado exitosamente!\n");
    console.log("─────────────────────────────────────────────────");
    console.log("📊 Resumen de datos demo creados:");
    console.log(`  • Empresa: ${empresa.nombre}`);
    console.log(`  • Usuario: ${usuario.email} / Contraseña: ${DEMO_DATA.usuario.password}`);
    console.log(`  • Centros de trabajo: ${centros.length}`);
    console.log(`  • Trabajadores: ${trabajadores.length}`);
    console.log(`  • Contratistas: ${contratistasCreados.length}`);
    console.log(`  • Vehículos/equipos demo: ${vehiculosDemoCount}`);
    console.log(`  • Plantillas acreditación demo: ${plantillasDemoCount}`);
    console.log(`  • Solicitudes acreditación demo: ${solicitudesDemoCount}`);
    console.log(`  • Historial acreditación demo: ${historialDemoCount}`);
    console.log(`  • Documentos acreditación demo: ${documentosDemoCount}`);
    console.log(`  • Checklists: ${checklistsCreados.length}`);
    console.log(`  • Actividades plan 2026: ${DEMO_DATA.planTrabajo2026.length}`);
    console.log("─────────────────────────────────────────────────");
    console.log("\n🚀 Modo de uso:");
    console.log(`  Iniciar sesión en: http://localhost:3000/login`);
    console.log(`  Usuario: ${usuario.email}`);
    console.log(`  Contraseña: ${DEMO_DATA.usuario.password}`);
    console.log("\n");
  } catch (error) {
    console.error("\n❌ Error durante seed:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Execute ─────────────────────────────────────────────────────────────────
seedDemo().catch((e) => {
  console.error(e);
  process.exit(1);
});
