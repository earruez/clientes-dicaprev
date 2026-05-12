"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, Users } from "lucide-react";
import {
  getCapacitacionSesiones,
  getAsistenciasSesion,
  bootstrapAsistenciasSesion,
  registrarAsistenciaCapacitacion,
} from "@/actions/capacitaciones";
import type {
  CapacitacionSesion,
  AsistenciaCapacitacion,
  EstadoAsistencia,
} from "@/actions/capacitaciones";

const estadoConfig: Record<EstadoAsistencia, { label: string; className: string }> = {
  presente: {
    label: "Presente",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full",
  },
  ausente: {
    label: "Ausente",
    className: "bg-rose-50 text-rose-700 border border-rose-200 rounded-full",
  },
  justificado: {
    label: "Justificado",
    className: "bg-amber-50 text-amber-700 border border-amber-200 rounded-full",
  },
  parcial: {
    label: "Parcial",
    className: "bg-sky-50 text-sky-700 border border-sky-200 rounded-full",
  },
};

export default function ParticipacionCapacitacionPage() {
  const [sesiones, setSesiones] = useState<CapacitacionSesion[]>([]);
  const [sesionId, setSesionId] = useState<string>("");
  const [asistencias, setAsistencias] = useState<AsistenciaCapacitacion[]>([]);
  const [loadingSesiones, setLoadingSesiones] = useState(true);
  const [loadingAsistencias, setLoadingAsistencias] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapInfo, setBootstrapInfo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bootstrapAttemptedBySesion, setBootstrapAttemptedBySesion] = useState<Record<string, boolean>>({});

  const cargarSesiones = useCallback(async () => {
    setLoadingSesiones(true);
    setError(null);
    try {
      const data = await getCapacitacionSesiones();
      setSesiones(data);
      if (data.length > 0 && !sesionId) {
        setSesionId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar sesiones");
    } finally {
      setLoadingSesiones(false);
    }
  }, [sesionId]);

  const cargarAsistencias = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingAsistencias(true);
    setSelectedIds([]);
    setError(null);
    setBootstrapInfo(null);
    try {
      let data = await getAsistenciasSesion(id);

      if (data.length === 0 && !bootstrapAttemptedBySesion[id]) {
        setBootstrapAttemptedBySesion((prev) => ({ ...prev, [id]: true }));
        const bootstrapResult = await bootstrapAsistenciasSesion(id);

        if (bootstrapResult.created > 0) {
          data = await getAsistenciasSesion(id);
          setBootstrapInfo(
            `Se cargaron ${bootstrapResult.created} registros iniciales de asistencia desde asignaciones reales.`,
          );
        }
      }

      setAsistencias(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar asistencias");
    } finally {
      setLoadingAsistencias(false);
    }
  }, [bootstrapAttemptedBySesion]);

  useEffect(() => {
    cargarSesiones();
  }, [cargarSesiones]);

  useEffect(() => {
    if (sesionId) cargarAsistencias(sesionId);
  }, [sesionId, cargarAsistencias]);

  const sesionActual = useMemo(
    () => sesiones.find((s) => s.id === sesionId),
    [sesiones, sesionId]
  );

  const filtrados = useMemo(() => {
    return asistencias.filter((a) =>
      !search.trim() || a.trabajadorNombre.toLowerCase().includes(search.toLowerCase())
    );
  }, [asistencias, search]);

  const stats = useMemo(() => {
    const total = asistencias.length;
    const presentes = asistencias.filter((a) => a.estadoAsistencia === "presente").length;
    const pct = total === 0 ? 0 : Math.round((presentes / total) * 100);
    return { total, presentes, pct };
  }, [asistencias]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const actualizarEstadoSeleccionados = async (estado: EstadoAsistencia) => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const targets = asistencias.filter((a) => selectedIds.includes(a.id));
      await Promise.all(
        targets.map((a) =>
          registrarAsistenciaCapacitacion({
            sesionId: a.sesionId,
            trabajadorId: a.trabajadorId,
            estadoAsistencia: estado,
          })
        )
      );
      setSelectedIds([]);
      await cargarAsistencias(sesionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar asistencia");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Participación en Capacitaciones
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Gestiona asistencia, confirma inscritos y obtiene indicadores de
            participación, todo conectado con el historial por trabajador.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-xl">Descargar lista de firma</Button>
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

      {bootstrapInfo && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{bootstrapInfo}</span>
          <button className="ml-auto text-xs underline" onClick={() => setBootstrapInfo(null)}>Cerrar</button>
        </div>
      )}

      {/* RESUMEN SESIÓN */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Sesión seleccionada</p>
              {loadingSesiones ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cargando sesiones…
                </div>
              ) : (
                <Select
                  value={sesionId}
                  onValueChange={(value: string) => setSesionId(value)}
                >
                  <SelectTrigger className="w-[360px] h-8 bg-white rounded-xl text-xs">
                    <SelectValue placeholder="Seleccionar sesión…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sesiones.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.titulo}
                        {s.fecha ? ` · ${s.fecha.slice(0, 10)}` : ""}
                        {s.horaInicio ? ` ${s.horaInicio}` : ""}
                        {s.ubicacion ? ` · ${s.ubicacion}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {sesionActual && (
              <div className="grid grid-cols-3 gap-3 text-xs w-full md:w-auto">
                <div>
                  <p className="text-slate-500">Registros</p>
                  <p className="text-slate-900 font-semibold">
                    {stats.total}{sesionActual.cupos != null ? `/${sesionActual.cupos}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Presentes</p>
                  <p className="text-slate-900 font-semibold">{stats.presentes}</p>
                </div>
                <div>
                  <p className="text-slate-500">Asistencia real</p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-semibold">{stats.pct}%</span>
                    <Progress value={stats.pct} className="h-1.5 rounded-full flex-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <Input
              placeholder="Buscar por nombre del trabajador…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="h-8 text-xs bg-white rounded-xl md:w-80"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <Button
                size="sm"
                className="rounded-xl"
                disabled={selectedIds.length === 0 || saving}
                onClick={() => actualizarEstadoSeleccionados("presente")}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Marcar presente
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedIds.length === 0 || saving}
                onClick={() => actualizarEstadoSeleccionados("ausente")}
              >
                Marcar ausente
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedIds.length === 0 || saving}
                onClick={() => actualizarEstadoSeleccionados("justificado")}
              >
                Justificado
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedIds.length === 0 || saving}
                onClick={() => actualizarEstadoSeleccionados("parcial")}
              >
                Parcial
              </Button>
            </div>
          </div>

          {/* TABLA ASISTENCIAS */}
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 w-8">
                    <Checkbox
                      checked={filtrados.length > 0 && selectedIds.length === filtrados.length}
                      onCheckedChange={(value: boolean | "indeterminate") =>
                        setSelectedIds(value ? filtrados.map((a) => a.id) : [])
                      }
                    />
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Trabajador</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Estado asistencia</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Observación</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Registrado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loadingAsistencias ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-xs">Cargando asistencias…</span>
                      </div>
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <Users className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                      <p className="text-sm font-medium text-slate-500">Sin registros de asistencia</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {sesionId
                          ? "No hay asistencias registradas para esta sesión."
                          : "Selecciona una sesión para ver su asistencia."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtrados.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedIds.includes(a.id)}
                          onCheckedChange={() => toggleSelected(a.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-800 font-medium">{a.trabajadorNombre}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-[11px] ${estadoConfig[a.estadoAsistencia].className}`}>
                          {estadoConfig[a.estadoAsistencia].label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{a.observacion ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {a.registradoEn ? new Date(a.registradoEn).toLocaleDateString("es-CL") : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2">
                          Ver historial
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400">
            * Los cambios de asistencia se reflejan automáticamente en{" "}
            <span className="font-medium">Historial</span> y en los indicadores del Dashboard DS44.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
