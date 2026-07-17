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
import { Progress } from "@/components/ui/progress";
import { AlertCircle, BarChart2, Loader2 } from "lucide-react";
import {
  getCapacitacionEvaluaciones,
  createCapacitacionEvaluacion,
  registrarResultadoEvaluacion,
  getCapacitaciones,
} from "@/actions/capacitaciones";
import { getTrabajadores } from "@/actions/trabajadores";
import type {
  CapacitacionEvaluacion,
  CapacitacionCatalogo,
} from "@/actions/capacitaciones/types";
import type { Worker } from "@/actions/trabajadores";

type NuevaForm = {
  trabajadorId: string;
  capacitacionId: string;
  nota: string;
  aprobado: string;
  fechaEvaluacion: string;
  observacion: string;
};

const FORM_EMPTY: NuevaForm = {
  trabajadorId: "",
  capacitacionId: "",
  nota: "",
  aprobado: "",
  fechaEvaluacion: "",
  observacion: "",
};

export default function EvaluacionesCapacitacionPage() {
  const [evaluaciones, setEvaluaciones] = useState<CapacitacionEvaluacion[]>([]);
  const [catalogo, setCatalogo] = useState<CapacitacionCatalogo[]>([]);
  const [trabajadores, setTrabajadores] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [selectedEval, setSelectedEval] = useState<CapacitacionEvaluacion | null>(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [openNueva, setOpenNueva] = useState(false);
  const [form, setForm] = useState<NuevaForm>(FORM_EMPTY);

  // Resultado inline por evaluación
  const [editResultado, setEditResultado] = useState<{
    id: string; nota: string; aprobado: string; observacion: string;
  } | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evals, cat, trab] = await Promise.all([
        getCapacitacionEvaluaciones(),
        getCapacitaciones(),
        getTrabajadores(),
      ]);
      setEvaluaciones(evals);
      setCatalogo(cat);
      setTrabajadores(trab);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Agrupar por capacitación para mostrar resumen
  const porCapacitacion = useMemo(() => {
    const map = new Map<string, { nombre: string; lista: CapacitacionEvaluacion[] }>();
    for (const ev of evaluaciones) {
      if (!map.has(ev.capacitacionId)) {
        map.set(ev.capacitacionId, { nombre: ev.capacitacionNombre, lista: [] });
      }
      map.get(ev.capacitacionId)!.lista.push(ev);
    }
    return Array.from(map.values());
  }, [evaluaciones]);

  const filtradas = useMemo(() => {
    if (!search.trim()) return porCapacitacion;
    return porCapacitacion.filter((g) =>
      g.nombre.toLowerCase().includes(search.toLowerCase())
    );
  }, [porCapacitacion, search]);

  const handleCrearEval = async () => {
    if (!form.trabajadorId || !form.capacitacionId || !form.fechaEvaluacion) return;
    setSaving(true);
    setError(null);
    try {
      await createCapacitacionEvaluacion({
        trabajadorId: form.trabajadorId,
        capacitacionId: form.capacitacionId,
        nota: form.nota ? Number(form.nota) : null,
        aprobado: form.aprobado === "true" ? true : form.aprobado === "false" ? false : null,
        fechaEvaluacion: form.fechaEvaluacion,
        observacion: form.observacion || null,
      });
      setForm(FORM_EMPTY);
      setOpenNueva(false);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear evaluación");
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarResultado = async () => {
    if (!editResultado) return;
    setSaving(true);
    setError(null);
    try {
      await registrarResultadoEvaluacion(editResultado.id, {
        nota: editResultado.nota ? Number(editResultado.nota) : 0,
        aprobado: editResultado.aprobado === "true",
        observacion: editResultado.observacion || null,
      });
      setEditResultado(null);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar resultado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* BREADCRUMB + SUB-NAV */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/dicaprev/trabajadores" className="hover:text-slate-700 transition-colors">Trabajadores</Link>
          <span>›</span>
          <span className="text-slate-600 font-medium">Capacitaciones</span>
        </div>
        <div className="flex gap-0 border-b border-slate-200">
          <Link href="/dicaprev/capacitacion/calendario" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Calendario</Link>
          <Link href="/dicaprev/capacitacion/historial" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Historial</Link>
          <Link href="/dicaprev/capacitacion/evaluaciones" className="px-4 py-2 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-700">Evaluaciones</Link>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Evaluaciones y Notas</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Registra y sigue los resultados de evaluaciones teóricas y prácticas. Los porcentajes de aprobación quedan disponibles como evidencia.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200">
            Descargar reporte consolidado
          </Button>
          <Button className="rounded-xl" onClick={() => setOpenNueva(true)} disabled={loading}>
            Crear evaluación
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

      {/* LISTA EVALUACIONES */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Input
              placeholder="Buscar por nombre de curso…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="h-8 text-xs bg-white rounded-xl md:w-72"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Cargando evaluaciones…</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart2 className="mx-auto h-9 w-9 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Sin evaluaciones que coincidan</p>
              <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o crea una nueva evaluación.</p>
            </div>
          ) : (
            filtradas.map((grupo) => {
              const total = grupo.lista.length;
              const aprobados = grupo.lista.filter((e) => e.aprobado === true).length;
              const aprobPct = total === 0 ? 0 : Math.round((aprobados / total) * 100);
              return (
                <div
                  key={grupo.nombre}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xs"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">{grupo.nombre}</p>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <Badge className="bg-slate-900 text-slate-50 rounded-full">
                        {total} registros
                      </Badge>
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                        {aprobados} aprobados
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Aprobación</span>
                        <span className="text-sm font-semibold text-slate-900">{aprobPct}%</span>
                      </div>
                      <Progress value={aprobPct} className="h-1.5 rounded-full min-w-[120px]" />
                      <p className="text-[11px] text-slate-500">{aprobados}/{total} trabajadores aprobados</p>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-[11px]"
                        onClick={() => {
                          setSelectedEval(grupo.lista[0]);
                          setOpenDetalle(true);
                        }}
                      >
                        Ver resultados
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* MODAL DETALLE EVALUACION */}
      <Dialog open={openDetalle} onOpenChange={(open) => { if (!open) { setOpenDetalle(false); setEditResultado(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Resultados de evaluación</DialogTitle>
            <DialogDescription>
              Revisa el detalle de resultados por trabajador para la capacitación seleccionada.
            </DialogDescription>
          </DialogHeader>
          {selectedEval && (() => {
            const capEvals = evaluaciones.filter(
              (e) => e.capacitacionId === selectedEval.capacitacionId
            );
            const aprobados = capEvals.filter((e) => e.aprobado === true).length;
            return (
              <div className="space-y-3 mt-1">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                  <p className="text-slate-500 mb-1">Curso</p>
                  <p className="font-medium text-slate-900">{selectedEval.capacitacionNombre}</p>
                </div>

                <Tabs defaultValue="tabla" className="w-full">
                  <TabsList className="bg-transparent px-0 pb-2 justify-start">
                    <TabsTrigger value="tabla" className="rounded-full text-xs px-4 py-1.5">
                      Tabla de resultados
                    </TabsTrigger>
                    <TabsTrigger value="resumen" className="rounded-full text-xs px-4 py-1.5">
                      Resumen
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tabla">
                    <div className="w-full overflow-x-auto rounded-xl border border-slate-100 bg-white">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                          <tr>
                            <th className="text-left px-3 py-2 text-[11px] text-slate-500">Trabajador</th>
                            <th className="text-left px-3 py-2 text-[11px] text-slate-500">Fecha</th>
                            <th className="text-left px-3 py-2 text-[11px] text-slate-500">Nota</th>
                            <th className="text-left px-3 py-2 text-[11px] text-slate-500">Estado</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {capEvals.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-xs text-slate-500 py-4">
                                Sin resultados registrados.
                              </td>
                            </tr>
                          ) : (
                            capEvals.map((r) => (
                              <tr key={r.id} className="border-b border-slate-50">
                                <td className="px-3 py-2 text-slate-800">{r.trabajadorNombre}</td>
                                <td className="px-3 py-2 text-slate-600">{r.fechaEvaluacion}</td>
                                <td className="px-3 py-2 text-slate-800">
                                  {r.nota != null ? r.nota.toFixed(1) : "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {r.aprobado != null ? (
                                    <Badge className={`rounded-full px-2 py-0.5 text-[11px] ${r.aprobado ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                                      {r.aprobado ? "Aprobado" : "Reprobado"}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">Pendiente</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[11px] px-2"
                                    onClick={() => setEditResultado({
                                      id: r.id,
                                      nota: r.nota != null ? String(r.nota) : "",
                                      aprobado: r.aprobado != null ? String(r.aprobado) : "",
                                      observacion: r.observacion ?? "",
                                    })}
                                  >
                                    Editar
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="resumen">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <Card className="border-slate-200 shadow-sm rounded-xl">
                        <CardContent className="p-3 space-y-1">
                          <p className="text-slate-500">Total evaluados</p>
                          <p className="text-xl font-semibold text-slate-900">{capEvals.length}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-slate-200 shadow-sm rounded-xl">
                        <CardContent className="p-3 space-y-1">
                          <p className="text-slate-500">Aprobados</p>
                          <p className="text-xl font-semibold text-emerald-700">{aprobados}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-400">
                      * Esta vista se conectará con la generación automática de certificados y el historial del trabajador.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
          <DialogFooter className="mt-4">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setOpenDetalle(false); setEditResultado(null); }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR RESULTADO */}
      <Dialog open={!!editResultado} onOpenChange={(open) => { if (!saving && !open) setEditResultado(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Registrar resultado</DialogTitle>
            <DialogDescription>
              Actualiza nota, estado y observación del resultado seleccionado.
            </DialogDescription>
          </DialogHeader>
          {editResultado && (
            <div className="space-y-3 mt-1">
              <div className="space-y-1">
                <Label className="text-xs">Nota</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="7"
                  className="h-8 text-xs rounded-xl"
                  value={editResultado.nota}
                  onChange={(e) => setEditResultado((prev) => prev ? { ...prev, nota: e.target.value } : null)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select
                  value={editResultado.aprobado}
                  onValueChange={(value) => setEditResultado((prev) => prev ? { ...prev, aprobado: value } : null)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aprobado</SelectItem>
                    <SelectItem value="false">Reprobado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observación</Label>
                <Input
                  className="h-8 text-xs rounded-xl"
                  value={editResultado.observacion}
                  onChange={(e) => setEditResultado((prev) => prev ? { ...prev, observacion: e.target.value } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditResultado(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" className="rounded-xl" onClick={handleGuardarResultado} disabled={saving || !editResultado?.aprobado}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Guardar resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NUEVA EVALUACION */}
      <Dialog open={openNueva} onOpenChange={(open) => { if (!saving) setOpenNueva(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Crear nueva evaluación</DialogTitle>
            <DialogDescription>
              Registra una evaluación para trabajador y curso con sus datos iniciales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label className="text-xs">Trabajador</Label>
              <Select value={form.trabajadorId} onValueChange={(value) => setForm((prev) => ({ ...prev, trabajadorId: value }))}>
                <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue placeholder="Seleccionar trabajador…" /></SelectTrigger>
                <SelectContent>
                  {trabajadores.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nombre} {t.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Curso (catálogo)</Label>
              <Select value={form.capacitacionId} onValueChange={(value) => setForm((prev) => ({ ...prev, capacitacionId: value }))}>
                <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue placeholder="Seleccionar curso…" /></SelectTrigger>
                <SelectContent>
                  {catalogo.filter((c) => c.activa).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nota</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="7"
                  className="h-8 text-xs rounded-xl"
                  value={form.nota}
                  onChange={(e) => setForm((prev) => ({ ...prev, nota: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={form.aprobado} onValueChange={(value) => setForm((prev) => ({ ...prev, aprobado: value }))}>
                  <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue placeholder="Resultado…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Aprobado</SelectItem>
                    <SelectItem value="false">Reprobado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha evaluación</Label>
              <Input
                type="date"
                className="h-8 text-xs rounded-xl"
                value={form.fechaEvaluacion}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaEvaluacion: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observación</Label>
              <Input
                className="h-8 text-xs rounded-xl"
                placeholder="Opcional"
                value={form.observacion}
                onChange={(e) => setForm((prev) => ({ ...prev, observacion: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setOpenNueva(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={handleCrearEval}
              disabled={saving || !form.trabajadorId || !form.capacitacionId || !form.fechaEvaluacion}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Crear evaluación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
