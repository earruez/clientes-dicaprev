"use client";

import React, { useState, useEffect, FormEvent } from "react";
import {
  Car, Truck, Wrench, CheckCircle2, AlertTriangle, XCircle,
  Search, Plus, Pencil, Eye,
} from "lucide-react";
import { VehiculoDetailDrawer } from "./VehiculoDetailDrawer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getCentroNombres } from "@/lib/centros/centros-store";
import {
  getVehiculos, getVehiculoById, createVehiculo, updateVehiculo,
  evaluarEstadoDocumental,
  type Vehiculo, type VehiculoInput,
  type TipoVehiculo, type EstadoVehiculo, type EstadoDocumental,
} from "@/lib/vehiculos/vehiculos-store";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

// ── Config visual ─────────────────────────────────────────────────────────

const TIPO_ICON: Record<TipoVehiculo, React.ReactNode> = {
  camioneta: <Car className="h-4 w-4" />,
  camion:    <Truck className="h-4 w-4" />,
  equipo:    <Wrench className="h-4 w-4" />,
};

const TIPO_LABEL: Record<TipoVehiculo, string> = {
  camioneta: "Camioneta",
  camion:    "Camión",
  equipo:    "Equipo / Maquinaria",
};

const ESTADO_OP_CFG: Record<EstadoVehiculo, { label: string; cls: string; icon: React.ReactNode }> = {
  operativo:  { label: "Operativo",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  mantencion: { label: "En mantención", cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: <AlertTriangle className="h-3 w-3" /> },
  baja:       { label: "Dado de baja",  cls: "bg-rose-50 text-rose-700 border-rose-200",           icon: <XCircle className="h-3 w-3" /> },
};

const ESTADO_DOC_CFG: Record<EstadoDocumental, { label: string; cls: string; dot: string }> = {
  en_regla:       { label: "En regla",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  por_vencer:     { label: "Por vencer",     cls: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500"   },
  fuera_de_regla: { label: "Fuera de regla", cls: "bg-rose-50 text-rose-700 border-rose-200",           dot: "bg-rose-500"    },
};

const EMPTY: VehiculoInput = {
  patente: "",
  codigoInterno: "",
  marca: "",
  modelo: "",
  anio: new Date().getFullYear(),
  tipo: "camioneta",
  centro: "",
  responsable: "",
  estado: "operativo",
  proximaRevision: "",
  kilometraje: 0,
  observaciones: "",
};

// ── Component ─────────────────────────────────────────────────────────────

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(() => getVehiculos());
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoVehiculo | "todos">("todos");
  const [filtroOp, setFiltroOp] = useState<EstadoVehiculo | "todos">("todos");
  const [filtroDoc, setFiltroDoc] = useState<EstadoDocumental | "todos">("todos");
  const [modal, setModal] = useState<{ open: boolean; modo: "crear" | "editar"; id?: string }>({
    open: false, modo: "crear",
  });
  const [form, setForm] = useState<VehiculoInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; vehiculo: Vehiculo | null }>({
    open: false, vehiculo: null,
  });

  const centroNombres = getCentroNombres();

  useEffect(() => { setVehiculos(getVehiculos()); }, []);

  const filtrados = vehiculos.filter((v) => {
    const q = search.toLowerCase();
    const matchText =
      !q ||
      v.patente.toLowerCase().includes(q) ||
      v.marca.toLowerCase().includes(q) ||
      v.modelo.toLowerCase().includes(q) ||
      v.centro.toLowerCase().includes(q) ||
      v.responsable.toLowerCase().includes(q);
    const matchTipo = filtroTipo === "todos" || v.tipo === filtroTipo;
    const matchOp   = filtroOp   === "todos" || v.estado === filtroOp;
    const matchDoc  = filtroDoc  === "todos" || evaluarEstadoDocumental(v) === filtroDoc;
    return matchText && matchTipo && matchOp && matchDoc;
  });

  const total        = vehiculos.length;
  const operativos   = vehiculos.filter((v) => v.estado === "operativo").length;
  const enMantencion = vehiculos.filter((v) => v.estado === "mantencion").length;
  const enBaja       = vehiculos.filter((v) => v.estado === "baja").length;
  const enRegla      = vehiculos.filter((v) => evaluarEstadoDocumental(v) === "en_regla").length;
  const porVencer    = vehiculos.filter((v) => evaluarEstadoDocumental(v) === "por_vencer").length;
  const fueraRegla   = vehiculos.filter((v) => evaluarEstadoDocumental(v) === "fuera_de_regla").length;

  function abrirCrear() {
    setForm({ ...EMPTY, centro: centroNombres[0] ?? "" });
    setModal({ open: true, modo: "crear" });
  }

  function abrirEditar(v: Vehiculo) {
    setForm({
      patente: v.patente,
      codigoInterno: v.codigoInterno,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      tipo: v.tipo,
      centro: v.centro,
      responsable: v.responsable,
      estado: v.estado,
      proximaRevision: v.proximaRevision,
      kilometraje: v.kilometraje,
      observaciones: v.observaciones,
    });
    setModal({ open: true, modo: "editar", id: v.id });
  }

  function cerrarModal() {
    setModal((prev) => ({ ...prev, open: false }));
  }

  function handleChange(field: keyof VehiculoInput, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function abrirDetalle(v: Vehiculo) {
    setDrawer({ open: true, vehiculo: v });
  }

  function cerrarDrawer() {
    setDrawer((prev) => ({ ...prev, open: false }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (modal.modo === "crear") {
      const v = createVehiculo(form);
      registrarAccion({
        accion: "crear",
        modulo: "vehiculos",
        entidadTipo: "Vehículo",
        entidadId: v.id,
        descripcion: `Registró vehículo ${form.patente} (${form.marca} ${form.modelo})`,
      });
    } else if (modal.modo === "editar" && modal.id) {
      updateVehiculo(modal.id, form);
      registrarAccion({
        accion: "editar",
        modulo: "vehiculos",
        entidadTipo: "Vehículo",
        entidadId: modal.id,
        descripcion: `Actualizó datos del vehículo ${form.patente} (${form.marca} ${form.modelo})`,
      });
      // Refresh drawer if the edited vehicle is currently open
      if (drawer.vehiculo?.id === modal.id) {
        const updated = getVehiculoById(modal.id);
        if (updated) setDrawer((prev) => ({ ...prev, vehiculo: updated }));
      }
    }
    setVehiculos(getVehiculos());
    setSaving(false);
    cerrarModal();
  }

  return (
    <div className="min-h-screen bg-slate-50/60">

      <div className="px-6 pt-2">
        <StandardPageHeader
          moduleLabel="Módulo Empresa"
          title="Vehículos y equipos"
          description="Flota vehicular y maquinaria con control documental integrado."
          icon={<Car className="h-6 w-6" />}
          iconWrapClassName="bg-slate-900"
          actions={
            <Button
              onClick={abrirCrear}
              className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nuevo vehículo / equipo
            </Button>
          }
        />
      </div>

      <div className="py-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(
            [
              { label: "Total flota",    val: total,        cls: "text-slate-900"   },
              { label: "Operativos",     val: operativos,   cls: "text-emerald-600" },
              { label: "En mantención",  val: enMantencion, cls: "text-amber-600"   },
              { label: "Dados de baja",  val: enBaja,       cls: "text-rose-500"    },
              { label: "En regla",       val: enRegla,      cls: "text-emerald-600" },
              { label: "Por vencer",     val: porVencer,    cls: "text-amber-600"   },
              { label: "Fuera de regla", val: fueraRegla,   cls: "text-rose-500"    },
            ] as const
          ).map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-snug">{k.label}</p>
              <p className={cn("text-3xl font-bold mt-1", k.cls)}>{k.val}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              className="pl-9 h-9 w-60 rounded-xl border-slate-200 bg-white text-sm"
              placeholder="Buscar patente, marca, centro…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as TipoVehiculo | "todos")}>
            <SelectTrigger className="h-9 w-44 rounded-xl border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="camioneta">Camioneta</SelectItem>
              <SelectItem value="camion">Camión</SelectItem>
              <SelectItem value="equipo">Equipo / Maquinaria</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroOp} onValueChange={(v) => setFiltroOp(v as EstadoVehiculo | "todos")}>
            <SelectTrigger className="h-9 w-44 rounded-xl border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Estado operativo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Estado operativo</SelectItem>
              <SelectItem value="operativo">Operativo</SelectItem>
              <SelectItem value="mantencion">En mantención</SelectItem>
              <SelectItem value="baja">Dado de baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroDoc} onValueChange={(v) => setFiltroDoc(v as EstadoDocumental | "todos")}>
            <SelectTrigger className="h-9 w-48 rounded-xl border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Estado documental" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Estado documental</SelectItem>
              <SelectItem value="en_regla">En regla</SelectItem>
              <SelectItem value="por_vencer">Por vencer</SelectItem>
              <SelectItem value="fuera_de_regla">Fuera de regla</SelectItem>
            </SelectContent>
          </Select>
          {(search || filtroTipo !== "todos" || filtroOp !== "todos" || filtroDoc !== "todos") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setFiltroTipo("todos"); setFiltroOp("todos"); setFiltroDoc("todos"); }}
              className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {(["", "Código / Patente", "Vehículo / Equipo", "Centro", "Responsable", "Estado operativo", "Estado documental", ""] as const).map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((v) => {
                const estadoOp  = ESTADO_OP_CFG[v.estado];
                const estadoDoc = ESTADO_DOC_CFG[evaluarEstadoDocumental(v)];
                return (
                  <tr key={v.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-4 py-3 text-slate-400 w-8">{TIPO_ICON[v.tipo]}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-slate-700">{v.patente}</span>
                      {v.codigoInterno && <p className="text-[10px] text-slate-400 mt-0.5">{v.codigoInterno}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{v.marca} {v.modelo}</p>
                      <p className="text-xs text-slate-400">{v.anio} · {TIPO_LABEL[v.tipo]}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell whitespace-nowrap">{v.centro}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell whitespace-nowrap">{v.responsable}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", estadoOp.cls)}>
                        {estadoOp.icon}{estadoOp.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", estadoDoc.cls)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", estadoDoc.dot)} />
                        {estadoDoc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => abrirEditar(v)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirDetalle(v)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Car className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                    <p className="text-sm font-medium text-slate-500">Sin vehículos que coincidan</p>
                    <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o registra un nuevo vehículo.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer lateral de detalle */}
      <VehiculoDetailDrawer
        open={drawer.open}
        onClose={cerrarDrawer}
        vehiculo={drawer.vehiculo}
        onEdit={(v) => abrirEditar(v)}
      />

      {/* Modal Crear / Editar */}
      <Dialog open={modal.open} onOpenChange={(o) => !o && cerrarModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modal.modo === "crear" ? "Nuevo vehículo / equipo" : "Editar vehículo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => handleChange("tipo", v as TipoVehiculo)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camioneta">Camioneta</SelectItem>
                    <SelectItem value="camion">Camión</SelectItem>
                    <SelectItem value="equipo">Equipo / Maquinaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado operativo</Label>
                <Select value={form.estado} onValueChange={(v) => handleChange("estado", v as EstadoVehiculo)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operativo">Operativo</SelectItem>
                    <SelectItem value="mantencion">En mantención</SelectItem>
                    <SelectItem value="baja">Dado de baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Patente</Label>
                <Input className="rounded-xl" placeholder="BBLF-45" value={form.patente} onChange={(e) => handleChange("patente", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Código interno</Label>
                <Input className="rounded-xl" placeholder="FLT-001" value={form.codigoInterno} onChange={(e) => handleChange("codigoInterno", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input className="rounded-xl" placeholder="Toyota" value={form.marca} onChange={(e) => handleChange("marca", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input className="rounded-xl" placeholder="Hilux" value={form.modelo} onChange={(e) => handleChange("modelo", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Año</Label>
                <Input className="rounded-xl" type="number" min={1990} max={2030} value={form.anio} onChange={(e) => handleChange("anio", parseInt(e.target.value) || 2024)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Centro de trabajo</Label>
                <Select value={form.centro} onValueChange={(v) => handleChange("centro", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                  <SelectContent>
                    {centroNombres.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Input className="rounded-xl" placeholder="Nombre del responsable" value={form.responsable} onChange={(e) => handleChange("responsable", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Próxima revisión</Label>
                <Input className="rounded-xl" type="date" value={form.proximaRevision} onChange={(e) => handleChange("proximaRevision", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Kilometraje</Label>
                <Input className="rounded-xl" type="number" min={0} value={form.kilometraje} onChange={(e) => handleChange("kilometraje", parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea className="rounded-xl resize-none" rows={2} placeholder="Observaciones adicionales…" value={form.observaciones} onChange={(e) => handleChange("observaciones", e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
                {modal.modo === "crear" ? "Crear vehículo" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
