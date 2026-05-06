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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Plus,
  Search,
  User,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { cn } from "@/lib/utils";
import type {
  EstadoHallazgo,
  Hallazgo,
  PrioridadHallazgo,
} from "../types";
import {
  actualizarHallazgo,
  cerrarHallazgo,
  crearHallazgo,
  getHallazgos,
  type OpcionesHallazgo,
  type PlantillaHallazgo,
} from "./actions";

const TIPO_CFG: Record<string, { label: string; cls: string }> = {
  documental: { label: "Documental", cls: "bg-sky-50 text-sky-700 border border-sky-200" },
  estructural: { label: "Estructural", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  capacitacion: { label: "Capacitación", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  evidencia: { label: "Evidencia", cls: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  procedimiento: { label: "Procedimiento", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  comite_paritario: { label: "Comité Paritario", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  plan_trabajo: { label: "Plan de trabajo", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  accidente_incidente: { label: "Accidente/incidente", cls: "bg-red-50 text-red-700 border border-red-200" },
  otro: { label: "Otro", cls: "bg-slate-100 text-slate-700 border border-slate-200" },
  // legacy
  seguridad: { label: "Seguridad", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  conducta: { label: "Conducta", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  equipos: { label: "Equipos", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  emergencias: { label: "Emergencias", cls: "bg-red-50 text-red-700 border border-red-200" },
};

const ESTADO_CFG: Record<EstadoHallazgo, { label: string; cls: string; icon: React.ReactNode }> = {
  abierto: {
    label: "Abierto",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  en_seguimiento: {
    label: "En seguimiento",
    cls: "bg-sky-50 text-sky-700 border border-sky-200",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  en_proceso: {
    label: "En proceso",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  resuelto: {
    label: "Resuelto",
    cls: "bg-teal-50 text-teal-700 border border-teal-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  cerrado: {
    label: "Cerrado",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

const PRIORIDAD_CFG: Record<PrioridadHallazgo, { label: string; cls: string }> = {
  critica: { label: "Crítica", cls: "bg-red-100 text-red-700 border border-red-300" },
  alta: { label: "Alta", cls: "bg-rose-100 text-rose-700 border border-rose-200" },
  media: { label: "Media", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  baja: { label: "Baja", cls: "bg-sky-100 text-sky-700 border border-sky-200" },
};

type HallazgoFormData = {
  plantillaClave: string;
  tipo: string;
  descripcion: string;
  centroTrabajoId: string;
  trabajadorId: string;
  obligacionClave: string;
  prioridad: PrioridadHallazgo;
  fechaCompromiso: string;
};

function fechaCompromisoDesdePlantilla(dias: number): string {
  const dt = new Date(Date.now() + dias * 86_400_000);
  return dt.toISOString().slice(0, 10);
}

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

function FORM_EMPTY(): HallazgoFormData {
  return {
    plantillaClave: "manual",
    tipo: "documental",
    descripcion: "",
    centroTrabajoId: "",
    trabajadorId: "none",
    obligacionClave: "none",
    prioridad: "media",
    fechaCompromiso: "",
  };
}

export default function HallazgosClient({
  initialHallazgos,
  opciones,
}: {
  initialHallazgos: Hallazgo[];
  opciones: OpcionesHallazgo;
}) {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(initialHallazgos);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoHallazgo | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<string | "todos">("todos");
  const [filtroCentro, setFiltroCentro] = useState<string>("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HallazgoFormData>(FORM_EMPTY());
  const [soloIncumplidas, setSoloIncumplidas] = useState(true);

  const [selected, setSelected] = useState<Hallazgo | null>(null);

  const obligacionesMap = useMemo(() => {
    return new Map(opciones.obligaciones.map((o) => [o.clave, o.nombre]));
  }, [opciones.obligaciones]);

  async function reloadHallazgos() {
    const latest = await getHallazgos();
    setHallazgos(latest);
  }

  function applyTemplate(plantilla: PlantillaHallazgo) {
    const sugerida = plantilla.sugerenciaObligacionTexto
      ? opciones.obligaciones.find((o) => o.nombre.toLowerCase().includes(plantilla.sugerenciaObligacionTexto!.toLowerCase()))
      : undefined;

    setForm((prev) => ({
      ...prev,
      plantillaClave: plantilla.clave,
      tipo: plantilla.tipo,
      prioridad: plantilla.prioridad,
      descripcion: plantilla.descripcionBase,
      fechaCompromiso: fechaCompromisoDesdePlantilla(plantilla.diasCompromiso),
      obligacionClave: sugerida?.clave ?? prev.obligacionClave,
    }));
  }

  function openCreate() {
    setEditId(null);
    setForm(FORM_EMPTY());
    setModalOpen(true);
  }

  function openEdit(h: Hallazgo) {
    setEditId(h.id);
    setForm({
      plantillaClave: "manual",
      tipo: h.tipo,
      descripcion: h.descripcion,
      centroTrabajoId: h.centroTrabajoId ?? h.centroId,
      trabajadorId: h.trabajadorId ?? "none",
      obligacionClave: h.obligacionClave ?? h.obligacionId ?? "none",
      prioridad: h.prioridad,
      fechaCompromiso: h.fechaCompromiso,
    });
    setModalOpen(true);
  }

  async function onSubmit() {
    if (!form.descripcion.trim() || !form.centroTrabajoId || !form.fechaCompromiso) return;
    try {
      setSaving(true);
      if (!editId) {
        await crearHallazgo({
          centroTrabajoId: form.centroTrabajoId,
          trabajadorId: form.trabajadorId === "none" ? null : form.trabajadorId,
          obligacionClave: form.obligacionClave === "none" ? null : form.obligacionClave,
          tipo: form.tipo,
          prioridad: form.prioridad,
          descripcion: form.descripcion,
          fechaCompromiso: form.fechaCompromiso,
        });
      } else {
        await actualizarHallazgo(editId, {
          centroTrabajoId: form.centroTrabajoId,
          trabajadorId: form.trabajadorId === "none" ? null : form.trabajadorId,
          obligacionClave: form.obligacionClave === "none" ? null : form.obligacionClave,
          tipo: form.tipo,
          prioridad: form.prioridad,
          descripcion: form.descripcion,
          fechaCompromiso: form.fechaCompromiso,
        });
      }
      await reloadHallazgos();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function onCerrar(h: Hallazgo) {
    if (!opciones.puedeEditar) return;
    try {
      setSaving(true);
      await cerrarHallazgo(h.id);
      await reloadHallazgos();
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  const trabajadoresFiltrados = useMemo(() => {
    return opciones.trabajadores.filter((t) => {
      if (!form.centroTrabajoId) return true;
      return t.centroTrabajoId === form.centroTrabajoId;
    });
  }, [opciones.trabajadores, form.centroTrabajoId]);

  const obligacionesDisponibles = useMemo(() => {
    return opciones.obligaciones.filter((o) => {
      if (!soloIncumplidas) return true;
      return o.incumplida;
    });
  }, [opciones.obligaciones, soloIncumplidas]);

  const abiertos = hallazgos.filter((h) => h.estado === "abierto").length;
  const enProceso = hallazgos.filter((h) => h.estado === "en_seguimiento" || h.estado === "en_proceso").length;
  const resueltos = hallazgos.filter((h) => h.estado === "resuelto").length;
  const cerrados = hallazgos.filter((h) => h.estado === "cerrado").length;

  const hallazgosFiltrados = useMemo(() => {
    const txt = search.toLowerCase();
    return hallazgos.filter((h) => {
      const matchText =
        txt.length === 0 ||
        h.descripcion.toLowerCase().includes(txt) ||
        h.centroNombre.toLowerCase().includes(txt) ||
        (h.trabajadorNombre?.toLowerCase().includes(txt) ?? false);
      const matchEstado = filtroEstado === "todos" || h.estado === filtroEstado;
      const matchTipo = filtroTipo === "todos" || h.tipo === filtroTipo;
      const matchCentro = filtroCentro === "todos" || h.centroId === filtroCentro || h.centroTrabajoId === filtroCentro;
      return matchText && matchEstado && matchTipo && matchCentro;
    });
  }, [hallazgos, search, filtroEstado, filtroTipo, filtroCentro]);

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-6xl space-y-8 px-4 lg:px-0">
        <StandardPageHeader
          moduleLabel="Cumplimiento DS44"
          title="Hallazgos DS44"
          description="Registro de hallazgos con plantillas rápidas y vínculos reales a obligaciones, centros y trabajadores."
          icon={AlertTriangle}
          actions={
            opciones.puedeEditar ? (
              <Button
                onClick={openCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo hallazgo
              </Button>
            ) : null
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Abiertos", value: abiertos, cls: "from-amber-50 to-amber-100 text-amber-700" },
            { label: "En proceso", value: enProceso, cls: "from-blue-50 to-blue-100 text-blue-700" },
            { label: "Resueltos", value: resueltos, cls: "from-teal-50 to-teal-100 text-teal-700" },
            { label: "Cerrados", value: cerrados, cls: "from-emerald-50 to-emerald-100 text-emerald-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}>
              <CardContent className="pt-5 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide">{kpi.label}</p>
                <p className="mt-1 text-3xl font-semibold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-5 flex flex-col gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar hallazgo, centro o trabajador..."
                className="pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}>
                <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="abierto">Abierto</SelectItem>
                  <SelectItem value="en_seguimiento">En seguimiento</SelectItem>
                  <SelectItem value="en_proceso">En proceso</SelectItem>
                  <SelectItem value="resuelto">Resuelto</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
                <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(TIPO_CFG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroCentro} onValueChange={setFiltroCentro}>
                <SelectTrigger className="w-52 text-sm"><SelectValue placeholder="Centro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {opciones.centros.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
                  {hallazgosFiltrados.map((h) => (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-slate-50/60 transition-colors">
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
                      <td className="py-3 font-medium text-slate-900 max-w-xs">{h.descripcion}</td>
                      <td className="py-3 text-slate-600 text-xs">{h.centroNombre}</td>
                      <td className="py-3 text-slate-500 text-xs">{h.trabajadorNombre ?? "-"}</td>
                      <td className="py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORIDAD_CFG[h.prioridad].cls)}>
                          {PRIORIDAD_CFG[h.prioridad].label}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{fmtFecha(h.fechaCompromiso)}</td>
                      <td className="py-3 pr-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(h)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {hallazgosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500">
                        Sin hallazgos que coincidan.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar hallazgo" : "Nuevo hallazgo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Plantilla de hallazgo</Label>
              <Select
                value={form.plantillaClave}
                onValueChange={(v) => {
                  if (v === "manual") {
                    setForm((prev) => ({ ...prev, plantillaClave: "manual" }));
                    return;
                  }
                  const plantilla = opciones.plantillas.find((p) => p.clave === v);
                  if (!plantilla) return;
                  applyTemplate(plantilla);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  {opciones.plantillas.map((p) => (
                    <SelectItem key={p.clave} value={p.clave}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((prev) => ({ ...prev, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_CFG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={(v) => setForm((prev) => ({ ...prev, prioridad: v as PrioridadHallazgo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDAD_CFG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Centro de trabajo</Label>
                <Select value={form.centroTrabajoId} onValueChange={(v) => setForm((prev) => ({ ...prev, centroTrabajoId: v, trabajadorId: "none" }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {opciones.centros.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Trabajador</Label>
                <Select value={form.trabajadorId} onValueChange={(v) => setForm((prev) => ({ ...prev, trabajadorId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No asociado</SelectItem>
                    {trabajadoresFiltrados.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nombreCompleto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={soloIncumplidas}
                  onCheckedChange={(v) => setSoloIncumplidas(Boolean(v))}
                  id="solo-incumplidas"
                />
                <Label htmlFor="solo-incumplidas">Mostrar solo obligaciones incumplidas</Label>
              </div>

              <div className="space-y-1">
                <Label>Obligación DS44</Label>
                <Select value={form.obligacionClave} onValueChange={(v) => setForm((prev) => ({ ...prev, obligacionClave: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asociar</SelectItem>
                    {obligacionesDisponibles.map((o) => (
                      <SelectItem key={o.clave} value={o.clave}>{o.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fecha compromiso</Label>
              <Input
                type="date"
                value={form.fechaCompromiso}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaCompromiso: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onSubmit}
              disabled={saving || !form.descripcion.trim() || !form.centroTrabajoId || !form.fechaCompromiso}
            >
              {editId ? "Guardar cambios" : "Crear hallazgo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalle del hallazgo</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-slate-900">{selected.descripcion}</p>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {selected.trabajadorNombre ?? "No asociado"}</div>
                <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {fmtFecha(selected.fechaCompromiso)}</div>
                <div>Centro: {selected.centroNombre}</div>
                <div>Obligación: {selected.obligacionClave ? (obligacionesMap.get(selected.obligacionClave) ?? selected.obligacionClave) : "Sin asociar"}</div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {selected && opciones.puedeEditar && selected.estado !== "cerrado" ? (
              <>
                <Button variant="outline" onClick={() => selected && openEdit(selected)}>Editar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => selected && onCerrar(selected)}>
                  Cerrar hallazgo
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
