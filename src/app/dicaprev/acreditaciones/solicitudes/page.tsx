"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  FolderOpen,
  Users,
  Car,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Layers,
  Building2,
  RotateCcw,
  PenLine,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACREDITACIONES_MOCK,
  EMPRESA_OPERADORA,
  generarDocumentosInstancia,
  calcularCompletitud,
} from "../mock-data";
import NuevaAcreditacionWizard from "../components/NuevaAcreditacionWizard";
import {
  CambiarEstadoModal,
  TRANSICIONES,
} from "../components/CambiarEstadoModal";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import type {
  Acreditacion,
  EstadoAcreditacion,
  WizardAcreditacionData,
} from "../types";

// ── Config visual de estados ─────────────────────────────────────────

const ESTADO_CFG: Record<
  EstadoAcreditacion,
  { label: string; dotCls: string; badgeCls: string; icon: React.ReactNode }
> = {
  en_preparacion: {
    label: "En preparación",
    dotCls: "bg-slate-400",
    badgeCls: "text-slate-600 bg-slate-100 border-slate-200",
    icon: <Clock className="h-3 w-3" />,
  },
  listo_para_enviar: {
    label: "Lista para enviar",
    dotCls: "bg-violet-500",
    badgeCls: "text-violet-700 bg-violet-50 border-violet-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  enviado: {
    label: "Enviada",
    dotCls: "bg-blue-500",
    badgeCls: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <Send className="h-3 w-3" />,
  },
  observada: {
    label: "Observada",
    dotCls: "bg-amber-500",
    badgeCls: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  aprobado: {
    label: "Aprobada",
    dotCls: "bg-emerald-500",
    badgeCls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rechazado: {
    label: "Rechazada",
    dotCls: "bg-rose-500",
    badgeCls: "text-rose-700 bg-rose-50 border-rose-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  cerrada: {
    label: "Cerrada",
    dotCls: "bg-slate-400",
    badgeCls: "text-slate-500 bg-slate-100 border-slate-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  vencido: {
    label: "Vencida",
    dotCls: "bg-orange-500",
    badgeCls: "text-orange-700 bg-orange-50 border-orange-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

function completitudColor(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-rose-600";
}

// ── Página ────────────────────────────────────────────────────────────

export default function SolicitudesPage() {
  const router = useRouter();
  const [acreditaciones, setAcreditaciones] = useState(() =>
    ACREDITACIONES_MOCK.filter((a) => a.empresaId === EMPRESA_OPERADORA.id)
  );
  const [wizardAbierto, setWizardAbierto] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoAcreditacion | "todos">("todos");
  const [filtroMandante, setFiltroMandante] = useState("todos");
  const [modalCambioEstado, setModalCambioEstado] = useState<{
    acId: string;
    estadoNuevo: EstadoAcreditacion;
  } | null>(null);

  const mandantes = Array.from(new Set(acreditaciones.map((a) => a.mandante)));

  const filtradas = acreditaciones.filter((ac) => {
    const txt = search.toLowerCase();
    const coincide =
      !txt ||
      ac.mandante.toLowerCase().includes(txt) ||
      ac.plantillaNombre.toLowerCase().includes(txt);
    return (
      coincide &&
      (filtroEstado === "todos" || ac.estado === filtroEstado) &&
      (filtroMandante === "todos" || ac.mandante === filtroMandante)
    );
  });

  // KPIs operativos
  const kpis = [
    {
      label: "En preparación",
      val: acreditaciones.filter((a) => a.estado === "en_preparacion").length,
      cls: "bg-slate-50 border-slate-200 text-slate-700",
    },
    {
      label: "Listas para enviar",
      val: acreditaciones.filter((a) => a.estado === "listo_para_enviar").length,
      cls: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
    {
      label: "Enviadas",
      val: acreditaciones.filter((a) => a.estado === "enviado").length,
      cls: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      label: "Observadas / Rechazadas",
      val: acreditaciones.filter(
        (a) => a.estado === "observada" || a.estado === "rechazado"
      ).length,
      cls: "bg-rose-50 border-rose-200 text-rose-700",
    },
  ];

  function handleCrear(data: WizardAcreditacionData) {
    if (!data.mandante || !data.tipo || !data.plantilla) return;
    const nueva: Acreditacion = {
      id: `ac-${Date.now()}`,
      empresaId: EMPRESA_OPERADORA.id,
      empresaNombre: EMPRESA_OPERADORA.razonSocial,
      mandanteId: data.mandante.id,
      mandante: data.mandante.nombre,
      tipo: data.tipo,
      estado: "en_preparacion",
      plantillaId: data.plantilla.id,
      plantillaNombre: data.plantilla.nombre,
      trabajadores: data.trabajadores,
      vehiculos: data.vehiculos,
      creadoEl: new Date().toISOString().slice(0, 10),
      actualizadoEl: new Date().toISOString().slice(0, 10),
    };
    setAcreditaciones((prev) => [nueva, ...prev]);
    setWizardAbierto(false);
    registrarAccion({
      accion: "crear",
      modulo: "acreditaciones",
      entidadTipo: "Acreditación",
      entidadId: nueva.id,
      descripcion: `Creó acreditación '${nueva.plantillaNombre}' para ${nueva.mandante}`,
    });
    router.push(`/dicaprev/acreditaciones/${nueva.id}`);
  }

  function abrirCambioEstado(acId: string, estadoNuevo: EstadoAcreditacion) {
    setModalCambioEstado({ acId, estadoNuevo });
  }

  function confirmarCambioEstado(comentario: string) {
    if (!modalCambioEstado) return;
    const { acId, estadoNuevo } = modalCambioEstado;
    const hoy = new Date().toISOString().slice(0, 10);
    const entrada = {
      estado: estadoNuevo,
      fecha: new Date().toISOString(),
      usuario: "Usuario",
      ...(comentario ? { comentario } : {}),
    };
    setAcreditaciones((prev) =>
      prev.map((a) =>
        a.id === acId
          ? {
              ...a,
              estado: estadoNuevo,
              actualizadoEl: hoy,
              ...(estadoNuevo === "enviado" ? { ultimoExpediente: hoy } : {}),
              historialEstados: [...(a.historialEstados ?? []), entrada],
            }
          : a
      )
    );
    setModalCambioEstado(null);
    registrarAccion({
      accion: "cambiar_estado",
      modulo: "acreditaciones",
      entidadTipo: "Acreditación",
      entidadId: acId,
      descripcion: `Cambió estado de acreditación a '${estadoNuevo}'`,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-screen-xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Solicitudes de acreditación
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Expedientes activos de {EMPRESA_OPERADORA.razonSocial}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Empresa chip */}
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">
                {EMPRESA_OPERADORA.razonSocial}
              </span>
            </div>
            <Button
              onClick={() => setWizardAbierto(true)}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva acreditación
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={cn("rounded-2xl border p-4 shadow-sm", k.cls)}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">
                {k.label}
              </p>
              <p className="text-3xl font-bold mt-1">{k.val}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar mandante o plantilla…"
              className="pl-9 text-sm bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={filtroEstado}
            onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}
          >
            <SelectTrigger className="w-full sm:w-48 text-sm bg-white">
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
          <Select value={filtroMandante} onValueChange={setFiltroMandante}>
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
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((ac) => {
            const docs = generarDocumentosInstancia(ac);
            const pct = calcularCompletitud(docs);
            const cfg = ESTADO_CFG[ac.estado];

            return (
              <AcreditacionCard
                key={ac.id}
                ac={ac}
                pct={pct}
                cfg={cfg}
                onVerExpediente={() =>
                  router.push(`/dicaprev/acreditaciones/${ac.id}`)
                }
                onCambiarEstado={(estadoNuevo) => abrirCambioEstado(ac.id, estadoNuevo)}
              />
            );
          })}

          {filtradas.length === 0 && (
            <div className="col-span-3 py-20 text-center">
              <FolderOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                No hay acreditaciones con los filtros aplicados.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Wizard */}
      {wizardAbierto && (
        <NuevaAcreditacionWizard
          onClose={() => setWizardAbierto(false)}
          onCrear={handleCrear}
        />
      )}

      {/* Modal cambio de estado */}
      {modalCambioEstado && (() => {
        const ac = acreditaciones.find((a) => a.id === modalCambioEstado.acId);
        if (!ac) return null;
        return (
          <CambiarEstadoModal
            open
            estadoActual={ac.estado}
            estadoNuevo={modalCambioEstado.estadoNuevo}
            empresaNombre={ac.empresaNombre}
            mandante={ac.mandante}
            onConfirmar={confirmarCambioEstado}
            onCerrar={() => setModalCambioEstado(null)}
          />
        );
      })()}
    </div>
  );
}

// ── Card de acreditación ──────────────────────────────────────────────

function AcreditacionCard({
  ac,
  pct,
  cfg,
  onVerExpediente,
  onCambiarEstado,
}: {
  ac: Acreditacion;
  pct: number;
  cfg: (typeof ESTADO_CFG)[EstadoAcreditacion];
  onVerExpediente: () => void;
  onCambiarEstado: (estadoNuevo: EstadoAcreditacion) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Card header */}
      <div className="p-5 flex items-start gap-3 border-b border-slate-100">
        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
          <FolderOpen className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-snug truncate">
            {ac.mandante}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{ac.plantillaNombre}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0",
            cfg.badgeCls
          )}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {/* Card body */}
      <div className="p-5 space-y-3 flex-1">
        {/* Plantilla */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{ac.plantillaNombre}</span>
        </div>

        {/* Completitud */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">Completitud (obligatorios)</span>
            <span className={cn("font-bold", completitudColor(pct))}>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {ac.trabajadores.length} trabajador{ac.trabajadores.length !== 1 ? "es" : ""}
          </div>
          {ac.vehiculos.length > 0 && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Car className="h-3.5 w-3.5 shrink-0" />
              {ac.vehiculos.length} vehículo{ac.vehiculos.length !== 1 ? "s" : ""}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Creada {fmt(ac.creadoEl)}
          </div>
          {ac.ultimoExpediente && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Send className="h-3.5 w-3.5 shrink-0" />
              Enviado {fmt(ac.ultimoExpediente)}
            </div>
          )}
        </div>

        {ac.observaciones && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
            {ac.observaciones}
          </p>
        )}
      </div>

      {/* Card footer — acciones */}
      <div className="px-5 pb-5">
        <CardAcciones
          ac={ac}
          onVerExpediente={onVerExpediente}
          onCambiarEstado={onCambiarEstado}
        />
      </div>
    </div>
  );
}

// ── Acciones contextuales: ver expediente + selector de estado ────────

function CardAcciones({
  ac,
  onVerExpediente,
  onCambiarEstado,
}: {
  ac: Acreditacion;
  onVerExpediente: () => void;
  onCambiarEstado: (estadoNuevo: EstadoAcreditacion) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const transiciones = TRANSICIONES[ac.estado];
  const esCerrada = ac.estado === "cerrada";

  const accionPrimaria = (() => {
    switch (ac.estado) {
      case "en_preparacion":
        return { label: "Completar expediente", icon: <PenLine className="h-3.5 w-3.5" /> };
      case "listo_para_enviar":
        return { label: "Ver expediente", icon: <ChevronRight className="h-3.5 w-3.5" /> };
      case "observada":
      case "rechazado":
        return { label: "Corregir observaciones", icon: <PenLine className="h-3.5 w-3.5" /> };
      case "vencido":
        return { label: "Renovar expediente", icon: <RotateCcw className="h-3.5 w-3.5" /> };
      default:
        return { label: "Ver expediente", icon: <ChevronRight className="h-3.5 w-3.5" /> };
    }
  })();

  return (
    <div className="flex gap-2">
      {/* Acción principal */}
      <button
        onClick={onVerExpediente}
        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
      >
        {accionPrimaria.icon}
        {accionPrimaria.label}
      </button>

      {/* Selector de estado (solo si hay transiciones posibles) */}
      {!esCerrada && transiciones.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setAbierto((v) => !v)}
            className="h-9 px-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
            title="Cambiar estado"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {abierto && (
            <>
              {/* overlay para cerrar */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setAbierto(false)}
              />
              <div className="absolute right-0 bottom-full mb-1 z-20 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 overflow-hidden">
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Cambiar a
                </p>
                {transiciones.map((e) => {
                  const c = ESTADO_CFG[e];
                  return (
                    <button
                      key={e}
                      onClick={() => {
                        setAbierto(false);
                        onCambiarEstado(e);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", c.dotCls)} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
