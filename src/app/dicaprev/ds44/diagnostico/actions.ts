"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import {
  DS44_PREGUNTAS,
  type Ds44BloqueResultado,
  type Ds44Brecha,
  type Ds44DiagnosticoPayload,
  type Ds44DiagnosticoResumen,
  type Ds44EstadoDiagnosticoDashboard,
  type Ds44GuardarRespuestaInput,
  type Ds44PrioridadBrecha,
  type Ds44RespuestaValor,
} from "./catalogo";

type EstadoDiagnostico = "en_evaluacion" | "completado";

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getPuntaje(respuesta: Ds44RespuestaValor | null): number | null {
  if (respuesta === "si") return 100;
  if (respuesta === "no") return 0;
  if (respuesta === "no_aplica") return null;
  return null;
}

function prioridadPeso(prioridad: Ds44PrioridadBrecha): number {
  if (prioridad === "critica") return 4;
  if (prioridad === "alta") return 3;
  if (prioridad === "media") return 2;
  return 1;
}

function buildDiagnosticoPayload(args: {
  diagnosticoId: string | null;
  estado: EstadoDiagnostico;
  updatedAt: Date | null;
  respuestas: Array<{ preguntaClave: string; respuesta: Ds44RespuestaValor; observacion: string | null }>;
  hallazgos: Array<{ id: string; descripcion: string }>;
}): Ds44DiagnosticoPayload {
  const respuestaMap = new Map(
    args.respuestas.map((item) => [item.preguntaClave, { respuesta: item.respuesta, observacion: item.observacion ?? "" }]),
  );

  const bloquesMap = new Map<string, Ds44BloqueResultado>();

  for (const pregunta of DS44_PREGUNTAS) {
    if (!bloquesMap.has(pregunta.bloqueId)) {
      bloquesMap.set(pregunta.bloqueId, {
        bloqueId: pregunta.bloqueId,
        bloqueNombre: pregunta.bloqueNombre,
        score: null,
        preguntasAplicables: 0,
        preguntasRespondidas: 0,
        preguntasCumplidas: 0,
        preguntas: [],
      });
    }

    const bloque = bloquesMap.get(pregunta.bloqueId)!;
    const estado = respuestaMap.get(pregunta.preguntaClave);
    const respuesta = estado?.respuesta ?? null;
    const puntaje = getPuntaje(respuesta);

    if (respuesta !== null) {
      bloque.preguntasRespondidas += 1;
    }
    if (respuesta === "si") {
      bloque.preguntasCumplidas += 1;
    }
    if (respuesta === "si" || respuesta === "no") {
      bloque.preguntasAplicables += 1;
    }

    bloque.preguntas.push({
      ...pregunta,
      respuesta,
      observacion: estado?.observacion ?? "",
      puntaje,
    });
  }

  let bloquesEvaluados = 0;
  let sumaScoreBloques = 0;
  let preguntasCumplidasTotal = 0;

  const bloques = [...bloquesMap.values()].map((bloque) => {
    preguntasCumplidasTotal += bloque.preguntasCumplidas;

    const puntajesAplicables = bloque.preguntas
      .map((item) => item.puntaje)
      .filter((item): item is number => typeof item === "number");

    if (puntajesAplicables.length > 0) {
      const promedio = Math.round(
        puntajesAplicables.reduce((acc, item) => acc + item, 0) / puntajesAplicables.length,
      );
      bloque.score = promedio;
      bloquesEvaluados += 1;
      sumaScoreBloques += promedio;
    }

    return bloque;
  });

  const scoreGlobal = bloquesEvaluados > 0 ? Math.round(sumaScoreBloques / bloquesEvaluados) : null;

  const hallazgosNormalizados = args.hallazgos.map((hallazgo) => ({
    ...hallazgo,
    token: normalizeToken(hallazgo.descripcion),
  }));

  const brechas: Ds44Brecha[] = [];

  for (const bloque of bloques) {
    for (const pregunta of bloque.preguntas) {
      if (pregunta.respuesta !== "no") continue;

      const hallazgoRelacionado = hallazgosNormalizados.find((hallazgo) =>
        pregunta.keywordsHallazgo.some((keyword) => hallazgo.token.includes(normalizeToken(keyword))),
      );

      brechas.push({
        bloqueId: bloque.bloqueId,
        bloqueNombre: bloque.bloqueNombre,
        preguntaClave: pregunta.preguntaClave,
        preguntaTexto: pregunta.preguntaTexto,
        prioridad: pregunta.prioridad,
        recomendacion: pregunta.recomendacion,
        evidenciaEsperada: pregunta.evidenciaEsperada,
        rutaSugerida: pregunta.rutaSugerida,
        hallazgoRelacionadoId: hallazgoRelacionado?.id ?? null,
        hallazgoRelacionadoDescripcion: hallazgoRelacionado?.descripcion ?? null,
      });
    }
  }

  brechas.sort((a, b) => prioridadPeso(b.prioridad) - prioridadPeso(a.prioridad));

  const brechasCriticas = brechas.filter((item) => item.prioridad === "critica").length;
  const brechasAltas = brechas.filter((item) => item.prioridad === "alta").length;

  return {
    diagnosticoId: args.diagnosticoId,
    estado: args.estado,
    scoreGlobal,
    updatedAt: args.updatedAt ? args.updatedAt.toISOString() : null,
    bloques,
    brechas,
    kpis: {
      bloquesEvaluados,
      preguntasCumplidas: preguntasCumplidasTotal,
      brechasCriticas,
      brechasAltas,
    },
  };
}

async function getHallazgosAbiertosEmpresa(empresaId: string): Promise<Array<{ id: string; descripcion: string }>> {
  const hallazgos = await prisma.hallazgoCumplimiento.findMany({
    where: {
      empresaId,
      estado: {
        in: ["abierto", "en_proceso", "en_seguimiento"],
      },
    },
    select: {
      id: true,
      descripcion: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return hallazgos;
}

export async function getDs44DiagnosticoData(): Promise<Ds44DiagnosticoPayload> {
  const { empresaId } = await requirePermission("canReadCumplimiento");

  const diagnostico = await prisma.ds44Diagnostico.findFirst({
    where: { empresaId },
    include: {
      respuestas: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const hallazgos = await getHallazgosAbiertosEmpresa(empresaId);

  if (!diagnostico) {
    return buildDiagnosticoPayload({
      diagnosticoId: null,
      estado: "en_evaluacion",
      updatedAt: null,
      respuestas: [],
      hallazgos,
    });
  }

  return buildDiagnosticoPayload({
    diagnosticoId: diagnostico.id,
    estado: diagnostico.estado,
    updatedAt: diagnostico.updatedAt,
    respuestas: diagnostico.respuestas.map((item) => ({
      preguntaClave: item.preguntaClave,
      respuesta: item.respuesta,
      observacion: item.observacion,
    })),
    hallazgos,
  });
}

export async function saveDs44Diagnostico(input: { respuestas: Ds44GuardarRespuestaInput[] }): Promise<Ds44DiagnosticoPayload> {
  const { empresaId } = await requirePermission("canManageCumplimiento");

  const rawMap = new Map(input.respuestas.map((item) => [item.preguntaClave, item]));

  const respuestasPersistidas = DS44_PREGUNTAS.flatMap((pregunta) => {
    const fromInput = rawMap.get(pregunta.preguntaClave);
    if (!fromInput || fromInput.respuesta === null) {
      return [];
    }

    return [
      {
        bloque: pregunta.bloqueNombre,
        preguntaClave: pregunta.preguntaClave,
        preguntaTexto: pregunta.preguntaTexto,
        respuesta: fromInput.respuesta,
        puntaje: getPuntaje(fromInput.respuesta),
        observacion: fromInput.observacion?.trim() || null,
      },
    ];
  });

  const preguntasRespondidas = respuestasPersistidas.length;
  const estado: EstadoDiagnostico =
    preguntasRespondidas === DS44_PREGUNTAS.length ? "completado" : "en_evaluacion";

  const payloadPreSave = buildDiagnosticoPayload({
    diagnosticoId: null,
    estado,
    updatedAt: null,
    respuestas: respuestasPersistidas.map((item) => ({
      preguntaClave: item.preguntaClave,
      respuesta: item.respuesta,
      observacion: item.observacion,
    })),
    hallazgos: [],
  });

  const diagnostico = await prisma.$transaction(async (tx) => {
    const existente = await tx.ds44Diagnostico.findFirst({
      where: { empresaId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    const target = existente
      ? await tx.ds44Diagnostico.update({
          where: { id: existente.id },
          data: {
            estado,
            scoreGlobal: payloadPreSave.scoreGlobal,
          },
          select: { id: true, estado: true, updatedAt: true },
        })
      : await tx.ds44Diagnostico.create({
          data: {
            empresaId,
            estado,
            scoreGlobal: payloadPreSave.scoreGlobal,
          },
          select: { id: true, estado: true, updatedAt: true },
        });

    await tx.ds44DiagnosticoRespuesta.deleteMany({
      where: { diagnosticoId: target.id },
    });

    if (respuestasPersistidas.length > 0) {
      await tx.ds44DiagnosticoRespuesta.createMany({
        data: respuestasPersistidas.map((item) => ({
          diagnosticoId: target.id,
          bloque: item.bloque,
          preguntaClave: item.preguntaClave,
          preguntaTexto: item.preguntaTexto,
          respuesta: item.respuesta,
          puntaje: item.puntaje,
          observacion: item.observacion,
        })),
      });
    }

    return target;
  });

  revalidatePath("/dicaprev/ds44");
  revalidatePath("/dicaprev/ds44/diagnostico");

  const hallazgos = await getHallazgosAbiertosEmpresa(empresaId);

  return buildDiagnosticoPayload({
    diagnosticoId: diagnostico.id,
    estado: diagnostico.estado,
    updatedAt: diagnostico.updatedAt,
    respuestas: respuestasPersistidas.map((item) => ({
      preguntaClave: item.preguntaClave,
      respuesta: item.respuesta,
      observacion: item.observacion,
    })),
    hallazgos,
  });
}

export async function getDs44DiagnosticoResumen(): Promise<Ds44DiagnosticoResumen> {
  const data = await getDs44DiagnosticoData();

  if (!data.diagnosticoId) {
    return {
      existeDiagnostico: false,
      estado: "sin_diagnostico",
      scoreGlobal: null,
      brechasCriticas: 0,
      brechasAltas: 0,
      diagnosticoId: null,
      updatedAt: null,
    };
  }

  let estado: Ds44EstadoDiagnosticoDashboard = "en_evaluacion";
  if (data.estado === "completado") {
    if (data.kpis.brechasCriticas + data.kpis.brechasAltas > 0) {
      estado = "con_brechas";
    } else {
      estado = "controlado";
    }
  }

  return {
    existeDiagnostico: true,
    estado,
    scoreGlobal: data.scoreGlobal,
    brechasCriticas: data.kpis.brechasCriticas,
    brechasAltas: data.kpis.brechasAltas,
    diagnosticoId: data.diagnosticoId,
    updatedAt: data.updatedAt,
  };
}
