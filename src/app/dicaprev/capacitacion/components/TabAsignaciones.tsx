"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  getCapacitacionAsignaciones,
  getCapacitaciones,
  getTrabajadoresAsignablesCapacitacion,
  createCapacitacionAsignacion,
  updateCapacitacionAsignacion,
  cambiarEstadoCapacitacionAsignacion,
  enviarCapacitacionAsignacion,
  deleteCapacitacionAsignacion,
  descargarCertificadoCapacitacionPdf,
} from "@/actions/capacitaciones";
import type {
  AsignacionCapacitacion,
  CapacitacionCatalogo,
  TrabajadorAsignableCapacitacion,
} from "@/actions/capacitaciones/types";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search, Send, Plus, Eye, ClipboardList, Bot, Pencil, X,
  ExternalLink, Copy, RefreshCw, CalendarClock, Award,
  FileBadge2, CheckCircle2, XCircle, RotateCcw, PlayCircle,
  ClipboardCheck, ChevronDown, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadTabAsignacionesData,
  normalizeAvanceEstado,
  normalizeEnvioEstado,
  type AvanceEstadoUI,
  type EnvioEstadoUI,
} from "@/lib/capacitacion/asignaciones-ui";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

// ─── Mapping de estados Prisma a UI ──────────────────────────────────────── //
type EstadoUI = "pendiente" | "enviada" | "en_proceso" | "completada" | "aprobada" | "rechazada" | "vencida" | "cancelada";

function mapEstadoUi(a: AsignacionCapacitacion): EstadoUI {
  if (a.estado === "completada") {
    if (a.aprobado === true) return "aprobada";
    if (a.aprobado === false) return "rechazada";
    return "completada";
  }
  if (a.estado === "en_progreso") return "en_proceso";
  return a.estado as EstadoUI;
}

function normalizeOrigen(origen?: string): "automatica" | "manual" {
  return origen === "automatica" || origen === "automatico" ? "automatica" : "manual";
}

function isVideoModalidad(modalidad?: string): boolean {
  const m = (modalidad || "").toLowerCase();
  return m === "virtual" || m === "e-learning" || m === "elearning";
}

// Configuración de UI por estado
const ESTADO_ASIG_CFG: Record<EstadoUI, { label: string; cls: string; dot: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  enviada: { label: "Enviada", cls: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-400" },
  en_proceso: { label: "En curso", cls: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-400" },
  completada: { label: "Completada", cls: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-400" },
  aprobada: { label: "Aprobada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rechazada: { label: "Rechazada", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  vencida: { label: "Vencida", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  cancelada: { label: "Cancelada", cls: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-350" },
};

type EnrichedAsignacion = AsignacionCapacitacion & {
  estadoUi: EstadoUI;
};

const ENVIO_CFG: Record<EnvioEstadoUI, { label: string; cls: string }> = {
  no_enviado: { label: "No enviado", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  enviado: { label: "Enviado", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  fallido: { label: "Fallido", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  reenviado: { label: "Reenviado", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const AVANCE_CFG: Record<AvanceEstadoUI, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  link_abierto: { label: "Link abierto", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  iniciada: { label: "Iniciada", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  completada: { label: "Completada", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  aprobada: { label: "Aprobada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  reprobada: { label: "Reprobada", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

// ─── Per-state action buttons (compact, for table row) ──────────────────── //
function AccionesRow({
  item,
  onAccion,
  loading,
}: {
  item: EnrichedAsignacion;
  onAccion: (accion: string, item: EnrichedAsignacion) => void;
  loading: boolean;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = item.token ? `${origin}/capacitacion/externa/${item.token}` : "";

  switch (item.estadoUi) {
    case "pendiente":
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("enviar", item); }}
            title="Enviar capacitación"
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px] font-medium hover:bg-cyan-100 transition-colors"
          >
            <Send className="h-3 w-3" /> {loading ? "Enviando..." : "Enviar"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("cancelar", item); }}
            title="Cancelar asignación"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <XCircle className="h-3 w-3" />
          </button>
        </div>
      );
    case "enviada":
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("reenviar", item); }}
            title="Reenviar enlace"
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> {loading ? "Reenviando..." : "Reenviar"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(link); }}
            title="Copiar link"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("cancelar", item); }}
            title="Cancelar asignación"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <XCircle className="h-3 w-3" />
          </button>
        </div>
      );
    case "en_proceso":
      return (
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 text-[11px] font-medium">
            <PlayCircle className="h-3 w-3" /> En curso
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("cancelar", item); }}
            title="Cancelar asignación"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <XCircle className="h-3 w-3" />
          </button>
        </div>
      );
    case "completada":
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onAccion("revisar", item); }}
          title="Revisar resultado"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-medium hover:bg-teal-100 transition-colors"
        >
          <ClipboardCheck className="h-3 w-3" /> Revisar
        </button>
      );
    case "aprobada":
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onAccion(item.certificadoId ? "ver_cert" : "generar_cert", item); }}
          title={item.certificadoId ? "Ver certificado" : "Generar certificado"}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium hover:bg-emerald-100 transition-colors"
        >
          <Award className="h-3 w-3" /> Certificado
        </button>
      );
    case "rechazada":
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onAccion("reasignar", item); }}
          title="Reasignar capacitación"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium hover:bg-rose-100 transition-colors"
        >
          <RotateCcw className="h-3 w-3" /> Reasignar
        </button>
      );
    case "vencida":
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("reasignar", item); }}
            title="Reasignar"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium hover:bg-amber-100 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reasignar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("extender", item); }}
            title="Extender plazo"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-colors"
          >
            <CalendarClock className="h-3 w-3" />
          </button>
        </div>
      );
    default:
      return null;
  }
}

// ─── Drawer de detalle ────────────────────────────────────────────────────── //
function DetalleDrawer({
  item,
  onClose,
  onAccion,
}: {
  item: EnrichedAsignacion | null;
  onClose: () => void;
  onAccion: (accion: string, item: EnrichedAsignacion) => void;
}) {
  if (!item) return null;
  const cfg = ESTADO_ASIG_CFG[item.estadoUi];
  const origenUi = normalizeOrigen(item.origen);
  const envioEstado = normalizeEnvioEstado(item.envioEstado);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = item.token ? `/capacitacion/externa/${item.token}` : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Detalle de asignación</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-5">
          {/* Badge row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border", cfg.cls)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
              origenUi === "automatica" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-violet-50 text-violet-700 border-violet-200"
            )}>
              {origenUi === "automatica" ? <Bot className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
              {origenUi === "automatica" ? "Automática" : "Manual"}
            </span>
          </div>

          {/* Trabajador + Capacitacion */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Trabajador</p>
              <p className="text-sm font-semibold text-slate-800">{item.trabajadorNombre}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Capacitación</p>
              <p className="text-sm text-slate-700">{item.capacitacionNombre}</p>
            </div>
          </div>

          {/* Dates grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Asignada",   val: item.fechaAsignacion },
              { label: "Enviada",    val: item.fechaEnvio },
              { label: "Inicio",     val: item.fechaInicio },
              { label: "Completada", val: item.fechaRespuesta },
              { label: "Vencimiento",val: item.fechaVencimiento },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5">
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">{label}</p>
                <p className="text-sm text-slate-700 font-medium">{fmt(val)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 space-y-2">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Seguimiento de envío</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border", ENVIO_CFG[envioEstado].cls)}>
                {ENVIO_CFG[envioEstado].label}
              </span>
              <span className="text-xs text-slate-500">Último envío: {fmt(item.fechaUltimoEnvio ?? item.fechaEnvio)}</span>
              <span className="text-xs text-slate-500">Intentos: {item.cantidadEnvios ?? 0}</span>
            </div>
            {item.ultimoErrorEnvio && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">
                Último error: {item.ultimoErrorEnvio}
              </p>
            )}
          </div>

          {/* Nota */}
          {item.nota !== undefined && (
            <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Nota obtenida</span>
              <span className={cn("text-2xl font-bold", (item.nota ?? 0) >= 4 ? "text-emerald-600" : "text-rose-600")}>
                {item.nota.toFixed(1)}
              </span>
            </div>
          )}

          {/* Certificado */}
          {item.certificadoId && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-4 py-3 flex items-center gap-3">
              <Award className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-800">Certificado generado</p>
                <p className="text-xs text-emerald-600 truncate font-mono">{item.certificadoId}</p>
              </div>
            </div>
          )}

          {/* Enlace externo */}
          {link && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">Enlace externo</p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
                <code className="text-xs text-slate-600 flex-1 truncate">{link}</code>
                <button onClick={() => copyToClipboard(`${origin}${link}`)} className="text-slate-400 hover:text-cyan-600 p-1">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-600 p-1">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Observacion */}
          {item.observacion && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Observación</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">{item.observacion}</p>
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="p-5 border-t border-slate-100 space-y-2">
          {item.estado === "pendiente" && (
            <Button className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => onAccion("enviar", item)}>
              <Send className="h-4 w-4 mr-2" /> Enviar capacitación
            </Button>
          )}
          {item.estado === "enviada" && (
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onAccion("reenviar", item)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reenviar enlace
              </Button>
              <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => link && copyToClipboard(`${origin}${link}`)}>
                <Copy className="h-4 w-4 mr-1.5" /> Copiar link
              </Button>
            </div>
          )}
          {(item.estado === "pendiente" || item.estado === "enviada" || item.estado === "en_progreso") && (
            <Button
              variant="outline"
              className="w-full rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={() => onAccion("cancelar", item)}
            >
              <XCircle className="h-4 w-4 mr-2" /> Cancelar asignación
            </Button>
          )}
          {item.estado === "en_progreso" && (
            <div className="flex items-center gap-2 bg-violet-50 rounded-xl px-4 py-3 border border-violet-100">
              <PlayCircle className="h-4 w-4 text-violet-500 shrink-0" />
              <p className="text-sm text-violet-700">El trabajador está realizando la capacitación.</p>
            </div>
          )}
          {item.estado === "completada" && item.aprobado === null && (
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAccion("aprobar", item)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobado
              </Button>
              <Button className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={() => onAccion("rechazar", item)}>
                <XCircle className="h-4 w-4 mr-2" /> No aprobado
              </Button>
            </div>
          )}
          {item.estado === "completada" && item.aprobado === true && (
            <div className="flex gap-2">
              {item.generaCertificado && !item.certificadoDocumentoId && (
                <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAccion("generar_cert", item)}>
                  <FileBadge2 className="h-4 w-4 mr-2" /> Generar certificado
                </Button>
              )}
              {item.certificadoDocumentoId && (
                <>
                  <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAccion("ver_cert", item)}>
                    <Award className="h-4 w-4 mr-2" /> Ver certificado
                  </Button>
                  {item.documentoId && (
                    <Button variant="outline" className="flex-1 rounded-xl border-slate-200" onClick={() => onAccion("ver_doc", item)}>
                      <FileBadge2 className="h-4 w-4 mr-2" /> Ver documento
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          {item.estado === "completada" && item.aprobado === false && (
            <Button className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={() => onAccion("reasignar", item)}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reasignar capacitación
            </Button>
          )}
          {item.estado === "vencida" && (
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white" onClick={() => onAccion("reasignar", item)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reasignar
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl border-slate-200" onClick={() => onAccion("extender", item)}>
                <CalendarClock className="h-4 w-4 mr-2" /> Extender plazo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TabAsignaciones() {
  const [asignaciones, setAsignaciones] = useState<AsignacionCapacitacion[]>([]);
  const [catalogo, setCatalogo] = useState<CapacitacionCatalogo[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorAsignableCapacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  const [trabajadoresError, setTrabajadoresError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoUI | "todos">("todos");
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "automatica" | "manual">("todos");
  const [selected, setSelected] = useState<EnrichedAsignacion | null>(null);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalRevisar, setModalRevisar] = useState<EnrichedAsignacion | null>(null);
  const [modalExtender, setModalExtender] = useState<EnrichedAsignacion | null>(null);
  const [modalCert, setModalCert] = useState<{ certId: string; nombre: string } | null>(null);
  const [formNueva, setFormNueva] = useState({ trabajadorId: "", capacitacionId: "", observacion: "" });
  const [notaRevisar, setNotaRevisar] = useState("");
  const [expandedTrabajadores, setExpandedTrabajadores] = useState<Record<string, boolean>>({});
  const [accionLoadingId, setAccionLoadingId] = useState<string | null>(null);

  // Cargar datos al montar
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await loadTabAsignacionesData({
          getAsignaciones: getCapacitacionAsignaciones,
          getCatalogo: getCapacitaciones,
          getTrabajadoresAsignables: getTrabajadoresAsignablesCapacitacion,
        });
        setAsignaciones(data.asignaciones);
        setCatalogo(data.catalogo);
        setTrabajadores(data.trabajadores);
        setError(data.asignacionesError);
        setCatalogoError(data.catalogoError);
        setTrabajadoresError(data.trabajadoresError);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las asignaciones.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const asignacionesData = await getCapacitacionAsignaciones();
      setAsignaciones(asignacionesData);
    } catch (err) {
      console.error("Error al refrescar asignaciones:", err);
    }
  }, []);

  const enriched = useMemo<EnrichedAsignacion[]>(() =>
    asignaciones.map((a) => ({
      ...a,
      estadoUi: mapEstadoUi(a),
    })),
    [asignaciones]
  );

  const filtered = useMemo(() =>
    enriched.filter((a) => {
      if (filtroEstado !== "todos" && a.estadoUi !== filtroEstado) return false;
      if (filtroOrigen !== "todos" && normalizeOrigen(a.origen) !== filtroOrigen) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.trabajadorNombre.toLowerCase().includes(q) &&
          !a.capacitacionNombre.toLowerCase().includes(q) &&
          !(a.modalidad || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    }),
    [enriched, filtroEstado, filtroOrigen, search]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, {
      trabajadorNombre: string;
      items: EnrichedAsignacion[];
      pendientes: number;
      enCurso: number;
      completadas: number;
    }>();

    filtered.forEach((a) => {
      if (!map.has(a.trabajadorId)) {
        map.set(a.trabajadorId, {
          trabajadorNombre: a.trabajadorNombre,
          items: [],
          pendientes: 0,
          enCurso: 0,
          completadas: 0,
        });
      }

      const group = map.get(a.trabajadorId)!;
      group.items.push(a);
      if (a.estadoUi === "pendiente") group.pendientes += 1;
      if (a.estadoUi === "enviada" || a.estadoUi === "en_proceso") group.enCurso += 1;
      if (a.estadoUi === "completada" || a.estadoUi === "aprobada") group.completadas += 1;
    });

    return Array.from(map.entries())
      .sort((a, b) => a[1].trabajadorNombre.localeCompare(b[1].trabajadorNombre, "es"))
      .map(([trabajadorId, value]) => ({ trabajadorId, ...value }));
  }, [filtered]);

  const kpis = useMemo(() => ({
    total: asignaciones.length,
    pendientes: asignaciones.filter((a) => a.estado === "pendiente").length,
    enCurso: asignaciones.filter((a) => ["enviada", "en_progreso"].includes(a.estado)).length,
    aprobadas: asignaciones.filter((a) => a.estado === "completada" && a.aprobado === true).length,
    vencidas: asignaciones.filter((a) => a.estado === "vencida").length,
  }), [asignaciones]);

  async function handleAccion(accion: string, item: EnrichedAsignacion) {
    try {
      switch (accion) {
        case "enviar":
        case "reenviar":
          setAccionLoadingId(item.id);
          await enviarCapacitacionAsignacion(item.id, { reenviar: accion === "reenviar" });
          registrarAccion({
            accion: "enviar", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: item.id,
            descripcion: `${accion === "reenviar" ? "Reenvió" : "Envió"} enlace de '${item.capacitacionNombre}' a ${item.trabajadorNombre}`,
          });
          await refresh();
          if (selected?.id === item.id) {
            const updated = asignaciones.find((a) => a.id === item.id);
            if (updated) setSelected({ ...item, ...updated, estadoUi: mapEstadoUi(updated) });
          }
          setAccionLoadingId(null);
          break;

        case "revisar":
        case "aprobar":
        case "rechazar":
          setModalRevisar(item);
          break;

        case "reasignar": {
          const newAsignacion = await createCapacitacionAsignacion({
            trabajadorId: item.trabajadorId,
            capacitacionId: item.capacitacionId,
            forceReasignar: true,
            origen: "manual",
          });
          registrarAccion({
            accion: "crear", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: newAsignacion.id,
            descripcion: `Reasignó '${item.capacitacionNombre}' a ${item.trabajadorNombre}`,
          });
          await refresh();
          setSelected(null);
          break;
        }

        case "extender":
          setModalExtender(item);
          break;

        case "cancelar": {
          await deleteCapacitacionAsignacion(item.id);
          registrarAccion({
            accion: "cambiar_estado", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: item.id,
            descripcion: `Canceló asignación de '${item.capacitacionNombre}' para ${item.trabajadorNombre}`,
          });
          await refresh();
          if (selected?.id === item.id) setSelected(null);
          break;
        }

        case "generar_cert": {
          const blob = await descargarCertificadoCapacitacionPdf(item.id);
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `certificado-${item.capacitacionNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${item.trabajadorNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          registrarAccion({
            accion: "crear", modulo: "capacitacion", entidadTipo: "Certificado", entidadId: item.id,
            descripcion: `Descargó certificado de '${item.capacitacionNombre}' para ${item.trabajadorNombre}`,
          });
          setModalCert({ certId: `cert-${item.id}`, nombre: item.capacitacionNombre });
          break;
        }

        case "ver_cert":
          setModalCert({ certId: item.certificadoDocumentoId || "cert-" + item.id, nombre: item.capacitacionNombre });
          break;
      }
    } catch (err) {
      console.error("Error en handleAccion:", err);
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo. Revisa la configuración de email o el correo del trabajador.");
    } finally {
      setAccionLoadingId((current) => (current === item.id ? null : current));
    }
  }

  async function handleRevisar(aprobado: boolean) {
    if (!modalRevisar) return;
    try {
      const nota = parseFloat(notaRevisar);
      const notaFinal = !isNaN(nota) ? Math.max(1, Math.min(7, nota)) : (aprobado ? 5.0 : 3.0);
      await cambiarEstadoCapacitacionAsignacion(modalRevisar.id, {
        estado: "completada",
        nota: notaFinal,
        aprobado,
      });
      registrarAccion({
        accion: "cambiar_estado", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: modalRevisar.id,
        descripcion: `${aprobado ? "Aprobó" : "Rechazó"} '${modalRevisar.capacitacionNombre}' de ${modalRevisar.trabajadorNombre}. Nota: ${notaFinal.toFixed(1)}`,
      });
      await refresh();
      setModalRevisar(null);
      setNotaRevisar("");
      if (selected?.id === modalRevisar.id) setSelected(null);
    } catch (err) {
      console.error("Error en handleRevisar:", err);
      setError(err instanceof Error ? err.message : "Error al revisar asignación");
    }
  }

  async function handleExtender(meses: number) {
    if (!modalExtender) return;
    try {
      const nouvecimiento = new Date(modalExtender.fechaVencimiento || new Date());
      nouvecimiento.setMonth(nouvecimiento.getMonth() + meses);
      await updateCapacitacionAsignacion(modalExtender.id, {
        fechaVencimiento: nouvecimiento.toISOString().slice(0, 10),
      });
      registrarAccion({
        accion: "editar", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: modalExtender.id,
        descripcion: `Extendió plazo ${meses} mes${meses > 1 ? "es" : ""} para '${modalExtender.capacitacionNombre}' de ${modalExtender.trabajadorNombre}`,
      });
      await refresh();
      setModalExtender(null);
      if (selected?.id === modalExtender.id) setSelected(null);
    } catch (err) {
      console.error("Error en handleExtender:", err);
      setError(err instanceof Error ? err.message : "Error al extender plazo");
    }
  }

  async function handleCrearManual(e: React.FormEvent) {
    e.preventDefault();
    if (!formNueva.trabajadorId || !formNueva.capacitacionId) return;
    try {
      const cap = catalogo.find((c) => c.id === formNueva.capacitacionId);
      const vencimiento = new Date();
      if (cap) vencimiento.setMonth(vencimiento.getMonth() + (cap.vigenciaMeses || 12));
      const nueva = await createCapacitacionAsignacion({
        trabajadorId: formNueva.trabajadorId,
        capacitacionId: formNueva.capacitacionId,
        origen: "manual",
        estado: "pendiente",
        fechaVencimiento: vencimiento.toISOString().slice(0, 10),
        observacion: formNueva.observacion || undefined,
      });
      registrarAccion({
        accion: "crear", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: nueva.id,
        descripcion: `Creó asignación manual de '${cap?.nombre}' para trabajador ${formNueva.trabajadorId}`,
      });
      await refresh();
      setModalNueva(false);
      setFormNueva({ trabajadorId: "", capacitacionId: "", observacion: "" });
    } catch (err) {
      console.error("Error en handleCrearManual:", err);
      setError(err instanceof Error ? err.message : "Error al crear asignación");
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {catalogoError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-sm">
          {catalogoError}
        </div>
      )}
      {trabajadoresError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-amber-800 text-sm">
          {trabajadoresError}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 shadow-sm text-center">
          <p className="text-slate-500">Cargando asignaciones...</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total",      value: kpis.total,      cls: "text-slate-700" },
              { label: "Pendientes", value: kpis.pendientes, cls: "text-slate-500" },
              { label: "En curso",   value: kpis.enCurso,    cls: "text-blue-600" },
              { label: "Aprobadas",  value: kpis.aprobadas,  cls: "text-emerald-600" },
              { label: "Vencidas",   value: kpis.vencidas,   cls: "text-amber-600" },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                <p className="text-[11px] text-slate-400 uppercase font-medium">{k.label}</p>
                <p className={cn("text-2xl font-semibold mt-0.5", k.cls)}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Filters + action */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex flex-wrap gap-2 items-center flex-1">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar trabajador o capacitación…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50 text-sm"
                />
              </div>
              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as EstadoUI | "todos")}>
                <SelectTrigger className="w-[165px] h-9 rounded-xl border-slate-200 text-sm bg-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {(Object.keys(ESTADO_ASIG_CFG) as EstadoUI[]).map((e) => (
                    <SelectItem key={e} value={e}>{ESTADO_ASIG_CFG[e].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroOrigen} onValueChange={(v) => setFiltroOrigen(v as typeof filtroOrigen)}>
                <SelectTrigger className="w-[130px] h-9 rounded-xl border-slate-200 text-sm bg-white">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="automatica">Automática</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setModalNueva(true)} className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shrink-0" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Asignación manual
            </Button>
          </div>

          {/* Lista agrupada por trabajador */}
          {grouped.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm py-14 text-center px-6">
              <ClipboardList className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">
                {catalogo.length === 0
                  ? "No hay capacitaciones en el catálogo."
                  : "Sin asignaciones para los filtros aplicados."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {catalogo.length === 0
                  ? "Agrega capacitaciones en la pestaña Catálogo antes de asignarlas a trabajadores."
                  : "Usa el botón \"Nueva asignación\" para asignar una capacitación a un trabajador."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((g) => {
                const isOpen = expandedTrabajadores[g.trabajadorId] ?? true;

                return (
                  <section
                    key={g.trabajadorId}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="bg-slate-50/90 border-b border-slate-200 px-4 sm:px-5 py-3.5 flex items-start gap-3 justify-between">
                      <button
                        onClick={() => setExpandedTrabajadores((prev) => ({
                          ...prev,
                          [g.trabajadorId]: !isOpen,
                        }))}
                        className="min-w-0 text-left flex-1"
                      >
                        <p className="text-sm sm:text-base font-semibold text-slate-800 truncate">{g.trabajadorNombre}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {g.items.length} asignaciones · {g.pendientes} pendientes · {g.enCurso} en curso · {g.completadas} completadas
                        </p>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border bg-slate-100 text-slate-700 border-slate-200">
                          {g.items.length}
                        </span>
                        <button
                          onClick={() => setExpandedTrabajadores((prev) => ({
                            ...prev,
                            [g.trabajadorId]: !isOpen,
                          }))}
                          className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors bg-white"
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="divide-y divide-slate-100">
                        {g.items
                          .slice()
                          .sort((a, b) => a.capacitacionNombre.localeCompare(b.capacitacionNombre, "es"))
                          .map((a) => {
                            const cfg = ESTADO_ASIG_CFG[a.estadoUi];
                            const origenUi = normalizeOrigen(a.origen);
                            const envioEstado = normalizeEnvioEstado(a.envioEstado);
                            const avanceEstado = normalizeAvanceEstado(a.avanceEstado);

                            return (
                              <article
                                key={a.id}
                                className="px-4 sm:px-5 py-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                onClick={() => setSelected(a)}
                              >
                                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_220px_minmax(220px,auto)] lg:items-center">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{a.capacitacionNombre}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="text-xs text-slate-500">{a.categoria}</span>
                                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border", ENVIO_CFG[envioEstado].cls)}>
                                        {ENVIO_CFG[envioEstado].label}
                                      </span>
                                      {isVideoModalidad(a.modalidad) && (
                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-cyan-50 text-cyan-700 border-cyan-200">
                                          <Video className="h-3 w-3" />
                                          Video
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 lg:justify-start">
                                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border", AVANCE_CFG[avanceEstado].cls)}>
                                      {AVANCE_CFG[avanceEstado].label}
                                    </span>
                                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border", cfg.cls)}>
                                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                                      {cfg.label}
                                    </span>
                                    <span className={cn(
                                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                                      origenUi === "automatica"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-violet-50 text-violet-700 border-violet-200",
                                    )}>
                                      {origenUi === "automatica" ? <Bot className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                                      {origenUi === "automatica" ? "Auto" : "Manual"}
                                    </span>
                                  </div>

                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                                    <div className="text-[11px] text-slate-500 sm:text-right whitespace-nowrap">
                                      <p>Asignada: {fmt(a.fechaAsignacion)}</p>
                                      <p className={cn(
                                        a.fechaVencimiento && new Date(a.fechaVencimiento) < new Date()
                                          ? "text-rose-600 font-medium"
                                          : "text-slate-500",
                                      )}>
                                        Vence: {fmt(a.fechaVencimiento)}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                      <AccionesRow item={a} onAccion={handleAccion} loading={accionLoadingId === a.id} />
                                      <button
                                        onClick={() => setSelected(a)}
                                        className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors bg-white"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Drawer detalle */}
      <DetalleDrawer item={selected} onClose={() => setSelected(null)} onAccion={handleAccion} />

      {/* Modal revisar resultado */}
      <Dialog open={!!modalRevisar} onOpenChange={(open) => { if (!open) { setModalRevisar(null); setNotaRevisar(""); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Revisar resultado</DialogTitle>
            <DialogDescription>
              Define la nota y el resultado final de la asignación seleccionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-600">
              <span className="font-medium">{modalRevisar?.trabajadorNombre}</span> — {modalRevisar?.capacitacionNombre}
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Nota obtenida (1–7, opcional)</Label>
              <Input
                type="number"
                min={1}
                max={7}
                step={0.1}
                placeholder="Ej: 5.5"
                value={notaRevisar}
                onChange={(e) => setNotaRevisar(e.target.value)}
                className="rounded-xl border-slate-200 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={() => handleRevisar(false)}>
              <XCircle className="h-4 w-4 mr-1.5" /> Rechazar
            </Button>
            <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleRevisar(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal extender plazo */}
      <Dialog open={!!modalExtender} onOpenChange={(open) => { if (!open) setModalExtender(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Extender plazo</DialogTitle>
            <DialogDescription>
              Selecciona cuántos meses deseas extender el vencimiento de la asignación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 pt-1">
            <p className="text-sm text-slate-600">
              <span className="font-medium">{modalExtender?.trabajadorNombre}</span> — {modalExtender?.capacitacionNombre}
            </p>
            <p className="text-xs text-slate-400">Vencimiento actual: {fmt(modalExtender?.fechaVencimiento)}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {[1, 3, 6].map((m) => (
              <Button key={m} variant="outline" className="w-full rounded-xl border-slate-200 justify-start text-sm" onClick={() => handleExtender(m)}>
                <CalendarClock className="h-4 w-4 mr-2 text-amber-500" />
                Extender {m} {m === 1 ? "mes" : "meses"}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal certificado */}
      <Dialog open={!!modalCert} onOpenChange={(open) => { if (!open) setModalCert(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" /> Certificado generado
            </DialogTitle>
            <DialogDescription>
              Resumen del certificado asociado a la asignación aprobada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center space-y-1">
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">NEXTPREV — Certificado SST</p>
              <p className="text-sm font-semibold text-slate-800">{modalCert?.nombre}</p>
              <p className="text-xs text-slate-500 font-mono mt-2">{modalCert?.certId}</p>
            </div>
            <p className="text-xs text-slate-400 text-center">En producción se generará un PDF vinculado al legajo del trabajador.</p>
          </div>
          <DialogFooter className="pt-2">
            <Button className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setModalCert(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nueva asignación */}
      <Dialog open={modalNueva} onOpenChange={setModalNueva}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Nueva asignación manual</DialogTitle>
            <DialogDescription>
              Asigna una capacitación activa a un trabajador seleccionado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearManual} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Trabajador</Label>
              <Select value={formNueva.trabajadorId} onValueChange={(v) => setFormNueva((p) => ({ ...p, trabajadorId: v }))}>
                <SelectTrigger className="rounded-xl border-slate-200 text-sm" disabled={trabajadores.length === 0}>
                  <SelectValue placeholder="Seleccionar trabajador…" />
                </SelectTrigger>
                <SelectContent>
                  {trabajadores.length > 0 ? (
                    trabajadores.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.nombre} {w.apellido} — {w.cargo}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__sin-trabajadores" disabled>Sin trabajadores asignables</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {trabajadores.length === 0 && !trabajadoresError && (
                <p className="text-xs text-slate-500">
                  No hay trabajadores activos disponibles para asignar capacitaciones.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Capacitación</Label>
              <Select value={formNueva.capacitacionId} onValueChange={(v) => setFormNueva((p) => ({ ...p, capacitacionId: v }))}>
                <SelectTrigger className="rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Seleccionar capacitación…" />
                </SelectTrigger>
                <SelectContent>
                  {catalogo.filter((c) => c.activa).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Observación (opcional)</Label>
              <Textarea
                value={formNueva.observacion}
                onChange={(e) => setFormNueva((p) => ({ ...p, observacion: e.target.value }))}
                placeholder="Motivo de la asignación extraordinaria…"
                className="rounded-xl border-slate-200 text-sm resize-none h-20"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setModalNueva(false)}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white" disabled={!formNueva.trabajadorId || !formNueva.capacitacionId}>
                Crear asignación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
