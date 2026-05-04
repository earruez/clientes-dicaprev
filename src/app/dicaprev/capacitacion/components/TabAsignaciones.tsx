"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAsignaciones,
  getCatalogo,
  createAsignacion,
  updateAsignacion,
  enviarEnlaceCapacitacion,
  reasignarCapacitacion,
  extenderPlazo,
  generarCertificadoMock,
  generarTokenCapacitacion,
  subscribe,
  ESTADO_ASIG_CFG,
  type AsignacionCapacitacion,
  type EstadoAsignacion,
} from "@/lib/capacitacion/capacitacion-store";
import { MOCK_WORKERS } from "@/components/trabajadores-v2/types";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HOY = "2026-04-10";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

type EnrichedAsignacion = AsignacionCapacitacion & {
  capacitacionNombre: string;
  trabajadorNombre: string;
  categoria: string;
  generaCertificado: boolean;
};

// ─── Per-state action buttons (compact, for table row) ──────────────────── //
function AccionesRow({
  item,
  onAccion,
}: {
  item: EnrichedAsignacion;
  onAccion: (accion: string, item: EnrichedAsignacion) => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = item.token ? `${origin}/capacitacion/externa/${item.token}` : "";

  switch (item.estado) {
    case "pendiente":
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onAccion("enviar", item); }}
          title="Enviar capacitación"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px] font-medium hover:bg-cyan-100 transition-colors"
        >
          <Send className="h-3 w-3" /> Enviar
        </button>
      );
    case "enviada":
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAccion("reenviar", item); }}
            title="Reenviar enlace"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Reenviar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(link); }}
            title="Copiar link"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      );
    case "en_proceso":
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 text-[11px] font-medium">
          <PlayCircle className="h-3 w-3" /> En curso
        </span>
      );
    case "finalizada":
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
  const cfg = ESTADO_ASIG_CFG[item.estado];
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
              item.origen === "automatica" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-violet-50 text-violet-700 border-violet-200"
            )}>
              {item.origen === "automatica" ? <Bot className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
              {item.origen === "automatica" ? "Automática" : "Manual"}
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
          {item.estado === "en_proceso" && (
            <div className="flex items-center gap-2 bg-violet-50 rounded-xl px-4 py-3 border border-violet-100">
              <PlayCircle className="h-4 w-4 text-violet-500 shrink-0" />
              <p className="text-sm text-violet-700">El trabajador está realizando la capacitación.</p>
            </div>
          )}
          {item.estado === "finalizada" && (
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAccion("aprobar", item)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar
              </Button>
              <Button className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={() => onAccion("rechazar", item)}>
                <XCircle className="h-4 w-4 mr-2" /> Rechazar
              </Button>
            </div>
          )}
          {item.estado === "aprobada" && (
            <div className="flex gap-2">
              {item.generaCertificado && !item.certificadoId && (
                <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAccion("generar_cert", item)}>
                  <FileBadge2 className="h-4 w-4 mr-2" /> Generar certificado
                </Button>
              )}
              {item.certificadoId && (
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
          {item.estado === "rechazada" && (
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
  const [asignaciones, setAsignaciones] = useState(() => getAsignaciones());
  const [catalogo] = useState(() => getCatalogo());
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoAsignacion | "todos">("todos");
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "automatica" | "manual">("todos");
  const [selected, setSelected] = useState<EnrichedAsignacion | null>(null);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalRevisar, setModalRevisar] = useState<EnrichedAsignacion | null>(null);
  const [modalExtender, setModalExtender] = useState<EnrichedAsignacion | null>(null);
  const [modalCert, setModalCert] = useState<{ certId: string; nombre: string } | null>(null);
  const [formNueva, setFormNueva] = useState({ trabajadorId: "", capacitacionId: "", observacion: "" });
  const [notaRevisar, setNotaRevisar] = useState("");

  useEffect(() => subscribe(() => setAsignaciones(getAsignaciones())), []);

  const refresh = useCallback(() => setAsignaciones(getAsignaciones()), []);

  const enriched = useMemo<EnrichedAsignacion[]>(() =>
    asignaciones.map((a) => {
      const cap = catalogo.find((c) => c.id === a.capacitacionId);
      const worker = MOCK_WORKERS.find((w) => w.id === a.trabajadorId);
      return {
        ...a,
        capacitacionNombre: cap?.nombre ?? a.capacitacionId,
        trabajadorNombre: worker ? `${worker.nombre} ${worker.apellido}` : a.trabajadorId,
        categoria: cap?.categoria ?? "otro",
        generaCertificado: cap?.generaCertificado ?? false,
      };
    }),
    [asignaciones, catalogo]
  );

  const filtered = useMemo(() =>
    enriched.filter((a) => {
      if (filtroEstado !== "todos" && a.estado !== filtroEstado) return false;
      if (filtroOrigen !== "todos" && a.origen !== filtroOrigen) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.trabajadorNombre.toLowerCase().includes(q) && !a.capacitacionNombre.toLowerCase().includes(q)) return false;
      }
      return true;
    }),
    [enriched, filtroEstado, filtroOrigen, search]
  );

  const kpis = useMemo(() => ({
    total: asignaciones.length,
    pendientes: asignaciones.filter((a) => a.estado === "pendiente").length,
    enCurso: asignaciones.filter((a) => ["enviada", "en_proceso", "finalizada"].includes(a.estado)).length,
    aprobadas: asignaciones.filter((a) => a.estado === "aprobada").length,
    vencidas: asignaciones.filter((a) => a.estado === "vencida").length,
  }), [asignaciones]);

  function handleAccion(accion: string, item: EnrichedAsignacion) {
    switch (accion) {
      case "enviar":
      case "reenviar":
        enviarEnlaceCapacitacion(item.id);
        registrarAccion({
          accion: "enviar", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: item.id,
          descripcion: `${accion === "reenviar" ? "Reenvió" : "Envió"} enlace de '${item.capacitacionNombre}' a ${item.trabajadorNombre}`,
        });
        refresh();
        if (selected?.id === item.id) {
          const updated = getAsignaciones().find((a) => a.id === item.id);
          if (updated) setSelected({ ...item, ...updated });
        }
        break;

      case "revisar":
      case "aprobar":
      case "rechazar":
        setModalRevisar(item);
        break;

      case "reasignar": {
        const nueva = reasignarCapacitacion(item.id);
        registrarAccion({
          accion: "crear", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: nueva.id,
          descripcion: `Reasignó '${item.capacitacionNombre}' a ${item.trabajadorNombre}`,
        });
        refresh();
        setSelected(null);
        break;
      }

      case "extender":
        setModalExtender(item);
        break;

      case "generar_cert": {
        const certId = generarCertificadoMock(item.id);
        registrarAccion({
          accion: "crear", modulo: "capacitacion", entidadTipo: "Certificado", entidadId: certId,
          descripcion: `Generó certificado de '${item.capacitacionNombre}' para ${item.trabajadorNombre}`,
        });
        refresh();
        setModalCert({ certId, nombre: item.capacitacionNombre });
        if (selected?.id === item.id) {
          const updated = getAsignaciones().find((a) => a.id === item.id);
          if (updated) setSelected({ ...item, ...updated });
        }
        break;
      }

      case "ver_cert":
        setModalCert({ certId: item.certificadoId!, nombre: item.capacitacionNombre });
        break;
    }
  }

  function handleRevisar(aprobado: boolean) {
    if (!modalRevisar) return;
    const nota = parseFloat(notaRevisar);
    const notaFinal = !isNaN(nota) ? nota : (aprobado ? 5.0 : 3.0);
    updateAsignacion(modalRevisar.id, {
      estado: aprobado ? "aprobada" : "rechazada",
      nota: notaFinal,
      aprobado,
      fechaRespuesta: new Date().toISOString().slice(0, 10),
    });
    registrarAccion({
      accion: "cambiar_estado", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: modalRevisar.id,
      descripcion: `${aprobado ? "Aprobó" : "Rechazó"} '${modalRevisar.capacitacionNombre}' de ${modalRevisar.trabajadorNombre}. Nota: ${notaFinal.toFixed(1)}`,
    });
    refresh();
    setModalRevisar(null);
    setNotaRevisar("");
    if (selected?.id === modalRevisar.id) setSelected(null);
  }

  function handleExtender(meses: number) {
    if (!modalExtender) return;
    extenderPlazo(modalExtender.id, meses);
    registrarAccion({
      accion: "editar", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: modalExtender.id,
      descripcion: `Extendió plazo ${meses} mes${meses > 1 ? "es" : ""} para '${modalExtender.capacitacionNombre}' de ${modalExtender.trabajadorNombre}`,
    });
    refresh();
    setModalExtender(null);
    if (selected?.id === modalExtender.id) setSelected(null);
  }

  function handleCrearManual(e: React.FormEvent) {
    e.preventDefault();
    if (!formNueva.trabajadorId || !formNueva.capacitacionId) return;
    const cap = catalogo.find((c) => c.id === formNueva.capacitacionId);
    const vencimiento = new Date(HOY);
    if (cap) vencimiento.setMonth(vencimiento.getMonth() + cap.vigenciaMeses);
    const nueva = createAsignacion({
      trabajadorId: formNueva.trabajadorId,
      capacitacionId: formNueva.capacitacionId,
      origen: "manual",
      estado: "pendiente",
      fechaAsignacion: HOY,
      fechaVencimiento: cap ? vencimiento.toISOString().slice(0, 10) : undefined,
      token: generarTokenCapacitacion(),
      observacion: formNueva.observacion || undefined,
    });
    registrarAccion({
      accion: "crear", modulo: "capacitacion", entidadTipo: "Asignación", entidadId: nueva.id,
      descripcion: `Creó asignación manual de '${cap?.nombre}' para trabajador ${formNueva.trabajadorId}`,
    });
    setModalNueva(false);
    setFormNueva({ trabajadorId: "", capacitacionId: "", observacion: "" });
  }

  return (
    <div className="space-y-5">
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
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as EstadoAsignacion | "todos")}>
            <SelectTrigger className="w-[165px] h-9 rounded-xl border-slate-200 text-sm bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {(Object.keys(ESTADO_ASIG_CFG) as EstadoAsignacion[]).map((e) => (
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

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_155px_110px_95px_95px_185px_40px] gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          <span>Trabajador / Capacitación</span>
          <span>Estado</span>
          <span>Origen</span>
          <span>Asignada</span>
          <span>Vence</span>
          <span>Acciones</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <ClipboardList className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Sin asignaciones para los filtros aplicados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((a) => {
              const cfg = ESTADO_ASIG_CFG[a.estado];
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_155px_110px_95px_95px_185px_40px] gap-2 px-5 py-3.5 items-center hover:bg-slate-50/60 transition-colors cursor-pointer"
                  onClick={() => setSelected(a)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.trabajadorNombre}</p>
                    <p className="text-xs text-slate-400 truncate">{a.capacitacionNombre}</p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border w-fit", cfg.cls)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                    {cfg.label}
                  </span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border w-fit",
                    a.origen === "automatica" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-violet-50 text-violet-700 border-violet-200"
                  )}>
                    {a.origen === "automatica" ? <Bot className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                    {a.origen === "automatica" ? "Auto" : "Manual"}
                  </span>
                  <span className="text-xs text-slate-500">{fmt(a.fechaAsignacion)}</span>
                  <span className={cn("text-xs", a.fechaVencimiento && a.fechaVencimiento < HOY ? "text-rose-600 font-medium" : "text-slate-500")}>
                    {fmt(a.fechaVencimiento)}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <AccionesRow item={a} onAccion={handleAccion} />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(a); }}
                    className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer detalle */}
      <DetalleDrawer item={selected} onClose={() => setSelected(null)} onAccion={handleAccion} />

      {/* Modal revisar resultado */}
      <Dialog open={!!modalRevisar} onOpenChange={(open) => { if (!open) { setModalRevisar(null); setNotaRevisar(""); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Revisar resultado</DialogTitle>
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
          </DialogHeader>
          <form onSubmit={handleCrearManual} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-600">Trabajador</Label>
              <Select value={formNueva.trabajadorId} onValueChange={(v) => setFormNueva((p) => ({ ...p, trabajadorId: v }))}>
                <SelectTrigger className="rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Seleccionar trabajador…" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_WORKERS.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.nombre} {w.apellido} — {w.cargo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
