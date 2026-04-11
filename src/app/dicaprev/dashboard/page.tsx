"use client";

import Link from "next/link";
import {
  CheckCircle2,
  FileWarning,
  XCircle,
  CalendarClock,
  ArrowRight,
  GraduationCap,
  Building2,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generarAlertas } from "@/lib/alertas";
import {
  OBLIGACIONES_MOCK,
  HALLAZGOS_MOCK,
  CENTROS_MOCK,
} from "../cumplimiento/mock-data";
import {
  ACREDITACIONES_MOCK,
  HISTORIAL_GESTION_MOCK,
  VEHICULOS_MOCK,
} from "../acreditaciones/mock-data";
import { MOCK_WORKERS } from "@/components/trabajadores-v2/types";
import {
  REGLAS_DOCUMENTALES,
  TIPOS_DOCUMENTO,
  MOCK_DOCUMENTOS,
  getWorkerDocs,
  getWorkerDocSummary,
} from "@/components/trabajadores-v2/documental/types";
import {
  REGLAS_CAPACITACION,
  TIPO_CAPACITACIONES,
  MOCK_CAPACITACIONES,
  getWorkerTrainings,
} from "@/components/trabajadores-v2/capacitacion/types";

/* ─── Métricas derivadas de datos reales del sistema ───────── */

// 1 · KPIs
const cumplimientoGlobal = Math.round(
  OBLIGACIONES_MOCK.reduce((s, o) => s + o.cumplimientoGlobal, 0) /
    OBLIGACIONES_MOCK.length
);

const acreditacionesActivas = ACREDITACIONES_MOCK.filter((a) =>
  ["en_preparacion", "listo_para_enviar", "enviado"].includes(a.estado)
).length;

const pendientesCriticos = HALLAZGOS_MOCK.filter(
  (h) => h.prioridad === "critica" && h.estado === "abierto"
).length;

const conResultado = HISTORIAL_GESTION_MOCK.filter((h) => h.resultado);
const totalAprobados = conResultado.filter(
  (h) => h.resultado === "aprobado"
).length;
const tasaAprobacion =
  conResultado.length > 0
    ? Math.round((totalAprobados / conResultado.length) * 100)
    : 0;

// 3 · Cumplimiento por centro
const cumplimientoPorCentro = CENTROS_MOCK.map((c) => {
  const vals: number[] = [];
  for (const o of OBLIGACIONES_MOCK) {
    const e = o.estadosPorCentro[c.id];
    if (!e || e === "no_aplica") continue;
    vals.push(e === "cumplida" ? 100 : e === "con_brechas" ? 50 : 0);
  }
  const pct =
    vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;
  return { nombre: c.nombre, pct };
});

// 4 · Acreditaciones
const envidadas = HISTORIAL_GESTION_MOCK.filter((h) => h.fechaEnvio).length;
const rechazadas = HISTORIAL_GESTION_MOCK.filter(
  (h) => h.resultado === "rechazado"
).length;
const conRespuesta = HISTORIAL_GESTION_MOCK.filter(
  (h): h is typeof h & { fechaEnvio: string; fechaRespuesta: string } =>
    !!h.fechaEnvio && !!h.fechaRespuesta
);
const promedioRespuesta =
  conRespuesta.length > 0
    ? Math.round(
        conRespuesta.reduce(
          (s, h) =>
            s +
            (new Date(h.fechaRespuesta).getTime() -
              new Date(h.fechaEnvio).getTime()) /
              86400000,
          0
        ) / conRespuesta.length
      )
    : 0;

// 5 · Tiempos de gestión
const conEnvio = HISTORIAL_GESTION_MOCK.filter(
  (h): h is typeof h & { fechaEnvio: string } => !!h.fechaEnvio
);
const promedioPreparacion =
  conEnvio.length > 0
    ? Math.round(
        conEnvio.reduce(
          (s, h) =>
            s +
            (new Date(h.fechaEnvio).getTime() -
              new Date(h.fechaCreacion).getTime()) /
              86400000,
          0
        ) / conEnvio.length
      )
    : 0;
const promedioGestionTotal = Math.round(
  HISTORIAL_GESTION_MOCK.reduce((s, h) => s + h.diasGestion, 0) /
    HISTORIAL_GESTION_MOCK.length
);
const aprobadosConFecha = HISTORIAL_GESTION_MOCK.filter(
  (h): h is typeof h & { fechaRespuesta: string } =>
    h.resultado === "aprobado" && !!h.fechaRespuesta
);
const promedioAprobacion =
  aprobadosConFecha.length > 0
    ? Math.round(
        aprobadosConFecha.reduce(
          (s, h) =>
            s +
            (new Date(h.fechaRespuesta).getTime() -
              new Date(h.fechaCreacion).getTime()) /
              86400000,
          0
        ) / aprobadosConFecha.length
      )
    : 0;

// 6 · Brechas operativas
const trabajadoresActivos = MOCK_WORKERS.filter((w) => w.estado === "Activo");

const sinDocCompleta = trabajadoresActivos.filter((w) => {
  const docs = getWorkerDocs(w, REGLAS_DOCUMENTALES, TIPOS_DOCUMENTO, MOCK_DOCUMENTOS);
  const s = getWorkerDocSummary(docs);
  return s.pendientes > 0 || s.vencidos > 0 || s.rechazados > 0;
}).length;

const sinCapVigente = trabajadoresActivos.filter((w) => {
  const caps = getWorkerTrainings(w, REGLAS_CAPACITACION, TIPO_CAPACITACIONES, MOCK_CAPACITACIONES);
  return caps.some((c) => c.estado === "vencida" || c.estado === "pendiente");
}).length;

const oblCriticasIncumplidas = OBLIGACIONES_MOCK.filter(
  (o) => o.cumplimientoGlobal < 50
).length;

const vehiculosConProblema = HISTORIAL_GESTION_MOCK.filter(
  (h) => h.motivoRechazo === "documentos_vehiculo"
).length;

// 7 · Alertas del sistema
const alertasSistema = generarAlertas().slice(0, 5);

/* ─── Helpers visuales ──────────────────────────────────────── */

function colorBar(pct: number) {
  return pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
}
function colorText(pct: number) {
  return pct >= 80
    ? "text-emerald-600"
    : pct >= 50
    ? "text-amber-600"
    : "text-rose-600";
}
function colorStroke(pct: number) {
  return pct >= 80 ? "stroke-emerald-400" : pct >= 50 ? "stroke-amber-400" : "stroke-rose-400";
}
function colorTextLight(pct: number) {
  return pct >= 80 ? "text-emerald-300" : pct >= 50 ? "text-amber-300" : "text-rose-300";
}

/* ─── Ranking de riesgo general ────────────────────────────── */

type NivelRiesgo = "ok" | "atencion" | "critico";

const factoresRiesgo = [
  { label: "Docs trabajadores",     valor: sinDocCompleta,         severo: sinDocCompleta > 5 },
  { label: "Obligaciones DS44",     valor: oblCriticasIncumplidas, severo: oblCriticasIncumplidas > 2 },
  { label: "Vehículos",             valor: vehiculosConProblema,   severo: vehiculosConProblema > 1 },
  { label: "Hallazgos críticos",    valor: pendientesCriticos,     severo: pendientesCriticos > 2 },
  { label: "Acred. rechazadas",     valor: rechazadas,             severo: rechazadas > 1 },
];

const factoresConBrecha = factoresRiesgo.filter((f) => f.valor > 0).length;

const RIESGO_CONFIG: Record<NivelRiesgo, {
  bg: string; iconBg: string; iconColor: string;
  badge: string; title: string; nivelLabel: string; mensaje: string;
}> = {
  ok: {
    bg:         "bg-emerald-50 border-emerald-200",
    iconBg:     "bg-emerald-100",
    iconColor:  "text-emerald-600",
    badge:      "bg-emerald-100 text-emerald-800 border-emerald-200",
    title:      "text-emerald-900",
    nivelLabel: "Sin riesgo crítico",
    mensaje:    "La empresa opera dentro de los estándares de seguridad esperados.",
  },
  atencion: {
    bg:         "bg-amber-50 border-amber-200",
    iconBg:     "bg-amber-100",
    iconColor:  "text-amber-600",
    badge:      "bg-amber-100 text-amber-900 border-amber-200",
    title:      "text-amber-900",
    nivelLabel: "Atención requerida",
    mensaje:    "Se detectaron brechas moderadas. Se recomienda atención oportuna.",
  },
  critico: {
    bg:         "bg-rose-50 border-rose-200",
    iconBg:     "bg-rose-100",
    iconColor:  "text-rose-600",
    badge:      "bg-rose-100 text-rose-900 border-rose-200",
    title:      "text-rose-900",
    nivelLabel: "Estado crítico",
    mensaje:    "Múltiples brechas activas detectadas. Se requiere acción inmediata.",
  },
};

function calcularRiesgoGeneral(): NivelRiesgo {
  let score = 0;
  if (sinDocCompleta > 5)         score += 2; else if (sinDocCompleta > 0)         score += 1;
  if (oblCriticasIncumplidas > 2) score += 2; else if (oblCriticasIncumplidas > 0) score += 1;
  if (vehiculosConProblema > 1)   score += 2; else if (vehiculosConProblema > 0)   score += 1;
  if (pendientesCriticos > 2)     score += 2; else if (pendientesCriticos > 0)     score += 1;
  if (rechazadas > 1)             score += 2; else if (rechazadas > 0)             score += 1;
  if (score >= 4) return "critico";
  if (score >= 2) return "atencion";
  return "ok";
}

const riesgoGeneral = calcularRiesgoGeneral();

/* ─── Alertas predictivas ───────────────────────────────────── */

type TipoAlertaProxima = "documento" | "capacitacion" | "obligacion" | "acreditacion";

interface AlertaProxima {
  tipo: TipoAlertaProxima;
  texto: string;
  /** días hasta el vencimiento; 0 = hoy; negativo = ya venció */
  dias: number;
  nivel: "critico" | "advertencia" | "info";
  href: string;
}

const AHORA_TS = Date.now();
const MS_DIA = 86_400_000;
const DIAS_VENTANA = 45; // lookahead window para capturar alertas

function calcularAlertasProximas(): AlertaProxima[] {
  const resultado: AlertaProxima[] = [];

  // a) Documentos por vencer (sólo estado completo con fechaVencimiento)
  for (const doc of MOCK_DOCUMENTOS) {
    if (!doc.fechaVencimiento || doc.estado !== "completo") continue;
    const dias = Math.ceil(
      (new Date(doc.fechaVencimiento).getTime() - AHORA_TS) / MS_DIA
    );
    if (dias < 0 || dias > DIAS_VENTANA) continue;
    const tipo = TIPOS_DOCUMENTO.find((t) => t.id === doc.tipoDocumentoId);
    const worker = MOCK_WORKERS.find((w) => w.id === doc.workerId);
    const nombre = worker ? `${worker.nombre} ${worker.apellido.split(" ")[0]}` : doc.workerId;
    resultado.push({
      tipo: "documento",
      texto: `${tipo?.nombre ?? "Documento"} — ${nombre}`,
      dias,
      nivel: dias <= 7 ? "critico" : dias <= 15 ? "advertencia" : "info",
      href: "/dicaprev/trabajadores/control-documental",
    });
  }

  // b) Capacitaciones por vencer (sólo completadas con fechaVencimiento próxima)
  for (const cap of MOCK_CAPACITACIONES) {
    if (!cap.fechaVencimiento || cap.estado !== "completada") continue;
    const dias = Math.ceil(
      (new Date(cap.fechaVencimiento).getTime() - AHORA_TS) / MS_DIA
    );
    if (dias < 0 || dias > DIAS_VENTANA) continue;
    const tipo = TIPO_CAPACITACIONES.find((t) => t.id === cap.tipoCapacitacionId);
    const worker = MOCK_WORKERS.find((w) => w.id === cap.workerId);
    const nombre = worker ? `${worker.nombre} ${worker.apellido.split(" ")[0]}` : cap.workerId;
    resultado.push({
      tipo: "capacitacion",
      texto: `${tipo?.nombre ?? "Capacitación"} — ${nombre}`,
      dias,
      nivel: dias <= 7 ? "critico" : dias <= 15 ? "advertencia" : "info",
      href: "/dicaprev/trabajadores/capacitaciones",
    });
  }

  // c) Obligaciones DS44 por vencer
  for (const ob of OBLIGACIONES_MOCK) {
    if (!ob.vencimiento) continue;
    const dias = Math.ceil(
      (new Date(ob.vencimiento).getTime() - AHORA_TS) / MS_DIA
    );
    if (dias < 0 || dias > DIAS_VENTANA) continue;
    resultado.push({
      tipo: "obligacion",
      texto: `DS44: ${ob.nombre.slice(0, 44)}`,
      dias,
      nivel: dias <= 7 ? "critico" : dias <= 15 ? "advertencia" : "info",
      href: "/dicaprev/cumplimiento/obligaciones",
    });
  }

  // d) Acreditaciones enviadas sin respuesta por más de 30 días
  for (const ac of ACREDITACIONES_MOCK) {
    if (ac.estado !== "enviado" || !ac.ultimoExpediente) continue;
    const diasEspera = Math.ceil(
      (AHORA_TS - new Date(ac.ultimoExpediente).getTime()) / MS_DIA
    );
    if (diasEspera < 30) continue;
    resultado.push({
      tipo: "acreditacion",
      texto: `Acred. ${ac.mandante} sin respuesta`,
      dias: 0,
      nivel: "critico",
      href: "/dicaprev/acreditaciones",
    });
  }

  return resultado.sort((a, b) => a.dias - b.dias).slice(0, 5);
}

const alertasProximas = calcularAlertasProximas();

/* ─── Score general de la empresa ──────────────────────────── */

interface ScoreEmpresa {
  score: number;
  nivel: "ok" | "atencion" | "critico";
  detalle: { label: string; peso: number; nota: number; contribucion: number }[];
}

function calcularScoreEmpresa(): ScoreEmpresa {
  const activosTotal = trabajadoresActivos.length || 1;

  // ── Bloque A: Cumplimiento DS44 (40%) ─────────────────────────
  const notaCumplimiento = cumplimientoGlobal; // 0–100

  // ── Bloque B: Acreditaciones (20%) ────────────────────────────
  const notaAcreditaciones = tasaAprobacion; // 0–100

  // ── Bloque C: Documentación (20%) ─────────────────────────────
  // Penalización proporcional por trabajadores con docs incompletas
  const pctSinDoc = (sinDocCompleta / activosTotal) * 100;
  const notaDocumentacion = Math.max(0, 100 - pctSinDoc * 2);

  // ── Bloque D: Operación (20%) ──────────────────────────────────
  // Combina hallazgos críticos y vehículos fuera de regla
  const penHallazgos = Math.min(pendientesCriticos * 10, 50);
  const penVehiculos = Math.min(vehiculosConProblema * 10, 50);
  const notaOperacion = Math.max(0, 100 - penHallazgos - penVehiculos);

  const detalle = [
    { label: "Cumplimiento DS44",  peso: 40, nota: notaCumplimiento,  contribucion: notaCumplimiento  * 0.4 },
    { label: "Acreditaciones",     peso: 20, nota: notaAcreditaciones, contribucion: notaAcreditaciones * 0.2 },
    { label: "Documentación",      peso: 20, nota: notaDocumentacion,  contribucion: notaDocumentacion  * 0.2 },
    { label: "Operación",          peso: 20, nota: notaOperacion,      contribucion: notaOperacion      * 0.2 },
  ];

  const score = Math.round(detalle.reduce((s, d) => s + d.contribucion, 0));
  const nivel: ScoreEmpresa["nivel"] =
    score >= 75 ? "ok" : score >= 50 ? "atencion" : "critico";

  return { score, nivel, detalle };
}

const scoreEmpresa = calcularScoreEmpresa();

const SCORE_CONFIG: Record<ScoreEmpresa["nivel"], {
  bg: string; ring: string; numColor: string;
  badge: string; label: string; mensaje: string;
}> = {
  ok: {
    bg:       "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200",
    ring:     "stroke-emerald-400",
    numColor: "text-emerald-700",
    badge:    "bg-emerald-100 text-emerald-800 border-emerald-200",
    label:    "Empresa saludable",
    mensaje:  "El nivel de gestión SST es sólido. Mantén el ritmo.",
  },
  atencion: {
    bg:       "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200",
    ring:     "stroke-amber-400",
    numColor: "text-amber-700",
    badge:    "bg-amber-100 text-amber-900 border-amber-200",
    label:    "Mejora requerida",
    mensaje:  "Existen áreas con brechas. Revisa los bloques con menor puntaje.",
  },
  critico: {
    bg:       "bg-gradient-to-br from-rose-50 to-red-50 border-rose-200",
    ring:     "stroke-rose-400",
    numColor: "text-rose-700",
    badge:    "bg-rose-100 text-rose-900 border-rose-200",
    label:    "Atención urgente",
    mensaje:  "Puntaje bajo. Se requieren acciones correctivas inmediatas.",
  },
};

/* ─── Page ──────────────────────────────────────────────────── */

export default function Page() {
  const sCfg = SCORE_CONFIG[scoreEmpresa.nivel];
  const cfg   = RIESGO_CONFIG[riesgoGeneral];

  const fraseHero =
    scoreEmpresa.score >= 75
      ? "La empresa mantiene un nivel de gestión SST sólido y consistente."
      : scoreEmpresa.score >= 50
      ? "Existen áreas de mejora. Revisa los bloques con menor puntaje."
      : "Se requieren acciones correctivas inmediatas en varios frentes.";

  const r          = 50;
  const circ       = 2 * Math.PI * r;
  const dialOffset = circ * (1 - scoreEmpresa.score / 100);

  return (
    <div className="space-y-5 max-w-7xl">

      {/* ══ HERO EJECUTIVO ══════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 shadow-md">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-600 opacity-[0.06] blur-3xl" />
          <div className="absolute -bottom-12 left-0 h-48 w-48 rounded-full bg-emerald-500 opacity-[0.06] blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">

          {/* Texto */}
          <div className="flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Panel Gerencial · PREVANTIA
            </p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              MVP CHILE SPA
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-3 py-0.5 text-xs font-bold", sCfg.badge)}>
                {sCfg.label}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs text-slate-400">
                Riesgo: {cfg.nivelLabel}
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">{fraseHero}</p>
            <p className="mt-3 text-[11px] text-slate-500">
              {new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Dial score */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative flex items-center justify-center">
              <svg width="120" height="120" className="-rotate-90">
                <circle cx="60" cy="60" r={r} strokeWidth="8" className="fill-none stroke-white/10" />
                <circle
                  cx="60" cy="60" r={r} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dialOffset}
                  className={cn("fill-none transition-all duration-700", sCfg.ring)}
                />
              </svg>
              <div className="absolute text-center">
                <p className={cn("text-4xl font-extrabold leading-none tabular-nums", sCfg.numColor)}>
                  {scoreEmpresa.score}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Score SST</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ══ 4 KPIs ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Cumplimiento DS44",
            value: `${cumplimientoGlobal}%`,
            sub: "promedio empresa",
            accent: colorBar(cumplimientoGlobal),
            valueColor: colorText(cumplimientoGlobal),
          },
          {
            label: "Brechas críticas",
            value: String(pendientesCriticos + oblCriticasIncumplidas),
            sub: `${pendientesCriticos} hallazgos · ${oblCriticasIncumplidas} oblig.`,
            accent: (pendientesCriticos + oblCriticasIncumplidas) > 0 ? "bg-rose-500" : "bg-emerald-500",
            valueColor: (pendientesCriticos + oblCriticasIncumplidas) > 0 ? "text-rose-600" : "text-emerald-600",
          },
          {
            label: "Acreditaciones",
            value: String(acreditacionesActivas),
            sub: "activas en trámite",
            accent: "bg-indigo-400",
            valueColor: "text-indigo-700",
          },
          {
            label: "Tasa de éxito",
            value: `${tasaAprobacion}%`,
            sub: `${totalAprobados}/${envidadas} aprobadas`,
            accent: colorBar(tasaAprobacion),
            valueColor: colorText(tasaAprobacion),
          },
        ].map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", k.accent)} />
            <p className="pl-3 text-xs font-medium text-slate-500">{k.label}</p>
            <p className={cn("mt-2 pl-3 text-3xl font-extrabold tabular-nums", k.valueColor)}>{k.value}</p>
            <p className="mt-0.5 pl-3 text-[11px] text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ══ CHARTS ROW ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Composición de brechas */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-5 text-sm font-semibold text-slate-800">Composición de brechas</p>
          <div className="space-y-4">
            {[
              { label: "Sin docs completa",    value: sinDocCompleta,         total: Math.max(trabajadoresActivos.length, 1), href: "/dicaprev/trabajadores",                   color: "bg-amber-400"  },
              { label: "Sin cap. vigente",      value: sinCapVigente,          total: Math.max(trabajadoresActivos.length, 1), href: "/dicaprev/trabajadores/capacitaciones",    color: "bg-orange-400" },
              { label: "Hallazgos críticos",    value: pendientesCriticos,     total: Math.max(pendientesCriticos, 5),         href: "/dicaprev/cumplimiento/hallazgos",         color: "bg-rose-500"   },
              { label: "Obligaciones DS44",     value: oblCriticasIncumplidas, total: Math.max(oblCriticasIncumplidas, 5),     href: "/dicaprev/cumplimiento/obligaciones",      color: "bg-red-400"    },
              { label: "Vehículos c/ problema", value: vehiculosConProblema,   total: Math.max(vehiculosConProblema, 5),       href: "/dicaprev/acreditaciones",                color: "bg-indigo-400" },
            ].map((b) => (
              <Link key={b.label} href={b.href} className="group flex items-center gap-3 text-xs hover:opacity-80">
                <span className="w-36 shrink-0 truncate font-medium text-slate-600">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", b.value === 0 ? "bg-emerald-400" : b.color)}
                    style={{ width: b.value === 0 ? "4%" : `${Math.round((b.value / b.total) * 100)}%` }}
                  />
                </div>
                <span className={cn("w-5 shrink-0 text-right font-bold tabular-nums", b.value === 0 ? "text-emerald-600" : "text-slate-800")}>
                  {b.value}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Acreditaciones + Score por bloque */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-slate-800">Acreditaciones · Resumen</p>
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
            {[
              { label: "Enviadas",   value: envidadas,      color: "text-slate-800"   },
              { label: "Aprobadas",  value: totalAprobados, color: "text-emerald-600" },
              { label: "Rechazadas", value: rechazadas,     color: "text-rose-600"    },
            ].map((s) => (
              <div key={s.label} className="px-3 py-2">
                <p className={cn("text-3xl font-extrabold tabular-nums", s.color)}>{s.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            {scoreEmpresa.detalle.map((d) => (
              <div key={d.label} className="flex items-center gap-2.5">
                <span className="w-36 shrink-0 text-xs font-medium text-slate-500">{d.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full", colorBar(d.nota))} style={{ width: `${d.nota}%` }} />
                </div>
                <span className={cn("w-7 shrink-0 text-right text-xs font-bold tabular-nums", colorText(d.nota))}>
                  {Math.round(d.nota)}
                </span>
                <span className="w-7 text-right text-[10px] text-slate-400">{d.peso}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ══ ATENCIÓN INMEDIATA ══════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Alertas del sistema — 2/3 */}
        <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Atención inmediata</p>
            {alertasSistema.length > 0 ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                {alertasSistema.length} alerta{alertasSistema.length !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Sin alertas activas</span>
            )}
          </div>
          {alertasSistema.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-sm text-emerald-700">Sin alertas activas. Todo en orden.</span>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {alertasSistema.map((a) => {
                const Icon =
                  a.tipo === "critica" ? FileWarning :
                  a.tipo === "gestion" ? XCircle : CalendarClock;
                const accent =
                  a.prioridad === 1 ? "border-l-rose-500" :
                  a.prioridad === 2 ? "border-l-amber-400" : "border-l-slate-200";
                const iconColor =
                  a.prioridad === 1 ? "text-rose-400" :
                  a.prioridad === 2 ? "text-amber-400" : "text-slate-400";
                const badge =
                  a.prioridad === 1 ? "bg-rose-50 text-rose-700" :
                  a.prioridad === 2 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500";
                const badgeLabel = a.prioridad === 1 ? "Crítico" : a.prioridad === 2 ? "Advertencia" : "Info";
                return (
                  <li key={a.id}>
                    <Link
                      href={a.link}
                      className={cn(
                        "group flex items-center gap-4 border-l-2 py-3 pl-4 pr-3 transition-colors hover:bg-slate-50",
                        accent
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{a.titulo}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{a.descripcion}</p>
                      </div>
                      <span className={cn("shrink-0 rounded px-2 py-0.5 text-[10px] font-bold", badge)}>
                        {badgeLabel}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Próximos vencimientos — 1/3 */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-slate-800">Próximos vencimientos</p>
          {alertasProximas.length === 0 ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3">
              <p className="text-xs text-emerald-700">Sin vencimientos en 45 días.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {alertasProximas.map((a, i) => {
                const Icon =
                  a.tipo === "documento"    ? FileWarning :
                  a.tipo === "capacitacion" ? GraduationCap :
                  a.tipo === "obligacion"   ? Building2 : CalendarClock;
                const dotColor =
                  a.nivel === "critico"     ? "bg-rose-400" :
                  a.nivel === "advertencia" ? "bg-amber-400" : "bg-slate-300";
                const badgeColor =
                  a.nivel === "critico"     ? "bg-rose-50 text-rose-700" :
                  a.nivel === "advertencia" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600";
                const diasLabel = a.dias === 0 ? "Hoy" : a.dias === 1 ? "Mañana" : `${a.dias}d`;
                return (
                  <li key={i}>
                    <Link
                      href={a.href}
                      className="group flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50"
                    >
                      <div className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Icon className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate text-xs font-medium text-slate-700">{a.texto}</span>
                        </div>
                      </div>
                      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums", badgeColor)}>
                        {diasLabel}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>

      {/* ══ BLOQUES SECUNDARIOS ════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Cumplimiento por centro */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Cumplimiento por centro DS44</p>
            <span className={cn("text-sm font-bold tabular-nums", colorText(cumplimientoGlobal))}>
              {cumplimientoGlobal}%
            </span>
          </div>
          <div className="space-y-3.5">
            {cumplimientoPorCentro.slice(0, 5).map((c) => (
              <div key={c.nombre} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs font-medium text-slate-600">{c.nombre}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", colorBar(c.pct))}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <span className={cn("w-9 shrink-0 text-right text-xs font-bold tabular-nums", colorText(c.pct))}>
                  {c.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tiempos de gestión */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Timer className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800">
              Tiempos de gestión <span className="font-normal text-slate-400">(días promedio)</span>
            </p>
          </div>
          <div className="space-y-4">
            {[
              { label: "Preparación",     valor: promedioPreparacion,  desc: "Creación → envío",           color: "bg-slate-100 text-slate-700"     },
              { label: "Respuesta",        valor: promedioRespuesta,    desc: "Envío → respuesta mandante", color: "bg-amber-100 text-amber-700"     },
              { label: "Hasta aprobación", valor: promedioAprobacion,   desc: "Creación → aprobado",        color: "bg-emerald-100 text-emerald-700" },
              { label: "Ciclo total",      valor: promedioGestionTotal, desc: "Promedio general",           color: "bg-indigo-100 text-indigo-700"   },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                <span className={cn("rounded-lg px-3 py-1 text-sm font-bold tabular-nums", item.color)}>
                  {item.valor}d
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

