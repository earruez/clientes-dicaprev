"use client";

import React, { useState, useTransition, FormEvent } from "react";
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
import {
  type DocumentoVehiculo,
  type Vehiculo,
  type TipoVehiculo,
  type EstadoVehiculo,
} from "./domain";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import {
  crearVehiculo, actualizarVehiculo,
  type VehiculoDTO, type VehiculoInput, type CentroItem, type VehiculoDocumentoDTO,
} from "./actions";

type EstadoDocumentalVehiculo = "en_regla" | "por_vencer" | "fuera_de_regla" | "en_revision";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Map Prisma DTO -> store Vehiculo shape */
function dtoToVehiculo(dto: VehiculoDTO): Vehiculo {
  const documentos: DocumentoVehiculo[] = dto.documentos.map((d) => ({
    tipo: d.tipo,
    subido: d.subido,
    vencimiento: d.vencimiento,
  }));

  return {
    id: dto.id,
    patente: dto.patente,
    codigoInterno: dto.codigoInterno ?? "",
    marca: dto.marca,
    modelo: dto.modelo,
    anio: dto.anio ?? new Date().getFullYear(),
    tipo: dto.tipo as TipoVehiculo,
    centro: dto.centroNombre ?? "",
    responsable: dto.responsable ?? "",
    estado: dto.estado as EstadoVehiculo,
    proximaRevision: dto.proximaRevision ?? "",
    kilometraje: dto.kilometraje ?? 0,
    observaciones: dto.observaciones ?? "",
    documentos,
    creadoEl: dto.createdAt.slice(0, 10),
  };
}

function isDocumentoVencido(doc: VehiculoDocumentoDTO) {
  if (!doc.fechaVencimiento) return false;
  return new Date(doc.fechaVencimiento).getTime() < Date.now();
}

function isDocumentoProximoVencer(doc: VehiculoDocumentoDTO) {
  if (!doc.fechaVencimiento) return false;
  const diff = new Date(doc.fechaVencimiento).getTime() - Date.now();
  return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
}

function isDocumentoCompleto(doc: VehiculoDocumentoDTO) {
  return doc.estado === "completo" && doc.subido && !isDocumentoVencido(doc);
}

function isDocumentoPendiente(doc: VehiculoDocumentoDTO) {
  return ["pendiente", "rechazado"].includes(doc.estado) || (!doc.subido && doc.estado !== "no_aplica");
}

function estadoDocumentalFromVehiculo(dto: VehiculoDTO): EstadoDocumentalVehiculo {
  if (dto.documentos.some((d) => d.estado === "en_revision")) {
    return "en_revision";
  }
  if (dto.documentos.some((d) => isDocumentoVencido(d) || d.estado === "vencido" || isDocumentoPendiente(d))) {
    return "fuera_de_regla";
  }
  if (dto.documentos.some((d) => isDocumentoProximoVencer(d))) {
    return "por_vencer";
  }
  return "en_regla";
}

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

const ESTADO_DOC_CFG: Record<EstadoDocumentalVehiculo, { label: string; cls: string; dot: string }> = {
  en_regla:       { label: "En regla",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  por_vencer:     { label: "Por vencer",     cls: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500"   },
  fuera_de_regla: { label: "Fuera de regla", cls: "bg-rose-50 text-rose-700 border-rose-200",           dot: "bg-rose-500"    },
  en_revision:    { label: "En revisión",    cls: "bg-blue-50 text-blue-700 border-blue-200",           dot: "bg-blue-500"    },
};

const EMPTY: VehiculoInput = {
  patente: "",
  codigoInterno: "",
  marca: "",
  modelo: "",
  anio: new Date().getFullYear(),
  tipo: "camioneta",
  centroTrabajoId: "",
  responsable: "",
  estado: "operativo",
  proximaRevision: "",
  kilometraje: 0,
  observaciones: "",
};

const NO_CENTRO_VALUE = "__sin_centro__";

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  initialVehiculos: VehiculoDTO[];
  initialCentros: CentroItem[];
}

// ── Component ─────────────────────────────────────────────────────────────

export default function VehiculosPrismaClient({ initialVehiculos, initialCentros }: Props) {
  const [vehiculosDTO, setVehiculosDTO] = useState<VehiculoDTO[]>(initialVehiculos);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoVehiculo | "todos">("todos");
  const [filtroOp, setFiltroOp] = useState<EstadoVehiculo | "todos">("todos");
  const [filtroDoc, setFiltroDoc] = useState<EstadoDocumentalVehiculo | "todos">("todos");
  const [filtroVencimiento, setFiltroVencimiento] = useState<"todos" | "vencidos" | "proximos">("todos");
  const [modal, setModal] = useState<{ open: boolean; modo: "crear" | "editar"; id?: string }>({
    open: false, modo: "crear",
  });
  const [form, setForm] = useState<VehiculoInput>(EMPTY);
  const [isPending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState<{ open: boolean; vehiculo: Vehiculo | null }>({
    open: false, vehiculo: null,
  });

  const vehiculos = vehiculosDTO.map(dtoToVehiculo);

  const filtrados = vehiculos.filter((v) => {
    const dto = vehiculosDTO.find((item) => item.id === v.id);
    if (!dto) return false;

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
    const matchDoc  = filtroDoc  === "todos" || estadoDocumentalFromVehiculo(dto) === filtroDoc;

    let matchVencimiento = true;
    if (filtroVencimiento === "vencidos") {
      matchVencimiento = dto.documentos.some((d) => isDocumentoVencido(d) || d.estado === "vencido");
    }
    if (filtroVencimiento === "proximos") {
      matchVencimiento = dto.documentos.some((d) => isDocumentoProximoVencer(d));
    }

    return matchText && matchTipo && matchOp && matchDoc && matchVencimiento;
  });

  const totalVehiculos = vehiculos.length;
  const totalDocs = vehiculosDTO.flatMap((item) => item.documentos);
  const docsCompletos = totalDocs.filter((d) => isDocumentoCompleto(d)).length;
  const docsFaltantes = totalDocs.filter((d) => isDocumentoPendiente(d)).length;
  const docsVencidos = totalDocs.filter((d) => isDocumentoVencido(d) || d.estado === "vencido").length;
  const docsProximos = totalDocs.filter((d) => isDocumentoProximoVencer(d)).length;

  function abrirCrear() {
    setForm({ ...EMPTY, centroTrabajoId: initialCentros[0]?.id ?? NO_CENTRO_VALUE });
    setModal({ open: true, modo: "crear" });
  }

  function abrirEditar(v: Vehiculo) {
    const dto = vehiculosDTO.find((d) => d.id === v.id);
    setForm({
      patente: v.patente,
      codigoInterno: v.codigoInterno,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      tipo: v.tipo,
      centroTrabajoId: dto?.centroTrabajoId ?? NO_CENTRO_VALUE,
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
    startTransition(async () => {
      const payload: VehiculoInput = {
        ...form,
        centroTrabajoId: form.centroTrabajoId === NO_CENTRO_VALUE ? "" : form.centroTrabajoId,
      };

      if (modal.modo === "crear") {
        const created = await crearVehiculo(payload);
        setVehiculosDTO((prev) => [...prev, created]);
        registrarAccion({
          accion: "crear",
          modulo: "vehiculos",
          entidadTipo: "Vehículo",
          entidadId: created.id,
          descripcion: `Registró vehículo ${form.patente} (${form.marca} ${form.modelo})`,
        });
      } else if (modal.modo === "editar" && modal.id) {
        const updated = await actualizarVehiculo(modal.id, payload);
        setVehiculosDTO((prev) => prev.map((d) => (d.id === modal.id ? updated : d)));
        registrarAccion({
          accion: "editar",
          modulo: "vehiculos",
          entidadTipo: "Vehículo",
          entidadId: modal.id,
          descripcion: `Actualizó datos del vehículo ${form.patente} (${form.marca} ${form.modelo})`,
        });
        if (drawer.vehiculo?.id === modal.id) {
          setDrawer((prev) => ({ ...prev, vehiculo: dtoToVehiculo(updated) }));
        }
      }
      cerrarModal();
    });
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(
            [
              { label: "Total vehiculos",      val: totalVehiculos, cls: "text-slate-900" },
              { label: "Docs completos",       val: docsCompletos,  cls: "text-emerald-600" },
              { label: "Docs faltantes",       val: docsFaltantes,  cls: "text-rose-500" },
              { label: "Docs vencidos",        val: docsVencidos,   cls: "text-rose-600" },
              { label: "Proximos a vencer",    val: docsProximos,   cls: "text-amber-600" },
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
          <Select value={filtroDoc} onValueChange={(v) => setFiltroDoc(v as EstadoDocumentalVehiculo | "todos")}>
            <SelectTrigger className="h-9 w-48 rounded-xl border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Estado documental" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Estado documental</SelectItem>
              <SelectItem value="en_regla">En regla</SelectItem>
              <SelectItem value="por_vencer">Por vencer</SelectItem>
              <SelectItem value="en_revision">En revisión</SelectItem>
              <SelectItem value="fuera_de_regla">Fuera de regla</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroVencimiento} onValueChange={(v) => setFiltroVencimiento(v as "todos" | "vencidos" | "proximos")}>
            <SelectTrigger className="h-9 w-48 rounded-xl border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Vencimientos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos vencimientos</SelectItem>
              <SelectItem value="vencidos">Solo vencidos</SelectItem>
              <SelectItem value="proximos">Proximos a vencer</SelectItem>
            </SelectContent>
          </Select>
          {(search || filtroTipo !== "todos" || filtroOp !== "todos" || filtroDoc !== "todos" || filtroVencimiento !== "todos") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setFiltroTipo("todos"); setFiltroOp("todos"); setFiltroDoc("todos"); setFiltroVencimiento("todos"); }}
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
                {(["", "Codigo / Patente", "Vehiculo / Equipo", "Centro", "Responsable", "Estado operativo", "Estado documental", "Faltantes", "Vencimientos", ""] as const).map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((v) => {
                const dto = vehiculosDTO.find((item) => item.id === v.id);
                if (!dto) return null;
                const estadoOp  = ESTADO_OP_CFG[v.estado];
                const estadoDoc = ESTADO_DOC_CFG[estadoDocumentalFromVehiculo(dto)];
                const faltantes = dto.documentos.filter((d) => isDocumentoPendiente(d)).length;
                const vencidos = dto.documentos.filter((d) => isDocumentoVencido(d) || d.estado === "vencido").length;
                const proximos = dto.documentos.filter((d) => isDocumentoProximoVencer(d)).length;
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
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell whitespace-nowrap">{v.centro || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell whitespace-nowrap">{v.responsable || "—"}</td>
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
                    <td className="px-4 py-3 text-sm font-semibold text-rose-600">{faltantes}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-rose-600">Vencidos: {vencidos}</span>
                        <span className="font-semibold text-amber-600">Prox.: {proximos}</span>
                      </div>
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
                  <td colSpan={10} className="px-6 py-16 text-center">
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
                <Select value={form.centroTrabajoId} onValueChange={(v) => handleChange("centroTrabajoId", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CENTRO_VALUE}>Sin centro asignado</SelectItem>
                    {initialCentros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
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
              <Button type="submit" disabled={isPending} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
                {modal.modo === "crear" ? "Crear vehículo" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
