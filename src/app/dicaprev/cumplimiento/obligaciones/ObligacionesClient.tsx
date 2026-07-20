"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
  Search,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Minus,
  Building2,
  CalendarDays,
  X,
  Cpu,
  FileText,
  Users,
} from "lucide-react";
import type { EstadoObligacion } from "../types";
import {
  actualizarEstadoObligacionEmpresa,
  getObligacionesCumplimientoEmpresa,
  type CumplimientoEmpresaPayload,
  type ObligacionCumplimientoReal,
  type EstadoManualObligacion,
} from "./actions";
import { calcularTamañoEmpresa, type TamanoEmpresa } from "@/lib/cumplimiento/cumplimiento-engine";
import { cn } from "@/lib/utils";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import Ds44SectionNav from "@/app/dicaprev/ds44/Ds44SectionNav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TAMANO_CFG: Record<TamanoEmpresa, { label: string; cls: string }> = {
  micro: { label: "Micro", cls: "bg-slate-100 text-slate-700 border border-slate-200" },
  pequena: { label: "Pequena", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  mediana: { label: "Mediana", cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  grande: { label: "Grande", cls: "bg-violet-100 text-violet-700 border border-violet-200" },
};

const ESTADO_OBLIGACION_CFG: Record<
  EstadoObligacion,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  cumplida: {
    label: "Cumplida",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  con_brechas: {
    label: "Con brechas",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  no_cumplida: {
    label: "No cumplida",
    cls: "bg-rose-50 text-rose-700 border border-rose-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  no_aplica: {
    label: "No aplica",
    cls: "bg-slate-100 text-slate-500 border border-slate-200",
    icon: <Minus className="h-3.5 w-3.5" />,
  },
};

const globalBarColor = (pct: number) => {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-rose-500";
};

const formateaFecha = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

function ObligacionDrawer({
  obligacion,
  centros,
  onClose,
}: {
  obligacion: ObligacionCumplimientoReal;
  centros: Array<{ id: string; nombre: string }>;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Detalle de obligacion
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900 leading-snug">
              {obligacion.nombre}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Cumplimiento global
            </p>
            <div className="flex items-center gap-3">
              <Progress value={obligacion.cumplimientoGlobal} className="flex-1 h-2" />
              <span className="text-sm font-semibold text-slate-800 w-10 text-right">
                {obligacion.cumplimientoGlobal}%
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { label: "Tipo", value: obligacion.tipo },
              { label: "Fuente", value: obligacion.fuenteTipo === "documento" ? "Documental real" : "Manual" },
              { label: "Estado documental", value: obligacion.estadoDocumental },
              { label: "Responsable", value: obligacion.responsable },
              { label: "Vencimiento", value: formateaFecha(obligacion.vencimiento) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-medium text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Descripción
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{obligacion.descripcion}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Estado por centro de trabajo
            </p>
            <div className="space-y-2">
              {centros.map((c) => {
                const estado: EstadoObligacion = obligacion.estadosPorCentro[c.id] ?? "no_aplica";
                const cfg = ESTADO_OBLIGACION_CFG[estado];
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      {c.nombre}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                          cfg.cls
                        }
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              Estado calculado con la última evidencia documental disponible.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function ObligacionesClient({
  data,
  contexto = "cumplimiento",
}: {
  data: CumplimientoEmpresaPayload;
  contexto?: "cumplimiento" | "ds44";
}) {
  const [obligaciones, setObligaciones] = useState<ObligacionCumplimientoReal[]>(data.obligaciones);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoObligacion>("todos");
  const [selected, setSelected] = useState<ObligacionCumplimientoReal | null>(null);
  const [openEstadoModal, setOpenEstadoModal] = useState(false);
  const [estadoTarget, setEstadoTarget] = useState<ObligacionCumplimientoReal | null>(null);
  const [manualEstado, setManualEstado] = useState<EstadoManualObligacion>("en_revision");
  const [manualObservacion, setManualObservacion] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);

  const tamanoEmpresa = calcularTamañoEmpresa(data.cantidadTrabajadores);

  const obligacionesVivas = obligaciones;

  async function guardarEstadoManual() {
    if (!estadoTarget) return;
    try {
      setGuardandoEstado(true);
      await actualizarEstadoObligacionEmpresa(estadoTarget.obligacionClave, {
        estado: manualEstado,
        observacion: manualObservacion,
      });
      const recargado = await getObligacionesCumplimientoEmpresa();
      setObligaciones(recargado.obligaciones);
      setOpenEstadoModal(false);
      setEstadoTarget(null);
      setManualObservacion("");
    } finally {
      setGuardandoEstado(false);
    }
  }

  function abrirModalEstado(ob: ObligacionCumplimientoReal) {
    setEstadoTarget(ob);
    setManualEstado(ob.manualEstado ?? "en_revision");
    setManualObservacion(ob.manualObservacion ?? "");
    setOpenEstadoModal(true);
  }

  const cumplidas = obligacionesVivas.filter((o) => o.cumplimientoGlobal >= 80).length;
  const conBrechas = obligacionesVivas.filter(
    (o) => o.cumplimientoGlobal >= 50 && o.cumplimientoGlobal < 80
  ).length;
  const noCumplidas = obligacionesVivas.filter((o) => o.cumplimientoGlobal < 50).length;

  const totalConBase = obligacionesVivas.filter((o) => o.estadoObligacion !== "no_aplica").length;
  const promedioGlobal =
    totalConBase > 0
      ? Math.round(
          obligacionesVivas
            .filter((o) => o.estadoObligacion !== "no_aplica")
            .reduce((s, o) => s + o.cumplimientoGlobal, 0) / totalConBase
        )
      : 0;

  const filtradas = useMemo(() => {
    return obligacionesVivas.filter((o) => {
      const txt = search.toLowerCase();
      const coincideTexto =
        txt.length === 0 ||
        o.nombre.toLowerCase().includes(txt) ||
        o.tipo.toLowerCase().includes(txt) ||
        o.responsable.toLowerCase().includes(txt);

      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "cumplida" && o.cumplimientoGlobal >= 80) ||
        (filtroEstado === "con_brechas" && o.cumplimientoGlobal >= 50 && o.cumplimientoGlobal < 80) ||
        (filtroEstado === "no_cumplida" && o.cumplimientoGlobal < 50);

      return coincideTexto && coincideEstado;
    });
  }, [obligacionesVivas, search, filtroEstado]);

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel={contexto === "ds44" ? "DS44" : "Cumplimiento"}
          title={contexto === "ds44" ? "Obligaciones aplicables DS44" : "Obligaciones DS44"}
          description={contexto === "ds44"
            ? "Estado real de obligaciones aplicables a la empresa, calculadas desde el motor de cumplimiento y usadas para alimentar el avance DS44."
            : "Estado real documental de obligaciones empresa, con reglas de aplicabilidad por cantidad de trabajadores."}
          icon={FileText}
        />

        {contexto === "ds44" ? (
          <>
            <Ds44SectionNav />
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 shadow-sm">
              Estas obligaciones se calculan desde el motor de cumplimiento y alimentan el avance del módulo DS44.
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-sm">
            <p>Esta vista ahora forma parte del flujo DS44. Puedes acceder desde DS44 &gt; Obligaciones.</p>
            <Button asChild variant="outline" className="rounded-2xl border-blue-200 bg-white font-semibold text-blue-800">
              <Link href="/dicaprev/ds44/obligaciones">Ir a Obligaciones DS44</Link>
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <Users className="h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Dotacion: <strong>{data.cantidadTrabajadores} trabajadores</strong>
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              TAMANO_CFG[tamanoEmpresa].cls
            )}
          >
            Empresa {TAMANO_CFG[tamanoEmpresa].label}
          </span>
          {data.noAplican > 0 ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
              {data.noAplican} obligacion{data.noAplican !== 1 ? "es" : ""} no aplican a esta dotacion
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Cumplimiento global",
              value: `${promedioGlobal}%`,
              sub: "Promedio sobre obligaciones aplicables",
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Cumplidas >= 80%",
              value: cumplidas,
              sub: "Obligaciones en nivel aceptable",
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Con brechas 50-79%",
              value: conBrechas,
              sub: "Requieren seguimiento",
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "No cumplidas < 50%",
              value: noCumplidas,
              sub: "Prioridad de regularizacion",
              cls: "from-rose-50 to-rose-100 text-rose-700",
            },
          ].map((kpi) => (
            <Card
              key={kpi.label}
              className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}
            >
              <CardContent className="pt-5 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide">{kpi.label}</p>
                <p className="mt-1 text-3xl font-semibold">{kpi.value}</p>
                <p className="mt-1 text-[11px] opacity-80">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar obligacion, tipo o responsable..."
                className="pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}>
              <SelectTrigger className="w-full sm:w-48 text-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="cumplida">Cumplida (&gt;= 80%)</SelectItem>
                <SelectItem value="con_brechas">Con brechas (50-79%)</SelectItem>
                <SelectItem value="no_cumplida">No cumplida (&lt; 50%)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="py-3 text-left pl-2">Obligacion</th>
                    <th className="py-3 text-left">Tipo</th>
                    <th className="py-3 text-left">Responsable</th>
                    <th className="py-3 text-left">Vencimiento</th>
                    <th className="py-3 text-left">Estado documental</th>
                    <th className="py-3 text-left">Estado estructura</th>
                    <th className="py-3 text-left w-36">Cumplimiento</th>
                    <th className="py-3 text-right pr-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((ob) => (
                    <tr
                      key={ob.id}
                      className="border-b last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => setSelected(ob)}
                    >
                      <td className="py-3 pl-2 font-medium text-slate-900 max-w-xs">
                        {ob.nombre}
                        {ob.aplicaDesdeTrabajadores != null ? (
                          <span className={[
                            "mt-1 block text-[10px] font-medium",
                            ob.aplicaDesdeTrabajadores <= 1 ? "text-emerald-600" : "text-slate-500",
                          ].join(" ")}>
                            {ob.aplicaDesdeTrabajadores <= 1
                              ? "Aplica a toda empresa"
                              : `Aplica desde ${ob.aplicaDesdeTrabajadores} trabajadores`}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 text-slate-500 text-xs">{ob.tipo}</td>
                      <td className="py-3 text-slate-600">{ob.responsable}</td>
                      <td className="py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-slate-400" />
                          {formateaFecha(ob.vencimiento)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {ob.estadoDocumental}
                        </span>
                      </td>
                      <td className="py-3">
                        {ob.tipoObligacion === "documental" ? (
                          <span className="text-xs text-slate-400">N/A</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            {ob.manualEstado === "cumple"
                              ? "Cumple"
                              : ob.manualEstado === "no_cumple"
                                ? "No cumple"
                                : "En revisión"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${globalBarColor(ob.cumplimientoGlobal)}`}
                              style={{ width: `${ob.cumplimientoGlobal}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-8 text-right">
                            {ob.cumplimientoGlobal}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {data.puedeEditarEstado && ob.tipoObligacion !== "documental" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirModalEstado(ob);
                              }}
                            >
                              Actualizar estado
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(ob);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <FileText className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                        <p className="text-sm font-medium text-slate-500">Sin obligaciones que coincidan</p>
                        <p className="text-xs text-slate-400 mt-1">Ajusta los filtros para ver otras obligaciones DS44.</p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Estado por centro de trabajo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.centros.map((c) => {
              const estados = obligacionesVivas.map(
                (o) => o.estadosPorCentro[c.id] ?? "no_aplica"
              );
              const cumplidasCentro = estados.filter((e) => e === "cumplida").length;
              const total = estados.filter((e) => e !== "no_aplica").length;
              const pct = total > 0 ? Math.round((cumplidasCentro / total) * 100) : 0;
              return (
                <Card key={c.id} className="border border-slate-200 bg-white shadow-sm">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-medium text-slate-800 leading-snug">{c.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Progress value={pct} className="flex-1 h-1.5" />
                      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-3">
                      {(["cumplida", "con_brechas", "no_cumplida"] as EstadoObligacion[]).map((est) => {
                        const count = estados.filter((e) => e === est).length;
                        if (count === 0) return null;
                        const cfg = ESTADO_OBLIGACION_CFG[est];
                        return (
                          <span
                            key={est}
                            className={
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                              cfg.cls
                            }
                          >
                            {count} {cfg.label.toLowerCase()}
                          </span>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {selected ? (
        <ObligacionDrawer obligacion={selected} centros={data.centros} onClose={() => setSelected(null)} />
      ) : null}

      <Dialog open={openEstadoModal} onOpenChange={setOpenEstadoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar estado estructural</DialogTitle>
            <DialogDescription>
              Marca cumplimiento manual para obligaciones estructurales o mixtas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={manualEstado} onValueChange={(v) => setManualEstado(v as EstadoManualObligacion)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cumple">Cumple</SelectItem>
                  <SelectItem value="no_cumple">No cumple</SelectItem>
                  <SelectItem value="en_revision">En revisión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observacion</Label>
              <Textarea
                value={manualObservacion}
                onChange={(e) => setManualObservacion(e.target.value)}
                placeholder="Detalle del estado estructural..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEstadoModal(false)} disabled={guardandoEstado}>
              Cancelar
            </Button>
            <Button onClick={guardarEstadoManual} disabled={guardandoEstado || !estadoTarget}>
              {guardandoEstado ? "Guardando..." : "Guardar estado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
