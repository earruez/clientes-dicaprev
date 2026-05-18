import { prisma } from "@/lib/prisma";
import { cumpleCondicionesDocumento } from "@/lib/documentacion/cumplimiento-documento";
import { REGLAS_DOCUMENTALES } from "@/lib/documentacion/reglas-documentales";

export type EstadoCumplimientoRegla = "cumple" | "faltante" | "incompleto" | "no_aplica";

export type DetalleCumplimientoRegla = {
  reglaId: string;
  codigo: string;
  nombre: string;
  entidad: "empresa" | "trabajador";
  estado: EstadoCumplimientoRegla;
  aplicable: boolean;
};

export type CumplimientoEmpresaResultado = {
  totalAplicables: number;
  totalCumple: number;
  totalFaltantes: number;
  totalIncompletos: number;
  porcentajeCumplimiento: number;
  detalles: DetalleCumplimientoRegla[];
};

const DEBUG_CUMPLIMIENTO_DOCUMENTAL =
  process.env.NODE_ENV !== "production" && process.env.DEBUG_CUMPLIMIENTO_DOCUMENTAL === "1";

const ESTADOS_VALIDOS = new Set(["aprobado", "vigente", "firmado"]);
const ESTADOS_INCOMPLETOS = new Set(["pendiente", "pendiente_firma", "en_revision"]);

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esReemplazado(estado: string | null | undefined) {
  return normalizeToken(estado) === "reemplazado";
}

function estadoDocumento(normalizedEstado: string): "valido" | "incompleto" | "otro" {
  if (ESTADOS_VALIDOS.has(normalizedEstado)) return "valido";
  if (ESTADOS_INCOMPLETOS.has(normalizedEstado)) return "incompleto";
  return "otro";
}

function reglaCoincideDocumento(reglaCodigo: string, reglaNombre: string, docTipo: string, docNombre: string) {
  const codigo = normalizeToken(reglaCodigo);
  const nombre = normalizeToken(reglaNombre);
  const tipoDoc = normalizeToken(docTipo);
  const nombreDoc = normalizeToken(docNombre);

  return tipoDoc === codigo || nombreDoc === nombre;
}

export async function calcularCumplimientoEmpresa({ empresaId }: { empresaId: string }): Promise<CumplimientoEmpresaResultado> {
  const [empresa, trabajadores, docsEmpresaRaw, docsTrabajadorRaw] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        tipoEmpresa: true,
        giro: true,
        tamanoEmpresa: true,
        cantidadTrabajadores: true,
      },
    }),
    prisma.trabajador.findMany({
      where: { empresaId, estado: { not: "inactivo" } },
      select: {
        id: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
    }),
    prisma.documentoEmpresa.findMany({
      where: { empresaId },
      select: {
        estado: true,
        tipo: true,
        nombre: true,
      },
    }),
    prisma.trabajadorDocumento.findMany({
      where: {
        empresaId,
        esVigente: true,
        trabajador: {
          estado: { not: "inactivo" },
        },
      },
      select: {
        trabajadorId: true,
        estado: true,
        tipo: true,
        nombre: true,
      },
    }),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  const docsEmpresa = docsEmpresaRaw.filter((doc) => !esReemplazado(doc.estado));
  const docsTrabajador = docsTrabajadorRaw.filter((doc) => !esReemplazado(doc.estado));

  const docsTrabajadorById = new Map<string, typeof docsTrabajador>();
  for (const doc of docsTrabajador) {
    const list = docsTrabajadorById.get(doc.trabajadorId) ?? [];
    list.push(doc);
    docsTrabajadorById.set(doc.trabajadorId, list);
  }

  const detalles: DetalleCumplimientoRegla[] = [];

  for (const regla of REGLAS_DOCUMENTALES) {
    if (regla.entidadAplicable === "empresa") {
      const aplica = cumpleCondicionesDocumento(regla, empresa);
      if (!aplica) {
        detalles.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "empresa",
          estado: "no_aplica",
          aplicable: false,
        });
        continue;
      }

      const docsAsociados = docsEmpresa.filter((doc) =>
        reglaCoincideDocumento(regla.codigo, regla.nombre, doc.tipo ?? "", doc.nombre),
      );

      if (docsAsociados.length === 0) {
        detalles.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "empresa",
          estado: "faltante",
          aplicable: true,
        });
        continue;
      }

      const estados = docsAsociados.map((doc) => estadoDocumento(normalizeToken(doc.estado)));
      const tieneValido = estados.includes("valido");
      const tieneIncompleto = estados.includes("incompleto") || estados.includes("otro");

      detalles.push({
        reglaId: regla.id,
        codigo: regla.codigo,
        nombre: regla.nombre,
        entidad: "empresa",
        estado: tieneValido ? "cumple" : tieneIncompleto ? "incompleto" : "faltante",
        aplicable: true,
      });
      continue;
    }

    const trabajadoresAplicables = trabajadores.filter((trabajador) =>
      cumpleCondicionesDocumento(regla, empresa, { cargo: trabajador.cargo }),
    );

    if (trabajadoresAplicables.length === 0) {
      detalles.push({
        reglaId: regla.id,
        codigo: regla.codigo,
        nombre: regla.nombre,
        entidad: "trabajador",
        estado: "no_aplica",
        aplicable: false,
      });
      continue;
    }

    let tieneFaltantes = false;
    let tieneIncompletos = false;

    for (const trabajador of trabajadoresAplicables) {
      const docsTrabajadorRegla = (docsTrabajadorById.get(trabajador.id) ?? []).filter((doc) =>
        reglaCoincideDocumento(regla.codigo, regla.nombre, doc.tipo, doc.nombre),
      );

      if (docsTrabajadorRegla.length === 0) {
        tieneFaltantes = true;
        continue;
      }

      const estados = docsTrabajadorRegla.map((doc) => estadoDocumento(normalizeToken(doc.estado)));
      const tieneValido = estados.includes("valido");
      if (!tieneValido) {
        tieneIncompletos = true;
      }
    }

    detalles.push({
      reglaId: regla.id,
      codigo: regla.codigo,
      nombre: regla.nombre,
      entidad: "trabajador",
      estado: tieneFaltantes ? "faltante" : tieneIncompletos ? "incompleto" : "cumple",
      aplicable: true,
    });
  }

  const aplicables = detalles.filter((item) => item.aplicable);
  const totalAplicables = aplicables.length;
  const totalCumple = aplicables.filter((item) => item.estado === "cumple").length;
  const totalFaltantes = aplicables.filter((item) => item.estado === "faltante").length;
  const totalIncompletos = aplicables.filter((item) => item.estado === "incompleto").length;
  const porcentajeCumplimiento = totalAplicables > 0 ? Number(((totalCumple / totalAplicables) * 100).toFixed(2)) : 100;

  if (DEBUG_CUMPLIMIENTO_DOCUMENTAL) {
    console.debug("[documentacion][cumplimiento-matriz]", {
      totalReglasEvaluadas: REGLAS_DOCUMENTALES.length,
      totalAplicables,
      totalCumple,
      totalFaltantes,
      totalIncompletos,
      docsEmpresaEncontrados: docsEmpresa.length,
      docsTrabajadorEncontrados: docsTrabajador.length,
    });
  }

  return {
    totalAplicables,
    totalCumple,
    totalFaltantes,
    totalIncompletos,
    porcentajeCumplimiento,
    detalles,
  };
}
