import { prisma } from "@/lib/prisma";
import { calcularCumplimientoEmpresa } from "@/lib/documentacion/cumplimiento-empresa";

type EscenarioResult = {
  totalAplicables: number;
  totalCumple: number;
  totalFaltantes: number;
  totalIncompletos: number;
  porcentajeCumplimiento: number;
};

const TEST_COMPANY_NAME = "TEST_AUTOMATIZADO_CUMPLIMIENTO_NO_PROD";
const TEST_USER_EMAIL = "test.cumplimiento@dicaprev.local";

function printScenario(name: string, result: EscenarioResult, expected: string, ok: boolean) {
  const status = ok ? "OK" : "FAIL";
  console.log(`\\n[${status}] ${name}`);
  console.log(`Resultado: ${JSON.stringify(result)}`);
  console.log(`Esperado: ${expected}`);
}

function assertScenario(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Test fallo: ${message}`);
  }
}

async function resetTestDataset(empresaId: string) {
  await prisma.trabajadorDocumento.deleteMany({ where: { empresaId } });
  await prisma.documentoEmpresa.deleteMany({ where: { empresaId } });
  await prisma.trabajador.deleteMany({ where: { empresaId } });
  await prisma.cargo.deleteMany({ where: { empresaId } });
}

async function ensureTestContext() {
  let empresa = await prisma.empresa.findFirst({
    where: { nombre: TEST_COMPANY_NAME },
    select: { id: true },
  });

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nombre: TEST_COMPANY_NAME,
        tipoEmpresa: "servicios",
        giro: "servicios generales",
        tamanoEmpresa: "mediana",
        cantidadTrabajadores: 1,
      },
      select: { id: true },
    });
  }

  let usuario = await prisma.usuario.findUnique({
    where: { email: TEST_USER_EMAIL },
    select: { id: true, email: true },
  });

  if (!usuario) {
    usuario = await prisma.usuario.create({
      data: {
        nombre: "Test Cumplimiento",
        email: TEST_USER_EMAIL,
        rol: "ADMIN_EMPRESA",
        empresaId: empresa.id,
      },
      select: { id: true, email: true },
    });
  } else {
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { empresaId: empresa.id },
    });
  }

  return { empresaId: empresa.id, usuarioId: usuario.id, usuarioEmail: usuario.email };
}

async function main() {
  const ctx = await ensureTestContext();
  await resetTestDataset(ctx.empresaId);

  const cargo = await prisma.cargo.create({
    data: {
      empresaId: ctx.empresaId,
      nombre: "Operario Test",
      perfilSST: "Sin riesgo",
      descripcion: "Cargo de prueba",
    },
    select: { id: true },
  });

  const trabajador = await prisma.trabajador.create({
    data: {
      empresaId: ctx.empresaId,
      nombres: "Trabajador",
      apellidos: "Prueba",
      estado: "activo",
      tipoContrato: "Indefinido",
      cargoId: cargo.id,
    },
    select: { id: true },
  });

  await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: {
      tipoEmpresa: "servicios",
      giro: "servicios generales",
      tamanoEmpresa: "mediana",
      cantidadTrabajadores: 1,
    },
  });

  const escenarioA = await calcularCumplimientoEmpresa({ empresaId: ctx.empresaId });
  const okA = escenarioA.porcentajeCumplimiento === 0;
  printScenario("A. Empresa sin documentos", escenarioA, "porcentajeCumplimiento = 0", okA);
  assertScenario(okA, "Escenario A");

  await prisma.documentoEmpresa.createMany({
    data: [
      {
        empresaId: ctx.empresaId,
        nombre: "Politica de Seguridad y Salud en el Trabajo",
        categoria: "empresa",
        tipo: "DOC-001",
        estado: "vigente",
        version: "1.0",
        subidoPorId: ctx.usuarioId,
        creadoPorEmail: ctx.usuarioEmail,
      },
      {
        empresaId: ctx.empresaId,
        nombre: "Reglamento Interno SST",
        categoria: "empresa",
        tipo: "DOC-002",
        estado: "firmado",
        version: "1.0",
        subidoPorId: ctx.usuarioId,
        creadoPorEmail: ctx.usuarioEmail,
      },
    ],
  });

  await prisma.trabajadorDocumento.create({
    data: {
      trabajadorId: trabajador.id,
      empresaId: ctx.empresaId,
      nombre: "Induccion SST",
      tipo: "DOC-011",
      categoria: "trabajador",
      estado: "aprobado",
      version: "1.0",
      subidoPorId: ctx.usuarioId,
      creadoPorEmail: ctx.usuarioEmail,
    },
  });

  const escenarioB = await calcularCumplimientoEmpresa({ empresaId: ctx.empresaId });
  const okB = escenarioB.porcentajeCumplimiento === 100;
  printScenario("B. Empresa con todos los documentos aplicables", escenarioB, "porcentajeCumplimiento = 100", okB);
  assertScenario(okB, "Escenario B");

  await prisma.documentoEmpresa.updateMany({
    where: { empresaId: ctx.empresaId, tipo: "DOC-002" },
    data: { estado: "pendiente" },
  });
  await prisma.trabajadorDocumento.deleteMany({
    where: { empresaId: ctx.empresaId, tipo: "DOC-011" },
  });

  const escenarioC = await calcularCumplimientoEmpresa({ empresaId: ctx.empresaId });
  const okC = escenarioC.porcentajeCumplimiento > 0 && escenarioC.porcentajeCumplimiento < 100;
  printScenario("C. Empresa parcial", escenarioC, "porcentajeCumplimiento entre 0 y 100", okC);
  assertScenario(okC, "Escenario C");

  await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: { tipoEmpresa: "manufactura", giro: "planta con ruido" },
  });
  await prisma.cargo.update({
    where: { id: cargo.id },
    data: { perfilSST: "Exposicion a ruido" },
  });

  const escenarioD = await calcularCumplimientoEmpresa({ empresaId: ctx.empresaId });
  const okD = escenarioD.totalAplicables > escenarioC.totalAplicables;
  printScenario("D. Cambio de industria", escenarioD, "totalAplicables aumenta por activacion condicional", okD);
  assertScenario(okD, "Escenario D");

  const escenarioE1 = await calcularCumplimientoEmpresa({ empresaId: ctx.empresaId });
  const escenarioE2 = await calcularCumplimientoEmpresa({ empresaId: ctx.empresaId });
  const okE =
    escenarioE1.totalAplicables === escenarioE2.totalAplicables &&
    escenarioE1.totalCumple === escenarioE2.totalCumple &&
    escenarioE1.totalFaltantes === escenarioE2.totalFaltantes &&
    escenarioE1.totalIncompletos === escenarioE2.totalIncompletos &&
    escenarioE1.porcentajeCumplimiento === escenarioE2.porcentajeCumplimiento;

  printScenario("E. Idempotencia", escenarioE1, "dos ejecuciones consecutivas con mismo resultado", okE);
  assertScenario(okE, "Escenario E");

  console.log("\\nTodos los escenarios de test:cumplimiento finalizaron correctamente.");
}

main()
  .catch((error) => {
    console.error("\\nFAIL general en test:cumplimiento");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
