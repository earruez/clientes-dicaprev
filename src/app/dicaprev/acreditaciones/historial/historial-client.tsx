"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Send,
  ShieldAlert,
  Timer,
  TriangleAlert,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type HistorialResultado = "aprobado" | "rechazado" | "con_observaciones";

type HistorialFila = {
  id: string;
  acreditacionId: string;
  mandanteId: string;
  mandante: string;
  tipo: string;
  estado: string;
  proyecto: string;
  obraFaena: string | null;
  responsableId: string | null;
  responsable: string;
  trabajadores: number;
  vehiculos: number;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRespuesta: string | null;
  fechaVencimiento: string | null;
  resultado: HistorialResultado | null;
  causaClave: string | null;
  causaEtiqueta: string | null;
  observaciones: string | null;
  diasGestion: number;
  diasPreparacion: number | null;
  diasRespuesta: number | null;
  diasAprobacion: number | null;
  totalDocumentos: number;
  documentosCompletos: number;
  documentosFaltantes: number;
  documentosVencidos: number;
  documentosObservados: number;
  alertasActivas: number;
  tieneAlerta: boolean;
  ultimaActividad: string;
};

type HistorialData = {
  kpis: {
    creadas: number;
    enviadas: number;
    aprobadas: number;
    rechazadasObservadas: number;
    cerradas: number;
    porcentajeExito: number;
    diasPromedioGestion: number;
    diasPromedioPreparacion: number | null;
    diasPromedioRespuesta: number | null;
    diasPromedioAprobacion: number | null;
    alertasActivas: number;
  };
  filas: HistorialFila[];
  mandantes: Array<{ id: string; nombre: string }>;
  tasaPorMandante: Array<{ mandanteId: string; mandante: string; total: number; aprobadas: number; tasa: number }>;
  causasRechazo: Array<{ causa: string; etiqueta: string; count: number; pct: number }>;
  alertas: {
    total: number;
    criticas: number;
    porTipo: {
      preparacionLenta: number;
      sinRespuesta: number;
      aprobacionLenta: number;
    };
  };
  mandantesLentos: Array<{ mandanteId: string; mandante: string; promedio: number; n: number }>;
  procesosLentosMes: Array<{
    id: string;
    mandante: string;
    tipo: string;
    estado: string;
    responsable: string;
    diasGestion: number;
  }>;
};

type Props = {
  data: HistorialData;
};

type EstadoFiltro = "todos" | "en_preparacion" | "listo_para_enviar" | "enviado" | "observada" | "aprobado" | "rechazado" | "cerrada" | "vencido";
type EstadoReal = Exclude<EstadoFiltro, "todos">;

const ESTADO_CFG: Record<EstadoReal, { label: string; cls: string; icon: JSX.Element }> = {
  en_preparacion: { label: "En preparación", cls: "text-slate-600 bg-slate-100 border-slate-200", icon: <Clock className="h-3 w-3" /> },
  listo_para_enviar: { label: "Listo p. enviar", cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  enviado: { label: "Enviado", cls: "text-blue-700 bg-blue-50 border-blue-200", icon: <Send className="h-3 w-3" /> },
  aprobado: { label: "Aprobado", cls: "text-green-700 bg-green-50 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  rechazado: { label: "Rechazado", cls: "text-rose-700 bg-rose-50 border-rose-200", icon: <AlertTriangle className="h-3 w-3" /> },
  vencido: { label: "Vencido", cls: "text-amber-700 bg-amber-50 border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> },
  observada: { label: "Observada", cls: "text-amber-700 bg-amber-50 border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> },
  cerrada: { label: "Cerrada", cls: "text-slate-500 bg-slate-100 border-slate-200", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const RESULTADO_CFG: Record<HistorialResultado, { label: string; cls: string }> = {
  aprobado: { label: "Aprobado", cls: "text-green-700 bg-green-50 border-green-200" },
  rechazado: { label: "Rechazado", cls: "text-rose-700 bg-rose-50 border-rose-200" },
  con_observaciones: { label: "Con observaciones", cls: "text-amber-700 bg-amber-50 border-amber-200" },
};

const TH = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap";
const TD = "px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap align-top";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

function calcularPromedio(valores: Array<number | null>) {
  const definidos = valores.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (definidos.length === 0) return null;
  return Math.round(definidos.reduce((sum, value) => sum + value, 0) / definidos.length);
}

function resumir(rows: HistorialFila[]) {
  const total = rows.length;
  const enviados = rows.filter((row) => row.fechaEnvio !== null || row.estado === "enviado").length;
  const aprobadas = rows.filter((row) => row.resultado === "aprobado" || row.estado === "aprobado").length;
  const rechazadasObservadas = rows.filter((row) => row.resultado === "rechazado" || row.resultado === "con_observaciones" || row.estado === "rechazado" || row.estado === "observada").length;
  const cerradas = rows.filter((row) => row.estado === "cerrada").length;
  const respuestas = rows.filter((row) => Boolean(row.resultado) || ["aprobado", "rechazado", "observada"].includes(row.estado)).length;

  return {
    total,
    enviados,
    aprobadas,
    rechazadasObservadas,
    cerradas,
    porcentajeExito: respuestas > 0 ? Math.round((aprobadas / respuestas) * 100) : 0,
    diasGestion: calcularPromedio(rows.map((row) => (row.diasGestion > 0 ? row.diasGestion : null))) ?? 0,
    diasPreparacion: calcularPromedio(rows.map((row) => row.diasPreparacion)),
    diasRespuesta: calcularPromedio(rows.map((row) => row.diasRespuesta)),
    diasAprobacion: calcularPromedio(rows.map((row) => row.diasAprobacion)),
    alertasActivas: rows.filter((row) => row.tieneAlerta).length,
  };
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

export default function HistorialAcreditacionesClient({ data }: Props) {
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("todos");
  const [filtroMandante, setFiltroMandante] = useState("todos");
  const [filtroResponsable, setFiltroResponsable] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [soloObservaciones, setSoloObservaciones] = useState(false);
  const [soloVencimientos, setSoloVencimientos] = useState(false);

  const tipos = useMemo(() => Array.from(new Set(data.filas.map((row) => row.tipo))).sort(), [data.filas]);
  const responsables = useMemo(() => Array.from(new Set(data.filas.map((row) => row.responsable).filter((value) => value !== "Sin asignar"))).sort(), [data.filas]);
  const mandantes = useMemo(() => data.mandantes, [data.mandantes]);

  const rows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return data.filas.filter((row) => {
      const coincideTexto = !text || [row.mandante, row.proyecto, row.responsable, row.observaciones ?? "", row.causaEtiqueta ?? ""].some((value) => value.toLowerCase().includes(text));
      const coincideEstado = filtroEstado === "todos" || row.estado === filtroEstado;
      const coincideMandante = filtroMandante === "todos" || row.mandanteId === filtroMandante;
      const coincideResponsable = filtroResponsable === "todos" || row.responsable === filtroResponsable;
      const coincideTipo = filtroTipo === "todos" || row.tipo === filtroTipo;
      const coincideDesde = !filtroFechaDesde || row.fechaCreacion >= filtroFechaDesde;
      const coincideHasta = !filtroFechaHasta || row.fechaCreacion <= filtroFechaHasta;
      const coincideObservaciones = !soloObservaciones || row.estado === "observada" || row.estado === "rechazado" || row.causaClave !== null || row.documentosObservados > 0;
      const coincideVencimientos = !soloVencimientos || row.estado === "vencido" || row.documentosVencidos > 0 || (row.fechaVencimiento !== null && row.fechaVencimiento <= new Date().toISOString());

      return coincideTexto && coincideEstado && coincideMandante && coincideResponsable && coincideTipo && coincideDesde && coincideHasta && coincideObservaciones && coincideVencimientos;
    });
  }, [data.filas, filtroEstado, filtroFechaDesde, filtroFechaHasta, filtroMandante, filtroResponsable, filtroTipo, search, soloObservaciones, soloVencimientos]);

  const resumen = useMemo(() => resumir(rows), [rows]);

  const tasaPorMandante = useMemo(() => {
    const map = new Map<string, { mandanteId: string; mandante: string; total: number; aprobadas: number }>();
    for (const row of rows) {
      const current = map.get(row.mandanteId) ?? { mandanteId: row.mandanteId, mandante: row.mandante, total: 0, aprobadas: 0 };
      if (Boolean(row.resultado) || ["aprobado", "rechazado", "observada"].includes(row.estado)) {
        current.total += 1;
        if (row.resultado === "aprobado" || row.estado === "aprobado") current.aprobadas += 1;
      }
      map.set(row.mandanteId, current);
    }

    return Array.from(map.values())
      .filter((item) => item.total > 0)
      .map((item) => ({ ...item, tasa: Math.round((item.aprobadas / item.total) * 100) }))
      .sort((left, right) => right.tasa - left.tasa);
  }, [rows]);

  const causasRechazo = useMemo(() => {
    const map = new Map<string, { etiqueta: string; count: number }>();
    for (const row of rows) {
      if (!row.causaClave) continue;
      const current = map.get(row.causaClave) ?? { etiqueta: row.causaEtiqueta ?? row.causaClave, count: 0 };
      current.count += 1;
      map.set(row.causaClave, current);
    }
    const totalCausas = Array.from(map.values()).reduce((sum, value) => sum + value.count, 0);

    return Array.from(map.entries())
      .map(([causa, value]) => ({ causa, etiqueta: value.etiqueta, count: value.count, pct: totalCausas > 0 ? Math.round((value.count / totalCausas) * 100) : 0 }))
      .sort((left, right) => right.count - left.count);
  }, [rows]);

  const alertasCriticas = useMemo(() => rows.filter((row) => row.estado === "rechazado" || row.estado === "observada" || row.estado === "vencido").length, [rows]);

  const mandantesLentos = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const row of rows) {
      if (row.diasRespuesta === null) continue;
      const list = map.get(row.mandanteId) ?? [];
      list.push(row.diasRespuesta);
      map.set(row.mandanteId, list);
    }

    return Array.from(map.entries())
      .map(([mandanteId, valores]) => ({
        mandanteId,
        mandante: rows.find((row) => row.mandanteId === mandanteId)?.mandante ?? mandanteId,
        promedio: Math.round(valores.reduce((sum, value) => sum + value, 0) / valores.length),
        n: valores.length,
      }))
      .sort((left, right) => right.promedio - left.promedio)
      .slice(0, 5);
  }, [rows]);

  const procesosLentosMes = useMemo(() => {
    const mesActual = new Date().toISOString().slice(0, 7);
    return rows
      .filter((row) => row.fechaCreacion.startsWith(mesActual) && row.diasGestion > 0)
      .sort((left, right) => right.diasGestion - left.diasGestion)
      .slice(0, 5);
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-screen-xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-slate-400">Acreditaciones</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historial de gestión</h1>
            <p className="text-sm text-slate-500 mt-1">Registro analítico real de acreditaciones, resultados, tiempos y responsables.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dicaprev/acreditaciones/solicitudes" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              <ExternalLink className="h-4 w-4" />
              Nueva solicitud
            </Link>
            <Link href="/dicaprev/acreditaciones/plantillas" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
              <ShieldAlert className="h-4 w-4" />
              Ver plantillas
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: "Creadas", value: resumen.total, cls: "bg-white border-slate-200 text-slate-900" },
            { label: "Enviadas", value: resumen.enviados, cls: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "Aprobadas", value: resumen.aprobadas, cls: "bg-green-50 border-green-200 text-green-700" },
            { label: "Rechazadas / Obs.", value: resumen.rechazadasObservadas, cls: "bg-rose-50 border-rose-200 text-rose-700" },
            { label: "Cerradas", value: resumen.cerradas, cls: "bg-slate-50 border-slate-200 text-slate-700" },
            { label: "% Éxito", value: `${resumen.porcentajeExito}%`, cls: resumen.porcentajeExito >= 70 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700" },
          ].map((card) => (
            <div key={card.label} className={cn("rounded-2xl border p-4 shadow-sm", card.cls)}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5 flex items-start gap-3">
            <TrendingUp className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Gestión total</p>
              <p className="text-2xl font-bold text-blue-700 tabular-nums">{resumen.diasGestion}d</p>
              <p className="text-[11px] text-blue-400 mt-0.5">promedio cerrados</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 flex items-start gap-3">
            <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">En preparación</p>
              <p className="text-2xl font-bold text-slate-700 tabular-nums">{resumen.diasPreparacion !== null ? `${resumen.diasPreparacion}d` : "—"}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">creación → envío</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 flex items-start gap-3">
            <Send className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hasta respuesta</p>
              <p className="text-2xl font-bold text-slate-700 tabular-nums">{resumen.diasRespuesta !== null ? `${resumen.diasRespuesta}d` : "—"}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">envío → resultado</p>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Hasta aprobación</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">{resumen.diasAprobacion !== null ? `${resumen.diasAprobacion}d` : "—"}</p>
              <p className="text-[11px] text-emerald-400 mt-0.5">creación → aprobado</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={cn("rounded-2xl border p-5 space-y-3", data.alertas.total > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white")}> 
            <div className="flex items-center gap-2">
              <TriangleAlert className={cn("h-4 w-4 shrink-0", data.alertas.total > 0 ? "text-amber-500" : "text-slate-300")} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Alertas activas</h2>
            </div>
            {data.alertas.total === 0 ? (
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
                    <p className="text-2xl font-bold text-amber-700">{data.alertas.total}</p>
                    <p className="text-[11px] text-amber-500 mt-0.5">en total</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex justify-between text-slate-600"><span>Preparación lenta</span><span className="font-semibold tabular-nums">{data.alertas.porTipo.preparacionLenta}</span></li>
                  <li className="flex justify-between text-slate-600"><span>Sin respuesta</span><span className="font-semibold tabular-nums text-rose-600">{data.alertas.porTipo.sinRespuesta}</span></li>
                  <li className="flex justify-between text-slate-600"><span>Aprobación lenta</span><span className="font-semibold tabular-nums">{data.alertas.porTipo.aprobacionLenta}</span></li>
                </ul>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Tasa de aprobación por mandante</h2>
            </div>
            {tasaPorMandante.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos suficientes.</p>
            ) : (
              <ul className="space-y-3">
                {tasaPorMandante.map(({ mandante, aprobadas, total, tasa }) => (
                  <li key={mandante}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-700 truncate max-w-[60%]">{mandante}</span>
                      <span className={cn("text-sm font-bold tabular-nums", tasaColor(tasa))}>{tasa}%<span className="text-slate-400 font-normal ml-1 text-xs">({aprobadas}/{total})</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", tasaBarCls(tasa))} style={{ width: `${tasa}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Top causas de rechazo / observación</h2>
            </div>
            {causasRechazo.length === 0 ? (
              <p className="text-xs text-slate-400">Sin rechazos registrados.</p>
            ) : (
              <ul className="space-y-2.5">
                {causasRechazo.map(({ causa, etiqueta, count, pct }) => (
                  <li key={causa} className="flex items-center gap-3">
                    <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-700 bg-slate-100 border-slate-200">{etiqueta}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 tabular-nums w-16 text-right">{count} caso{count !== 1 ? "s" : ""} · {pct}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Mandantes más lentos</h2>
            </div>
            {mandantesLentos.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos de respuesta.</p>
            ) : (
              <ul className="space-y-2.5">
                {mandantesLentos.map(({ mandanteId, mandante, promedio, n }) => (
                  <li key={mandanteId}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-700 truncate max-w-[65%]">{mandante}</span>
                      <span className={cn("text-xs font-bold tabular-nums", promedio > 21 ? "text-rose-600" : promedio > 14 ? "text-amber-600" : "text-emerald-600")}>{promedio}d<span className="text-slate-400 font-normal ml-1">({n})</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", promedio > 21 ? "bg-rose-400" : promedio > 14 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${Math.min(100, Math.round((promedio / 30) * 100))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Más lentos del mes</h2>
            </div>
            {procesosLentosMes.length === 0 ? (
              <p className="text-xs text-slate-400">Sin procesos registrados este mes.</p>
            ) : (
              <ul className="space-y-2.5">
                {procesosLentosMes.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{row.mandante}</p>
                      <p className="text-[11px] text-slate-400">{row.tipo}</p>
                    </div>
                    <span className={cn("text-xs font-bold tabular-nums", row.diasGestion > 60 ? "text-rose-600" : row.diasGestion > 30 ? "text-amber-600" : "text-slate-700")}>{row.diasGestion}d</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">Datos clave</h2>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex justify-between gap-3"><span>Activas con alerta</span><span className="font-semibold tabular-nums">{resumen.alertasActivas}</span></li>
              <li className="flex justify-between gap-3"><span>Mandantes únicos</span><span className="font-semibold tabular-nums">{mandantes.length}</span></li>
              <li className="flex justify-between gap-3"><span>Tipos de plantilla</span><span className="font-semibold tabular-nums">{tipos.length}</span></li>
              <li className="flex justify-between gap-3"><span>Responsables</span><span className="font-semibold tabular-nums">{responsables.length}</span></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar mandante, proyecto, responsable o causa…" className="pl-9 text-sm bg-white" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={filtroMandante} onValueChange={setFiltroMandante}>
            <SelectTrigger className="w-full sm:w-56 text-sm bg-white"><SelectValue placeholder="Mandante" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los mandantes</SelectItem>
              {mandantes.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={(value) => setFiltroEstado(value as EstadoFiltro)}>
            <SelectTrigger className="w-full sm:w-48 text-sm bg-white"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {(Object.keys(ESTADO_CFG) as EstadoReal[]).map((key) => <SelectItem key={key} value={key}>{ESTADO_CFG[key].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full sm:w-48 text-sm bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {tipos.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroResponsable} onValueChange={setFiltroResponsable}>
            <SelectTrigger className="w-full sm:w-56 text-sm bg-white"><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los responsables</SelectItem>
              {responsables.map((responsable) => <SelectItem key={responsable} value={responsable}>{responsable}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <input type="date" className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" value={filtroFechaDesde} onChange={(event) => setFiltroFechaDesde(event.target.value)} />
            <span className="text-sm text-slate-400">—</span>
            <input type="date" className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300" value={filtroFechaHasta} onChange={(event) => setFiltroFechaHasta(event.target.value)} />
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
            <input type="checkbox" checked={soloObservaciones} onChange={(event) => setSoloObservaciones(event.target.checked)} />
            Solo observaciones
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
            <input type="checkbox" checked={soloVencimientos} onChange={(event) => setSoloVencimientos(event.target.checked)} />
            Solo vencimientos
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className={TH}>Fecha creación</th>
                  <th className={TH}>Mandante</th>
                  <th className={TH}>Tipo</th>
                  <th className={TH}>Estado</th>
                  <th className={cn(TH, "text-center")}><Users className="h-3.5 w-3.5 inline" /></th>
                  <th className={cn(TH, "text-center")}><Car className="h-3.5 w-3.5 inline" /></th>
                  <th className={TH}>Fecha envío</th>
                  <th className={TH}>Fecha respuesta</th>
                  <th className={TH}>Resultado / causa</th>
                  <th className={TH}>Responsable</th>
                  <th className={cn(TH, "text-right")}>Días gestión</th>
                  <th className={cn(TH, "text-right")}>Prep.</th>
                  <th className={cn(TH, "text-right")}>Resp.</th>
                  <th className={cn(TH, "text-center")}>Alertas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-sm text-slate-400">
                      No hay registros con los filtros aplicados.
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const estadoCfg = ESTADO_CFG[row.estado as EstadoReal];
                  const resultadoCfg = row.resultado ? RESULTADO_CFG[row.resultado] : null;

                  return (
                    <tr key={row.id} className={cn("transition-colors", row.tieneAlerta ? "bg-amber-50/35 hover:bg-amber-50/65" : "hover:bg-slate-50/60") }>
                      <td className={TD}><span className="font-medium text-slate-800">{fmt(row.fechaCreacion)}</span></td>
                      <td className={TD}><span className="font-medium text-slate-800">{row.mandante}</span></td>
                      <td className={TD}><span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium">{row.tipo}</span></td>
                      <td className={TD}>
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", estadoCfg.cls)}>
                          {estadoCfg.icon}
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className={cn(TD, "text-center")}><span className="font-medium">{row.trabajadores}</span></td>
                      <td className={cn(TD, "text-center")}><span className="font-medium">{row.vehiculos}</span></td>
                      <td className={TD}>{fmt(row.fechaEnvio)}</td>
                      <td className={TD}>{fmt(row.fechaRespuesta)}</td>
                      <td className={TD}>
                        {resultadoCfg ? <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", resultadoCfg.cls)}>{resultadoCfg.label}</span> : <span className="text-slate-400">—</span>}
                        {row.causaEtiqueta ? <div className="mt-1 text-xs font-semibold text-slate-600">{row.causaEtiqueta}</div> : null}
                      </td>
                      <td className={TD}><span className="font-medium text-slate-800">{row.responsable}</span></td>
                      <td className={cn(TD, "text-right")}>{row.diasGestion}d</td>
                      <td className={cn(TD, "text-right")}>{row.diasPreparacion !== null ? `${row.diasPreparacion}d` : "—"}</td>
                      <td className={cn(TD, "text-right")}>{row.diasRespuesta !== null ? `${row.diasRespuesta}d` : "—"}</td>
                      <td className={cn(TD, "text-center")}>
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", row.alertasActivas > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-500")}>{row.alertasActivas > 0 ? `${row.alertasActivas}` : "0"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-700">No hay acreditaciones en el historial todavía.</p>
            <p className="mt-2 text-sm text-slate-500">Cuando existan procesos reales, aparecerán aquí sin depender de datos mock.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/dicaprev/acreditaciones/solicitudes" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Crear primera solicitud</Link>
              <Link href="/dicaprev/acreditaciones/plantillas" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Ver plantillas base</Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}