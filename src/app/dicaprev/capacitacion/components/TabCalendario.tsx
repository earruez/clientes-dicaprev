"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  getSesiones,
  getCatalogo,
  createSesion,
  updateSesion,
  subscribe,
  ESTADO_SESION_CFG,
  MODALIDAD_CFG,
  type SesionCapacitacion,
  type EstadoSesion,
} from "@/lib/capacitacion/capacitacion-store";
import { MOCK_WORKERS } from "@/components/trabajadores-v2/types";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Plus,
  Pencil,
  BookOpen,
  Video,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSesion {
  capacitacionId: string;
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  modalidad: "presencial" | "online" | "mixta";
  ubicacion: string;
  relator: string;
  cupos: string;
  estado: EstadoSesion;
  trabajadoresIds: string[];
}

const EMPTY_FORM: FormSesion = {
  capacitacionId: "",
  titulo: "",
  fecha: "",
  horaInicio: "",
  horaFin: "",
  modalidad: "presencial",
  ubicacion: "",
  relator: "",
  cupos: "",
  estado: "programada",
  trabajadoresIds: [],
};

function iconModalidad(m: string) {
  if (m === "online" || m === "hibrido") return <Video className="h-3.5 w-3.5" />;
  if (m === "elearning") return <Monitor className="h-3.5 w-3.5" />;
  return <BookOpen className="h-3.5 w-3.5" />;
}

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function group(sesiones: SesionCapacitacion[]) {
  const mapa: Record<string, SesionCapacitacion[]> = {};
  for (const s of sesiones) {
    const key = s.fecha.slice(0, 7); // YYYY-MM
    if (!mapa[key]) mapa[key] = [];
    mapa[key].push(s);
  }
  return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b));
}

function mesLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export default function TabCalendario() {
  const [sesiones, setSesiones] = useState(() => getSesiones());
  const [catalogo] = useState(() => getCatalogo());
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [editTarget, setEditTarget] = useState<SesionCapacitacion | null>(null);
  const [form, setForm] = useState<FormSesion>(EMPTY_FORM);
  const [searchWorker, setSearchWorker] = useState("");

  useEffect(() => subscribe(() => setSesiones(getSesiones())), []);

  const grouped = useMemo(() => group(sesiones), [sesiones]);

  function openCrear() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModal("crear");
  }

  function openEditar(s: SesionCapacitacion) {
    setEditTarget(s);
    setForm({
      capacitacionId: s.capacitacionId,
      titulo: s.titulo,
      fecha: s.fecha,
      horaInicio: s.horaInicio ?? "",
      horaFin: s.horaFin ?? "",
      modalidad: s.modalidad as FormSesion["modalidad"],
      ubicacion: s.ubicacion ?? "",
      relator: s.relator ?? "",
      cupos: s.cupos ? String(s.cupos) : "",
      estado: s.estado,
      trabajadoresIds: [...s.trabajadoresIds],
    });
    setModal("editar");
  }

  function toggleWorker(id: string) {
    setForm((p) => ({
      ...p,
      trabajadoresIds: p.trabajadoresIds.includes(id)
        ? p.trabajadoresIds.filter((x) => x !== id)
        : [...p.trabajadoresIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cap = catalogo.find((c) => c.id === form.capacitacionId);
    const payload = {
      capacitacionId: form.capacitacionId,
      titulo: form.titulo || (cap?.nombre ?? "Sesión sin título"),
      fecha: form.fecha,
      horaInicio: form.horaInicio || undefined,
      horaFin: form.horaFin || undefined,
      modalidad: form.modalidad,
      ubicacion: form.ubicacion || undefined,
      relator: form.relator || undefined,
      cupos: form.cupos ? Number(form.cupos) : undefined,
      estado: form.estado,
      trabajadoresIds: form.trabajadoresIds,
    };

    if (modal === "crear") {
      const nueva = createSesion(payload);
      registrarAccion({
        accion: "crear",
        modulo: "capacitacion",
        entidadTipo: "Sesión",
        entidadId: nueva.id,
        descripcion: `Creó sesión '${nueva.titulo}' para ${fmt(nueva.fecha)}`,
      });
    } else if (editTarget) {
      updateSesion(editTarget.id, payload);
      registrarAccion({
        accion: "editar",
        modulo: "capacitacion",
        entidadTipo: "Sesión",
        entidadId: editTarget.id,
        descripcion: `Editó sesión '${payload.titulo}'`,
      });
    }
    setModal(null);
  }

  const filteredWorkers = useMemo(() =>
    MOCK_WORKERS.filter((w) => {
      if (!searchWorker) return true;
      const q = searchWorker.toLowerCase();
      return `${w.nombre} ${w.apellido}`.toLowerCase().includes(q) || w.cargo.toLowerCase().includes(q);
    }),
    [searchWorker]
  );

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
        <p className="text-sm font-medium text-slate-600">{sesiones.length} sesiones programadas</p>
        <Button onClick={openCrear} className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva sesión
        </Button>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center shadow-sm">
          <Calendar className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay sesiones programadas.</p>
        </div>
      ) : (
        grouped.map(([mes, items]) => (
          <div key={mes}>
            <h3 className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-2 px-1 capitalize">
              {mesLabel(mes)}
            </h3>
            <div className="space-y-2">
              {items.map((s) => {
                const cfg = ESTADO_SESION_CFG[s.estado];
                const modCfg = MODALIDAD_CFG[s.modalidad];
                const cap = catalogo.find((c) => c.id === s.capacitacionId);
                return (
                  <div
                    key={s.id}
                    className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-4"
                  >
                    {/* Date block */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {new Date(s.fecha + "T12:00").toLocaleDateString("es-CL", { month: "short" })}
                      </span>
                      <span className="text-xl font-bold text-slate-700 leading-tight">
                        {new Date(s.fecha + "T12:00").getDate()}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.titulo}</p>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", cfg.cls)}>
                          {cfg.label}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", modCfg.cls)}>
                          {iconModalidad(s.modalidad)}
                          {modCfg.label}
                        </span>
                      </div>
                      {cap && <p className="text-xs text-slate-400 mt-0.5">{cap.nombre}</p>}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                        {s.horaInicio && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {s.horaInicio}{s.horaFin ? ` – ${s.horaFin}` : ""}
                          </span>
                        )}
                        {s.ubicacion && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.ubicacion}
                          </span>
                        )}
                        {s.relator && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {s.relator}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {s.trabajadoresIds.length}{s.cupos ? `/${s.cupos}` : ""} participantes
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openEditar(s)}
                      className="flex-shrink-0 h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal crear/editar */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {modal === "crear" ? "Nueva sesión" : "Editar sesión"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600">Capacitación</Label>
                <Select value={form.capacitacionId} onValueChange={(v) => {
                  const c = catalogo.find((x) => x.id === v);
                  setForm((p) => ({ ...p, capacitacionId: v, titulo: c?.nombre ?? "" }));
                }}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-sm">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogo.filter((c) => c.activa).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600">Título de la sesión</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ej: Sesión grupal Turno Mañana"
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Fecha</Label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} className="rounded-xl border-slate-200 text-sm" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Modalidad</Label>
                <Select value={form.modalidad} onValueChange={(v) => setForm((p) => ({ ...p, modalidad: v as FormSesion["modalidad"] }))}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Hora inicio</Label>
                <Input type="time" value={form.horaInicio} onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Hora fin</Label>
                <Input type="time" value={form.horaFin} onChange={(e) => setForm((p) => ({ ...p, horaFin: e.target.value }))} className="rounded-xl border-slate-200 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Ubicación / Sala</Label>
                <Input value={form.ubicacion} onChange={(e) => setForm((p) => ({ ...p, ubicacion: e.target.value }))} placeholder="Sala A, Plataforma Zoom…" className="rounded-xl border-slate-200 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Relator</Label>
                <Input value={form.relator} onChange={(e) => setForm((p) => ({ ...p, relator: e.target.value }))} placeholder="Nombre del relator" className="rounded-xl border-slate-200 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Cupos máximos</Label>
                <Input type="number" min={1} value={form.cupos} onChange={(e) => setForm((p) => ({ ...p, cupos: e.target.value }))} placeholder="Sin límite" className="rounded-xl border-slate-200 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v as EstadoSesion }))}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ESTADO_SESION_CFG) as EstadoSesion[]).map((e) => (
                      <SelectItem key={e} value={e}>{ESTADO_SESION_CFG[e].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seleccionar participantes */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">
                Participantes ({form.trabajadoresIds.length} seleccionados)
              </Label>
              <Input
                placeholder="Buscar trabajador…"
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                className="rounded-xl border-slate-200 text-sm"
              />
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-50">
                {filteredWorkers.map((w) => {
                  const checked = form.trabajadoresIds.includes(w.id);
                  return (
                    <label key={w.id} className={cn("flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors", checked && "bg-cyan-50/60")}>
                      <input type="checkbox" checked={checked} onChange={() => toggleWorker(w.id)} className="accent-cyan-600 h-4 w-4" />
                      <span className="text-sm text-slate-700">{w.nombre} {w.apellido}</span>
                      <span className="text-xs text-slate-400 ml-auto">{w.cargo}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white">
                {modal === "crear" ? "Crear sesión" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
