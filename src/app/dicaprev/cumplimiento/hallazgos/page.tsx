"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Paperclip,
  CalendarDays,
  Building2,
  User,
  FileText,
  Cpu,
  ArrowRight,
  ClipboardList,
  BadgeCheck,
  Eye,
} from "lucide-react";
import { HALLAZGOS_MOCK, CENTROS_MOCK, OBLIGACIONES_MOCK, EVIDENCIAS_MOCK } from "../mock-data";
import { getAll as getHallazgosAcreditacion } from "@/lib/acreditaciones/hallazgo-acreditacion-store";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import type {
  Hallazgo,
  TipoHallazgo,
  EstadoHallazgo,
  PrioridadHallazgo,
  HistorialHallazgo,
} from "../types";
import { cn } from "@/lib/utils";
import {
  evaluarObligaciones,
  generarHallazgosDesdeEvaluaciones,
  type DocumentoEvaluable,
  type EntidadInput,
} from "@/lib/cumplimiento/cumplimiento-engine";

// ---- cfg helpers ----------------------------------------------------------------

const TIPO_CFG: Record<TipoHallazgo, { label: string; cls: string }> = {
  documental:   { label: "Documental",   cls: "bg-sky-50 text-sky-700 border border-sky-200" },
  capacitacion: { label: "Capacitación", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  seguridad:    { label: "Seguridad",    cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  conducta:     { label: "Conducta",     cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  equipos:      { label: "Equipos",      cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  emergencias:  { label: "Emergencias",  cls: "bg-red-50 text-red-700 border border-red-200" },
};

const ESTADO_CFG: Record<EstadoHallazgo, { label: string; cls: string; icon: React.ReactNode }> = {
  abierto:        { label: "Abierto",        cls: "bg-amber-50 text-amber-700 border border-amber-200",     icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  en_seguimiento: { label: "En seguimiento", cls: "bg-sky-50 text-sky-700 border border-sky-200",           icon: <Eye className="h-3.5 w-3.5" /> },
  en_proceso:     { label: "En proceso",     cls: "bg-blue-50 text-blue-700 border border-blue-200",        icon: <Clock className="h-3.5 w-3.5" /> },
  resuelto:       { label: "Resuelto",       cls: "bg-teal-50 text-teal-700 border border-teal-200",        icon: <BadgeCheck className="h-3.5 w-3.5" /> },
  cerrado:        { label: "Cerrado",        cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

const PRIORIDAD_CFG: Record<PrioridadHallazgo, { label: string; cls: string }> = {
  critica: { label: "Crítica", cls: "bg-red-100 text-red-700 border border-red-300" },
  alta:    { label: "Alta",    cls: "bg-rose-100 text-rose-700 border border-rose-200" },
  media:   { label: "Media",   cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  baja:    { label: "Baja",    cls: "bg-sky-100 text-sky-700 border border-sky-200" },
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

const fmtHora = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
};

// ---- drawer -----------------------------------------------------------------

function HallazgoDrawer({
  hallazgo,
  onClose,
  onEdit,
  onCambioEstado,
}: {
  hallazgo: Hallazgo;
  onClose: () => void;
  onEdit: (h: Hallazgo) => void;
  onCambioEstado: (h: Hallazgo, estado: "resuelto" | "cerrado") => void;
}) {
  const estCfg = ESTADO_CFG[hallazgo.estado];
  const tipCfg = TIPO_CFG[hallazgo.tipo];
  const priCfg = PRIORIDAD_CFG[hallazgo.prioridad];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Detalle del hallazgo
            </p>
            <h2 className="text-base font-semibold text-slate-900 leading-snug">
              {hallazgo.descripcion}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", estCfg.cls)}>
                {estCfg.icon}{estCfg.label}
              </span>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", tipCfg.cls)}>
                {tipCfg.label}
              </span>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", priCfg.cls)}>
                {priCfg.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
          {/* meta */}
          <div className="space-y-2.5">
            {[
              { icon: <Building2 className="h-4 w-4 text-slate-400" />, label: "Centro", value: hallazgo.centroNombre },
              ...(hallazgo.trabajadorNombre
                ? [{ icon: <User className="h-4 w-4 text-slate-400" />, label: "Trabajador", value: hallazgo.trabajadorNombre }]
                : []),
              ...(hallazgo.obligacionNombre
                ? [{ icon: <FileText className="h-4 w-4 text-slate-400" />, label: "Obligación DS44", value: hallazgo.obligacionNombre }]
                : []),
              { icon: <CalendarDays className="h-4 w-4 text-slate-400" />, label: "Fecha compromiso", value: fmt(hallazgo.fechaCompromiso) },
              { icon: <CalendarDays className="h-4 w-4 text-slate-400" />, label: "Creado el", value: fmtHora(hallazgo.fechaCreacion) },
              { icon: <User className="h-4 w-4 text-slate-400" />, label: "Creado por", value: hallazgo.creadoPor },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-2">
                <span className="mt-0.5">{row.icon}</span>
                <span className="text-slate-500 w-32 shrink-0">{row.label}</span>
                <span className="font-medium text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>

          {/* evidencias */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Evidencias adjuntas ({hallazgo.evidenciaIds.length})
            </p>
            {hallazgo.evidenciaIds.length === 0 ? (
              <p className="text-slate-400 text-xs">Sin evidencias adjuntas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {hallazgo.evidenciaIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                  >
                    <Paperclip className="h-3 w-3" />
                    {id}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* advisory: evidencias disponibles */}
          {hallazgo.evidenciaIds.length > 0 &&
            hallazgo.estado !== "cerrado" &&
            hallazgo.estado !== "resuelto" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
              <BadgeCheck className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-teal-800">Evidencias disponibles</p>
                <p className="text-xs text-teal-600 mt-0.5">
                  Este hallazgo tiene {hallazgo.evidenciaIds.length} evidencia{hallazgo.evidenciaIds.length !== 1 ? "s" : ""} vinculada{hallazgo.evidenciaIds.length !== 1 ? "s" : ""}.
                  Puedes marcarlo como resuelto.
                </p>
              </div>
            </div>
          )}

          {/* historial */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Historial
            </p>
            <ol className="relative border-l border-slate-200 space-y-4">
              {[...hallazgo.historial]
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .map((item, i) => (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-slate-300 bg-white" />
                    <p className="text-[11px] text-slate-400">{fmtHora(item.fecha)}</p>
                    <p className="font-medium text-slate-800">{item.accion}</p>
                    <p className="text-xs text-slate-500">{item.usuario}</p>
                    {item.detalle && (
                      <p className="mt-0.5 text-xs text-slate-500 italic">
                        {item.detalle}
                      </p>
                    )}
                  </li>
                ))}
            </ol>
          </div>
        </div>

        {/* footer */}
        <div className="border-t px-6 py-4">
          {hallazgo.id.startsWith("auto-") ? (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 w-full">
              <Cpu className="h-3.5 w-3.5 shrink-0" />
              Generado automáticamente por el motor de cumplimiento. Para cerrar, crea un hallazgo manual con evidencia real.
            </div>
          ) : hallazgo.estado === "cerrado" ? (
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Hallazgo cerrado
              </span>
              <Button variant="outline" size="sm" onClick={onClose}>Cerrar panel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              {hallazgo.estado !== "resuelto" && (
                <Button variant="outline" size="sm" onClick={() => onEdit(hallazgo)}>
                  Editar
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                {hallazgo.estado !== "resuelto" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                    onClick={() => onCambioEstado(hallazgo, "resuelto")}
                  >
                    <BadgeCheck className="h-3.5 w-3.5 mr-1.5" />
                    Marcar resuelto
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onCambioEstado(hallazgo, "cerrado")}
                >
                  Cerrar hallazgo
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ---- form modal -----------------------------------------------------------------

interface HallazgoFormData {
  tipo: TipoHallazgo;
  descripcion: string;
  centroId: string;
  trabajadorNombre: string;
  obligacionId: string;
  prioridad: PrioridadHallazgo;
  fechaCompromiso: string;
}

const FORM_EMPTY: HallazgoFormData = {
  tipo: "documental",
  descripcion: "",
  centroId: "",
  trabajadorNombre: "",
  obligacionId: "_none",
  prioridad: "media",
  fechaCompromiso: "",
};

function HallazgoModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: HallazgoFormData;
  onClose: () => void;
  onSave: (data: HallazgoFormData) => void;
}) {
  const [form, setForm] = useState<HallazgoFormData>(initial);

  React.useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const set = <K extends keyof HallazgoFormData>(k: K, v: HallazgoFormData[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nuevo hallazgo" : "Editar hallazgo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* descripción */}
          <div className="space-y-1">
            <Label>Descripción *</Label>
            <Textarea
              rows={2}
              placeholder="Describir el hallazgo detalladamente…"
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* tipo */}
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v as TipoHallazgo)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_CFG) as [TipoHallazgo, { label: string }][]).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* prioridad */}
            <div className="space-y-1">
              <Label>Prioridad *</Label>
              <Select value={form.prioridad} onValueChange={(v) => set("prioridad", v as PrioridadHallazgo)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORIDAD_CFG) as [PrioridadHallazgo, { label: string }][]).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* centro */}
            <div className="space-y-1">
              <Label>Centro de trabajo *</Label>
              <Select value={form.centroId} onValueChange={(v) => set("centroId", v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Opcional…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin asociar</SelectItem>
                  {OBLIGACIONES_MOCK.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nombre.length > 40 ? o.nombre.slice(0, 40) + "…" : o.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* trabajador */}
            <div className="space-y-1">
              <Label>Trabajador (opcional)</Label>
              <Input
                placeholder="Nombre del trabajador"
                value={form.trabajadorNombre}
                onChange={(e) => set("trabajadorNombre", e.target.value)}
              />
            </div>

            {/* fecha */}
            <div className="space-y-1">
              <Label>Fecha compromiso *</Label>
              <Input
                type="date"
                value={form.fechaCompromiso}
                onChange={(e) => set("fechaCompromiso", e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onSave(form)}
            disabled={!form.descripcion || !form.centroId || !form.fechaCompromiso}
          >
            {mode === "create" ? "Crear hallazgo" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- cierre modal ------------------------------------------------------------------

function CierreModal({
  open,
  hallazgo,
  targetEstado,
  onClose,
  onConfirm,
}: {
  open: boolean;
  hallazgo: Hallazgo | null;
  targetEstado: "resuelto" | "cerrado";
  onClose: () => void;
  onConfirm: (comentario: string) => void;
}) {
  const [comentario, setComentario] = useState("");
  React.useEffect(() => { if (open) setComentario(""); }, [open]);

  const isResuelto = targetEstado === "resuelto";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isResuelto
              ? <><BadgeCheck className="h-4 w-4 text-teal-600" /> Marcar como resuelto</>
              : <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Cerrar hallazgo</>
            }
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-500">
            {isResuelto
              ? "Se registrará que este hallazgo fue resuelto con las acciones correctivas implementadas. Puede ser cerrado definitivamente en un paso posterior."
              : "El hallazgo será cerrado definitivamente. Esta acción queda registrada en el historial y no puede revertirse desde esta vista."}
          </p>
          {hallazgo && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 leading-snug">
              {hallazgo.descripcion}
            </div>
          )}
          <div className="space-y-1">
            <Label>Comentario {isResuelto ? "de resolución" : "de cierre"} (opcional)</Label>
            <Textarea
              rows={3}
              placeholder={isResuelto
                ? "Describir la acción correctiva implementada…"
                : "Describir resolución, responsable o criterio de cierre…"}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className={isResuelto
              ? "bg-teal-600 hover:bg-teal-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"}
            onClick={() => onConfirm(comentario)}
          >
            {isResuelto ? "Marcar como resuelto" : "Confirmar cierre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- page -------------------------------------------------------------------

export default function HallazgosPage() {

  // ── Engine: build docs + auto-hallazgos ───────────────────────────────────

  const docs = useMemo<DocumentoEvaluable[]>(() => {
    return EVIDENCIAS_MOCK.flatMap((ev) => {
      const hallazgo = HALLAZGOS_MOCK.find((h) => h.id === ev.hallazgoId);
      if (!hallazgo?.obligacionId) return [];
      const ob = OBLIGACIONES_MOCK.find((o) => o.id === hallazgo.obligacionId);
      return [{
        id: ev.id,
        nombre: ev.nombre,
        tipo: String(ev.tipoDocumento),
        entidadId: hallazgo.centroId,
        entidadTipo: "centro" as const,
        obligacionId: hallazgo.obligacionId,
        fechaVencimiento: ob?.vencimiento,
      }];
    });
  }, []);

  const entidades = useMemo<EntidadInput[]>(
    () => CENTROS_MOCK.map((c) => ({ id: c.id, tipo: "centro" as const })),
    []
  );

  const evaluaciones = useMemo(
    () => evaluarObligaciones(OBLIGACIONES_MOCK, docs, entidades),
    [docs, entidades]
  );

  /**
   * Convierte HallazgoGenerado (motor) → Hallazgo (UI).
   * Filtra los que ya tienen un hallazgo manual abierto/en_proceso para
   * la misma obligación + centro, evitando duplicados.
   */
  const autoHallazgos = useMemo<Hallazgo[]>(() => {
    const compromiso = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return generarHallazgosDesdeEvaluaciones(evaluaciones)
      .filter((hg) =>
        !HALLAZGOS_MOCK.some(
          (h) =>
            h.obligacionId === hg.obligacionId &&
            h.centroId === hg.entidadId &&
            h.estado !== "cerrado"
        )
      )
      .map<Hallazgo>((hg) => {
        const centro = CENTROS_MOCK.find((c) => c.id === hg.entidadId);
        return {
          id: hg.id,
          tipo: "documental" as TipoHallazgo,
          descripcion: hg.titulo,
          centroId: hg.entidadId,
          centroNombre: centro?.nombre ?? hg.entidadId,
          obligacionId: hg.obligacionId,
          obligacionNombre: hg.obligacionNombre,
          estado: "abierto" as EstadoHallazgo,
          prioridad: hg.prioridad as PrioridadHallazgo,
          fechaCompromiso: compromiso,
          fechaCreacion: hg.generadoEl,
          creadoPor: "Motor de cumplimiento (automático)",
          historial: [
            {
              fecha: hg.generadoEl,
              usuario: "Motor de cumplimiento",
              accion: "Hallazgo generado automáticamente",
              detalle: hg.descripcion,
            },
          ],
          evidenciaIds: [],
        };
      });
  }, [evaluaciones]);

  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(() => [
    ...getHallazgosAcreditacion(),
    ...autoHallazgos,
    ...HALLAZGOS_MOCK,
  ]);

  // Re-sync hallazgos generados desde Acreditaciones al navegar a esta página
  React.useEffect(() => {
    const fromStore = getHallazgosAcreditacion();
    if (fromStore.length === 0) return;
    setHallazgos((prev) => {
      const existingIds = new Set(prev.map((h) => h.id));
      const nuevos = fromStore.filter((h) => !existingIds.has(h.id));
      if (nuevos.length === 0) return prev;
      return [...nuevos, ...prev];
    });
  }, []);
  const [selected, setSelected] = useState<Hallazgo | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<HallazgoFormData>(FORM_EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const [cierreOpen, setCierreOpen] = useState(false);
  const [hallazgoCierre, setHallazgoCierre] = useState<Hallazgo | null>(null);
  const [targetEstadoCierre, setTargetEstadoCierre] = useState<"resuelto" | "cerrado">("cerrado");

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoHallazgo | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<TipoHallazgo | "todos">("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState<
    PrioridadHallazgo | "todos"
  >("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");

  // ---- kpis
  const abiertos   = hallazgos.filter((h) => h.estado === "abierto").length;
  const enProceso  = hallazgos.filter((h) => h.estado === "en_seguimiento" || h.estado === "en_proceso").length;
  const resueltos  = hallazgos.filter((h) => h.estado === "resuelto").length;
  const cerrados   = hallazgos.filter((h) => h.estado === "cerrado").length;
  const criticos   = hallazgos.filter(
    (h) => h.prioridad === "critica" && h.estado !== "cerrado" && h.estado !== "resuelto"
  ).length;

  // ---- filter
  const hallazgosFiltrados = hallazgos.filter((h) => {
    const txt = search.toLowerCase();
    const coincide =
      txt.length === 0 ||
      h.descripcion.toLowerCase().includes(txt) ||
      h.centroNombre.toLowerCase().includes(txt) ||
      (h.trabajadorNombre?.toLowerCase().includes(txt) ?? false);

    return (
      coincide &&
      (filtroEstado === "todos" || h.estado === filtroEstado) &&
      (filtroTipo === "todos" || h.tipo === filtroTipo) &&
      (filtroPrioridad === "todos" || h.prioridad === filtroPrioridad) &&
      (filtroCentro === "todos" || h.centroId === filtroCentro)
    );
  });

  // ---- actions
  const abrirNuevo = () => {
    setModalMode("create");
    setEditId(null);
    setFormInitial(FORM_EMPTY);
    setModalOpen(true);
  };

  const abrirEditar = (h: Hallazgo) => {
    setModalMode("edit");
    setEditId(h.id);
    setFormInitial({
      tipo: h.tipo,
      descripcion: h.descripcion,
      centroId: h.centroId,
      trabajadorNombre: h.trabajadorNombre ?? "",
      obligacionId: h.obligacionId ?? "_none",
      prioridad: h.prioridad,
      fechaCompromiso: h.fechaCompromiso,
    });
    setSelected(null);
    setModalOpen(true);
  };

  const abrirCierre = (h: Hallazgo, targetEstado: "resuelto" | "cerrado") => {
    setHallazgoCierre(h);
    setTargetEstadoCierre(targetEstado);
    setSelected(null);
    setCierreOpen(true);
  };

  const guardarHallazgo = (data: HallazgoFormData) => {
    const ahora = new Date().toISOString();
    const centro = CENTROS_MOCK.find((c) => c.id === data.centroId);
    const obligacion = OBLIGACIONES_MOCK.find((o) => o.id === data.obligacionId && data.obligacionId !== "_none");

    if (modalMode === "create") {
      const nuevo: Hallazgo = {
        id: `h-${Date.now()}`,
        tipo: data.tipo,
        descripcion: data.descripcion,
        centroId: data.centroId,
        centroNombre: centro?.nombre ?? data.centroId,
        trabajadorNombre: data.trabajadorNombre || undefined,
        obligacionId: data.obligacionId !== "_none" ? data.obligacionId : undefined,
        obligacionNombre: obligacion?.nombre,
        estado: "abierto",
        prioridad: data.prioridad,
        fechaCompromiso: data.fechaCompromiso,
        fechaCreacion: ahora,
        creadoPor: "Prevencionista PREVANTIA",
        historial: [{ fecha: ahora, usuario: "Prevencionista PREVANTIA", accion: "Creación de hallazgo" }],
        evidenciaIds: [],
      };
      setHallazgos((prev) => [nuevo, ...prev]);
      registrarAccion({
        accion: "crear",
        modulo: "cumplimiento",
        entidadTipo: "Hallazgo",
        entidadId: nuevo.id,
        descripcion: `Registró hallazgo: ${nuevo.descripcion.slice(0, 80)}`,
      });
    } else if (editId) {
      setHallazgos((prev) =>
        prev.map((h) => {
          if (h.id !== editId) return h;
          const historial: HistorialHallazgo[] = [
            ...h.historial,
            { fecha: ahora, usuario: "Prevencionista PREVANTIA", accion: "Edición de hallazgo" },
          ];
          return {
            ...h,
            tipo: data.tipo,
            descripcion: data.descripcion,
            centroId: data.centroId,
            centroNombre: centro?.nombre ?? data.centroId,
            trabajadorNombre: data.trabajadorNombre || undefined,
            obligacionId: data.obligacionId !== "_none" ? data.obligacionId : undefined,
            obligacionNombre: obligacion?.nombre,
            prioridad: data.prioridad,
            fechaCompromiso: data.fechaCompromiso,
            historial,
          };
        })
      );
      registrarAccion({
        accion: "editar",
        modulo: "cumplimiento",
        entidadTipo: "Hallazgo",
        entidadId: editId,
        descripcion: `Editó hallazgo: ${data.descripcion.slice(0, 80)}`,
      });
    }
    setModalOpen(false);
  };

  const confirmarCierre = (comentario: string) => {
    if (!hallazgoCierre) return;
    const ahora = new Date().toISOString();
    const accion =
      targetEstadoCierre === "resuelto"
        ? "Hallazgo marcado como resuelto"
        : "Cierre definitivo de hallazgo";
    setHallazgos((prev) =>
      prev.map((h) => {
        if (h.id !== hallazgoCierre.id) return h;
        return {
          ...h,
          estado: targetEstadoCierre as EstadoHallazgo,
          fechaCierre: ahora,
          comentarioCierre: comentario.trim() || undefined,
          historial: [
            ...h.historial,
            {
              fecha: ahora,
              usuario: "Prevencionista PREVANTIA",
              accion,
              detalle: comentario.trim() || `${accion} sin comentario adicional.`,
            },
          ],
        };
      })
    );
    setCierreOpen(false);
    setHallazgoCierre(null);
    registrarAccion({
      accion: "cambiar_estado",
      modulo: "cumplimiento",
      entidadTipo: "Hallazgo",
      entidadId: hallazgoCierre.id,
      descripcion: `${accion}: ${hallazgoCierre.descripcion.slice(0, 70)}`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-0">
        {/* ---- header ---- */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Hallazgos DS44
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Incumplimientos detectados que requieren acción correctiva. Cada hallazgo debe tener responsable y fecha compromiso asignados.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/dicaprev/cumplimiento/plan-trabajo"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Plan de trabajo
            </Link>
            <Button
              onClick={abrirNuevo}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo hallazgo
            </Button>
          </div>
        </header>

        {/* ── Banner críticos ── */}
        {criticos > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span>
              Tienes <strong>{criticos}</strong> hallazgo{criticos !== 1 ? "s" : ""} crítico{criticos !== 1 ? "s" : ""} abierto{criticos !== 1 ? "s" : ""} sin responsable asignado.
              Asigna fecha compromiso y responsable para cada uno.
            </span>
            <Link
              href="/dicaprev/cumplimiento/plan-trabajo"
              className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Ver plan de trabajo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* ---- KPIs ---- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Abiertos",   value: abiertos,  cls: "from-amber-50 to-amber-100 text-amber-700",     sub: "Pendientes de acción" },
            { label: "En proceso", value: enProceso, cls: "from-blue-50 to-blue-100 text-blue-700",       sub: "En seguimiento o en curso" },
            { label: "Resueltos",  value: resueltos, cls: "from-teal-50 to-teal-100 text-teal-700",       sub: "Acción correctiva aplicada" },
            { label: "Cerrados",   value: cerrados,  cls: "from-emerald-50 to-emerald-100 text-emerald-700", sub: "Gestionados definitivamente" },
          ].map((kpi) => (
            <Card key={kpi.label} className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}>
              <CardContent className="pt-5 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide">{kpi.label}</p>
                <p className="mt-1 text-3xl font-semibold">{kpi.value}</p>
                <p className="mt-1 text-[11px] opacity-80">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ---- filtros ---- */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-5 flex flex-col gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar hallazgo, centro o trabajador…"
                className="pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {/* estado */}
              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}>
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="abierto">Abierto</SelectItem>
                  <SelectItem value="en_seguimiento">En seguimiento</SelectItem>
                  <SelectItem value="en_proceso">En proceso</SelectItem>
                  <SelectItem value="resuelto">Resuelto</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>

              {/* tipo */}
              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
                <SelectTrigger className="w-40 text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(Object.entries(TIPO_CFG) as [TipoHallazgo, { label: string }][]).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* prioridad */}
              <Select value={filtroPrioridad} onValueChange={(v) => setFiltroPrioridad(v as typeof filtroPrioridad)}>
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {(Object.entries(PRIORIDAD_CFG) as [PrioridadHallazgo, { label: string }][]).map(([k, c]) => (
                    <SelectItem key={k} value={k}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* centro */}
              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger className="w-48 text-sm">
                  <SelectValue placeholder="Centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {CENTROS_MOCK.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* mobile button */}
              <Button
                onClick={abrirNuevo}
                className="sm:hidden ml-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 text-sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Nuevo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ---- tabla ---- */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="py-3 text-left pl-2">Estado</th>
                    <th className="py-3 text-left">Tipo</th>
                    <th className="py-3 text-left">Hallazgo</th>
                    <th className="py-3 text-left">Centro</th>
                    <th className="py-3 text-left">Trabajador</th>
                    <th className="py-3 text-left">Prioridad</th>
                    <th className="py-3 text-left">Compromiso</th>
                    <th className="py-3 text-right pr-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {hallazgosFiltrados.map((h) => {
                    const esAuto = h.id.startsWith("auto-");
                    const esAcr = h.id.startsWith("acr-");
                    return (
                    <tr
                      key={h.id}
                      className="border-b last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => setSelected(h)}
                    >
                      <td className="py-3 pl-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", ESTADO_CFG[h.estado].cls)}>
                          {ESTADO_CFG[h.estado].icon}
                          {ESTADO_CFG[h.estado].label}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", TIPO_CFG[h.tipo].cls)}>
                          {TIPO_CFG[h.tipo].label}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-900 max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {esAuto && (
                            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                              <Cpu className="h-2.5 w-2.5" /> Auto
                            </span>
                          )}
                          {esAcr && (
                            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                              📋 Acreditación
                            </span>
                          )}
                          <span>{h.descripcion}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 text-xs">{h.centroNombre}</td>
                      <td className="py-3 text-slate-500 text-xs">
                        {h.trabajadorNombre ?? "—"}
                      </td>
                      <td className="py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORIDAD_CFG[h.prioridad].cls)}>
                          {PRIORIDAD_CFG[h.prioridad].label}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{fmt(h.fechaCompromiso)}</td>
                      <td className="py-3 pr-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-700"
                          onClick={(e) => { e.stopPropagation(); setSelected(h); }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                  {hallazgosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <AlertTriangle className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                        <p className="text-sm font-medium text-slate-500">Sin hallazgos que coincidan</p>
                        <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o registra un nuevo hallazgo.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- drawer ---- */}
      {selected && (
        <HallazgoDrawer
          hallazgo={selected}
          onClose={() => setSelected(null)}
          onEdit={abrirEditar}
          onCambioEstado={abrirCierre}
        />
      )}

      {/* ---- modals ---- */}
      <HallazgoModal
        open={modalOpen}
        mode={modalMode}
        initial={formInitial}
        onClose={() => setModalOpen(false)}
        onSave={guardarHallazgo}
      />

      <CierreModal
        open={cierreOpen}
        hallazgo={hallazgoCierre}
        targetEstado={targetEstadoCierre}
        onClose={() => setCierreOpen(false)}
        onConfirm={confirmarCierre}
      />
    </div>
  );
}
