import { calcularCumplimientoEmpresa } from "@/lib/documentacion/cumplimiento-empresa";
import { cumpleCondicionesDocumento } from "@/lib/documentacion/cumplimiento-documento";
import { REGLAS_DOCUMENTALES, type ReglaDocumentalNextPrev } from "@/lib/documentacion/reglas-documentales";
import { prisma } from "@/lib/prisma";

type GenerarContenidoContexto = {
  empresa: {
    nombre: string;
    giro: string | null;
    tipoEmpresa: string | null;
    tamanoEmpresa: string | null;
  };
  trabajador?: {
    id: string;
    nombreCompleto: string;
  };
  industria: string;
  riesgos: string[];
};

/** Salida estructurada del generador de contenido IA. */
export type ContenidoGeneradoIA = {
  contenido: string;
  version: number;
  generadoPor: "IA";
  fecha: Date;
};

export type GeneracionDocumentoItem = {
  reglaId: string;
  codigo: string;
  nombre: string;
  entidad: "empresa" | "trabajador";
  accion: "generado" | "actualizado" | "omitido";
  documentoId: string | null;
  trabajadorId?: string;
};

export type GenerarDocumentosFaltantesResultado = {
  generados: number;
  actualizados: number;
  omitidos: number;
  items: GeneracionDocumentoItem[];
  logId: string | null;
};

// ─────────────────────────────────────────────
// CONTROL DE EJECUCIÓN – flag por empresa (singleton en proceso)
// ─────────────────────────────────────────────

const _ejecucionEnCurso = new Map<string, boolean>();

function marcarEnCurso(empresaId: string): boolean {
  if (_ejecucionEnCurso.get(empresaId)) return false;
  _ejecucionEnCurso.set(empresaId, true);
  return true;
}

function liberarEjecucion(empresaId: string): void {
  _ejecucionEnCurso.delete(empresaId);
}

const MAX_CONTENIDO_CHARS = 4000;

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferIndustria(empresa: { tipoEmpresa: string | null; giro: string | null }) {
  const source = normalizeToken(`${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""}`);
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

function inferRiesgos(input: {
  empresa: { tipoEmpresa: string | null; giro: string | null };
  regla: ReglaDocumentalNextPrev;
  trabajador?: { cargoPerfil: string | null; cargoDescripcion: string | null };
}) {
  const fromRule = input.regla.aplica.riesgos
    .map((item) => normalizeToken(item))
    .filter((item) => item && item !== "general" && item !== "todos");

  const source = normalizeToken(
    `${input.empresa.tipoEmpresa ?? ""} ${input.empresa.giro ?? ""} ${input.trabajador?.cargoPerfil ?? ""} ${input.trabajador?.cargoDescripcion ?? ""}`,
  );

  const inferred: string[] = [];
  if (source.includes("ruido")) inferred.push("ruido");
  if (source.includes("silice") || source.includes("silica")) inferred.push("silice");
  if (source.includes("uv") || source.includes("radiacion")) inferred.push("uv");
  if (source.includes("tmert")) inferred.push("tmert");
  if (source.includes("psicosocial")) inferred.push("psicosocial");

  return Array.from(new Set([...fromRule, ...inferred]));
}

// TODO: Integrar proveedor IA real (OpenAI / Azure OpenAI)
// TODO: Manejar tokens y costos antes de activar en produccion
// TODO: Agregar reintentos con backoff y control de errores de red
// TODO: Definir workflow completo de estados documentales (pendiente → en_revision → firmado → aprobado)
export function generarContenidoDocumento(
  doc: ReglaDocumentalNextPrev,
  contexto: GenerarContenidoContexto,
): ContenidoGeneradoIA {
  const riesgos = contexto.riesgos.length > 0 ? contexto.riesgos.join(", ") : "sin riesgos especificos";

  const lines = [
    `# ${doc.nombre}`,
    "",
    "## Contexto",
    `- Empresa: ${contexto.empresa.nombre}`,
    `- Industria: ${contexto.industria}`,
    `- Tamano empresa: ${contexto.empresa.tamanoEmpresa ?? "no informado"}`,
    `- Giro: ${contexto.empresa.giro ?? "no informado"}`,
    `- Riesgos detectados: ${riesgos}`,
    contexto.trabajador ? `- Trabajador: ${contexto.trabajador.nombreCompleto}` : null,
    "",
    "## Contenido sugerido (IA mock)",
    "1. Objetivo del documento.",
    "2. Alcance y responsables.",
    "3. Procedimiento / evidencia requerida.",
    "4. Frecuencia de actualizacion.",
    "5. Firma y aprobacion.",
    "",
    `Base normativa: ${doc.cumplimiento.baseNormativa.join(", ")}`,
  ].filter(Boolean).join("\n");

  // Proteccion: limitar tamano y asegurar contenido no vacio.
  const contenido =
    lines.length > 0
      ? lines.slice(0, MAX_CONTENIDO_CHARS)
      : `# ${doc.nombre}\n\nDocumento generado automaticamente.`;

  return {
    contenido,
    version: 1,
    generadoPor: "IA",
    fecha: new Date(),
  };
}

function isDocumentoValido(estado: string) {
  const normalized = normalizeToken(estado);
  return normalized === "aprobado" || normalized === "vigente" || normalized === "firmado";
}

export async function generarDocumentosFaltantesIA(params: {
  empresaId: string;
  usuarioId: string;
  email: string;
}): Promise<GenerarDocumentosFaltantesResultado> {
  // Control de ejecucion concurrente: una sola ejecucion activa por empresa.
  const adquirido = marcarEnCurso(params.empresaId);
  if (!adquirido) {
    throw new Error("Generacion en curso. Vuelve a intentarlo en unos segundos.");
  }

  const inicioMs = Date.now();

  try {
    return await _ejecutarGeneracion(params, inicioMs);
  } finally {
    liberarEjecucion(params.empresaId);
    console.info("[documentacion][ia] ejecucion finalizada", {
      empresaId: params.empresaId,
      duracionMs: Date.now() - inicioMs,
    });
  }
}

async function _ejecutarGeneracion(
  params: { empresaId: string; usuarioId: string; email: string },
  inicioMs: number,
): Promise<GenerarDocumentosFaltantesResultado> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: params.empresaId },
    select: {
      id: true,
      nombre: true,
      giro: true,
      tipoEmpresa: true,
      tamanoEmpresa: true,
      cantidadTrabajadores: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  const [trabajadores, cumplimiento] = await Promise.all([
    prisma.trabajador.findMany({
      where: { empresaId: params.empresaId, estado: { not: "inactivo" } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
    }),
    calcularCumplimientoEmpresa({ empresaId: params.empresaId }),
  ]);

  const reglasObjetivo = cumplimiento.detalles
    .filter((item) => item.estado === "faltante" || item.estado === "incompleto")
    .map((item) => REGLAS_DOCUMENTALES.find((regla) => regla.id === item.reglaId))
    .filter(Boolean) as ReglaDocumentalNextPrev[];

  // Si no hay documentos faltantes ni incompletos, salir sin procesar.
  if (reglasObjetivo.length === 0) {
    const log = await _registrarLog({ ...params, generados: 0, actualizados: 0, omitidos: 0, duracionMs: Date.now() - inicioMs });
    return { generados: 0, actualizados: 0, omitidos: 0, items: [], logId: log?.id ?? null };
  }

  const industria = inferIndustria({ tipoEmpresa: empresa.tipoEmpresa, giro: empresa.giro });
  const items: GeneracionDocumentoItem[] = [];
  let generados = 0;
  let actualizados = 0;
  let omitidos = 0;

  for (const regla of reglasObjetivo) {
    if (regla.entidadAplicable === "empresa") {
      const existentes = await prisma.documentoEmpresa.findMany({
        where: {
          empresaId: params.empresaId,
          OR: [{ tipo: regla.codigo }, { nombre: regla.nombre }],
          estado: { not: "Reemplazado" },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, estado: true, tipo: true, nombre: true },
      });

      const contexto = {
        empresa: {
          nombre: empresa.nombre,
          giro: empresa.giro,
          tipoEmpresa: empresa.tipoEmpresa,
          tamanoEmpresa: empresa.tamanoEmpresa,
        },
        industria,
        riesgos: inferRiesgos({ empresa, regla }),
      };

      const generado = generarContenidoDocumento(regla, contexto);

      if (existentes.length === 0) {
        const created = await prisma.documentoEmpresa.create({
          data: {
            empresaId: params.empresaId,
            nombre: regla.nombre,
            categoria: regla.categoria,
            tipo: regla.codigo,
            // faltante → pendiente (requiere revision humana)
            estado: "pendiente",
            version: `${generado.version}.0`,
            observaciones: generado.contenido,
            subidoPorId: params.usuarioId,
            creadoPorEmail: params.email,
            tieneVencimiento: Boolean(regla.workflow.frecuenciaVigencia),
          },
          select: { id: true },
        });

        await prisma.documentoEmpresaHistorial.create({
          data: {
            documentoId: created.id,
            usuarioId: params.usuarioId,
            accion: "DOCUMENTO_GENERADO_IA",
            detalle: "Documento generado automaticamente con IA (pendiente de revision)",
            version: `${generado.version}.0`,
          },
        });

        items.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "empresa",
          accion: "generado",
          documentoId: created.id,
        });
        generados += 1;
      } else {
        const doc = existentes[0];
        if (isDocumentoValido(doc.estado)) {
          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "empresa",
            accion: "omitido",
            documentoId: doc.id,
          });
          omitidos += 1;
        } else {
          // incompleto → en_revision (requiere aprobacion humana, no directamente vigente)
          // TODO: Definir workflow completo: en_revision → pendiente_firma → firmado → aprobado
          const updated = await prisma.documentoEmpresa.update({
            where: { id: doc.id },
            data: {
              estado: "en_revision",
              observaciones: generado.contenido,
              version: `${generado.version}.1`,
            },
            select: { id: true },
          });

          await prisma.documentoEmpresaHistorial.create({
            data: {
              documentoId: updated.id,
              usuarioId: params.usuarioId,
              accion: "DOCUMENTO_ACTUALIZADO_IA",
              detalle: "Documento actualizado con IA (en revision pendiente de aprobacion)",
              version: `${generado.version}.1`,
            },
          });

          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "empresa",
            accion: "actualizado",
            documentoId: updated.id,
          });
          actualizados += 1;
        }
      }

      continue;
    }

    const trabajadoresAplicables = trabajadores.filter((trabajador) =>
      cumpleCondicionesDocumento(
        regla,
        {
          tipoEmpresa: empresa.tipoEmpresa,
          giro: empresa.giro,
          tamanoEmpresa: empresa.tamanoEmpresa,
          cantidadTrabajadores: empresa.cantidadTrabajadores,
        },
        {
          cargo: {
            perfilSST: trabajador.cargo?.perfilSST,
            descripcion: trabajador.cargo?.descripcion,
          },
        },
      ),
    );

    for (const trabajador of trabajadoresAplicables) {
      const existente = await prisma.trabajadorDocumento.findFirst({
        where: {
          empresaId: params.empresaId,
          trabajadorId: trabajador.id,
          OR: [{ tipo: regla.codigo }, { nombre: regla.nombre }],
        },
        select: { id: true, estado: true, tipo: true, nombre: true },
      });

      const contexto = {
        empresa: {
          nombre: empresa.nombre,
          giro: empresa.giro,
          tipoEmpresa: empresa.tipoEmpresa,
          tamanoEmpresa: empresa.tamanoEmpresa,
        },
        trabajador: {
          id: trabajador.id,
          nombreCompleto: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
        },
        industria,
        riesgos: inferRiesgos({
          empresa,
          regla,
          trabajador: {
            cargoPerfil: trabajador.cargo?.perfilSST ?? null,
            cargoDescripcion: trabajador.cargo?.descripcion ?? null,
          },
        }),
      };

      const generado = generarContenidoDocumento(regla, contexto);

      if (!existente) {
        try {
          const created = await prisma.trabajadorDocumento.create({
            data: {
              trabajadorId: trabajador.id,
              empresaId: params.empresaId,
              nombre: regla.nombre,
              tipo: regla.codigo,
              categoria: "trabajador",
              // faltante → pendiente
              estado: "pendiente",
              version: `${generado.version}.0`,
              observaciones: generado.contenido,
              subidoPorId: params.usuarioId,
              creadoPorEmail: params.email,
              tieneVencimiento: Boolean(regla.workflow.frecuenciaVigencia),
            },
            select: { id: true },
          });

          await prisma.trabajadorDocumentoHistorial.create({
            data: {
              documentoId: created.id,
              usuarioId: params.usuarioId,
              accion: "DOCUMENTO_GENERADO_IA",
              detalle: "Documento generado automaticamente con IA (pendiente de revision)",
              version: `${generado.version}.0`,
            },
          });

          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "trabajador",
            accion: "generado",
            documentoId: created.id,
            trabajadorId: trabajador.id,
          });
          generados += 1;
        } catch {
          // Evita romper la ejecucion por condiciones de carrera con indice unico.
          items.push({
            reglaId: regla.id,
            codigo: regla.codigo,
            nombre: regla.nombre,
            entidad: "trabajador",
            accion: "omitido",
            documentoId: null,
            trabajadorId: trabajador.id,
          });
          omitidos += 1;
        }
      } else if (isDocumentoValido(existente.estado)) {
        items.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "trabajador",
          accion: "omitido",
          documentoId: existente.id,
          trabajadorId: trabajador.id,
        });
        omitidos += 1;
      } else {
        // incompleto → en_revision
        // TODO: Definir workflow completo de estados documentales
        const updated = await prisma.trabajadorDocumento.update({
          where: { id: existente.id },
          data: {
            estado: "en_revision",
            observaciones: generado.contenido,
            version: `${generado.version}.1`,
          },
          select: { id: true },
        });

        await prisma.trabajadorDocumentoHistorial.create({
          data: {
            documentoId: updated.id,
            usuarioId: params.usuarioId,
            accion: "DOCUMENTO_ACTUALIZADO_IA",
            detalle: "Documento actualizado con IA (en revision pendiente de aprobacion)",
            version: `${generado.version}.1`,
          },
        });

        items.push({
          reglaId: regla.id,
          codigo: regla.codigo,
          nombre: regla.nombre,
          entidad: "trabajador",
          accion: "actualizado",
          documentoId: updated.id,
          trabajadorId: trabajador.id,
        });
        actualizados += 1;
      }
    }
  }

  console.info("[documentacion][ia] documentos procesados", {
    empresaId: params.empresaId,
    generados,
    actualizados,
    omitidos,
    duracionMs: Date.now() - inicioMs,
  });

  // Registro de auditoria en DB.
  const log = await _registrarLog({ ...params, generados, actualizados, omitidos, duracionMs: Date.now() - inicioMs });

  return {
    generados,
    actualizados,
    omitidos,
    items,
    logId: log?.id ?? null,
  };
}

// ─────────────────────────────────────────────
// AUDITORÍA – guardar log de ejecucion
// ─────────────────────────────────────────────

async function _registrarLog(params: {
  empresaId: string;
  usuarioId: string;
  generados: number;
  actualizados: number;
  omitidos: number;
  duracionMs: number;
}): Promise<{ id: string } | null> {
  try {
    return await prisma.generacionDocumentosLog.create({
      data: {
        empresaId: params.empresaId,
        usuarioId: params.usuarioId,
        generados: params.generados,
        actualizados: params.actualizados,
        omitidos: params.omitidos,
        duracionMs: params.duracionMs,
      },
      select: { id: true },
    });
  } catch (err) {
    // No bloquear la respuesta si el log falla.
    console.error("[documentacion][ia] error al registrar log de auditoria", err);
    return null;
  }
}
