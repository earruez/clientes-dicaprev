"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CalendarOff, Loader2 } from "lucide-react";
import {
  getCapacitacionSesiones,
  createCapacitacionSesion,
  updateCapacitacionSesion,
  cambiarEstadoCapacitacionSesion,
  getCapacitaciones,
} from "@/actions/capacitaciones";
import type {
  CapacitacionSesion,
  CapacitacionCatalogo,
  EstadoCapacitacionSesion,
} from "@/actions/capacitaciones";

const ESTADO_LABEL: Record<EstadoCapacitacionSesion, string> = {
  programada: "Programada",
  en_curso: "En curso",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

const monthDays = Array.from({ length: 30 }).map((_, i) => i + 1);

type NuevaSesionForm = {
  capacitacionId: string;
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  modalidad: string;
  ubicacion: string;
  cupos: number;
};

const FORM_EMPTY: NuevaSesionForm = {
  capacitacionId: "",
  titulo: "",
  fecha: "",
  horaInicio: "",
  horaFin: "",
  modalidad: "presencial",
  ubicacion: "",
  cupos: 20,
};

export default function CalendarioCapacitacionPage() {
  const [sesiones, setSesiones] = useState<CapacitacionSesion[]>([]);
  const [catalogo, setCatalogo] = useState<CapacitacionCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState<"agenda" | "mes">("agenda");
  const [ubicacionFiltro, setUbicacionFiltro] = useState<string>("todas");
  const [modalidadFiltro, setModalidadFiltro] = useState<string>("todas");
  const [search, setSearch] = useState<string>("");

  const [openNueva, setOpenNueva] = useState<boolean>(false);
  const [form, setForm] = useState<NuevaSesionForm>(FORM_EMPTY);

  const [editSesion, setEditSesion] = useState<CapacitacionSesion | null>(null);
  const [editForm, setEditForm] = useState<Partial<NuevaSesionForm>>({});

  const [cancelTarget, setCancelTarget] = useState<CapacitacionSesion | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ses, cat] = await Promise.all([
        getCapacitacionSesiones(),
        getCapacitaciones(),
      ]);
      setSesiones(ses);
      setCatalogo(cat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar sesiones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const ubicacionesUnicas = useMemo(() => {
    const set = new Set(sesiones.map((s) => s.ubicacion).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [sesiones]);

  const sesionesFiltradas = useMemo(() => {
    return sesiones.filter((s) => {
      if (ubicacionFiltro !== "todas" && s.ubicacion !== ubicacionFiltro) return false;
      if (modalidadFiltro !== "todas" && s.modalidad !== modalidadFiltro) return false;
      if (search.trim() && !s.titulo.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sesiones, ubicacionFiltro, modalidadFiltro, search]);

  const sesionesPorDia = useMemo(() => {
    const map: Record<number, CapacitacionSesion[]> = {};
    sesionesFiltradas.forEach((s) => {
      const day = Number(s.fecha.split("-")[2] || "1");
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sesionesFiltradas]);

  const handleCrearSesion = async () => {
    if (!form.capacitacionId || !form.titulo || !form.fecha) return;
    setSaving(true);
    try {
      await createCapacitacionSesion({
        capacitacionId: form.capacitacionId,
        titulo: form.titulo,
        fecha: form.fecha,
        horaInicio: form.horaInicio || null,
        horaFin: form.horaFin || null,
        modalidad: form.modalidad,
        ubicacion: form.ubicacion || null,
        cupos: form.cupos || null,
      });
      setOpenNueva(false);
      setForm(FORM_EMPTY);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear sesión");
    } finally {
      setSaving(false);
    }
  };

  const handleEditarSesion = async () => {
    if (!editSesion) return;
    setSaving(true);
    try {
      await updateCapacitacionSesion(editSesion.id, {
        titulo: editForm.titulo,
        fecha: editForm.fecha,
        horaInicio: editForm.horaInicio ?? null,
        horaFin: editForm.horaFin ?? null,
        modalidad: editForm.modalidad,
        ubicacion: editForm.ubicacion ?? null,
        cupos: editForm.cupos ?? null,
      });
      setEditSesion(null);
      setEditForm({});
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al editar sesión");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarSesion = async () => {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      await cambiarEstadoCapacitacionSesion(cancelTarget.id, { estado: "cancelada" });
      setCancelTarget(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar sesión");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: CapacitacionSesion) => {
    setEditSesion(s);
    setEditForm({
      titulo: s.titulo,
      fecha: s.fecha,
      horaInicio: s.horaInicio ?? "",
      horaFin: s.horaFin ?? "",
      modalidad: s.modalidad,
      ubicacion: s.ubicacion ?? "",
      cupos: s.cupos ?? 20,
    });
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* BREADCRUMB + SUB-NAV */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/dicaprev/trabajadores/dotacion" className="hover:text-slate-700 transition-colors">Trabajadores</Link>
          <span>›</span>
          <span className="text-slate-600 font-medium">Capacitaciones</span>
        </div>
        <div className="flex gap-0 border-b border-slate-200">
          <Link href="/dicaprev/capacitacion/calendario" className="px-4 py-2 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-700">Calendario</Link>
          <Link href="/dicaprev/capacitacion/historial" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Historial</Link>
          <Link href="/dicaprev/capacitacion/evaluaciones" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Evaluaciones</Link>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Calendario de Capacitaciones
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Programa sesiones de capacitación, asigna cupos por obra y controla participantes. Se conecta con historial, participación y evaluaciones.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200"
            onClick={() => setView(view === "agenda" ? "mes" : "agenda")}
          >
            Vista {view === "agenda" ? "mensual" : "agenda"}
          </Button>
          <Button className="rounded-xl" onClick={() => setOpenNueva(true)} disabled={loading}>
            Programar capacitación
          </Button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* FILTROS */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Select
                value={ubicacionFiltro}
                onValueChange={(value: string) => setUbicacionFiltro(value)}
              >
                <SelectTrigger className="w-[220px] h-9 bg-white rounded-xl text-xs">
                  <SelectValue placeholder="Ubicación / centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las ubicaciones</SelectItem>
                  {ubicacionesUnicas.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={modalidadFiltro}
                onValueChange={(value: string) => setModalidadFiltro(value)}
              >
                <SelectTrigger className="w-[160px] h-9 bg-white rounded-xl text-xs">
                  <SelectValue placeholder="Modalidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las modalidades</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="mixta">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Buscar por nombre del curso…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="h-9 text-xs bg-white rounded-xl md:w-72"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs
            value={view}
            onValueChange={(value: string) =>
              setView(value as "agenda" | "mes")
            }
          >
            <TabsList className="bg-transparent px-0 pt-0 pb-3 justify-start">
              <TabsTrigger value="agenda" className="rounded-full text-xs px-4 py-1.5">
                Agenda detallada
              </TabsTrigger>
              <TabsTrigger value="mes" className="rounded-full text-xs px-4 py-1.5">
                Vista mensual
              </TabsTrigger>
            </TabsList>

            {/* AGENDA */}
            <TabsContent value="agenda" className="pt-0">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Cargando sesiones…</p>
                </div>
              ) : sesionesFiltradas.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarOff className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Sin sesiones que coincidan</p>
                  <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o programa una nueva capacitación.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sesionesFiltradas
                    .slice()
                    .sort((a, b) => a.fecha.localeCompare(b.fecha))
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-slate-50 text-xs shrink-0">
                            <span className="font-semibold">
                              {s.fecha.split("-")[2]}
                            </span>
                            <span className="uppercase tracking-wide text-[9px]">
                              {new Date(s.fecha + "T00:00:00").toLocaleString("es-CL", {
                                month: "short",
                              })}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {s.titulo}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {s.capacitacionNombre}
                              {s.ubicacion ? ` · ${s.ubicacion}` : ""}
                              {s.horaInicio ? ` · ${s.horaInicio} hrs` : ""}
                              {s.cupos != null
                                ? ` · Cupos ${s.asistentesConfirmados ?? 0}/${s.cupos}`
                                : ""}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                              <Badge
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                  s.modalidad === "presencial"
                                    ? "bg-sky-50 text-sky-700 border border-sky-100"
                                    : s.modalidad === "online"
                                    ? "bg-violet-50 text-violet-700 border border-violet-100"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                }`}
                              >
                                {s.modalidad.charAt(0).toUpperCase() + s.modalidad.slice(1)}
                              </Badge>
                              <Badge
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                  s.estado === "cancelada"
                                    ? "bg-red-50 text-red-600 border border-red-100"
                                    : s.estado === "finalizada"
                                    ? "bg-slate-50 text-slate-500 border border-slate-100"
                                    : s.estado === "en_curso"
                                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                                    : "bg-cyan-50 text-cyan-700 border border-cyan-100"
                                }`}
                              >
                                {ESTADO_LABEL[s.estado]}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end shrink-0">
                          {s.estado !== "cancelada" && s.estado !== "finalizada" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-[11px]"
                                onClick={() => openEdit(s)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-[11px] text-red-600 border-red-100 hover:bg-red-50"
                                onClick={() => setCancelTarget(s)}
                              >
                                Cancelar sesión
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* VISTA MENSUAL */}
            <TabsContent value="mes" className="pt-0">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Cargando sesiones…</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                  <div className="grid grid-cols-7 border-b border-slate-100 text-[11px] text-slate-500 bg-slate-50/70">
                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                      <div key={d} className="px-2 py-1.5 text-center">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 text-[11px]">
                    {monthDays.map((day) => {
                      const events = sesionesPorDia[day] || [];
                      return (
                        <div
                          key={day}
                          className="min-h-[72px] border-b border-r border-slate-100 px-1.5 py-1.5 last:border-r-0"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-slate-700">{day}</span>
                            {events.length > 0 && (
                              <span className="text-[9px] text-slate-400">{events.length} cap.</span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {events.slice(0, 2).map((e) => (
                              <div
                                key={e.id}
                                className={`rounded-xl px-1 py-0.5 text-[9px] cursor-pointer ${
                                  e.estado === "cancelada"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-slate-900 text-slate-50"
                                }`}
                                title={e.titulo}
                              >
                                <span className="block truncate">{e.titulo}</span>
                              </div>
                            ))}
                            {events.length > 2 && (
                              <span className="text-[9px] text-slate-400">+{events.length - 2} más</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MODAL NUEVA SESIÓN */}
      <Dialog open={openNueva} onOpenChange={(open) => { if (!saving) setOpenNueva(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Programar nueva capacitación</DialogTitle>
            <DialogDescription>
              Completa los datos para crear una nueva sesión de capacitación en calendario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label className="text-xs">Curso (catálogo)</Label>
              <Select
                value={form.capacitacionId}
                onValueChange={(value) => {
                  const cap = catalogo.find((c) => c.id === value);
                  setForm((prev) => ({
                    ...prev,
                    capacitacionId: value,
                    titulo: cap ? cap.nombre : prev.titulo,
                    modalidad: cap ? cap.modalidad : prev.modalidad,
                  }));
                }}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Seleccionar curso…" />
                </SelectTrigger>
                <SelectContent>
                  {catalogo.filter((c) => c.activa).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Título de la sesión</Label>
              <Input
                className="h-8 text-xs rounded-xl"
                placeholder="Ej. Inducción general SST nuevos ingresos"
                value={form.titulo}
                onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  className="h-8 text-xs rounded-xl"
                  value={form.fecha}
                  onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora inicio</Label>
                <Input
                  type="time"
                  className="h-8 text-xs rounded-xl"
                  value={form.horaInicio}
                  onChange={(e) => setForm((prev) => ({ ...prev, horaInicio: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ubicación / centro de trabajo</Label>
              <Input
                className="h-8 text-xs rounded-xl"
                placeholder="Ej. Planta Quilicura, Obra Los Álamos…"
                value={form.ubicacion}
                onChange={(e) => setForm((prev) => ({ ...prev, ubicacion: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modalidad</Label>
                <Select
                  value={form.modalidad}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, modalidad: value }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cupos</Label>
                <Input
                  type="number"
                  className="h-8 text-xs rounded-xl"
                  value={form.cupos}
                  onChange={(e) => setForm((prev) => ({ ...prev, cupos: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setOpenNueva(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={handleCrearSesion}
              disabled={saving || !form.capacitacionId || !form.titulo || !form.fecha}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Crear sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR SESIÓN */}
      <Dialog open={!!editSesion} onOpenChange={(open) => { if (!saving && !open) { setEditSesion(null); setEditForm({}); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Editar sesión</DialogTitle>
            <DialogDescription>
              Actualiza los datos operativos de la sesión seleccionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label className="text-xs">Título de la sesión</Label>
              <Input
                className="h-8 text-xs rounded-xl"
                value={editForm.titulo ?? ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, titulo: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  className="h-8 text-xs rounded-xl"
                  value={editForm.fecha ?? ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora inicio</Label>
                <Input
                  type="time"
                  className="h-8 text-xs rounded-xl"
                  value={editForm.horaInicio ?? ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, horaInicio: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ubicación</Label>
              <Input
                className="h-8 text-xs rounded-xl"
                value={editForm.ubicacion ?? ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, ubicacion: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modalidad</Label>
                <Select
                  value={editForm.modalidad ?? "presencial"}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, modalidad: value }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cupos</Label>
                <Input
                  type="number"
                  className="h-8 text-xs rounded-xl"
                  value={editForm.cupos ?? 20}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, cupos: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setEditSesion(null); setEditForm({}); }} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" className="rounded-xl" onClick={handleEditarSesion} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR CANCELACIÓN */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!saving && !open) setCancelTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Cancelar sesión</DialogTitle>
            <DialogDescription>
              Confirma la cancelación definitiva de esta sesión de capacitación.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600 mt-1">
            ¿Confirmas cancelar la sesión <span className="font-medium">&quot;{cancelTarget?.titulo}&quot;</span>? Esta acción no puede revertirse.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCancelTarget(null)} disabled={saving}>
              Volver
            </Button>
            <Button size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleCancelarSesion} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Sí, cancelar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
