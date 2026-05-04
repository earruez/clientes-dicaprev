"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Paperclip,
  ChevronRight,
  X,
  FileText,
  Image as ImageIcon,
  Award,
  FileCheck,
  ClipboardList,
  BookOpen,
  CalendarDays,
  User,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  Link2,
  AlertTriangle,
} from "lucide-react";
import {
  EVIDENCIAS_CUMPLIMIENTO_MOCK,
  HALLAZGOS_MOCK,
  OBLIGACIONES_MOCK,
  CENTROS_MOCK,
} from "../mock-data";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import type {
  EvidenciaCumplimiento,
  EstadoEvidencia,
  TipoEvidencia,
} from "../types";
import { cn } from "@/lib/utils";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

// ─── Config ──────────────────────────────────────────────────────────────────

const TIPO_CFG: Record<
  TipoEvidencia,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  documento:   { label: "Documento",   cls: "bg-sky-50 text-sky-700 border border-sky-200",           icon: <FileText className="h-3.5 w-3.5" /> },
  fotografia:  { label: "Fotografía",  cls: "bg-violet-50 text-violet-700 border border-violet-200",   icon: <ImageIcon className="h-3.5 w-3.5" /> },
  certificado: { label: "Certificado", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <Award className="h-3.5 w-3.5" /> },
  acta:        { label: "Acta",        cls: "bg-amber-50 text-amber-700 border border-amber-200",       icon: <FileCheck className="h-3.5 w-3.5" /> },
  registro:    { label: "Registro",    cls: "bg-indigo-50 text-indigo-700 border border-indigo-200",    icon: <ClipboardList className="h-3.5 w-3.5" /> },
  informe:     { label: "Informe",     cls: "bg-rose-50 text-rose-700 border border-rose-200",          icon: <BookOpen className="h-3.5 w-3.5" /> },
};

const ESTADO_CFG: Record<
  EstadoEvidencia,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  valida:    { label: "Válida",    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border border-amber-200",       icon: <Clock className="h-3.5 w-3.5" /> },
  rechazada: { label: "Rechazada", cls: "bg-red-50 text-red-700 border border-red-200",             icon: <XCircle className="h-3.5 w-3.5" /> },
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

// ─── Drawer ──────────────────────────────────────────────────────────────────

function EvidenciaDrawer({
  evidencia,
  onClose,
  onEstadoChange,
}: {
  evidencia: EvidenciaCumplimiento;
  onClose: () => void;
  onEstadoChange: (id: string, estado: EstadoEvidencia) => void;
}) {
  const tipCfg = TIPO_CFG[evidencia.tipo];
  const estCfg = ESTADO_CFG[evidencia.estado];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Detalle de evidencia
            </p>
            <h2 className="text-base font-semibold text-slate-900 leading-snug break-words">
              {evidencia.titulo}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", tipCfg.cls)}>
                {tipCfg.icon}{tipCfg.label}
              </span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", estCfg.cls)}>
                {estCfg.icon}{estCfg.label}
              </span>
              {evidencia.cierraHallazgo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Cierra hallazgo
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
          {/* meta */}
          <div className="space-y-2.5">
            {[
              {
                icon: <CalendarDays className="h-4 w-4 text-slate-400" />,
                label: "Fecha",
                value: fmt(evidencia.fecha),
              },
              {
                icon: <User className="h-4 w-4 text-slate-400" />,
                label: "Subida por",
                value: evidencia.subidaPor,
              },
              ...(evidencia.entidadNombre
                ? [{ icon: <Building2 className="h-4 w-4 text-slate-400" />, label: "Entidad", value: evidencia.entidadNombre }]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="shrink-0">{row.icon}</span>
                <span className="text-slate-500 w-24 shrink-0">{row.label}</span>
                <span className="font-medium text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>

          {/* vinculación */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Vinculación
            </p>
            <div className="space-y-2">
              {evidencia.obligacionNombre && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Obligación DS44</p>
                  <p className="text-sm font-medium text-slate-800">{evidencia.obligacionNombre}</p>
                </div>
              )}
              {evidencia.hallazgoDescripcion && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500 mb-0.5">Hallazgo</p>
                  <p className="text-sm font-medium text-slate-800">{evidencia.hallazgoDescripcion}</p>
                </div>
              )}
              {evidencia.accionTitulo && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 mb-0.5">Acción del plan</p>
                  <p className="text-sm font-medium text-slate-800">{evidencia.accionTitulo}</p>
                </div>
              )}
            </div>
          </div>

          {/* observación */}
          {evidencia.observacion && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Observación</p>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-slate-700 leading-relaxed">
                {evidencia.observacion}
              </div>
            </div>
          )}

          {/* archivo */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Archivo adjunto</p>
            {evidencia.archivoUrl ? (
              <a
                href={evidencia.archivoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium break-all">{evidencia.archivoUrl}</span>
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400">
                <Paperclip className="h-4 w-4 shrink-0" />
                <p className="text-sm">Sin archivo adjunto — disponible cuando se conecte el backend.</p>
              </div>
            )}
          </div>

          {/* cambiar estado */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">Cambiar estado</p>
            <div className="flex flex-wrap gap-2">
              {(["valida", "pendiente", "rechazada"] as EstadoEvidencia[])
                .filter((e) => e !== evidencia.estado)
                .map((e) => {
                  const cfg = ESTADO_CFG[e];
                  return (
                    <button
                      key={e}
                      onClick={() => { onEstadoChange(evidencia.id, e); onClose(); }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-opacity hover:opacity-75",
                        cfg.cls
                      )}
                    >
                      {cfg.icon}{cfg.label}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="border-t px-6 py-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </aside>
    </>
  );
}

// ─── Modal nueva evidencia ────────────────────────────────────────────────────

interface EvidenciaFormData {
  titulo: string;
  tipo: TipoEvidencia;
  fecha: string;
  obligacionId: string;
  hallazgoId: string;
  accionId: string;
  entidadId: string;
  archivoUrl: string;
  observacion: string;
  cierraHallazgo: boolean;
}

const FORM_EMPTY: EvidenciaFormData = {
  titulo: "",
  tipo: "documento",
  fecha: "",
  obligacionId: "_none",
  hallazgoId: "_none",
  accionId: "",
  entidadId: "_none",
  archivoUrl: "",
  observacion: "",
  cierraHallazgo: false,
};

function EvidenciaModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: EvidenciaFormData) => void;
}) {
  const [form, setForm] = useState<EvidenciaFormData>(FORM_EMPTY);
  React.useEffect(() => { if (open) setForm(FORM_EMPTY); }, [open]);
  const set = <K extends keyof EvidenciaFormData>(k: K, v: EvidenciaFormData[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const hallazgoSel = HALLAZGOS_MOCK.find((h) => h.id === form.hallazgoId);

  // When a hallazgo is selected, auto-fill entidad if not already set
  const handleHallazgoChange = (v: string) => {
    const h = HALLAZGOS_MOCK.find((hh) => hh.id === v);
    setForm((prev) => ({
      ...prev,
      hallazgoId: v,
      entidadId: prev.entidadId === "_none" && h ? h.centroId : prev.entidadId,
      obligacionId: prev.obligacionId === "_none" && h?.obligacionId ? h.obligacionId : prev.obligacionId,
      cierraHallazgo: v === "_none" ? false : prev.cierraHallazgo,
    }));
  };

  const ESTADO_LABELS: Record<string, string> = {
    abierto: "Abierto",
    en_seguimiento: "En seguimiento",
    en_proceso: "En proceso",
    resuelto: "Resuelto",
    cerrado: "Cerrado",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva evidencia</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto space-y-4 py-2 pr-1">
          {/* título */}
          <div className="space-y-1">
            <Label>Título *</Label>
            <Input
              placeholder="Ej: Certificado de extintores renovados"
              value={form.titulo}
              onChange={(e) => set("titulo", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* tipo */}
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v as TipoEvidencia)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_CFG) as [TipoEvidencia, { label: string }][]).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* fecha */}
            <div className="space-y-1">
              <Label>Fecha *</Label>
              <Input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </div>
          </div>

          {/* hallazgo — first so entidad/obligación can auto-populate */}
          <div className="space-y-1">
            <Label>Hallazgo vinculado</Label>
            <Select value={form.hallazgoId} onValueChange={handleHallazgoChange}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Opcional…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin hallazgo</SelectItem>
                {HALLAZGOS_MOCK.filter((h) => h.estado !== "cerrado").map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.descripcion.length > 50 ? h.descripcion.slice(0, 50) + "…" : h.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hallazgoSel && (
              <p className="text-[11px] text-slate-500">
                {hallazgoSel.centroNombre}
                <span className="mx-1">·</span>
                {ESTADO_LABELS[hallazgoSel.estado] ?? hallazgoSel.estado}
                {hallazgoSel.prioridad === "critica" && (
                  <span className="ml-1 inline-flex items-center rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 text-[9px] font-semibold">
                    Crítica
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* entidad */}
            <div className="space-y-1">
              <Label>Entidad</Label>
              <Select value={form.entidadId} onValueChange={(v) => set("entidadId", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin entidad</SelectItem>
                  {CENTROS_MOCK.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* obligación */}
            <div className="space-y-1">
              <Label>Obligación DS44</Label>
              <Select value={form.obligacionId} onValueChange={(v) => set("obligacionId", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Opcional…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin asociar</SelectItem>
                  {OBLIGACIONES_MOCK.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nombre.length > 45 ? o.nombre.slice(0, 45) + "…" : o.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* URL de archivo */}
          <div className="space-y-1">
            <Label>URL de archivo</Label>
            <Input
              placeholder="https://… (opcional)"
              value={form.archivoUrl}
              onChange={(e) => set("archivoUrl", e.target.value)}
            />
          </div>

          {/* observación */}
          <div className="space-y-1">
            <Label>Observación</Label>
            <Textarea
              rows={2}
              placeholder="Notas adicionales…"
              value={form.observacion}
              onChange={(e) => set("observacion", e.target.value)}
            />
          </div>

          {/* cierra hallazgo — only when a hallazgo is selected */}
          {form.hallazgoId !== "_none" && (
            <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                checked={form.cierraHallazgo}
                onChange={(e) => set("cierraHallazgo", e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium text-slate-800">Esta evidencia cierra el hallazgo</p>
                <p className="text-xs text-slate-500">El hallazgo quedará marcado como resuelto al registrar.</p>
              </div>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!form.titulo || !form.fecha}
            onClick={() => onSave(form)}
          >
            Registrar evidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EvidenciasPage() {
  const [evidencias, setEvidencias] = useState<EvidenciaCumplimiento[]>(
    EVIDENCIAS_CUMPLIMIENTO_MOCK
  );
  const [selected, setSelected] = useState<EvidenciaCumplimiento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoEvidencia | "todos">("todos");
  const [filtroEstado, setFiltroEstado] = useState<EstadoEvidencia | "todos">("todos");
  const [filtroEntidad, setFiltroEntidad] = useState("todos");

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalValidas   = evidencias.filter((e) => e.estado === "valida").length;
  const totalPendientes = evidencias.filter((e) => e.estado === "pendiente").length;
  const totalRechazadas = evidencias.filter((e) => e.estado === "rechazada").length;
  const totalCierran   = evidencias.filter((e) => e.cierraHallazgo).length;

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = useMemo<EvidenciaCumplimiento[]>(() => {
    let list = evidencias;
    if (filtroTipo !== "todos")    list = list.filter((e) => e.tipo === filtroTipo);
    if (filtroEstado !== "todos")  list = list.filter((e) => e.estado === filtroEstado);
    if (filtroEntidad !== "todos") list = list.filter((e) => e.entidadId === filtroEntidad);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          (e.obligacionNombre ?? "").toLowerCase().includes(q) ||
          (e.hallazgoDescripcion ?? "").toLowerCase().includes(q) ||
          (e.entidadNombre ?? "").toLowerCase().includes(q) ||
          e.subidaPor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [evidencias, filtroTipo, filtroEstado, filtroEntidad, search]);

  const hasFilters =
    filtroTipo !== "todos" ||
    filtroEstado !== "todos" ||
    filtroEntidad !== "todos" ||
    search.trim() !== "";

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEstadoChange = (id: string, estado: EstadoEvidencia) => {
    setEvidencias((prev) => prev.map((e) => (e.id === id ? { ...e, estado } : e)));
    registrarAccion({
      accion: "cambiar_estado",
      modulo: "cumplimiento",
      entidadTipo: "Evidencia",
      entidadId: id,
      descripcion: `Cambió estado de evidencia a '${estado}'`,
    });
  };

  const guardarEvidencia = (data: EvidenciaFormData) => {
    const ob     = data.obligacionId !== "_none" ? OBLIGACIONES_MOCK.find((o) => o.id === data.obligacionId) : null;
    const h      = data.hallazgoId   !== "_none" ? HALLAZGOS_MOCK.find((hh) => hh.id === data.hallazgoId)   : null;
    const centro = data.entidadId    !== "_none" ? CENTROS_MOCK.find((c) => c.id === data.entidadId)         : null;
    // Derive accionId and accionTitulo automatically from the linked hallazgo
    const accionId    = h ? `accion-${h.id}` : undefined;
    const accionTitulo = h ? `Regularizar: ${h.descripcion}` : undefined;
    const nueva: EvidenciaCumplimiento = {
      id: `evc-${Date.now()}`,
      titulo: data.titulo,
      tipo: data.tipo,
      fecha: data.fecha,
      obligacionId: data.obligacionId !== "_none" ? data.obligacionId : undefined,
      obligacionNombre: ob?.nombre,
      hallazgoId: data.hallazgoId !== "_none" ? data.hallazgoId : undefined,
      hallazgoDescripcion: h?.descripcion,
      accionId,
      accionTitulo,
      entidadId: data.entidadId !== "_none" ? data.entidadId : undefined,
      entidadNombre: centro?.nombre,
      archivoUrl: data.archivoUrl || undefined,
      observacion: data.observacion || undefined,
      subidaPor: "Prevencionista NEXTPREV",
      estado: "pendiente",
      cierraHallazgo: data.cierraHallazgo,
    };
    setEvidencias((prev) => [nueva, ...prev]);
    registrarAccion({
      accion: "subir_documento",
      modulo: "cumplimiento",
      entidadTipo: "Evidencia",
      entidadId: nueva.id,
      descripcion: `Subió evidencia: ${nueva.titulo}`,
    });
    setModalOpen(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">

        <StandardPageHeader
          moduleLabel="Cumplimiento DS44"
          title="Evidencias"
          description="Documentos vinculados a obligaciones, hallazgos y acciones del plan de trabajo."
          icon={Paperclip}
          actions={
            <Button
              onClick={() => setModalOpen(true)}
              className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva evidencia
            </Button>
          }
        />

        {/* ── KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total registradas",
              value: evidencias.length,
              sub: `${totalCierran} cierran hallazgo`,
              icon: <Paperclip className="h-5 w-5" />,
              cls: "from-slate-50 to-slate-100 text-slate-700",
            },
            {
              label: "Válidas",
              value: totalValidas,
              sub: "Aprobadas y aceptadas",
              icon: <CheckCircle2 className="h-5 w-5" />,
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Pendientes",
              value: totalPendientes,
              sub: "Por revisar o validar",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Rechazadas",
              value: totalRechazadas,
              sub: "Requieren corrección",
              icon: <AlertTriangle className="h-5 w-5" />,
              cls: "from-red-50 to-red-100 text-red-700",
            },
          ].map((kpi) => (
            <Card key={kpi.label} className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {kpi.icon}
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{kpi.label}</p>
                </div>
                <p className="text-3xl font-semibold">{kpi.value}</p>
                <p className="mt-1 text-[11px] opacity-80">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filters ── */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por título, obligación, hallazgo…"
                  className="pl-9 text-sm bg-slate-50 border-slate-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as EstadoEvidencia | "todos")}>
                <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {(Object.entries(ESTADO_CFG) as [EstadoEvidencia, { label: string }][]).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as TipoEvidencia | "todos")}>
                <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {(Object.entries(TIPO_CFG) as [TipoEvidencia, { label: string }][]).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroEntidad} onValueChange={setFiltroEntidad}>
                <SelectTrigger className="w-44 text-sm"><SelectValue placeholder="Entidad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las entidades</SelectItem>
                  {CENTROS_MOCK.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 gap-1"
                  onClick={() => { setFiltroTipo("todos"); setFiltroEstado("todos"); setFiltroEntidad("todos"); setSearch(""); }}
                >
                  <X className="h-3.5 w-3.5" /> Limpiar
                </Button>
              )}

              <span className="ml-auto text-xs text-slate-400">
                {filtered.length} {filtered.length === 1 ? "evidencia" : "evidencias"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <CardContent className="py-20 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Sin evidencias que coincidan</p>
              <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o sube una nueva evidencia.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Evidencia", "Tipo", "Vinculación", "Entidad", "Fecha", "Estado", ""].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((ev) => {
                    const tipCfg = TIPO_CFG[ev.tipo];
                    const estCfg = ESTADO_CFG[ev.estado];
                    return (
                      <tr
                        key={ev.id}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        onClick={() => setSelected(ev)}
                      >
                        {/* evidencia */}
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="flex items-start gap-2">
                            <Paperclip className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-slate-800 leading-snug line-clamp-2">{ev.titulo}</p>
                              {ev.cierraHallazgo && (
                                <span className="inline-flex items-center gap-0.5 mt-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Cierra hallazgo
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* tipo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", tipCfg.cls)}>
                            {tipCfg.icon}{tipCfg.label}
                          </span>
                        </td>

                        {/* vinculación */}
                        <td className="px-4 py-3 max-w-[220px]">
                          <div className="space-y-1">
                            {ev.obligacionNombre && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <FileText className="h-3 w-3 text-slate-300 shrink-0" />
                                <span className="line-clamp-1">{ev.obligacionNombre}</span>
                              </div>
                            )}
                            {ev.hallazgoDescripcion && (
                              <div className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span className="line-clamp-1">{ev.hallazgoDescripcion}</span>
                              </div>
                            )}
                            {ev.accionTitulo && (
                              <div className="flex items-center gap-1 text-xs text-indigo-600">
                                <ClipboardList className="h-3 w-3 shrink-0" />
                                <span className="line-clamp-1">{ev.accionTitulo}</span>
                              </div>
                            )}
                            {!ev.obligacionNombre && !ev.hallazgoDescripcion && !ev.accionTitulo && (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </div>
                        </td>

                        {/* entidad */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ev.entidadNombre ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {ev.entidadNombre}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>

                        {/* fecha */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {fmt(ev.fecha)}
                          </div>
                        </td>

                        {/* estado */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", estCfg.cls)}>
                            {estCfg.icon}{estCfg.label}
                          </span>
                        </td>

                        {/* chevron */}
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>

      {/* ── Drawer ── */}
      {selected && (
        <EvidenciaDrawer
          evidencia={selected}
          onClose={() => setSelected(null)}
          onEstadoChange={handleEstadoChange}
        />
      )}

      {/* ── Modal ── */}
      <EvidenciaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={guardarEvidencia}
      />
    </div>
  );
}


