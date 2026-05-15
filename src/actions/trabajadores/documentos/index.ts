"use server";

import { findDocumentoEmpresaCanonicoPorRequerido } from "@/lib/documentacion/documento-empresa-duplicados";
import { cumpleCondicionesDocumento } from "@/lib/documentacion/cumplimiento-documento";
import { REGLAS_DOCUMENTALES, type ReglaDocumentalNextPrev } from "@/lib/documentacion/reglas-documentales";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { Worker } from "@/components/trabajadores-v2/types";
import type {
  DocumentoTrabajador,
  DocEstado,
  ReglaDocumental,
  TipoDocumento,
} from "@/components/trabajadores-v2/documental/types";

export type TipoDocumentoTrabajadorInput = {
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  vigenciaDias?: number | null;
  requiereVencimiento: boolean;
  requiereArchivo: boolean;
  activo?: boolean;
};

export type ReglaDocumentoTrabajadorInput = {
  tipoDocumentoId: string;
  cargoId?: string | null;
  areaId?: string | null;
  centroTrabajoId?: string | null;
  tipoContrato?: string | null;
  obligatorio: boolean;
  activo?: boolean;
};

export type ControlDocumentalTrabajadoresPayload = {
  workers: Worker[];
  tipos: TipoDocumento[];
  reglas: ReglaDocumental[];
  documentos: DocumentoTrabajador[];
};

export type EmpresaDocumentoMeta = {
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  direccion: string | null;
  logoUrl: string | null;
};

export type EstadoDocumentoTrabajadorInput =
  | "pendiente"
  | "en_revision"
  | "validado"
  | "enviado_firma"
  | "aprobado"
  | "firmado"
  | "rechazado"
  | "vencido"
  | "no_aplica"
  | "completo";

export type CreateTrabajadorDocumentoInput = {
  trabajadorId: string;
  tipoDocumentoId: string;
  estado: EstadoDocumentoTrabajadorInput;
  fechaEmision?: string;
  fechaVencimiento?: string;
  observaciones?: string;
  cargadoPor?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
  archivoTipo?: string;
  archivoPeso?: number;
};

export type UpdateTrabajadorDocumentoInput = {
  documentoId: string;
  estado?: EstadoDocumentoTrabajadorInput;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  observaciones?: string | null;
  cargadoPor?: string | null;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
};

export type HistorialDocumentoTrabajadorInput = {
  accion: string;
  detalle?: string;
  version?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
  archivoUrl?: string;
  archivoTipo?: string;
  archivoPeso?: number;
};

export type EvaluacionReglasTrabajadorResult = {
  trabajadorId: string;
  reglasEvaluadas: number;
  reglasAplicables: number;
  pendientesGenerados: number;
  documentosGeneradosIds: string[];
};

export type EvaluacionReglasEmpresaResult = {
  trabajadoresEvaluados: number;
  trabajadoresConPendientesNuevos: number;
  pendientesGenerados: number;
  detalles: EvaluacionReglasTrabajadorResult[];
};

export type EventoDocumental =
  | "trabajador_creado"
  | "trabajador_actualizado"
  | "empresa_actualizada"
  | "estructura_empresa_actualizada"
  | "reglas_documentales_actualizadas";

export type EvaluacionDocumentosPorEventoInput = {
  empresaId: string;
  evento: EventoDocumental;
  trabajadorId?: string;
  usuarioId?: string;
  email?: string;
};

export type EvaluacionDocumentosPorEventoResult = {
  evento: EventoDocumental;
  trabajadorId?: string;
  trabajadoresEvaluados: number;
  documentosTrabajadorGenerados: number;
  documentosEmpresaGenerados: number;
};

function mapDocEstado(estado: string): DocEstado {
  const normalized = estado.toLowerCase();
  if (normalized === "aprobado") return "completo";
  if (normalized === "completo" || normalized === "vigente") return "completo";
  if (normalized === "validado") return "validado";
  if (normalized === "enviado_firma") return "enviado_firma";
  if (normalized === "firmado") return "firmado";
  if (normalized === "vencido") return "vencido";
  if (normalized === "no_aplica") return "no_aplica";
  if (normalized === "en_revision") return "en_revision";
  if (normalized === "rechazado") return "rechazado";
  return "pendiente";
}

function normalizeEstadoForStorage(estado: EstadoDocumentoTrabajadorInput): string {
  if (estado === "aprobado") return "completo";
  return estado;
}

function mapPendingWorkflowEstado(estado?: string): "pendiente" | "en_revision" {
  const value = (estado ?? "").trim().toLowerCase();
  if (value === "pendiente_validacion") return "en_revision";
  if (value === "pendiente_firma") return "pendiente";
  if (value === "pendiente_completar") return "pendiente";
  if (value === "pendiente_asignacion") return "pendiente";
  return "pendiente";
}

function mapEstadoInicialDocumentoTrabajador(estado?: string): string {
  const value = (estado ?? "").trim().toLowerCase();
  if (value === "no_aplica") return "no_aplica";
  if (value === "en_revision") return "en_revision";
  if (value === "vigente") return "completo";
  return mapPendingWorkflowEstado(value);
}

function mapEstadoInicialDocumentoEmpresa(estado?: string): string {
  const value = (estado ?? "").trim().toLowerCase();
  if (!value || value === "borrador") return "pendiente_configuracion";
  if (value === "no_aplica") return "No aplica";
  if (value === "vigente") return "Vigente";
  if (value === "en_revision") return "Pendiente de carga";
  return "Pendiente de carga";
}

function parseOptionalDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha invalida");
  return parsed;
}

function inferCategoria(nombre: string): TipoDocumento["categoria"] {
  const n = nombre.toLowerCase();
  if (n.includes("examen") || n.includes("medic")) return "Médico";
  if (n.includes("inducci") || n.includes("capacit")) return "Capacitación";
  if (n.includes("epp") || n.includes("odi") || n.includes("ds44") || n.includes("sst")) return "SST";
  if (n.includes("licencia") || n.includes("competencia") || n.includes("técn") || n.includes("tecn")) return "Técnico";
  return "Contratación";
}

function mapWorkerRow(row: {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  estado: string;
  fechaIngreso: Date | null;
  fechaNacimiento: Date | null;
  tipoContrato: string | null;
  cargo: { nombre: string } | null;
  area: { nombre: string } | null;
  centroTrabajo: { nombre: string } | null;
  posicionDotacionId: string | null;
  documentos: { estado: string }[];
}): Worker {
  const pendientes = row.documentos.filter((d) => mapDocEstado(d.estado) !== "completo").length;

  return {
    id: row.id,
    nombre: row.nombres,
    apellido: row.apellidos,
    rut: row.rut ?? "",
    cargo: row.cargo?.nombre ?? "Sin cargo",
    area: row.area?.nombre ?? "Sin área",
    centroTrabajo: row.centroTrabajo?.nombre ?? "Sin centro",
    email: row.email ?? "",
    telefono: row.telefono ?? "",
    estado:
      row.estado === "inactivo"
        ? "Inactivo"
        : row.estado === "licencia"
          ? "Licencia"
          : row.estado === "vacaciones"
            ? "Vacaciones"
            : "Activo",
    fechaIngreso: row.fechaIngreso ? row.fechaIngreso.toISOString().slice(0, 10) : "",
    fechaNacimiento: row.fechaNacimiento ? row.fechaNacimiento.toISOString().slice(0, 10) : "",
    tipoContrato:
      row.tipoContrato === "Plazo Fijo" || row.tipoContrato === "Por Obra" || row.tipoContrato === "Part Time"
        ? row.tipoContrato
        : "Indefinido",
    documentosPendientes: pendientes,
    capacitacionesPendientes: 0,
    dotacionId: row.posicionDotacionId ?? undefined,
  };
}

function buildReglaNombre(rule: {
  cargo?: { nombre: string } | null;
  area?: { nombre: string } | null;
  centroTrabajo?: { nombre: string } | null;
  tipoContrato?: string | null;
  obligatorio: boolean;
}) {
  const tags: string[] = [];
  if (rule.area?.nombre) tags.push(`Área ${rule.area.nombre}`);
  if (rule.cargo?.nombre) tags.push(`Cargo ${rule.cargo.nombre}`);
  if (rule.centroTrabajo?.nombre) tags.push(`Centro ${rule.centroTrabajo.nombre}`);
  if (rule.tipoContrato) tags.push(`Contrato ${rule.tipoContrato}`);
  if (tags.length === 0) return rule.obligatorio ? "Base universal" : "Base opcional";
  return tags.join(" · ");
}

type TrabajadorEvaluable = {
  id: string;
  estado?: string | null;
  nombreCompleto?: string | null;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
  tipoContrato: string | null;
  cargo?: {
    perfilSST: string | null;
    descripcion: string | null;
  } | null;
};

type EmpresaEvaluable = {
  id: string;
  tipoEmpresa: string | null;
  giro: string | null;
  tamanoEmpresa: string | null;
  cantidadTrabajadores: number;
};

const DEBUG_REGLAS_DOCUMENTALES =
  process.env.NODE_ENV !== "production" && process.env.DEBUG_REGLAS_DOCUMENTALES === "1";

function normalizeDocName(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectarRiesgosDesdeContexto(
  empresa: EmpresaEvaluable,
  trabajador?: TrabajadorEvaluable,
): string[] {
  const source = normalizeDocName(
    `${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""} ${trabajador?.cargo?.perfilSST ?? ""} ${trabajador?.cargo?.descripcion ?? ""}`,
  );

  const riesgos: string[] = [];
  if (source.includes("ruido")) riesgos.push("ruido");
  if (source.includes("silice") || source.includes("silica")) riesgos.push("silice");
  if (source.includes("uv") || source.includes("radiacion")) riesgos.push("uv");
  if (source.includes("psicosocial")) riesgos.push("psicosocial");
  if (source.includes("tmert")) riesgos.push("tmert");
  if (source.includes("mmc") || source.includes("manual de carga")) riesgos.push("mmc");

  return Array.from(new Set(riesgos));
}

function getIndustriaDebug(empresa: EmpresaEvaluable): string {
  const source = normalizeDocName(`${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""}`);
  if (source.includes("constru")) return "construccion";
  if (source.includes("manufact")) return "manufactura";
  if (source.includes("miner")) return "mineria";
  if (source.includes("logist") || source.includes("transport")) return "logistica_transporte";
  if (source.includes("agro")) return "agroindustria";
  if (source.includes("alimento")) return "alimentos";
  if (source.includes("salud")) return "salud";
  if (source.includes("comerc")) return "comercio";
  return "servicios";
}

function filtrarReglasAplicables(
  empresa: EmpresaEvaluable,
  trabajador?: TrabajadorEvaluable,
): ReglaDocumentalNextPrev[] {
  const industriaEmpresa = getIndustriaDebug(empresa);
  const riesgosDetectados = detectarRiesgosDesdeContexto(empresa, trabajador);

  return REGLAS_DOCUMENTALES.filter((doc) => {
    const aplica = cumpleCondicionesDocumento(
      doc,
      {
        tipoEmpresa: empresa.tipoEmpresa,
        giro: empresa.giro,
        tamanoEmpresa: empresa.tamanoEmpresa,
        cantidadTrabajadores: empresa.cantidadTrabajadores,
      },
      trabajador
        ? {
            cargo: trabajador.cargo,
          }
        : undefined,
    );

    if (DEBUG_REGLAS_DOCUMENTALES) {
      console.debug("[documentacion][reglas]", {
        documento: doc.codigo,
        industriaEmpresa,
        riesgosDetectados,
        resultado: aplica,
        trabajadorId: trabajador?.id ?? null,
      });
    }

    return aplica;
  });
}

async function evaluarReglasDocumentalesTrabajadorInternal(
  context: { empresaId: string; usuarioId: string; email: string },
  trabajador: TrabajadorEvaluable,
  reglas: ReglaDocumentalNextPrev[],
): Promise<EvaluacionReglasTrabajadorResult> {
  const existentes = await prisma.trabajadorDocumento.findMany({
    where: { empresaId: context.empresaId, trabajadorId: trabajador.id },
    select: { tipo: true, nombre: true },
  });

  const existentesKeys = new Set<string>();
  existentes.forEach((doc) => {
    existentesKeys.add(doc.tipo.toLowerCase());
    existentesKeys.add(doc.nombre.toLowerCase());
  });

  const reglasAplicables = reglas.filter((regla) => normalizeDocName(regla.entidadAplicable) === "trabajador");

  const tiposPendientes = new Map<string, ReglaDocumentalNextPrev>();

  for (const regla of reglasAplicables) {
    const codigoKey = regla.codigo.toLowerCase();
    const nombreKey = regla.nombre.toLowerCase();
    if (existentesKeys.has(codigoKey) || existentesKeys.has(nombreKey)) continue;

    tiposPendientes.set(codigoKey, regla);
  }

  const documentosGeneradosIds: string[] = [];

  for (const regla of tiposPendientes.values()) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const documento = await tx.trabajadorDocumento.create({
          data: {
            trabajadorId: trabajador.id,
            empresaId: context.empresaId,
            nombre: regla.nombre,
            tipo: regla.codigo,
            categoria: "trabajador",
            estado: mapEstadoInicialDocumentoTrabajador(regla.workflow.estadoInicialSugerido),
            version: "1.0",
            tieneVencimiento: Boolean(regla.workflow.frecuenciaVigencia),
            observaciones: "Generado automáticamente por regla documental.",
            subidoPorId: context.usuarioId,
            creadoPorEmail: context.email,
          },
          select: { id: true, version: true },
        });

        await tx.trabajadorDocumentoHistorial.create({
          data: {
            documentoId: documento.id,
            usuarioId: context.usuarioId,
            accion: "DOCUMENTO_GENERADO_POR_REGLA",
            detalle: "Documento generado automáticamente por regla documental",
            version: documento.version,
          },
        });

        return documento;
      });

      documentosGeneradosIds.push(created.id);
      existentesKeys.add(regla.codigo.toLowerCase());
      existentesKeys.add(regla.nombre.toLowerCase());
    } catch {
      // Evita fallar toda la evaluación si otra ejecución creó el mismo documento en paralelo.
    }
  }

  return {
    trabajadorId: trabajador.id,
    reglasEvaluadas: REGLAS_DOCUMENTALES.length,
    reglasAplicables: reglasAplicables.length,
    pendientesGenerados: documentosGeneradosIds.length,
    documentosGeneradosIds,
  };
}

async function generarDocumentosBaseEmpresa(context: {
  empresaId: string;
  usuarioId: string;
  email: string;
  reglasAplicables: ReglaDocumentalNextPrev[];
}): Promise<number> {
  const [requeridos, existentes] = await Promise.all([
    prisma.documentoRequeridoEmpresa.findMany({
      where: { obligatorio: true, activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        categoria: true,
        requiereVencimiento: true,
      },
    }),
    prisma.documentoEmpresa.findMany({
      where: { empresaId: context.empresaId },
      select: { id: true, nombre: true, documentoRequeridoId: true },
    }),
  ]);

  const existentesPorRequerido = new Set<string>(
    existentes.map((doc) => doc.documentoRequeridoId).filter(Boolean) as string[],
  );
  const existentesPorNombre = new Set<string>(existentes.map((doc) => normalizeDocName(doc.nombre)));

  const requeridoPorNombre = new Map(requeridos.map((item) => [normalizeDocName(item.nombre), item]));

  const reglasEmpresa = context.reglasAplicables.filter(
    (regla) => normalizeDocName(regla.entidadAplicable) === "empresa",
  );

  let generated = 0;

  for (const regla of reglasEmpresa) {
    const requerido = requeridoPorNombre.get(normalizeDocName(regla.nombre));
    const target = {
      documentoRequeridoId: requerido?.id ?? null,
      nombre: requerido?.nombre ?? regla.nombre,
      categoria: requerido?.categoria ?? regla.categoria,
      requiereVencimiento: requerido?.requiereVencimiento ?? Boolean(regla.workflow.frecuenciaVigencia),
      estadoInicial: mapEstadoInicialDocumentoEmpresa(regla.workflow.estadoInicialSugerido),
      tipo: regla.codigo,
    };

    const duplicateByReq = Boolean(target.documentoRequeridoId && existentesPorRequerido.has(target.documentoRequeridoId));
    const duplicateByName = existentesPorNombre.has(normalizeDocName(target.nombre));
    if (duplicateByReq || duplicateByName) continue;

    if (target.documentoRequeridoId) {
      const existenteEnBd = await findDocumentoEmpresaCanonicoPorRequerido({
        empresaId: context.empresaId,
        documentoRequeridoId: target.documentoRequeridoId,
      });

      if (existenteEnBd) {
        existentesPorRequerido.add(target.documentoRequeridoId);
        existentesPorNombre.add(normalizeDocName(existenteEnBd.nombre));
        continue;
      }
    }

    try {
      const created = await prisma.documentoEmpresa.create({
        data: {
          empresaId: context.empresaId,
          nombre: target.nombre,
          categoria: target.categoria,
          tipo: target.tipo,
          estado: target.estadoInicial,
          version: "1.0",
          tieneVencimiento: target.requiereVencimiento,
          observaciones: "Generado automáticamente por regla documental.",
          subidoPorId: context.usuarioId,
          creadoPorEmail: context.email,
          documentoRequeridoId: target.documentoRequeridoId,
        },
        select: { id: true, version: true },
      });

      await prisma.documentoEmpresaHistorial.create({
        data: {
          documentoId: created.id,
          usuarioId: context.usuarioId,
          accion: "DOCUMENTO_GENERADO_POR_REGLA",
          detalle: "Documento generado automáticamente por regla documental",
          version: created.version,
        },
      });

      generated += 1;
      if (target.documentoRequeridoId) existentesPorRequerido.add(target.documentoRequeridoId);
      existentesPorNombre.add(normalizeDocName(target.nombre));
    } catch {
      // Evita colisión por concurrencia.
    }
  }

  return generated;
}

export async function evaluarDocumentosPendientesPorEvento(
  input: EvaluacionDocumentosPorEventoInput,
): Promise<EvaluacionDocumentosPorEventoResult> {
  const context = {
    empresaId: input.empresaId,
    usuarioId: input.usuarioId,
    email: input.email,
  };

  if (!context.usuarioId || !context.email) {
    const fallbackUsuario = await prisma.usuario.findFirst({
      where: { empresaId: input.empresaId },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    });
    if (!fallbackUsuario) {
      return {
        evento: input.evento,
        trabajadorId: input.trabajadorId,
        trabajadoresEvaluados: 0,
        documentosTrabajadorGenerados: 0,
        documentosEmpresaGenerados: 0,
      };
    }
    context.usuarioId = fallbackUsuario.id;
    context.email = fallbackUsuario.email;
  }

  const runtimeContext = {
    empresaId: context.empresaId,
    usuarioId: context.usuarioId,
    email: context.email,
  } as { empresaId: string; usuarioId: string; email: string };

  const result: EvaluacionDocumentosPorEventoResult = {
    evento: input.evento,
    trabajadorId: input.trabajadorId,
    trabajadoresEvaluados: 0,
    documentosTrabajadorGenerados: 0,
    documentosEmpresaGenerados: 0,
  };

  const empresa = await prisma.empresa.findFirst({
    where: { id: input.empresaId },
    select: {
      id: true,
      tipoEmpresa: true,
      giro: true,
      tamanoEmpresa: true,
      cantidadTrabajadores: true,
    },
  });

  if (!empresa) {
    return result;
  }

  if (input.evento === "empresa_actualizada") {
    const reglasAplicables = filtrarReglasAplicables(empresa);
    result.documentosEmpresaGenerados = await generarDocumentosBaseEmpresa({
      ...runtimeContext,
      reglasAplicables,
    });
    return result;
  }

  if (input.evento === "trabajador_creado" || input.evento === "trabajador_actualizado") {
    if (!input.trabajadorId) return result;

    const trabajador = await prisma.trabajador.findFirst({
      where: {
        id: input.trabajadorId,
        empresaId: input.empresaId,
        estado: { not: "inactivo" },
      },
      select: {
        id: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
    });

    if (!trabajador) return result;

    const reglasAplicables = filtrarReglasAplicables(empresa, trabajador);
    const evalResult = await evaluarReglasDocumentalesTrabajadorInternal(runtimeContext, trabajador, reglasAplicables);
    result.trabajadoresEvaluados = 1;
    result.documentosTrabajadorGenerados = evalResult.pendientesGenerados;
    return result;
  }

  const trabajadores = await prisma.trabajador.findMany({
    where: { empresaId: input.empresaId, estado: { not: "inactivo" } },
    select: {
      id: true,
      cargoId: true,
      areaId: true,
      centroTrabajoId: true,
      tipoContrato: true,
      cargo: {
        select: {
          perfilSST: true,
          descripcion: true,
        },
      },
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  for (const trabajador of trabajadores) {
    const reglasAplicables = filtrarReglasAplicables(empresa, trabajador);
    const evalResult = await evaluarReglasDocumentalesTrabajadorInternal(runtimeContext, trabajador, reglasAplicables);
    result.documentosTrabajadorGenerados += evalResult.pendientesGenerados;
  }
  result.trabajadoresEvaluados = trabajadores.length;

  if (
    input.evento === "estructura_empresa_actualizada" ||
    input.evento === "reglas_documentales_actualizadas"
  ) {
    const reglasAplicables = filtrarReglasAplicables(empresa);
    result.documentosEmpresaGenerados = await generarDocumentosBaseEmpresa({
      ...runtimeContext,
      reglasAplicables,
    });
  }

  return result;
}

export async function getTiposDocumentoTrabajador(): Promise<TipoDocumento[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.documentoTipoTrabajador.findMany({
    where: { empresaId, activo: true },
    orderBy: [{ nombre: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categoria: inferCategoria(row.nombre),
    descripcion: row.descripcion ?? "Documento configurable por empresa.",
    requiereVencimiento: row.requiereVencimiento,
    vencimientoMeses: row.vigenciaDias ? Math.max(1, Math.round(row.vigenciaDias / 30)) : null,
    esCritico: row.requiereArchivo || row.requiereVencimiento,
  }));
}

export async function getReglasDocumentoTrabajador(): Promise<ReglaDocumental[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.reglaDocumentoTrabajador.findMany({
    where: { empresaId, activo: true },
    include: {
      tipoDocumento: { select: { id: true } },
      cargo: { select: { nombre: true } },
      area: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    nombre: buildReglaNombre(row),
    descripcion: row.obligatorio
      ? "Regla automática obligatoria"
      : "Regla automática opcional",
    condicion: {
      cargo: row.cargo?.nombre,
      area: row.area?.nombre,
      tipoContrato: row.tipoContrato ?? undefined,
      centroTrabajo: row.centroTrabajo?.nombre,
    },
    tiposDocumentoIds: [row.tipoDocumento.id],
    activa: row.activo,
  }));
}

export async function getControlDocumentalTrabajadores(includeInactivos = false): Promise<ControlDocumentalTrabajadoresPayload> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const [trabajadoresRows, tiposRows, reglasRows] = await Promise.all([
    prisma.trabajador.findMany({
      where: includeInactivos
        ? { empresaId }
        : {
            empresaId,
            estado: {
              not: "inactivo",
            },
          },
      include: {
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
        documentos: { select: { estado: true } },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.documentoTipoTrabajador.findMany({
      where: { empresaId, activo: true },
      orderBy: [{ nombre: "asc" }],
    }),
    prisma.reglaDocumentoTrabajador.findMany({
      where: { empresaId, activo: true },
      include: {
        tipoDocumento: { select: { id: true } },
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  const workerIds = trabajadoresRows.map((w) => w.id);
  const docsRows = workerIds.length
    ? await prisma.trabajadorDocumento.findMany({
        where: { empresaId, trabajadorId: { in: workerIds } },
        select: {
          id: true,
          trabajadorId: true,
          tipo: true,
          estado: true,
          createdAt: true,
          fechaVencimiento: true,
          creadoPorEmail: true,
          observaciones: true,
          firmadoPor: true,
          firmadoEn: true,
        },
        orderBy: [{ createdAt: "desc" }],
      })
    : [];

  const tipos = tiposRows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categoria: inferCategoria(row.nombre),
    descripcion: row.descripcion ?? "Documento configurable por empresa.",
    requiereVencimiento: row.requiereVencimiento,
    vencimientoMeses: row.vigenciaDias ? Math.max(1, Math.round(row.vigenciaDias / 30)) : null,
    esCritico: row.requiereArchivo || row.requiereVencimiento,
  })) satisfies TipoDocumento[];

  const reglas = reglasRows.map((row) => ({
    id: row.id,
    nombre: buildReglaNombre(row),
    descripcion: row.obligatorio ? "Regla automática obligatoria" : "Regla automática opcional",
    condicion: {
      cargo: row.cargo?.nombre,
      area: row.area?.nombre,
      tipoContrato: row.tipoContrato ?? undefined,
      centroTrabajo: row.centroTrabajo?.nombre,
    },
    tiposDocumentoIds: [row.tipoDocumento.id],
    activa: row.activo,
  })) satisfies ReglaDocumental[];

  const tipoByCodigo = new Map(tiposRows.map((t) => [t.codigo.toLowerCase(), t.id]));
  const tipoByNombre = new Map(tiposRows.map((t) => [t.nombre.toLowerCase(), t.id]));

  const documentos = docsRows
    .map((row) => {
      const tipoRaw = row.tipo.toLowerCase();
      const tipoDocumentoId = tipoByCodigo.get(tipoRaw) ?? tipoByNombre.get(tipoRaw);
      if (!tipoDocumentoId) {
        // TODO(Fase 15.5): migrar catálogo legacy en TrabajadorDocumento.tipo para eliminar descartes por no mapeo.
        return null;
      }

      return {
        id: row.id,
        workerId: row.trabajadorId,
        tipoDocumentoId,
        estado: mapDocEstado(row.estado),
        fechaCarga: row.createdAt.toISOString().slice(0, 10),
        fechaVencimiento: row.fechaVencimiento ? row.fechaVencimiento.toISOString().slice(0, 10) : undefined,
        cargadoPor: row.creadoPorEmail ?? undefined,
        observacion: row.observaciones ?? undefined,
        firmadoPor: row.firmadoPor ?? undefined,
        firmadoEn: row.firmadoEn ? row.firmadoEn.toISOString() : undefined,
      } satisfies DocumentoTrabajador;
    })
    .filter(Boolean) as DocumentoTrabajador[];

  return {
    workers: trabajadoresRows.map(mapWorkerRow),
    tipos,
    reglas,
    documentos,
  };
}

export async function getEmpresaDocumentoMeta(): Promise<EmpresaDocumentoMeta> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      nombre: true,
      razonSocial: true,
      rut: true,
      direccion: true,
      logoUrl: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  return empresa;
}

export async function createTipoDocumentoTrabajador(
  data: TipoDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const created = await prisma.documentoTipoTrabajador.create({
    data: {
      empresaId,
      nombre: data.nombre.trim(),
      codigo: data.codigo.trim(),
      descripcion: data.descripcion?.trim() || null,
      vigenciaDias: data.vigenciaDias ?? null,
      requiereVencimiento: data.requiereVencimiento,
      requiereArchivo: data.requiereArchivo,
      activo: data.activo ?? true,
    },
    select: { id: true },
  });

  return created;
}

export async function updateTipoDocumentoTrabajador(
  id: string,
  data: Partial<TipoDocumentoTrabajadorInput>,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const updated = await prisma.documentoTipoTrabajador.updateMany({
    where: { id, empresaId },
    data: {
      nombre: data.nombre?.trim(),
      codigo: data.codigo?.trim(),
      descripcion: data.descripcion === undefined ? undefined : data.descripcion?.trim() || null,
      vigenciaDias: data.vigenciaDias,
      requiereVencimiento: data.requiereVencimiento,
      requiereArchivo: data.requiereArchivo,
      activo: data.activo,
    },
  });

  if (updated.count === 0) throw new Error("Tipo de documento no encontrado");
  return { id };
}

async function getTrabajadorDocumentoInEmpresa(empresaId: string, documentoId: string) {
  const documento = await prisma.trabajadorDocumento.findFirst({
    where: { id: documentoId, empresaId },
    select: {
      id: true,
      trabajadorId: true,
      empresaId: true,
      estado: true,
      version: true,
      tipo: true,
      nombre: true,
    },
  });

  if (!documento) {
    throw new Error("Documento de trabajador no encontrado");
  }

  return documento;
}

async function getTrabajadorAndTipoInEmpresa(empresaId: string, trabajadorId: string, tipoDocumentoId: string) {
  const [trabajador, tipoDocumento] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: { id: true },
    }),
    prisma.documentoTipoTrabajador.findFirst({
      where: { id: tipoDocumentoId, empresaId, activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        requiereVencimiento: true,
      },
    }),
  ]);

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (!tipoDocumento) {
    throw new Error("Tipo de documento no encontrado en la empresa actual");
  }

  return { trabajador, tipoDocumento };
}

async function validateDocumentoReferencesInEmpresa(
  empresaId: string,
  documento: { trabajadorId: string; tipo: string; nombre: string },
) {
  const [trabajador, tipoDocumento] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: documento.trabajadorId, empresaId },
      select: { id: true },
    }),
    prisma.documentoTipoTrabajador.findFirst({
      where: {
        empresaId,
        OR: [
          { codigo: documento.tipo },
          { nombre: documento.nombre },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (!tipoDocumento) {
    throw new Error("Tipo de documento no encontrado en la empresa actual");
  }
}

export async function registrarHistorialDocumentoTrabajador(
  documentoId: string,
  data: HistorialDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const historial = await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: documento.id,
      usuarioId,
      accion: data.accion,
      detalle: data.detalle?.trim() || null,
      version: data.version?.trim() || null,
      archivoNombre: data.archivoNombre?.trim() || null,
      archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
      archivoUrl: data.archivoUrl?.trim() || null,
      archivoTipo: data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso ?? null,
    },
    select: { id: true },
  });

  return historial;
}

export type HistorialEntryView = {
  id: string;
  accion: string;
  detalle: string | null;
  version: string | null;
  archivoNombre: string | null;
  archivoNombreOriginal: string | null;
  archivoUrl: string | null;
  archivoTipo: string | null;
  archivoPeso: number | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  createdAt: string;
};

export async function getHistorialDocumentoTrabajador(
  documentoId: string,
): Promise<HistorialEntryView[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);

  const entries = await prisma.trabajadorDocumentoHistorial.findMany({
    where: { documentoId: documento.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      accion: true,
      detalle: true,
      version: true,
      archivoNombre: true,
      archivoNombreOriginal: true,
      archivoUrl: true,
      archivoTipo: true,
      archivoPeso: true,
      createdAt: true,
      usuario: {
        select: { nombre: true, email: true },
      },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    accion: e.accion,
    detalle: e.detalle,
    version: e.version,
    archivoNombre: e.archivoNombre,
    archivoNombreOriginal: e.archivoNombreOriginal,
    archivoUrl: e.archivoUrl,
    archivoTipo: e.archivoTipo,
    archivoPeso: e.archivoPeso,
    usuarioNombre: e.usuario?.nombre ?? null,
    usuarioEmail: e.usuario?.email ?? null,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function createTrabajadorDocumento(
  data: CreateTrabajadorDocumentoInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const estado = normalizeEstadoForStorage(data.estado);
  const { tipoDocumento } = await getTrabajadorAndTipoInEmpresa(
    empresaId,
    data.trabajadorId,
    data.tipoDocumentoId,
  );

  const exists = await prisma.trabajadorDocumento.findUnique({
    where: {
      trabajadorId_tipo: {
        trabajadorId: data.trabajadorId,
        tipo: tipoDocumento.codigo,
      },
    },
    select: { id: true },
  });

  if (exists) {
    throw new Error("Ya existe un documento de este tipo para el trabajador");
  }

  const created = await prisma.trabajadorDocumento.create({
    data: {
      trabajadorId: data.trabajadorId,
      empresaId,
      nombre: tipoDocumento.nombre,
      tipo: tipoDocumento.codigo,
      categoria: "trabajador",
      estado,
      version: "1.0",
      archivoNombre: data.archivoNombre?.trim() || null,
      archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
      // TODO(Fase 15.8): persistir archivoUrl real cuando se implemente storage de archivos.
      archivoUrl: null,
      archivoTipo: data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso ?? null,
      tieneVencimiento: tipoDocumento.requiereVencimiento,
      fechaEmision: parseOptionalDate(data.fechaEmision) ?? null,
      fechaVencimiento: parseOptionalDate(data.fechaVencimiento) ?? null,
      observaciones: data.observaciones?.trim() || null,
      subidoPorId: usuarioId,
      creadoPorEmail: data.cargadoPor?.trim() || email,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: created.id,
      usuarioId,
      accion: "DOCUMENTO_CREADO",
      detalle: `Documento creado con estado ${estado}`,
      version: created.version,
      archivoNombre: data.archivoNombre?.trim() || null,
      archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
      archivoTipo: data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso ?? null,
    },
  });

  return { id: created.id };
}

/**
 * Guarda el contenido textual (generado o editado por el usuario) de un documento.
 * Usa el campo `observaciones` como almacén del contenido IA hasta que exista
 * una columna dedicada. Registra historial "CONTENIDO_EDITADO".
 */
export async function guardarContenidoIADocumento(
  documentoId: string,
  contenido: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      observaciones: contenido.trim() || null,
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "CONTENIDO_EDITADO",
      detalle: "Documento editado por usuario",
      version: updated.version,
    },
  });

  return { id: updated.id };
}

export async function updateTrabajadorDocumento(
  data: UpdateTrabajadorDocumentoInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, data.documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const normalizedEstado = data.estado ? normalizeEstadoForStorage(data.estado) : undefined;
  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: normalizedEstado,
      fechaEmision: parseOptionalDate(data.fechaEmision),
      fechaVencimiento: parseOptionalDate(data.fechaVencimiento),
      observaciones: data.observaciones === undefined ? undefined : data.observaciones?.trim() || null,
      creadoPorEmail: data.cargadoPor === undefined ? undefined : data.cargadoPor?.trim() || email,
      archivoNombre: data.archivoNombre === undefined ? undefined : data.archivoNombre?.trim() || null,
      archivoNombreOriginal:
        data.archivoNombreOriginal === undefined
          ? undefined
          : data.archivoNombreOriginal?.trim() || null,
      // TODO(Fase 15.8): actualizar archivoUrl cuando exista integración de storage.
      archivoTipo: data.archivoTipo === undefined ? undefined : data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso,
      subidoPorId: usuarioId,
    },
    select: { id: true, estado: true, version: true },
  });

  if (normalizedEstado && normalizedEstado !== documento.estado) {
    await prisma.trabajadorDocumentoHistorial.create({
      data: {
        documentoId: updated.id,
        usuarioId,
        accion: "ESTADO_ACTUALIZADO",
        detalle: `Estado ${documento.estado} -> ${normalizedEstado}`,
        version: updated.version,
      },
    });
  }

  return { id: updated.id };
}

export async function cambiarEstadoTrabajadorDocumento(
  documentoId: string,
  estado: EstadoDocumentoTrabajadorInput,
  detalle?: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);
  const normalizedEstado = normalizeEstadoForStorage(estado);

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: normalizedEstado,
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "ESTADO_ACTUALIZADO",
      detalle: detalle?.trim() || `Estado ${documento.estado} -> ${normalizedEstado}`,
      version: updated.version,
    },
  });

  return { id: updated.id };
}

export async function validarTrabajadorDocumento(
  documentoId: string,
  detalle?: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const estadoActual = (documento.estado ?? "").trim().toLowerCase();
  if (estadoActual !== "en_revision") {
    throw new Error("Solo se puede validar un documento en revisión");
  }

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: "validado",
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "DOCUMENTO_VALIDADO",
      detalle: detalle?.trim() || "Documento validado",
      version: updated.version,
    },
  });

  return { id: updated.id };
}

export async function enviarTrabajadorDocumentoAFirma(
  documentoId: string,
  detalle?: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const estadoActual = (documento.estado ?? "").trim().toLowerCase();
  if (estadoActual !== "validado") {
    throw new Error("Solo se puede enviar a firma un documento validado");
  }

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: "enviado_firma",
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "DOCUMENTO_ENVIADO_FIRMA",
      detalle: detalle?.trim() || "Documento enviado a firma",
      version: updated.version,
    },
  });

  return { id: updated.id };
}

export async function firmarTrabajadorDocumento(
  documentoId: string,
): Promise<{ id: string; firmadoPor: string; firmadoEn: Date }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const estadoActual = (documento.estado ?? "").trim().toLowerCase();
  if (estadoActual !== "enviado_firma") {
    throw new Error("Solo se puede firmar un documento enviado a firma");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { nombre: true, email: true },
  });

  const firmadoEn = new Date();
  const firmadoPor = usuario?.nombre ?? usuario?.email ?? usuarioId;

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: "firmado",
      firmado: true,
      firmadoPor,
      firmadoEn,
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "DOCUMENTO_FIRMADO",
      detalle: `Documento firmado por ${firmadoPor}`,
      version: updated.version,
    },
  });

  return { id: updated.id, firmadoPor, firmadoEn };
}

export async function evaluarReglasDocumentalesTrabajador(
  trabajadorId: string,
): Promise<EvaluacionReglasTrabajadorResult> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const [empresa, trabajador] = await Promise.all([
    prisma.empresa.findFirst({
      where: { id: empresaId },
      select: {
        id: true,
        tipoEmpresa: true,
        giro: true,
        tamanoEmpresa: true,
        cantidadTrabajadores: true,
      },
    }),
    prisma.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: {
        id: true,
        estado: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
    }),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (trabajador.estado === "inactivo") {
    return {
      trabajadorId,
      reglasEvaluadas: REGLAS_DOCUMENTALES.length,
      reglasAplicables: 0,
      pendientesGenerados: 0,
      documentosGeneradosIds: [],
    };
  }

  const reglasAplicables = filtrarReglasAplicables(empresa, trabajador);

  return evaluarReglasDocumentalesTrabajadorInternal(
    { empresaId, usuarioId, email },
    trabajador,
    reglasAplicables,
  );
}

export async function evaluarReglasDocumentalesEmpresa(): Promise<EvaluacionReglasEmpresaResult> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const [empresa, trabajadores] = await Promise.all([
    prisma.empresa.findFirst({
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
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  const detalles: EvaluacionReglasTrabajadorResult[] = [];

  for (const trabajador of trabajadores) {
    const reglasAplicables = filtrarReglasAplicables(empresa, trabajador);
    const result = await evaluarReglasDocumentalesTrabajadorInternal(
      { empresaId, usuarioId, email },
      trabajador,
      reglasAplicables,
    );
    detalles.push(result);
  }

  const pendientesGenerados = detalles.reduce((sum, item) => sum + item.pendientesGenerados, 0);

  return {
    trabajadoresEvaluados: detalles.length,
    trabajadoresConPendientesNuevos: detalles.filter((item) => item.pendientesGenerados > 0).length,
    pendientesGenerados,
    detalles,
  };
}

export async function createReglaDocumentoTrabajador(
  data: ReglaDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const created = await prisma.reglaDocumentoTrabajador.create({
    data: {
      empresaId,
      tipoDocumentoId: data.tipoDocumentoId,
      cargoId: data.cargoId ?? null,
      areaId: data.areaId ?? null,
      centroTrabajoId: data.centroTrabajoId ?? null,
      tipoContrato: data.tipoContrato ?? null,
      obligatorio: data.obligatorio,
      activo: data.activo ?? true,
    },
    select: { id: true },
  });

  return created;
}

export async function updateReglaDocumentoTrabajador(
  id: string,
  data: Partial<ReglaDocumentoTrabajadorInput>,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const updated = await prisma.reglaDocumentoTrabajador.updateMany({
    where: { id, empresaId },
    data: {
      tipoDocumentoId: data.tipoDocumentoId,
      cargoId: data.cargoId === undefined ? undefined : data.cargoId ?? null,
      areaId: data.areaId === undefined ? undefined : data.areaId ?? null,
      centroTrabajoId: data.centroTrabajoId === undefined ? undefined : data.centroTrabajoId ?? null,
      tipoContrato: data.tipoContrato === undefined ? undefined : data.tipoContrato ?? null,
      obligatorio: data.obligatorio,
      activo: data.activo,
    },
  });

  if (updated.count === 0) throw new Error("Regla documental no encontrada");
  return { id };
}
