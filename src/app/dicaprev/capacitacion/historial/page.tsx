"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ClipboardList, Loader2 } from "lucide-react";
import { getCapacitacionHistorial } from "@/actions/capacitaciones";
import type { CapacitacionHistorialEvento } from "@/actions/capacitaciones/types";

const ESTADO_STYLE: Record<string, { label: string; className: string }> = {
  vigente: { label: "Vigente", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full" },
  vencido: { label: "Vencido", className: "bg-rose-50 text-rose-700 border border-rose-200 rounded-full" },
  aprobado: { label: "Aprobado", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full" },
  reprobado: { label: "Reprobado", className: "bg-rose-50 text-rose-700 border border-rose-200 rounded-full" },
  pendiente: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border border-amber-200 rounded-full" },
  completado: { label: "Completado", className: "bg-sky-50 text-sky-700 border border-sky-200 rounded-full" },
  cancelado: { label: "Cancelado", className: "bg-slate-100 text-slate-600 border border-slate-200 rounded-full" },
};

function estadoBadge(estado: string | null) {
  if (!estado) return null;
  const style = ESTADO_STYLE[estado] ?? { label: estado, className: "bg-slate-100 text-slate-600 border border-slate-200 rounded-full" };
  return <span className={`px-2 py-0.5 text-[11px] ${style.className}`}>{style.label}</span>;
}

function formatTipoEvento(tipo: string) {
  return tipo.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HistorialCapacitacionPage() {
  const [registros, setRegistros] = useState<CapacitacionHistorialEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [openFicha, setOpenFicha] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<string>("");

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCapacitacionHistorial();
      setRegistros(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar historial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (
        search.trim() &&
        !(
          r.trabajadorNombre.toLowerCase().includes(search.toLowerCase()) ||
          r.trabajadorRut.toLowerCase().includes(search.toLowerCase())
        )
      ) return false;
      if (estadoFiltro !== "todos" && r.estado !== estadoFiltro) return false;
      return true;
    });
  }, [registros, search, estadoFiltro]);

  const resumen = useMemo(() => {
    const total = registros.length;
    const vigentes = registros.filter((r) => r.estado === "vigente" || r.estado === "aprobado").length;
    const vencidos = registros.filter((r) => r.estado === "vencido" || r.estado === "reprobado").length;
    const pendientes = registros.filter((r) => !r.estado || r.estado === "pendiente").length;
    return { total, vigentes, vencidos, pendientes };
  }, [registros]);

  const fichaRegistros = useMemo(
    () => registros.filter((r) => r.trabajadorId === trabajadorSeleccionado),
    [registros, trabajadorSeleccionado],
  );

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
          <Link href="/dicaprev/capacitacion/calendario" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Calendario</Link>
          <Link href="/dicaprev/capacitacion/historial" className="px-4 py-2 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-700">Historial</Link>
          <Link href="/dicaprev/capacitacion/evaluaciones" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Evaluaciones</Link>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Historial de Capacitaciones</h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Registro completo de eventos por trabajador — vigencias, notas y estado de cumplimiento. Útil para auditorías, organismos administradores y DS44.
          </p>
        </div>
        <Button className="rounded-xl">Exportar a Excel</Button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Registros totales</p>
            <p className="text-2xl font-semibold text-slate-900">{resumen.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Vigentes / Aprobados</p>
            <p className="text-2xl font-semibold text-emerald-700">{resumen.vigentes}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Vencidos / Reprobados</p>
            <p className="text-2xl font-semibold text-rose-700">{resumen.vencidos}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Pendientes</p>
            <p className="text-2xl font-semibold text-amber-700">{resumen.pendientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS + TABLA */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Input
              placeholder="Buscar por nombre o RUT…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="h-8 text-xs bg-white rounded-xl md:w-72"
            />
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="h-8 text-xs rounded-xl w-[170px] bg-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="reprobado">Reprobado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Trabajador</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">RUT</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Cargo</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Curso</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Tipo evento</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Detalle</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Fecha</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Vigencia hasta</th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400">Cargando historial…</p>
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <ClipboardList className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                      <p className="text-sm font-medium text-slate-500">Sin registros que coincidan</p>
                      <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o busca por nombre del trabajador.</p>
                    </td>
                  </tr>
                ) : (
                  filtrados.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2 text-slate-800">{r.trabajadorNombre}</td>
                      <td className="px-3 py-2 text-slate-600">{r.trabajadorRut || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{r.trabajadorCargo || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{r.capacitacionNombre}</td>
                      <td className="px-3 py-2 text-slate-600">{formatTipoEvento(r.tipoEvento)}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate" title={r.detalle ?? ""}>{r.detalle || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{r.fechaEvento}</td>
                      <td className="px-3 py-2 text-slate-600">{r.vigenciaHasta || "—"}</td>
                      <td className="px-3 py-2">{estadoBadge(r.estado)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] px-2"
                          onClick={() => { setTrabajadorSeleccionado(r.trabajadorId); setOpenFicha(true); }}
                        >
                          Ver ficha
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FICHA TRABAJADOR */}
      <Dialog open={openFicha} onOpenChange={setOpenFicha}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Ficha de capacitación del trabajador</DialogTitle>
            <DialogDescription>
              Resumen histórico de eventos de capacitación asociados al trabajador seleccionado.
            </DialogDescription>
          </DialogHeader>
          {fichaRegistros.length > 0 ? (
            <div className="space-y-3 mt-1">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                <p className="text-slate-500 mb-1">Trabajador</p>
                <p className="font-medium text-slate-900">{fichaRegistros[0].trabajadorNombre} · {fichaRegistros[0].trabajadorRut}</p>
                <p className="text-slate-500 mt-2">Cargo</p>
                <p className="text-slate-800">{fichaRegistros[0].trabajadorCargo || "—"}</p>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-slate-100 bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">Curso</th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">Tipo evento</th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">Fecha</th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">Vigencia</th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichaRegistros.map((r) => (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="px-3 py-2 text-slate-800">{r.capacitacionNombre}</td>
                        <td className="px-3 py-2 text-slate-600">{formatTipoEvento(r.tipoEvento)}</td>
                        <td className="px-3 py-2 text-slate-600">{r.fechaEvento}</td>
                        <td className="px-3 py-2 text-slate-600">{r.vigenciaHasta || "—"}</td>
                        <td className="px-3 py-2">{estadoBadge(r.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button size="sm" className="rounded-xl text-[11px]">Descargar ficha en PDF</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No se encontraron registros para este trabajador.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
