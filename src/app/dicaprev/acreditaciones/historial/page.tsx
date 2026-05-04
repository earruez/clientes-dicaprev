"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Car,
  Calendar,
  UserCircle,
  Search,
  ShieldAlert,
  Building2,
  CheckCheck,
  X as XIcon,
  ExternalLink,
  Zap,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HISTORIAL_GESTION_MOCK } from "../mock-data";
import type { EstadoAcreditacion, ResultadoHistorial, TipoAcreditacion, CausaRechazo, RegistroHistorial } from "../types";
import { agregarHallazgoAcreditacion } from "@/lib/acreditaciones/hallazgo-acreditacion-store";
import {
  detectarAlertas,
  severidadAlertas,
  UMBRALES,
} from "@/lib/acreditaciones/calcular-duraciones";
import type { AlertaAcreditacion } from "@/lib/acreditaciones/calcular-duraciones";
import type { Hallazgo, TipoHallazgo, PrioridadHallazgo } from "../../cumplimiento/types";

// ── Config visual ────────────────────────────────────────────────────

const ESTADO_CFG: Record<
  EstadoAcreditacion,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  en_preparacion: {
    label: "En preparación",
    cls: "text-slate-600 bg-slate-100 border-slate-200",
    icon: <Clock className="h-3 w-3" />,
  },
  listo_para_enviar: {
    label: "Listo p. enviar",
    cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  enviado: {
    label: "Enviado",
    cls: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <Send className="h-3 w-3" />,
  },
  aprobado: {
    label: "Aprobado",
    cls: "text-green-700 bg-green-50 border-green-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rechazado: {
    label: "Rechazado",
    cls: "text-rose-700 bg-rose-50 border-rose-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  vencido: {
    label: "Vencido",
    cls: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  observada: {
    label: "Observada",
    cls: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  cerrada: {
    label: "Cerrada",
    cls: "text-slate-500 bg-slate-100 border-slate-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const RESULTADO_CFG: Record<
  ResultadoHistorial,
  { label: string; cls: string }
> = {
  aprobado: { label: "Aprobado", cls: "text-green-700 bg-green-50 border-green-200" },
  rechazado: { label: "Rechazado", cls: "text-rose-700 bg-rose-50 border-rose-200" },
  con_observaciones: { label: "Con observaciones", cls: "text-amber-700 bg-amber-50 border-amber-200" },
};

const CAUSA_CFG: Record<CausaRechazo, { label: string; cls: string }> = {
  documentos_vehiculo:    { label: "Docs. vehículo",        cls: "text-orange-700 bg-orange-50 border-orange-200" },
  licencias_vencidas:     { label: "Licencias vencidas",     cls: "text-amber-700 bg-amber-50 border-amber-200" },
  expediente_incompleto:  { label: "Expediente incompleto",  cls: "text-rose-700 bg-rose-50 border-rose-200" },
  examenes_salud_altura:  { label: "Exámenes salud/altura",  cls: "text-violet-700 bg-violet-50 border-violet-200" },
  formato_mandante:       { label: "Formato mandante",       cls: "text-blue-700 bg-blue-50 border-blue-200" },
  documentos_empresa:     { label: "Docs. empresa",          cls: "text-slate-700 bg-slate-100 border-slate-200" },
  otro:                   { label: "Otro motivo",            cls: "text-slate-500 bg-slate-50 border-slate-200" },
};

const ACCION_SUGERIDA: Partial<Record<CausaRechazo, string>> = {
  documentos_vehiculo:   "Actualizar SOAP, revisión técnica y permiso de circulación antes del re-envío.",
  licencias_vencidas:    "Programar renovación urgente de licencias y adjuntar copia vigente al expediente.",
  expediente_incompleto: "Solicitar listado de documentos faltantes al mandante y completar el expediente.",
  examenes_salud_altura: "Agendar exámenes médicos de salud y altura con urgencia en el próximo periodo.",
  formato_mandante:      "Reformatear según plantilla oficial del mandante y re-enviar en un plazo de 5 días.",
  documentos_empresa:    "Regularizar documentación de empresa (RUT, patente, etc.) y actualizar expediente.",
  otro:                  "Revisar observaciones del mandante y subsanar dentro del plazo acordado.",
};

const TIPO_MINI: Record<TipoHallazgo, { label: string; cls: string }> = {
  documental:   { label: "Documental",   cls: "text-sky-700 bg-sky-50 border-sky-200" },
  capacitacion: { label: "Capacitación", cls: "text-violet-700 bg-violet-50 border-violet-200" },
  seguridad:    { label: "Seguridad",    cls: "text-rose-700 bg-rose-50 border-rose-200" },
  conducta:     { label: "Conducta",     cls: "text-orange-700 bg-orange-50 border-orange-200" },
  equipos:      { label: "Equipos",      cls: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  emergencias:  { label: "Emergencias",  cls: "text-red-700 bg-red-50 border-red-200" },
};

const PRIOR_MINI: Record<PrioridadHallazgo, { label: string; cls: string }> = {
  critica: { label: "Crítica", cls: "text-red-700 bg-red-100 border-red-300" },
  alta:    { label: "Alta",    cls: "text-rose-700 bg-rose-100 border-rose-200" },
  media:   { label: "Media",   cls: "text-amber-700 bg-amber-100 border-amber-200" },
  baja:    { label: "Baja",    cls: "text-sky-700 bg-sky-100 border-sky-200" },
};

function derivarDesdeAcreditacion(h: RegistroHistorial): {
  titulo: string;
  descripcion: string;
  tipo: TipoHallazgo;
  prioridad: PrioridadHallazgo;
  accionSugerida: string;
} {
  const causaLabel = h.motivoRechazo ? CAUSA_CFG[h.motivoRechazo].label : "documentación";
  const resultadoLabel = h.resultado === "rechazado" ? "rechazada" : "aprobada con observaciones";
  const titulo = `Acreditación ${resultadoLabel} — ${h.mandante}`;
  const descripcion =
    `Acreditación ${TIPO_LABEL[h.tipo]} enviada a ${h.mandante} fue ${resultadoLabel}` +
    (h.motivoRechazo ? ` por: ${causaLabel}` : "") +
    `. Responsable: ${h.responsable}. Requiere acción correctiva.`;
  const tipo: TipoHallazgo = "documental";
  const prioridad: PrioridadHallazgo =
    h.resultado === "rechazado"
      ? h.motivoRechazo === "licencias_vencidas" || h.motivoRechazo === "examenes_salud_altura"
        ? "critica"
        : "alta"
      : "media";
  const accionSugerida =
    h.motivoRechazo
      ? ACCION_SUGERIDA[h.motivoRechazo] ?? ACCION_SUGERIDA.otro!
      : "Revisar observaciones del mandante y subsanar dentro del plazo acordado.";
  return { titulo, descripcion, tipo, prioridad, accionSugerida };
}

function tasaColor(pct: number) {
  if (pct >= 75) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-rose-600";
}
function tasaBarCls(pct: number) {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-rose-400";
}

const TIPO_LABEL: Record<TipoAcreditacion, string> = {
  municipal: "Municipal",
  enel: "Enel",
  cge: "CGE",
  mandante_general: "Mandante general",
  via_publica: "Vía pública",
  contratista: "Contratista",
  mineria: "Minería",
  sanitaria: "Sanitaria",
};

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

const TH = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap";
const TD = "px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap align-top";

// ── Duraciones derivadas de un RegistroHistorial ────────────────────

interface FasesRegistro {
  diasPreparacion: number | null;
  diasRespuesta: number | null;
  diasAprobacion: number | null;
}

function diffDias(desde: string, hasta: string): number {
  const t1 = new Date(desde).getTime();
  const t2 = new Date(hasta).getTime();
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
  return Math.max(0, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
}

function fasesRegistro(h: RegistroHistorial): FasesRegistro {
  const diasPreparacion =
    h.fechaEnvio ? diffDias(h.fechaCreacion, h.fechaEnvio) : null;
  const diasRespuesta =
    h.fechaEnvio && h.fechaRespuesta
      ? diffDias(h.fechaEnvio, h.fechaRespuesta)
      : null;
  const diasAprobacion =
    h.resultado === "aprobado" && h.fechaRespuesta
      ? diffDias(h.fechaCreacion, h.fechaRespuesta)
      : null;
  return { diasPreparacion, diasRespuesta, diasAprobacion };
}

// ── Página ────────────────────────────────────────────────────────────

export default function HistorialGestionPage() {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoAcreditacion | "todos">("todos");
  const [filtroMandante, setFiltroMandante] = useState("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [hallazgosGenerados, setHallazgosGenerados] = useState<Set<string>>(() => new Set());
  const [modalRegistro, setModalRegistro] = useState<RegistroHistorial | null>(null);
  const [modalConfirmado, setModalConfirmado] = useState(false);
  const router = useRouter();

  const mandantes = useMemo(
    () => Array.from(new Set(HISTORIAL_GESTION_MOCK.map((h) => h.mandante))).sort(),
    []
  );

  const registros = useMemo(() => {
    return HISTORIAL_GESTION_MOCK.filter((h) => {
      const txt = search.toLowerCase();
      const coincideTxt =
        !txt ||
        h.mandante.toLowerCase().includes(txt) ||
        h.responsable.toLowerCase().includes(txt);
      const coincideEstado = filtroEstado === "todos" || h.estado === filtroEstado;
      const coincideMandante = filtroMandante === "todos" || h.mandante === filtroMandante;
      const coincideDesde = !filtroFechaDesde || h.fechaCreacion >= filtroFechaDesde;
      const coincideHasta = !filtroFechaHasta || h.fechaCreacion <= filtroFechaHasta;
      return coincideTxt && coincideEstado && coincideMandante && coincideDesde && coincideHasta;
    });
  }, [search, filtroEstado, filtroMandante, filtroFechaDesde, filtroFechaHasta]);

  // KPIs del historial filtrado
  const creadas = registros.length;
  const enviadas = registros.filter((h) => h.fechaEnvio).length;
  const aprobadas = registros.filter((h) => h.resultado === "aprobado").length;
  const rechazadas = registros.filter(
    (h) => h.resultado === "rechazado" || h.resultado === "con_observaciones"
  ).length;
  const cerradas = registros.filter(
    (h) => h.estado === "aprobado" || h.estado === "rechazado" || h.estado === "vencido"
  ).length;
  const conResultado = registros.filter((h) => h.resultado !== undefined).length;
  const pctExito =
    conResultado > 0 ? Math.round((aprobadas / conResultado) * 100) : 0;

  const diasPromedio = useMemo(() => {
    const cerradosConDias = registros.filter(
      (h) => h.resultado !== undefined && h.diasGestion > 0
    );
    if (cerradosConDias.length === 0) return 0;
    return Math.round(
      cerradosConDias.reduce((s, h) => s + h.diasGestion, 0) / cerradosConDias.length
    );
  }, [registros]);

  // Promedios por fase (preparación / respuesta / aprobación)
  const promediosFases = useMemo(() => {
    const prep: number[] = [];
    const resp: number[] = [];
    const apro: number[] = [];
    for (const h of registros) {
      const f = fasesRegistro(h);
      if (f.diasPreparacion !== null) prep.push(f.diasPreparacion);
      if (f.diasRespuesta !== null) resp.push(f.diasRespuesta);
      if (f.diasAprobacion !== null) apro.push(f.diasAprobacion);
    }
    const avg = (arr: number[]) =>
      arr.length === 0 ? null : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    return {
      preparacion: avg(prep),
      respuesta: avg(resp),
      aprobacion: avg(apro),
    };
  }, [registros]);

  // Alertas activas por registro (todos los mock, no solo filtrados)
  const alertasPorId = useMemo(() => {
    const map = new Map<string, AlertaAcreditacion[]>();
    for (const h of HISTORIAL_GESTION_MOCK) {
      const a = detectarAlertas(h);
      if (a.length > 0) map.set(h.id, a);
    }
    return map;
  }, []);

  const totalAlertas = alertasPorId.size;
  const alertasCriticas = Array.from(alertasPorId.values()).filter(
    (a) => severidadAlertas(a) === "critica"
  ).length;

  // Mandantes con mayor tiempo promedio de respuesta
  const mandantesLentos = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const h of HISTORIAL_GESTION_MOCK) {
      if (h.fechaEnvio && h.fechaRespuesta) {
        const dias = Math.round(
          (new Date(h.fechaRespuesta).getTime() - new Date(h.fechaEnvio).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (!map.has(h.mandante)) map.set(h.mandante, []);
        map.get(h.mandante)!.push(dias);
      }
    }
    return Array.from(map.entries())
      .map(([mandante, dias]) => ({
        mandante,
        promedio: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length),
        n: dias.length,
      }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5);
  }, []);

  // Procesos más lentos del mes actual (por diasGestion)
  const mesActual = new Date().toISOString().slice(0, 7); // "2026-04"
  const procesosLentosMes = useMemo(() => {
    return HISTORIAL_GESTION_MOCK.filter(
      (h) => h.fechaCreacion.startsWith(mesActual) && h.diasGestion > 0
    )
      .sort((a, b) => b.diasGestion - a.diasGestion)
      .slice(0, 5);
  }, [mesActual]);

  const tasaPorMandante = useMemo(() => {
    const map = new Map<string, { total: number; aprobados: number }>();
    for (const h of HISTORIAL_GESTION_MOCK) {
      if (!h.resultado) continue;
      if (!map.has(h.mandante)) map.set(h.mandante, { total: 0, aprobados: 0 });
      const m = map.get(h.mandante)!;
      m.total++;
      if (h.resultado === "aprobado") m.aprobados++;
    }
    return Array.from(map.entries())
      .map(([mandante, v]) => ({
        mandante,
        total: v.total,
        aprobados: v.aprobados,
        tasa: Math.round((v.aprobados / v.total) * 100),
      }))
      .sort((a, b) => b.tasa - a.tasa);
  }, []);

  const causasRechazo = useMemo(() => {
    const map = new Map<CausaRechazo, number>();
    for (const h of HISTORIAL_GESTION_MOCK) {
      if (h.motivoRechazo) map.set(h.motivoRechazo, (map.get(h.motivoRechazo) ?? 0) + 1);
    }
    const totalConMotivo = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([causa, count]) => ({ causa, count, pct: Math.round((count / totalConMotivo) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const kpis = [
    { label: "Creadas", value: creadas, cls: "bg-white border-slate-200 text-slate-900" },
    { label: "Enviadas", value: enviadas, cls: "bg-blue-50 border-blue-200 text-blue-700" },
    { label: "Aprobadas", value: aprobadas, cls: "bg-green-50 border-green-200 text-green-700" },
    {
      label: "Rechazadas / Obs.",
      value: rechazadas,
      cls: "bg-rose-50 border-rose-200 text-rose-700",
    },
    { label: "Cerradas", value: cerradas, cls: "bg-slate-50 border-slate-200 text-slate-700" },
    {
      label: "% Éxito",
      value: `${pctExito}%`,
      cls:
        pctExito >= 70
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-amber-50 border-amber-200 text-amber-700",
    },
  ];

  function abrirModal(h: RegistroHistorial) {
    setModalRegistro(h);
    setModalConfirmado(false);
  }
  function confirmarHallazgo() {
    if (!modalRegistro) return;
    const derivado = derivarDesdeAcreditacion(modalRegistro);
    const ahora = new Date().toISOString();
    const fechaCompromiso = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const nuevo: Hallazgo = {
      id: `acr-${modalRegistro.id}`,
      tipo: derivado.tipo,
      descripcion: derivado.titulo,
      centroId: "c1",
      centroNombre: "NEXTPREV SpA",
      trabajadorNombre: undefined,
      obligacionId: undefined,
      obligacionNombre: undefined,
      estado: "abierto",
      prioridad: derivado.prioridad,
      fechaCompromiso,
      fechaCreacion: ahora,
      creadoPor: modalRegistro.responsable,
      historial: [
        {
          fecha: ahora,
          usuario: modalRegistro.responsable,
          accion: "Hallazgo generado desde Historial de Acreditaciones",
          detalle: derivado.accionSugerida,
        },
      ],
      evidenciaIds: [],
    };
    agregarHallazgoAcreditacion(modalRegistro.id, nuevo);
    setHallazgosGenerados((prev) => {
      const next = new Set(prev);
      next.add(modalRegistro.id);
      return next;
    });
    setModalConfirmado(true);
  }
  function cerrarModal() {
    setModalRegistro(null);
    setModalConfirmado(false);
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Historial de gestión
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro analítico de acreditaciones — resultados, tiempos y responsables
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={cn("rounded-2xl border p-4 shadow-sm", k.cls)}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">
                {k.label}
              </p>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Análisis: Tasa por mandante + Top causas de rechazo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel izquierdo: tasa por mandante */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                Tasa de aprobación por mandante
              </h2>
            </div>
            {tasaPorMandante.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos suficientes.</p>
            ) : (
              <ul className="space-y-3">
                {tasaPorMandante.map(({ mandante, aprobados, total, tasa }) => (
                  <li key={mandante}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-700 truncate max-w-[60%]">{mandante}</span>
                      <span className={cn("text-sm font-bold tabular-nums", tasaColor(tasa))}>
                        {tasa}%
                        <span className="text-slate-400 font-normal ml-1 text-xs">({aprobados}/{total})</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", tasaBarCls(tasa))}
                        style={{ width: `${tasa}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Panel derecho: top causas de rechazo */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                Top causas de rechazo / observación
              </h2>
            </div>
            {causasRechazo.length === 0 ? (
              <p className="text-xs text-slate-400">Sin rechazos registrados.</p>
            ) : (
              <ul className="space-y-2.5">
                {causasRechazo.map(({ causa, count, pct }) => {
                  const cfg = CAUSA_CFG[causa];
                  return (
                    <li key={causa} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
                          cfg.cls
                        )}
                      >
                        {cfg.label}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums w-16 text-right">
                        {count} caso{count !== 1 ? "s" : ""} · {pct}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Métricas de tiempo ── panel de fases */}
        {diasPromedio > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5 flex items-start gap-3">
              <TrendingUp className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Gestión total
                </p>
                <p className="text-2xl font-bold text-blue-700 tabular-nums">
                  {diasPromedio}d
                </p>
                <p className="text-[11px] text-blue-400 mt-0.5">promedio cerrados</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 flex items-start gap-3">
              <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  En preparación
                </p>
                <p className="text-2xl font-bold text-slate-700 tabular-nums">
                  {promediosFases.preparacion !== null ? `${promediosFases.preparacion}d` : "—"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">creación → envío</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 flex items-start gap-3">
              <Send className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Hasta respuesta
                </p>
                <p className="text-2xl font-bold text-slate-700 tabular-nums">
                  {promediosFases.respuesta !== null ? `${promediosFases.respuesta}d` : "—"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">envío → resultado</p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Hasta aprobación
                </p>
                <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                  {promediosFases.aprobacion !== null ? `${promediosFases.aprobacion}d` : "—"}
                </p>
                <p className="text-[11px] text-emerald-400 mt-0.5">creación → aprobado</p>
              </div>
            </div>
          </div>
        )}

        {/* Cuellos de botella: alertas + mandantes lentos + procesos del mes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Panel alertas activas */}
          <div className={cn(
            "rounded-2xl border p-5 space-y-3",
            alertasCriticas > 0
              ? "border-rose-200 bg-rose-50"
              : totalAlertas > 0
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-white"
          )}>
            <div className="flex items-center gap-2">
              <TriangleAlert className={cn(
                "h-4 w-4 shrink-0",
                alertasCriticas > 0 ? "text-rose-500" : totalAlertas > 0 ? "text-amber-500" : "text-slate-300"
              )} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">
                Alertas activas
              </h2>
            </div>
            {totalAlertas === 0 ? (
              <p className="text-xs text-slate-400">Sin atrasos detectados.</p>
            ) : (
              <>
                <div className="flex gap-3">
                  {alertasCriticas > 0 && (
                    <div className="flex-1 rounded-xl bg-rose-100 border border-rose-200 px-3 py-2 text-center">
                      <p className="text-2xl font-bold text-rose-700">{alertasCriticas}</p>
                      <p className="text-[11px] text-rose-500 mt-0.5">críticas</p>
                    </div>
                  )}
                  <div className="flex-1 rounded-xl bg-amber-100 border border-amber-200 px-3 py-2 text-center">
                    <p className="text-2xl font-bold text-amber-700">{totalAlertas}</p>
                    <p className="text-[11px] text-amber-500 mt-0.5">en total</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex justify-between text-slate-600">
                    <span>En preparación {">"} {UMBRALES.preparacionLenta}d</span>
                    <span className="font-semibold tabular-nums">
                      {Array.from(alertasPorId.values()).filter((a) =>
                        a.some((x) => x.tipo === "preparacion_lenta")
                      ).length}
                    </span>
                  </li>
                  <li className="flex justify-between text-slate-600">
                    <span>Sin respuesta {">"} {UMBRALES.sinRespuesta}d</span>
                    <span className="font-semibold tabular-nums text-rose-600">
                      {Array.from(alertasPorId.values()).filter((a) =>
                        a.some((x) => x.tipo === "sin_respuesta")
                      ).length}
                    </span>
                  </li>
                  <li className="flex justify-between text-slate-600">
                    <span>Aprobación {">"} {UMBRALES.aprobacionLenta}d</span>
                    <span className="font-semibold tabular-nums">
                      {Array.from(alertasPorId.values()).filter((a) =>
                        a.some((x) => x.tipo === "aprobacion_lenta")
                      ).length}
                    </span>
                  </li>
                </ul>
              </>
            )}
          </div>

          {/* Panel mandantes con mayor tiempo de respuesta */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">
                Mandantes más lentos
              </h2>
            </div>
            {mandantesLentos.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos de respuesta.</p>
            ) : (
              <ul className="space-y-2.5">
                {mandantesLentos.map(({ mandante, promedio, n }) => (
                  <li key={mandante}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-700 truncate max-w-[65%]">{mandante}</span>
                      <span className={cn(
                        "text-xs font-bold tabular-nums",
                        promedio > 21 ? "text-rose-600" : promedio > 14 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {promedio}d
                        <span className="text-slate-400 font-normal ml-1">({n})</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          promedio > 21 ? "bg-rose-400" : promedio > 14 ? "bg-amber-400" : "bg-emerald-400"
                        )}
                        style={{ width: `${Math.min(100, Math.round((promedio / 30) * 100))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Panel procesos más lentos del mes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">
                Más lentos del mes
              </h2>
            </div>
            {procesosLentosMes.length === 0 ? (
              <p className="text-xs text-slate-400">Sin procesos registrados este mes.</p>
            ) : (
              <ul className="space-y-2.5">
                {procesosLentosMes.map((h) => {
                  const alertas = alertasPorId.get(h.id) ?? [];
                  const severidad = severidadAlertas(alertas);
                  return (
                    <li key={h.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{h.mandante}</p>
                        <p className="text-[11px] text-slate-400">{TIPO_LABEL[h.tipo]}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {severidad === "critica" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                        {severidad === "advertencia" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          h.diasGestion > UMBRALES.aprobacionLenta
                            ? "text-rose-600"
                            : h.diasGestion > 30
                            ? "text-amber-600"
                            : "text-slate-700"
                        )}>
                          {h.diasGestion}d
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar mandante o responsable…"
              className="pl-9 text-sm bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={filtroMandante}
            onValueChange={setFiltroMandante}
          >
            <SelectTrigger className="w-full sm:w-52 text-sm bg-white">
              <SelectValue placeholder="Mandante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los mandantes</SelectItem>
              {mandantes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filtroEstado}
            onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}
          >
            <SelectTrigger className="w-full sm:w-44 text-sm bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {(Object.keys(ESTADO_CFG) as EstadoAcreditacion[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {ESTADO_CFG[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="date"
              className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
            />
            <span className="text-sm text-slate-400">—</span>
            <input
              type="date"
              className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={TH}>Fecha creación</th>
                  <th className={TH}>Mandante</th>
                  <th className={TH}>Tipo</th>
                  <th className={TH}>Estado</th>
                  <th className={cn(TH, "text-center")}>
                    <Users className="h-3.5 w-3.5 inline" />
                  </th>
                  <th className={cn(TH, "text-center")}>
                    <Car className="h-3.5 w-3.5 inline" />
                  </th>
                  <th className={TH}>Fecha envío</th>
                  <th className={TH}>Fecha respuesta</th>
                  <th className={TH}>Resultado / Motivo</th>
                  <th className={TH}>Responsable</th>
                  <th className={cn(TH, "text-right")}>Días gestión</th>
                  <th className={cn(TH, "text-right")}>T. aprobación</th>
                  <th className={cn(TH, "text-center")}>Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-16 text-center text-sm text-slate-400">
                      No hay registros con los filtros aplicados.
                    </td>
                  </tr>
                )}
                {registros.map((h) => {
                  const estadoCfg = ESTADO_CFG[h.estado];
                  const resultadoCfg = h.resultado ? RESULTADO_CFG[h.resultado] : null;
                  const fases = fasesRegistro(h);
                  const alertas = alertasPorId.get(h.id) ?? [];
                  const severidad = severidadAlertas(alertas);

                  return (
                    <tr
                      key={h.id}
                      className={cn(
                        "transition-colors",
                        severidad === "critica"
                          ? "bg-rose-50/60 hover:bg-rose-50"
                          : severidad === "advertencia"
                          ? "bg-amber-50/40 hover:bg-amber-50/70"
                          : "hover:bg-slate-50/60"
                      )}
                    >
                      {/* Fecha creación */}
                      <td className={TD}>
                        <span className="font-medium text-slate-800">
                          {fmt(h.fechaCreacion)}
                        </span>
                      </td>

                      {/* Mandante */}
                      <td className={TD}>
                        <span className="font-medium text-slate-800">{h.mandante}</span>
                      </td>

                      {/* Tipo */}
                      <td className={TD}>
                        <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium">
                          {TIPO_LABEL[h.tipo]}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className={TD}>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                            estadoCfg.cls
                          )}
                        >
                          {estadoCfg.icon}
                          {estadoCfg.label}
                        </span>
                      </td>

                      {/* Trabajadores */}
                      <td className={cn(TD, "text-center")}>
                        <span className="font-medium">{h.cantidadTrabajadores}</span>
                      </td>

                      {/* Vehículos */}
                      <td className={cn(TD, "text-center")}>
                        <span className="font-medium">{h.cantidadVehiculos}</span>
                      </td>

                      {/* Fecha envío */}
                      <td className={TD}>{fmt(h.fechaEnvio)}</td>

                      {/* Fecha respuesta */}
                      <td className={TD}>{fmt(h.fechaRespuesta)}</td>

                      {/* Resultado / Motivo */}
                      <td className={TD}>
                        <div className="flex flex-col gap-1">
                          {resultadoCfg ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                                resultadoCfg.cls
                              )}
                            >
                              {resultadoCfg.label}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                          {h.motivoRechazo && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                CAUSA_CFG[h.motivoRechazo].cls
                              )}
                            >
                              {CAUSA_CFG[h.motivoRechazo].label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Responsable */}
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-slate-300 shrink-0" />
                          <span>{h.responsable}</span>
                        </div>
                      </td>

                      {/* Días gestión */}
                      <td className={cn(TD, "text-right")}>
                        <span
                          className={cn(
                            "font-semibold",
                            h.diasGestion > 45
                              ? "text-amber-600"
                              : h.diasGestion > 30
                              ? "text-slate-700"
                              : "text-emerald-600"
                          )}
                        >
                          {h.diasGestion}d
                        </span>
                        <div className="flex flex-col gap-0.5 mt-0.5 items-end">
                          {fases.diasPreparacion !== null && (
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              Prep. {fases.diasPreparacion}d
                            </span>
                          )}
                          {fases.diasRespuesta !== null && (
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              Resp. {fases.diasRespuesta}d
                            </span>
                          )}
                        </div>
                      </td>

                      {/* T. aprobación */}
                      <td className={cn(TD, "text-right")}>
                        {fases.diasAprobacion !== null ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                alertas.some((a) => a.tipo === "aprobacion_lenta")
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              )}
                            >
                              {fases.diasAprobacion}d
                            </span>
                            {alertas.some((a) => a.tipo === "aprobacion_lenta") && (
                              <span className="text-[10px] text-amber-500">
                                lento ({UMBRALES.aprobacionLenta}d)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Cumplimiento */}
                      <td className={cn(TD, "text-center")}>
                        {(h.resultado === "rechazado" || h.resultado === "con_observaciones") ? (
                          hallazgosGenerados.has(h.id) ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                                <CheckCheck className="h-3 w-3" />
                                Vinculado
                              </span>
                              <button
                                onClick={() => router.push("/dicaprev/cumplimiento/hallazgos")}
                                className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                Ver hallazgo
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => abrirModal(h)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              <ShieldAlert className="h-3 w-3" />
                              Crear hallazgo
                            </button>
                          )
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer de tabla */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              {registros.length} registro{registros.length !== 1 ? "s" : ""}
              {registros.length !== HISTORIAL_GESTION_MOCK.length &&
                ` de ${HISTORIAL_GESTION_MOCK.length} en total`}
            </p>
          </div>
        </div>

      </div>

      {modalRegistro && (
        <GenerarHallazgoModal
          registro={modalRegistro}
          confirmado={modalConfirmado}
          onConfirmar={confirmarHallazgo}
          onCerrar={cerrarModal}
          onVerHallazgos={() => router.push("/dicaprev/cumplimiento/hallazgos")}
        />
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-36 shrink-0 text-slate-400">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function GenerarHallazgoModal({
  registro,
  confirmado,
  onConfirmar,
  onCerrar,
  onVerHallazgos,
}: {
  registro: RegistroHistorial;
  confirmado: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
  onVerHallazgos: () => void;
}) {
  const derivado = React.useMemo(() => derivarDesdeAcreditacion(registro), [registro]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("rounded-full p-2", confirmado ? "bg-emerald-100" : "bg-rose-100")}>
              {confirmado
                ? <CheckCheck className="h-5 w-5 text-emerald-600" />
                : <ShieldAlert className="h-5 w-5 text-rose-600" />
              }
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {confirmado ? "Hallazgo generado" : "Generar hallazgo"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {confirmado
                  ? "Acción registrada en cumplimiento"
                  : "Acreditación rechazada / con observaciones"}
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 pb-5 space-y-4">
          {!confirmado ? (
            <>
              {/* Hallazgo derivado — previsualización */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Hallazgo a generar
                </p>
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {derivado.titulo}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {derivado.descripcion}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", TIPO_MINI[derivado.tipo].cls)}>
                    {TIPO_MINI[derivado.tipo].label}
                  </span>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", PRIOR_MINI[derivado.prioridad].cls)}>
                    {PRIOR_MINI[derivado.prioridad].label}
                  </span>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span><strong>Acción sugerida:</strong> {derivado.accionSugerida}</span>
                </div>
              </div>

              {/* Datos de origen */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Origen</p>
                <FieldRow label="Mandante" value={registro.mandante} />
                <FieldRow
                  label="Resultado"
                  value={
                    registro.resultado ? (
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", RESULTADO_CFG[registro.resultado].cls)}>
                        {RESULTADO_CFG[registro.resultado].label}
                      </span>
                    ) : "—"
                  }
                />
                {registro.motivoRechazo && (
                  <FieldRow
                    label="Motivo"
                    value={
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", CAUSA_CFG[registro.motivoRechazo].cls)}>
                        {CAUSA_CFG[registro.motivoRechazo].label}
                      </span>
                    }
                  />
                )}
                <FieldRow label="Responsable" value={registro.responsable} />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <p className="text-sm text-emerald-700 font-medium">
                  El hallazgo fue registrado exitosamente.
                </p>
                <p className="text-xs text-emerald-600">
                  Accede al módulo de Hallazgos para asignar responsable, fecha límite y realizar
                  el seguimiento.
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hallazgo creado</p>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{derivado.titulo}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", TIPO_MINI[derivado.tipo].cls)}>
                    {TIPO_MINI[derivado.tipo].label}
                  </span>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", PRIOR_MINI[derivado.prioridad].cls)}>
                    {PRIOR_MINI[derivado.prioridad].label}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 flex justify-end gap-2 shrink-0 border-t border-slate-100">
          {!confirmado ? (
            <>
              <button
                onClick={onCerrar}
                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmar}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors"
              >
                Generar hallazgo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCerrar}
                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={onVerHallazgos}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver hallazgos
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
