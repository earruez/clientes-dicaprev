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

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
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
    { nombres: "Claudia", apellidos: "Castillo Díaz", rut: "33.901.234-5", cargoIdx: 2, centroIdx: 4, estado: "pendiente_documental" },
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
};

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
      }
      trabajadores.push(t);
    }

    // ────── 9. DOCUMENTOS DE TRABAJADORES ───────────────────────────────────
    console.log("9️⃣ Creando/verificando documentos de trabajadores...");
    const tiposDoc = [
      { tipo: "CONTRATO_TRABAJO", nombre: "Contrato de trabajo" },
      { tipo: "CEDULA_IDENTIDAD", nombre: "Cédula de identidad" },
      { tipo: "IRL", nombre: "IRL - Informe de Riesgos Laborales" },
      { tipo: "REGLAMENTO_INTERNO", nombre: "Reglamento interno firmado" },
      { tipo: "ENTREGA_EPP", nombre: "Entrega de EPP" },
      { tipo: "CAPACITACION_INICIAL", nombre: "Capacitación inicial" },
    ];
    const estadosDoc = ["completo", "completo", "completo", "faltante", "vencido", "rechazado"];

    for (let i = 0; i < trabajadores.length; i++) {
      const trab = trabajadores[i];
      for (let j = 0; j < tiposDoc.length; j++) {
        const existe = await prisma.trabajadorDocumento.findFirst({
          where: {
            empresaId: empresa.id,
            trabajadorId: trab.id,
            tipo: tiposDoc[j].tipo,
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
              nombre: tiposDoc[j].nombre,
              tipo: tiposDoc[j].tipo,
              categoria: "documentos_generales",
              estado,
              observaciones: estado === "rechazado" ? "Documento demo con observaciones" : null,
              fechaEmision: new Date("2025-06-01"),
              fechaVencimiento: estado === "vencido" ? new Date("2024-01-01") : fechaVencimiento,
            },
          });
        } else {
          await prisma.trabajadorDocumento.update({
            where: { id: existe.id },
            data: {
              nombre: existe.nombre || tiposDoc[j].nombre,
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

    console.log("\n✅ Seed de empresa demo completado exitosamente!\n");
    console.log("─────────────────────────────────────────────────");
    console.log("📊 Resumen de datos demo creados:");
    console.log(`  • Empresa: ${empresa.nombre}`);
    console.log(`  • Usuario: ${usuario.email} / Contraseña: ${DEMO_DATA.usuario.password}`);
    console.log(`  • Centros de trabajo: ${centros.length}`);
    console.log(`  • Trabajadores: ${trabajadores.length}`);
    console.log(`  • Contratistas: ${contratistasCreados.length}`);
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
