"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type Ds44RespuestaValor = "si" | "no" | "no_aplica";
export type Ds44PrioridadBrecha = "critica" | "alta" | "media" | "baja";
export type Ds44EstadoDiagnosticoDashboard = "sin_diagnostico" | "en_evaluacion" | "con_brechas" | "controlado";

export type Ds44PreguntaDef = {
  bloqueId: string;
  bloqueNombre: string;
  preguntaClave: string;
  preguntaTexto: string;
  prioridad: Ds44PrioridadBrecha;
  recomendacion: string;
  evidenciaEsperada: string;
  rutaSugerida: string;
  keywordsHallazgo: string[];
};

export type Ds44PreguntaEstado = Ds44PreguntaDef & {
  respuesta: Ds44RespuestaValor | null;
  observacion: string;
  puntaje: number | null;
};

export type Ds44BloqueResultado = {
  bloqueId: string;
  bloqueNombre: string;
  score: number | null;
  preguntasAplicables: number;
  preguntasRespondidas: number;
  preguntasCumplidas: number;
  preguntas: Ds44PreguntaEstado[];
};

export type Ds44Brecha = {
  bloqueId: string;
  bloqueNombre: string;
  preguntaClave: string;
  preguntaTexto: string;
  prioridad: Ds44PrioridadBrecha;
  recomendacion: string;
  evidenciaEsperada: string;
  rutaSugerida: string;
  hallazgoRelacionadoId: string | null;
  hallazgoRelacionadoDescripcion: string | null;
};

export type Ds44DiagnosticoPayload = {
  diagnosticoId: string | null;
  estado: "en_evaluacion" | "completado";
  scoreGlobal: number | null;
  updatedAt: string | null;
  bloques: Ds44BloqueResultado[];
  brechas: Ds44Brecha[];
  kpis: {
    bloquesEvaluados: number;
    preguntasCumplidas: number;
    brechasCriticas: number;
    brechasAltas: number;
  };
};

export type Ds44DiagnosticoResumen = {
  existeDiagnostico: boolean;
  estado: Ds44EstadoDiagnosticoDashboard;
  scoreGlobal: number | null;
  brechasCriticas: number;
  brechasAltas: number;
  diagnosticoId: string | null;
  updatedAt: string | null;
};

export type Ds44GuardarRespuestaInput = {
  preguntaClave: string;
  respuesta: Ds44RespuestaValor | null;
  observacion?: string;
};

const DS44_PREGUNTAS: Ds44PreguntaDef[] = [
  {
    bloqueId: "A",
    bloqueNombre: "Liderazgo, politica y organizacion preventiva",
    preguntaClave: "A_POLITICA_SST",
    preguntaTexto: "Existe politica SST formal, vigente y comunicada a toda la organizacion.",
    prioridad: "critica",
    recomendacion: "Formalizar y comunicar una politica SST con roles, objetivos y seguimiento ejecutivo.",
    evidenciaEsperada: "Politica SST firmada y registro de difusion.",
    rutaSugerida: "/dicaprev/documentacion",
    keywordsHallazgo: ["politica", "sst", "comunicada"],
  },
  {
    bloqueId: "A",
    bloqueNombre: "Liderazgo, politica y organizacion preventiva",
    preguntaClave: "A_ESTRUCTURA_PREVENTIVA",
    preguntaTexto: "La estructura preventiva requerida (comite, delegado o encargado) esta constituida y operativa.",
    prioridad: "critica",
    recomendacion: "Constituir formalmente la estructura preventiva segun dotacion y actividad.",
    evidenciaEsperada: "Actas de constitucion, resoluciones y reuniones de seguimiento.",
    rutaSugerida: "/dicaprev/cumplimiento/obligaciones",
    keywordsHallazgo: ["comite", "delegado", "encargado", "estructura"],
  },
  {
    bloqueId: "B",
    bloqueNombre: "Identificacion de peligros y evaluacion de riesgos",
    preguntaClave: "B_MIPER_VIGENTE",
    preguntaTexto: "La matriz MIPER esta vigente, con controles definidos por proceso y responsables.",
    prioridad: "critica",
    recomendacion: "Actualizar la matriz MIPER por proceso y asegurar control operacional de riesgos criticos.",
    evidenciaEsperada: "Matriz MIPER vigente con responsables y fechas de revision.",
    rutaSugerida: "/dicaprev/cumplimiento/obligaciones",
    keywordsHallazgo: ["miper", "iper", "riesgo", "peligro"],
  },
  {
    bloqueId: "B",
    bloqueNombre: "Identificacion de peligros y evaluacion de riesgos",
    preguntaClave: "B_INFO_RIESGOS",
    preguntaTexto: "La informacion de riesgos por tarea esta difundida y entendida por los trabajadores.",
    prioridad: "critica",
    recomendacion: "Estandarizar inducciones y charlas de riesgo por tarea con control de cobertura.",
    evidenciaEsperada: "Registros de charla, induccion y firmas de recepcion.",
    rutaSugerida: "/dicaprev/capacitacion",
    keywordsHallazgo: ["riesgo", "informacion", "charla", "induccion"],
  },
  {
    bloqueId: "C",
    bloqueNombre: "Reglamento interno y procedimientos",
    preguntaClave: "C_RIHS_VIGENTE",
    preguntaTexto: "El RIHS esta vigente, difundido y disponible para fiscalizacion.",
    prioridad: "alta",
    recomendacion: "Regularizar version vigente de RIHS y reforzar trazabilidad de difusion.",
    evidenciaEsperada: "RIHS vigente, respaldo de comunicacion y registro de entrega.",
    rutaSugerida: "/dicaprev/documentacion",
    keywordsHallazgo: ["rihs", "reglamento", "higiene"],
  },
  {
    bloqueId: "C",
    bloqueNombre: "Reglamento interno y procedimientos",
    preguntaClave: "C_PTS_CRITICOS",
    preguntaTexto: "Existen PTS para tareas criticas y se aplican en terreno.",
    prioridad: "alta",
    recomendacion: "Definir o actualizar PTS criticos con control de aplicacion en faena.",
    evidenciaEsperada: "Procedimientos firmados y registros de verificacion en terreno.",
    rutaSugerida: "/dicaprev/cumplimiento/hallazgos",
    keywordsHallazgo: ["pts", "procedimiento", "tarea critica"],
  },
  {
    bloqueId: "D",
    bloqueNombre: "Programa de trabajo preventivo",
    preguntaClave: "D_PROGRAMA_PREVENTIVO",
    preguntaTexto: "Existe programa preventivo anual con metas, responsables y seguimiento.",
    prioridad: "critica",
    recomendacion: "Construir programa anual con hitos medibles y seguimiento mensual.",
    evidenciaEsperada: "Programa anual, planillas de avance y respaldos de cumplimiento.",
    rutaSugerida: "/dicaprev/cumplimiento/plan-trabajo",
    keywordsHallazgo: ["programa", "plan", "preventivo", "anual"],
  },
  {
    bloqueId: "D",
    bloqueNombre: "Programa de trabajo preventivo",
    preguntaClave: "D_INDICADORES_CONTROL",
    preguntaTexto: "Se monitorean indicadores de gestion SST para seguimiento gerencial.",
    prioridad: "media",
    recomendacion: "Definir indicadores de proceso y resultado con revisiones periodicas.",
    evidenciaEsperada: "Tablero de indicadores y actas de revision.",
    rutaSugerida: "/dicaprev/cumplimiento/resumen",
    keywordsHallazgo: ["indicador", "seguimiento", "gerencial"],
  },
  {
    bloqueId: "E",
    bloqueNombre: "Capacitacion e informacion",
    preguntaClave: "E_PLAN_CAPACITACION",
    preguntaTexto: "Existe plan de capacitacion SST ejecutado y trazable por rol y riesgo.",
    prioridad: "alta",
    recomendacion: "Planificar y ejecutar capacitacion segmentada por riesgos criticos.",
    evidenciaEsperada: "Plan, asistencia, evaluaciones y evidencia de cierre de brechas.",
    rutaSugerida: "/dicaprev/capacitacion",
    keywordsHallazgo: ["capacitacion", "plan de capacitacion", "asistencia"],
  },
  {
    bloqueId: "E",
    bloqueNombre: "Capacitacion e informacion",
    preguntaClave: "E_INDUCCION_RIESGOS",
    preguntaTexto: "Se ejecutan inducciones de riesgos al ingreso y ante cambios de tarea.",
    prioridad: "alta",
    recomendacion: "Estandarizar el flujo de induccion y refresco con control de cobertura.",
    evidenciaEsperada: "Registro de induccion inicial y reinducciones.",
    rutaSugerida: "/dicaprev/trabajadores/inducciones",
    keywordsHallazgo: ["induccion", "riesgo", "ingreso"],
  },
  {
    bloqueId: "F",
    bloqueNombre: "Investigacion de incidentes",
    preguntaClave: "F_INVESTIGACION_EVENTOS",
    preguntaTexto: "Los accidentes e incidentes se investigan con causa raiz y acciones correctivas.",
    prioridad: "critica",
    recomendacion: "Aplicar metodologia de investigacion y gestionar acciones con trazabilidad.",
    evidenciaEsperada: "Informes de investigacion y acciones correctivas verificadas.",
    rutaSugerida: "/dicaprev/cumplimiento/hallazgos",
    keywordsHallazgo: ["accidente", "incidente", "investigacion", "causa"],
  },
  {
    bloqueId: "F",
    bloqueNombre: "Investigacion de incidentes",
    preguntaClave: "F_ACCIONES_CIERRE",
    preguntaTexto: "Las acciones correctivas derivadas de incidentes tienen cierre efectivo y evidencia.",
    prioridad: "alta",
    recomendacion: "Implementar control de vencimientos y validacion de cierre de acciones.",
    evidenciaEsperada: "Plan de acciones, evidencia de implementacion y validacion de cierre.",
    rutaSugerida: "/dicaprev/cumplimiento/plan-trabajo",
    keywordsHallazgo: ["accion correctiva", "cierre", "vencida"],
  },
  {
    bloqueId: "G",
    bloqueNombre: "Documentacion, registros y mejora continua",
    preguntaClave: "G_CONTROL_DOCUMENTAL",
    preguntaTexto: "Existe control documental para asegurar vigencia y trazabilidad de registros SST.",
    prioridad: "media",
    recomendacion: "Definir control de versiones, vencimientos y responsables documentales.",
    evidenciaEsperada: "Matriz documental, vigencias y trazabilidad de actualizaciones.",
    rutaSugerida: "/dicaprev/documentacion",
    keywordsHallazgo: ["documento", "vigencia", "vencido", "registro"],
  },
  {
    bloqueId: "G",
    bloqueNombre: "Documentacion, registros y mejora continua",
    preguntaClave: "G_REVISION_GERENCIAL",
    preguntaTexto: "Se realiza revision gerencial de desempeno SST y mejora continua.",
    prioridad: "media",
    recomendacion: "Formalizar revision gerencial periodica con decisiones y planes de mejora.",
    evidenciaEsperada: "Actas de revision gerencial y seguimiento de compromisos.",
    rutaSugerida: "/dicaprev/cumplimiento/resumen",
    keywordsHallazgo: ["revision gerencial", "mejora continua", "auditoria interna"],
  },
  {
    bloqueId: "H",
    bloqueNombre: "PRRD y protocolos MINSAL",
    preguntaClave: "H_PRRD_IMPLEMENTADO",
    preguntaTexto: "El PRRD esta definido, implementado y actualizado segun la operacion.",
    prioridad: "alta",
    recomendacion: "Implementar PRRD con responsables, simulacros y ciclo de mejora.",
    evidenciaEsperada: "Documento PRRD vigente y registros de activacion/simulacro.",
    rutaSugerida: "/dicaprev/documentacion",
    keywordsHallazgo: ["prrd", "emergencia", "simulacro"],
  },
  {
    bloqueId: "H",
    bloqueNombre: "PRRD y protocolos MINSAL",
    preguntaClave: "H_PROTOCOLOS_MINSAL",
    preguntaTexto: "Los protocolos MINSAL aplicables estan implementados y con seguimiento.",
    prioridad: "alta",
    recomendacion: "Levantar brechas de protocolos MINSAL y calendarizar su cumplimiento.",
    evidenciaEsperada: "Protocolos aplicables, planes de implementacion y respaldos de seguimiento.",
    rutaSugerida: "/dicaprev/cumplimiento/obligaciones",
    keywordsHallazgo: ["minsal", "protocolo", "fiscalizacion"],
  },
];

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
  estado: "en_evaluacion" | "completado";
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
  const estado: "en_evaluacion" | "completado" =
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
