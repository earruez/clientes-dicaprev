"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  cambiarEstadoCapacitacionSesion,
  createCapacitacionSesion,
  getCapacitacionSesiones,
  getCapacitaciones,
  updateCapacitacionSesion,
  type CapacitacionCatalogo,
  type CapacitacionSesion,
  type EstadoCapacitacionSesion,
} from "@/actions/capacitaciones";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Calendar,
  Clock,
  Loader2,
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

const ESTADO_SESION_CFG: Record<EstadoCapacitacionSesion, { label: string; cls: string }> = {
  programada: { label: "Programada", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  en_curso: { label: "En curso", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  finalizada: { label: "Finalizada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelada: { label: "Cancelada", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const MODALIDAD_CFG: Record<string, { label: string; cls: string }> = {
  presencial: { label: "Presencial", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  online: { label: "Online", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  mixta: { label: "Mixta", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  hibrido: { label: "Hibrido", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  elearning: { label: "E-learning", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

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
  videoUrl: string;
  videoDuracionSegundos: string;
  minimoVisualizacionPct: string;
  evaluacionMinimoAprobacion: string;
  preguntas: Array<{
    id: string;
    texto: string;
    opciones: [string, string, string, string];
    correcta: number;
  }>;
  estado: EstadoCapacitacionSesion;
}

function defaultPreguntas() {
  return [1, 2, 3, 4].map((n) => ({
    id: `p${n}`,
    texto: "",
    opciones: ["", "", "", ""] as [string, string, string, string],
    correcta: 0,
  }));
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
  videoUrl: "",
  videoDuracionSegundos: "600",
  minimoVisualizacionPct: "85",
  evaluacionMinimoAprobacion: "70",
  preguntas: defaultPreguntas(),
  estado: "programada",
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

function group(sesiones: CapacitacionSesion[]) {
  const mapa: Record<string, CapacitacionSesion[]> = {};
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
  const [sesiones, setSesiones] = useState<CapacitacionSesion[]>([]);
  const [catalogo, setCatalogo] = useState<CapacitacionCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [editTarget, setEditTarget] = useState<CapacitacionSesion | null>(null);
  const [form, setForm] = useState<FormSesion>(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ses, caps] = await Promise.all([getCapacitacionSesiones(), getCapacitaciones()]);
      setSesiones(ses);
      setCatalogo(caps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar sesiones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grouped = useMemo(() => group(sesiones), [sesiones]);

  function openCrear() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModal("crear");
  }

  function openEditar(s: CapacitacionSesion) {
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
      videoUrl: s.videoUrl ?? "",
      videoDuracionSegundos: s.videoDuracionSegundos ? String(s.videoDuracionSegundos) : "600",
      minimoVisualizacionPct: String(s.minimoVisualizacionPct ?? 85),
      evaluacionMinimoAprobacion: String(s.evaluacionMinimoAprobacion ?? 70),
      preguntas:
        s.evaluacionPreguntas?.length > 0
          ? s.evaluacionPreguntas.slice(0, 4).map((p, i) => ({
              id: p.id || `p${i + 1}`,
              texto: p.texto,
              opciones: [
                p.opciones[0] ?? "",
                p.opciones[1] ?? "",
                p.opciones[2] ?? "",
                p.opciones[3] ?? "",
              ] as [string, string, string, string],
              correcta: p.correcta,
            }))
          : defaultPreguntas(),
      estado: s.estado,
    });
    setModal("editar");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cap = catalogo.find((c) => c.id === form.capacitacionId);

    const preguntasNormalizadas = form.preguntas
      .map((p, i) => ({
        id: p.id || `p${i + 1}`,
        texto: p.texto.trim(),
        opciones: p.opciones.map((o) => o.trim()),
        correcta: p.correcta,
      }))
      .filter((p) => p.texto.length > 0)
      .map((p) => ({
        ...p,
        opciones: p.opciones.filter((o) => o.length > 0),
      }))
      .filter((p) => p.opciones.length === 4 && p.correcta >= 0 && p.correcta < 4);

    if ((cap?.requiereEvaluacion ?? false) && preguntasNormalizadas.length !== 4) {
      setError("Debes cargar 4 preguntas válidas para esta capacitación.");
      return;
    }

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
      videoUrl: form.videoUrl || undefined,
      videoDuracionSegundos: form.videoUrl ? Number(form.videoDuracionSegundos || 600) : undefined,
      minimoVisualizacionPct: form.videoUrl ? Number(form.minimoVisualizacionPct || 85) : undefined,
      evaluacionPreguntas: preguntasNormalizadas,
      evaluacionMinimoAprobacion: Number(form.evaluacionMinimoAprobacion || 70),
    };

    setSaving(true);
    setError(null);
    try {
      if (modal === "crear") {
        const nueva = await createCapacitacionSesion(payload);
        if (form.estado !== "programada") {
          await cambiarEstadoCapacitacionSesion(nueva.id, { estado: form.estado });
        }
        registrarAccion({
          accion: "crear",
          modulo: "capacitacion",
          entidadTipo: "Sesión",
          entidadId: nueva.id,
          descripcion: `Creó sesión '${nueva.titulo}' para ${fmt(nueva.fecha)}`,
        });
      } else if (editTarget) {
        await updateCapacitacionSesion(editTarget.id, payload);
        if (form.estado !== editTarget.estado) {
          await cambiarEstadoCapacitacionSesion(editTarget.id, { estado: form.estado });
        }
        registrarAccion({
          accion: "editar",
          modulo: "capacitacion",
          entidadTipo: "Sesión",
          entidadId: editTarget.id,
          descripcion: `Editó sesión '${payload.titulo}'`,
        });
      }
      setModal(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la sesión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          {loading ? "Cargando sesiones..." : `${sesiones.length} sesiones programadas`}
        </p>
        <Button onClick={openCrear} disabled={loading || saving} className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white" size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
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
                const modCfg = MODALIDAD_CFG[s.modalidad] ?? MODALIDAD_CFG.presencial;
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
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        {s.videoUrl ? (
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-cyan-700">
                            Video configurado
                          </span>
                        ) : null}
                        {s.evaluacionPreguntas.length > 0 ? (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">
                            {s.evaluacionPreguntas.length} preguntas
                          </span>
                        ) : null}
                      </div>
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
                          {s.asistentesConfirmados ?? 0}{s.cupos ? `/${s.cupos}` : ""} participantes
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
            <DialogDescription>
              Configura fecha, modalidad y participantes de la sesión seleccionada.
            </DialogDescription>
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
                <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v as EstadoCapacitacionSesion }))}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ESTADO_SESION_CFG) as EstadoCapacitacionSesion[]).map((e) => (
                      <SelectItem key={e} value={e}>{ESTADO_SESION_CFG[e].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 mt-2 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contenido virtual</p>
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600">URL video</Label>
                <Input
                  value={form.videoUrl}
                  onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  placeholder="https://youtu.be/... o https://.../video.mp4"
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Duración video (seg)</Label>
                <Input
                  type="number"
                  min={30}
                  value={form.videoDuracionSegundos}
                  onChange={(e) => setForm((p) => ({ ...p, videoDuracionSegundos: e.target.value }))}
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">% mínimo visualización</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.minimoVisualizacionPct}
                  onChange={(e) => setForm((p) => ({ ...p, minimoVisualizacionPct: e.target.value }))}
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>

              <div className="col-span-2 mt-2 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mini test (4 preguntas)</p>
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600">% mínimo aprobación</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.evaluacionMinimoAprobacion}
                  onChange={(e) => setForm((p) => ({ ...p, evaluacionMinimoAprobacion: e.target.value }))}
                  className="rounded-xl border-slate-200 text-sm"
                />
              </div>

              {form.preguntas.map((pregunta, idx) => (
                <div key={pregunta.id} className="col-span-2 rounded-xl border border-slate-200 p-3 space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Pregunta {idx + 1}</Label>
                  <Input
                    value={pregunta.texto}
                    onChange={(e) =>
                      setForm((prev) => {
                        const next = [...prev.preguntas];
                        next[idx] = { ...next[idx], texto: e.target.value };
                        return { ...prev, preguntas: next };
                      })
                    }
                    placeholder="Escribe la pregunta"
                    className="rounded-xl border-slate-200 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {pregunta.opciones.map((opcion, optIdx) => (
                      <Input
                        key={`${pregunta.id}-${optIdx}`}
                        value={opcion}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.preguntas];
                            const opciones = [...next[idx].opciones] as [string, string, string, string];
                            opciones[optIdx] = e.target.value;
                            next[idx] = { ...next[idx], opciones };
                            return { ...prev, preguntas: next };
                          })
                        }
                        placeholder={`Opción ${optIdx + 1}`}
                        className="rounded-xl border-slate-200 text-sm"
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Respuesta correcta</Label>
                    <Select
                      value={String(pregunta.correcta)}
                      onValueChange={(v) =>
                        setForm((prev) => {
                          const next = [...prev.preguntas];
                          next[idx] = { ...next[idx], correcta: Number(v) };
                          return { ...prev, preguntas: next };
                        })
                      }
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Opción 1</SelectItem>
                        <SelectItem value="1">Opción 2</SelectItem>
                        <SelectItem value="2">Opción 3</SelectItem>
                        <SelectItem value="3">Opción 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white">
                {saving ? "Guardando..." : modal === "crear" ? "Crear sesión" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
