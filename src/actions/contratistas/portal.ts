"use server";

import { prisma } from "@/lib/prisma";
import { resolverPortalContratista } from "@/lib/contratistas/portal";
import { REQUISITOS_RECURSO, estadoVisibleRequisitoContratista, vencimientoEfectivoRequisito, type CategoriaContratista } from "@/lib/contratistas/requisitos";
import { formatRutChile, validarRutChile } from "@/lib/rut";
import { normalizarCargoContratista, claveAgrupacionCargoContratista } from "@/lib/contratistas/cargos";

function valido(input: string) {
  return input.trim().slice(0, 160);
}

function requisitosParaNuevoRecurso(
  tipo: Exclude<CategoriaContratista, "empresa">,
  reglas: { id: string; nombre: string; obligatorio: boolean; vigenciaMeses: number | null; condicional: boolean }[],
) {
  const nombreNormal = (nombre: string) => nombre.trim().toLocaleLowerCase("es");
  const basicos = REQUISITOS_RECURSO[tipo].map((d) => {
    const regla = tipo === "trabajador" ? reglas.find((r) => nombreNormal(r.nombre) === nombreNormal(d.nombre)) : undefined;
    return {
      nombre: d.nombre, categoria: d.categoria, obligatorio: regla?.obligatorio ?? d.obligatorio,
      reglaTrabajadorId: regla?.id || null, vigenciaMeses: regla?.vigenciaMeses || null,
      condicional: regla?.condicional || false,
    };
  });
  if (tipo !== "trabajador") return basicos;
  const nombres = new Set(basicos.map((d) => nombreNormal(d.nombre)));
  const adicionales = reglas.filter((r) => {
    const clave = nombreNormal(r.nombre);
    if (nombres.has(clave)) return false;
    nombres.add(clave);
    return true;
  }).map((r) => ({
    nombre: r.nombre, categoria: "trabajador", obligatorio: r.obligatorio, reglaTrabajadorId: r.id,
    vigenciaMeses: r.vigenciaMeses, condicional: r.condicional,
  }));
  return [...basicos, ...adicionales];
}

/**
 * Hereda una configuración de aplicabilidad cuando todos los trabajadores
 * existentes del mismo cargo comparten ese valor. No sobreescribe excepciones.
 */
function heredarPerfilCargo<T extends { reglaTrabajadorId: string | null; obligatorio: boolean }>(
  documentos: T[],
  expediente: Awaited<ReturnType<typeof resolverPortalContratista>>,
  cargo: string,
): T[] {
  const etiqueta = claveAgrupacionCargoContratista(cargo);
  if (!expediente || !etiqueta) return documentos;
  const trabajadores = expediente.recursos.filter((r) => r.tipo === "trabajador" &&
    claveAgrupacionCargoContratista(r.cargo || "") === etiqueta);
  if (!trabajadores.length) return documentos;
  return documentos.map((doc) => {
    if (!doc.reglaTrabajadorId) return doc;
    const estados = trabajadores.map((worker) => expediente.requisitos.find((r) =>
      r.recursoId === worker.id && r.reglaTrabajadorId === doc.reglaTrabajadorId));
    if (estados.some((r) => !r) || estados.some((r) => r?.obligatorio !== estados[0]?.obligatorio)) return doc;
    return { ...doc, obligatorio: estados[0]!.obligatorio };
  });
}

export async function obtenerPortalContratista(token: string) {
  const s = await resolverPortalContratista(token);
  if (!s) return null;
  const empresa = await prisma.empresa.findUnique({ where: { id: s.empresaId }, select: { nombre: true } });
  const recursosBase = await prisma.contratistaRecursoBase.findMany({ where: { empresaId: s.empresaId, contratistaId: s.contratistaId }, orderBy: { nombre: "asc" }, select: { id: true, tipo: true, nombre: true, identificador: true, patente: true, cargo: true } });
  return {
    nombre: s.nombre, faena: s.faena, servicio: s.servicio,
    estado: s.estado, contactoEmail: s.contactoEmail, empresaMandante: empresa?.nombre || "Empresa mandante",
    contratista: s.contratista, recursos: s.recursos, recursosBase,
    requisitos: s.requisitos.map((r) => ({ ...r, fechaVencimiento: vencimientoEfectivoRequisito(r.fechaVencimiento, r.fechaEmision, r.vigenciaMeses), estadoEfectivo: estadoVisibleRequisitoContratista(r.estado, r.archivoNombre, r.fechaVencimiento, r.fechaEmision, r.vigenciaMeses) })),
  };
}

export async function guardarDatosEmpresaPortal(token: string, input: {
  razonSocial: string;
  rut: string;
  giro?: string;
  direccion?: string;
  representanteLegal?: string;
  rutRepresentante?: string;
  telefono?: string;
}) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  if (!input.razonSocial?.trim() || !input.rut?.trim()) throw new Error("Completa razón social y RUT");
  await prisma.contratista.update({
    where: { id: s.contratistaId },
    data: {
      razonSocial: input.razonSocial.trim().slice(0, 180),
      rut: formatRutChile(input.rut).slice(0, 18),
      giro: valido(input.giro || "") || null,
      direccion: input.direccion?.trim().slice(0, 200) || null,
      representanteLegal: valido(input.representanteLegal || "") || null,
      rutRepresentante: input.rutRepresentante
        ? formatRutChile(input.rutRepresentante)
        : null,
      telefono: valido(input.telefono || "") || null,
    },
  });
  return { ok: true };
}

export async function agregarRecursoPortal(token: string, input: {
  tipo: Exclude<CategoriaContratista, "empresa">;
  nombre: string;
  identificador?: string;
  cargo?: string;
  patente?: string;
}) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  if (!(input.tipo in REQUISITOS_RECURSO)) throw new Error("Tipo de recurso inválido");
  const nombre = valido(input.nombre || "");
  if (!nombre) throw new Error("Indica el nombre del trabajador, vehículo o equipo");
  const identificadorBase = valido(input.identificador || "");
  const identificador =
    input.tipo === "trabajador" && identificadorBase
      ? formatRutChile(identificadorBase)
      : identificadorBase;
  const cargo = input.tipo === "trabajador" ? normalizarCargoContratista(input.cargo || "") : valido(input.cargo || "");
  const patente = valido(input.patente || "");
  if (input.tipo === "trabajador" && !validarRutChile(identificador)) throw new Error("El RUT del trabajador no es válido.");
  if (input.tipo === "vehiculo" && !patente) throw new Error("Indica la patente del vehículo");
  const existe = await prisma.contratistaRecurso.findFirst({
    where: {
      solicitudId: s.id, tipo: input.tipo,
      ...(input.tipo === "vehiculo" ? { patente } : { identificador: identificador || null, nombre }),
    },
    select: { id: true },
  });
  if (existe) throw new Error("Este recurso ya existe en el expediente");
  // El mismo recurso se conserva en la ficha permanente y se asocia a cada obra.
  // Su documentación y revisión, en cambio, continúan siendo independientes.
  const claveOriginal = input.tipo === "vehiculo" ? patente : identificador || nombre;
  const clave = claveOriginal.toUpperCase().normalize("NFD").replace(/[^A-Z0-9]/g, "");
  if (!clave) throw new Error("El recurso requiere una identificación válida");
  const r = await prisma.$transaction(async (tx) => {
    const base = await tx.contratistaRecursoBase.upsert({
      where: { contratistaId_tipo_clave: { contratistaId: s.contratistaId, tipo: input.tipo, clave } },
      update: { nombre, identificador: identificador || null, cargo: cargo || null, patente: patente || null },
      create: {
        empresaId: s.empresaId, contratistaId: s.contratistaId, tipo: input.tipo, clave, nombre,
        identificador: identificador || null, cargo: cargo || null, patente: patente || null,
      },
    });
    const reglas = input.tipo === "trabajador" ? await tx.contratistaRequisitoRegla.findMany({
      where: { solicitudId: s.id, empresaId: s.empresaId, activo: true },
      select: { id: true, nombre: true, obligatorio: true, vigenciaMeses: true, condicional: true },
    }) : [];
    return tx.contratistaRecurso.create({
      data: {
        empresaId: s.empresaId, solicitud: { connect: { id: s.id } },
        recursoBase: { connect: { id: base.id } }, tipo: input.tipo, nombre,
        identificador: identificador || null, cargo: cargo || null, patente: patente || null,
        requisitos: { create: heredarPerfilCargo(requisitosParaNuevoRecurso(input.tipo, reglas), s, cargo).map((d) => ({
          empresaId: s.empresaId, nombre: d.nombre, categoria: d.categoria, obligatorio: d.obligatorio,
          vigenciaMeses: d.vigenciaMeses, condicional: d.condicional,
          solicitud: { connect: { id: s.id } },
          ...(d.reglaTrabajadorId ? { reglaTrabajador: { connect: { id: d.reglaTrabajadorId } } } : {}),
        })) },
      },
      select: { id: true },
    });
  });
  await prisma.contratistaSolicitud.update({ where: { id: s.id }, data: { estado: ["en_revision", "observada"].includes(s.estado) ? s.estado : "enviada" } });
  return r;
}


/** Importación atómica: cada fila crea un recurso individual y todos sus requisitos documentales. */
export async function importarNominaContratistaPortal(
  token: string,
  filas: { nombre: string; rut: string; cargo?: string }[],
) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  if (!Array.isArray(filas) || filas.length === 0 || filas.length > 150) {
    throw new Error("La nómina debe contener entre 1 y 150 trabajadores.");
  }
  const normalizadas = filas.map((fila, index) => {
    const nombre = valido(String(fila.nombre || ""));
    const rut = formatRutChile(String(fila.rut || ""));
    const cargo = normalizarCargoContratista(String(fila.cargo || ""));
    const clave = rut.replace(/[^0-9K]/gi, "").toUpperCase();
    if (!nombre || !validarRutChile(rut) || !cargo) {
      throw new Error(`Fila ${index + 2}: nombre, RUT o cargo de trabajador no válido.`);
    }
    return { nombre, rut, cargo, clave };
  });
  const claves = normalizadas.map((r) => r.clave);
  if (new Set(claves).size !== claves.length) throw new Error("La nómina contiene RUT duplicados.");
  const existentes = new Set(s.recursos.filter((r) => r.tipo === "trabajador")
    .map((r) => (r.identificador || "").replace(/[^0-9K]/gi, "").toUpperCase()));
  const nuevos = normalizadas.filter((r) => !existentes.has(r.clave));
  if (!nuevos.length) return { creados: 0, omitidos: normalizadas.length };
  await prisma.$transaction(async (tx) => {
    const reglas = await tx.contratistaRequisitoRegla.findMany({
      where: { solicitudId: s.id, empresaId: s.empresaId, activo: true },
      select: { id: true, nombre: true, obligatorio: true, vigenciaMeses: true, condicional: true },
    });
    const requisitos = requisitosParaNuevoRecurso("trabajador", reglas);

    // Batch único: escala a 100+ trabajadores sin 100 transacciones ni N consultas.
    await tx.contratistaRecursoBase.createMany({
      data: nuevos.map((item) => ({
        empresaId: s.empresaId, contratistaId: s.contratistaId,
        tipo: "trabajador", clave: item.clave, nombre: item.nombre,
        identificador: item.rut, cargo: item.cargo || null,
      })),
      skipDuplicates: true,
    });
    const bases = await tx.contratistaRecursoBase.findMany({
      where: { contratistaId: s.contratistaId, tipo: "trabajador",
        clave: { in: nuevos.map((item) => item.clave) } },
      select: { id: true, clave: true },
    });
    const basePorClave = new Map(bases.map((base) => [base.clave, base.id]));
    if (basePorClave.size !== nuevos.length) throw new Error("No se pudo registrar toda la nómina.");
    await tx.contratistaRecurso.createMany({
      data: nuevos.map((item) => ({
        empresaId: s.empresaId, solicitudId: s.id, recursoBaseId: basePorClave.get(item.clave),
        tipo: "trabajador", nombre: item.nombre, identificador: item.rut,
        cargo: item.cargo || null,
      })),
    });
    const personas = await tx.contratistaRecurso.findMany({
      where: { empresaId: s.empresaId, solicitudId: s.id, tipo: "trabajador",
        identificador: { in: nuevos.map((item) => item.rut) } },
      select: { id: true, identificador: true },
    });
    const idsPorRut = new Map(personas.map((persona) => [persona.identificador, persona.id]));
    if (idsPorRut.size !== nuevos.length) throw new Error("No se pudieron crear todas las carpetas.");
    await tx.contratistaRequisito.createMany({
      data: nuevos.flatMap((item) => heredarPerfilCargo(requisitos, s, item.cargo).map((req) => ({
        empresaId: s.empresaId, solicitudId: s.id,
        recursoId: idsPorRut.get(item.rut) as string,
        nombre: req.nombre, categoria: req.categoria,
        obligatorio: req.obligatorio, condicional: req.condicional,
        vigenciaMeses: req.vigenciaMeses,
        reglaTrabajadorId: req.reglaTrabajadorId,
      }))),
    });
    await tx.contratistaSolicitud.update({
      where: { id: s.id }, data: { estado: ["en_revision", "observada"].includes(s.estado) ? s.estado : "enviada" },
    });
  }, { timeout: 20000 });
  return { creados: nuevos.length, omitidos: normalizadas.length - nuevos.length };
}

export async function incorporarRecursoBasePortal(token: string, recursoBaseId: string) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  const base = await prisma.contratistaRecursoBase.findFirst({
    where: { id: recursoBaseId, empresaId: s.empresaId, contratistaId: s.contratistaId },
  });
  if (!base) throw new Error("Recurso no encontrado en esta empresa");
  if (s.recursos.some((r) => r.recursoBaseId === base.id)) throw new Error("El recurso ya está incorporado en esta obra");
  const tipo = base.tipo as Exclude<CategoriaContratista, "empresa">;
  if (!(tipo in REQUISITOS_RECURSO)) throw new Error("Tipo de recurso no válido");
  await prisma.$transaction(async (tx) => {
    const reglas = tipo === "trabajador" ? await tx.contratistaRequisitoRegla.findMany({
      where: { solicitudId: s.id, empresaId: s.empresaId, activo: true },
      select: { id: true, nombre: true, obligatorio: true, vigenciaMeses: true, condicional: true },
    }) : [];
    await tx.contratistaRecurso.create({
      data: {
        empresaId: s.empresaId, solicitud: { connect: { id: s.id } },
        recursoBase: { connect: { id: base.id } }, tipo, nombre: base.nombre,
        identificador: base.identificador, cargo: base.cargo, patente: base.patente,
        requisitos: { create: heredarPerfilCargo(requisitosParaNuevoRecurso(tipo, reglas), s, normalizarCargoContratista(base.cargo || "")).map((d) => ({
          empresaId: s.empresaId, nombre: d.nombre, categoria: d.categoria, obligatorio: d.obligatorio,
          vigenciaMeses: d.vigenciaMeses, condicional: d.condicional,
          solicitud: { connect: { id: s.id } },
          ...(d.reglaTrabajadorId ? { reglaTrabajador: { connect: { id: d.reglaTrabajadorId } } } : {}),
        })) },
      },
    });
  });
  await prisma.contratistaSolicitud.update({ where: { id: s.id }, data: { estado: ["en_revision", "observada"].includes(s.estado) ? s.estado : "enviada" } });
  return { ok: true };
}

export async function eliminarRecursoPortal(token: string, recursoId: string) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  const r = await prisma.contratistaRecurso.findFirst({ where: { id: recursoId, solicitudId: s.id }, include: { requisitos: { select: { archivoNombre: true } } } });
  if (!r) throw new Error("Recurso no encontrado");
  if (r.requisitos.some((d) => d.archivoNombre)) throw new Error("No puedes eliminar un recurso con documentos cargados; solicita apoyo a la mandante");
  await prisma.contratistaRecurso.delete({ where: { id: r.id } });
  return { ok: true };
}

/**
 * Entregas parciales e independientes: la documentación empresarial no espera
 * la nómina ni los documentos de cada persona. Los pendientes permanecen visibles.
 */
export async function enviarCarpetaContratista(
  token: string,
  categoria?: "empresa" | "trabajador" | "vehiculo" | "equipo",
  recursoId?: string,
) {
  const s = await resolverPortalContratista(token);
  if (!s) throw new Error("Invitación inválida o vencida");
  if (!s.contratista.rut || !s.contratista.razonSocial) {
    throw new Error("Completa razón social y RUT de la empresa antes de enviar.");
  }
  const tipos = ["empresa", "trabajador", "vehiculo", "equipo"];
  if (categoria && !tipos.includes(categoria)) throw new Error("Categoría inválida");
  if (recursoId && (!categoria || categoria === "empresa" ||
    !s.recursos.some((r) => r.id === recursoId && r.tipo === categoria))) {
    throw new Error("El recurso no pertenece a esta solicitud.");
  }
  const seleccionados = s.requisitos.filter((r) =>
    (!categoria || r.categoria === categoria) &&
    (!recursoId || r.recursoId === recursoId) &&
    Boolean(r.archivoNombre) &&
    !["aprobado", "en_revision"].includes(r.estado) &&
    estadoEfectivo(r.estado, r.fechaVencimiento, r.fechaEmision, r.vigenciaMeses) !== "vencido",
  );
  if (!seleccionados.length) throw new Error("No hay documentos nuevos vigentes que enviar en esta carpeta.");
  await prisma.$transaction([
    prisma.contratistaRequisito.updateMany({
      where: { empresaId: s.empresaId, solicitudId: s.id, id: { in: seleccionados.map((r) => r.id) } },
      data: { estado: "en_revision", observacionRevision: null },
    }),
    prisma.contratistaSolicitud.update({
      where: { id: s.id }, data: { estado: "en_revision" },
    }),
  ]);
  return { ok: true, enviados: seleccionados.length };
}
