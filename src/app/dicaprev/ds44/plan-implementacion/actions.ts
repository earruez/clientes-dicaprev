import { getDs44DiagnosticoData } from "../diagnostico/actions";
import type { Ds44Brecha, Ds44PrioridadBrecha } from "../diagnostico/catalogo";

type Ds44PlanEstado = "pendiente";
type Ds44PlanGeneracion = "sin_diagnostico" | "sin_brechas" | "con_brechas";

export type Ds44PlanAccion = {
  id: string;
  prioridad: Ds44PrioridadBrecha;
  preguntaTexto: string;
  recomendacion: string;
  evidenciaEsperada: string;
  responsableSugerido: string;
  plazoDias: 7 | 15 | 30 | 60;
  plazoSugeridoLabel: string;
  fechaObjetivo: string;
  estado: Ds44PlanEstado;
  frenteOperativo: string;
  rutaSugerida: string;
};

export type Ds44PlanImplementacionData = {
  estadoGeneracion: Ds44PlanGeneracion;
  diagnosticoId: string | null;
  diagnosticoUpdatedAt: string | null;
  totalBrechas: number;
  acciones: Ds44PlanAccion[];
  timeline: Record<"7" | "15" | "30" | "60", Ds44PlanAccion[]>;
  resumen: {
    totalAcciones: number;
    criticas: number;
    altas: number;
    sinEvidencia: number;
    vencidas: number;
    proximas: number;
  };
  proximoHito: {
    titulo: string;
    detalle: string;
    href: string;
    cta: string;
  } | null;
};

function prioridadPeso(prioridad: Ds44PrioridadBrecha): number {
  if (prioridad === "critica") return 4;
  if (prioridad === "alta") return 3;
  if (prioridad === "media") return 2;
  return 1;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function getReglaPlan(prioridad: Ds44PrioridadBrecha): {
  plazoDias: 7 | 15 | 30 | 60;
  responsableSugerido: string;
  frenteOperativo: string;
} {
  if (prioridad === "critica") {
    return {
      plazoDias: 7,
      responsableSugerido: "Encargado SST / Administracion",
      frenteOperativo: "Cumplimiento critico",
    };
  }

  if (prioridad === "alta") {
    return {
      plazoDias: 15,
      responsableSugerido: "Encargado SST",
      frenteOperativo: "Regularizacion preventiva",
    };
  }

  if (prioridad === "media") {
    return {
      plazoDias: 30,
      responsableSugerido: "Administracion / Prevencion",
      frenteOperativo: "Mejora documental",
    };
  }

  return {
    plazoDias: 60,
    responsableSugerido: "Administracion",
    frenteOperativo: "Mejora continua",
  };
}

function toPlanAccion(brecha: Ds44Brecha, baseDate: Date): Ds44PlanAccion {
  const regla = getReglaPlan(brecha.prioridad);
  const fechaObjetivo = addDays(baseDate, regla.plazoDias);

  return {
    id: `${brecha.preguntaClave}-${brecha.prioridad}`,
    prioridad: brecha.prioridad,
    preguntaTexto: brecha.preguntaTexto,
    recomendacion: brecha.recomendacion,
    evidenciaEsperada: brecha.evidenciaEsperada,
    responsableSugerido: regla.responsableSugerido,
    plazoDias: regla.plazoDias,
    plazoSugeridoLabel: `${regla.plazoDias} dias`,
    fechaObjetivo: fechaObjetivo.toISOString(),
    estado: "pendiente",
    frenteOperativo: regla.frenteOperativo,
    rutaSugerida: brecha.rutaSugerida,
  };
}

function sortAcciones(acciones: Ds44PlanAccion[]): Ds44PlanAccion[] {
  return [...acciones].sort((a, b) => {
    const prioridad = prioridadPeso(b.prioridad) - prioridadPeso(a.prioridad);
    if (prioridad !== 0) return prioridad;
    const fechaA = new Date(a.fechaObjetivo).getTime();
    const fechaB = new Date(b.fechaObjetivo).getTime();
    return fechaA - fechaB;
  });
}

export async function getDs44PlanImplementacionData(): Promise<Ds44PlanImplementacionData> {
  const diagnostico = await getDs44DiagnosticoData();

  if (!diagnostico.diagnosticoId) {
    return {
      estadoGeneracion: "sin_diagnostico",
      diagnosticoId: null,
      diagnosticoUpdatedAt: null,
      totalBrechas: 0,
      acciones: [],
      timeline: { "7": [], "15": [], "30": [], "60": [] },
      resumen: {
        totalAcciones: 0,
        criticas: 0,
        altas: 0,
        sinEvidencia: 0,
        vencidas: 0,
        proximas: 0,
      },
      proximoHito: null,
    };
  }

  const baseDate = diagnostico.updatedAt ? new Date(diagnostico.updatedAt) : new Date();
  const baseDateSafe = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;

  const acciones = sortAcciones(diagnostico.brechas.map((brecha) => toPlanAccion(brecha, baseDateSafe)));

  if (acciones.length === 0) {
    return {
      estadoGeneracion: "sin_brechas",
      diagnosticoId: diagnostico.diagnosticoId,
      diagnosticoUpdatedAt: diagnostico.updatedAt,
      totalBrechas: 0,
      acciones: [],
      timeline: { "7": [], "15": [], "30": [], "60": [] },
      resumen: {
        totalAcciones: 0,
        criticas: 0,
        altas: 0,
        sinEvidencia: 0,
        vencidas: 0,
        proximas: 0,
      },
      proximoHito: {
        titulo: "Diagnostico sin brechas activas",
        detalle: "No hay brechas activas. Mantener seguimiento periodico y actualizar evidencia.",
        href: "/dicaprev/ds44/diagnostico",
        cta: "Ver diagnostico",
      },
    };
  }

  const timeline: Record<"7" | "15" | "30" | "60", Ds44PlanAccion[]> = {
    "7": acciones.filter((item) => item.plazoDias === 7),
    "15": acciones.filter((item) => item.plazoDias === 15),
    "30": acciones.filter((item) => item.plazoDias === 30),
    "60": acciones.filter((item) => item.plazoDias === 60),
  };

  const now = new Date();
  const nowTime = now.getTime();
  const proximasLimite = addDays(now, 7).getTime();

  const vencidas = acciones.filter((item) => new Date(item.fechaObjetivo).getTime() < nowTime).length;
  const proximas = acciones.filter((item) => {
    const fecha = new Date(item.fechaObjetivo).getTime();
    return fecha >= nowTime && fecha <= proximasLimite;
  }).length;

  const primerFrente = acciones.find((item) => item.prioridad === "critica") ?? acciones[0];

  return {
    estadoGeneracion: "con_brechas",
    diagnosticoId: diagnostico.diagnosticoId,
    diagnosticoUpdatedAt: diagnostico.updatedAt,
    totalBrechas: acciones.length,
    acciones,
    timeline,
    resumen: {
      totalAcciones: acciones.length,
      criticas: acciones.filter((item) => item.prioridad === "critica").length,
      altas: acciones.filter((item) => item.prioridad === "alta").length,
      sinEvidencia: acciones.filter((item) => item.evidenciaEsperada.trim().length === 0).length,
      vencidas,
      proximas,
    },
    proximoHito: {
      titulo: primerFrente.prioridad === "critica" ? "Atender frente critico inmediato" : "Iniciar frente prioritario",
      detalle: `Primer frente sugerido: ${primerFrente.frenteOperativo}.`,
      href: primerFrente.rutaSugerida,
      cta: "Ir al frente sugerido",
    },
  };
}