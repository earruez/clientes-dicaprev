// src/app/dicaprev/empresa/puestos/page.tsx
"use client";

import React, { useState, useMemo, useCallback, useEffect, ChangeEvent, FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Users, UserCheck, AlertTriangle, MapPin,
  Clock, Layers, SlidersHorizontal,
  Search, Plus, X, Shield, BookOpen, FileCheck, TrendingUp,
} from "lucide-react";
import {
  getDotacion,
  crearPosicion,
  actualizarPosicion,
  desactivarPosicion,
} from "./actions";
import { getCentrosTrabajo } from "@/app/dicaprev/empresa/centros/actions";
import { getCargos } from "@/app/dicaprev/empresa/cargos/actions";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Estado = "activo" | "inactivo";
type Turno = "Diurno" | "Nocturno" | "Mixto" | "Especial";
type Modalidad = "Presencial" | "Híbrido" | "Remoto";

type Posicion = {
  id: string;
  codigo: string;
  centroNombre: string;
  cargoNombre: string;
  dotacionRequerida: number;
  asignados: number;
  turno: Turno;
  modalidad: Modalidad;
  ubicacion: string;
  riesgosClave: string;
  requiereDS44: boolean;
  estado: Estado;
  creadoEl: string;
};

type RefCentro = {
  id: string;
  nombre: string;
};

type DotacionRow = {
  id: string;
  cantidad: number;
  asignados: number;
  vacantes: number;
  estado: string;
  esCritica: boolean;
  createdAt: Date;
  centroTrabajo: {
    id: string;
    nombre: string;
  };
  cargo: {
    id: string;
    nombre: string;
  };
  trabajadoresAsignados: {
    id: string;
    nombres: string;
    apellidos: string;
    rut: string | null;
    estado: string;
  }[];
};

// Posicion is imported from dotacion-store
type PosicionForm = Omit<Posicion, "id" | "creadoEl">;

interface CargoOption { id: string; nombre: string; riesgos?: string; ds44?: boolean; }

interface TrabajadorAsignado {
  id: string;
  nombre: string;
  rut: string;
  estado: "Al día" | "Pendiente" | "Crítico";
  completitudDoc: number;
  capacitaciones: number;
}

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const WORKERS_BY_POSICION: Record<string, TrabajadorAsignado[]> = {};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function coverageColor(p: Posicion): string {
  if (isSobredotado(p)) return "text-purple-700 bg-purple-50 border-purple-100";
  const v = vacantesPos(p);
  if (v === 0) return "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (v >= p.dotacionRequerida) return "text-rose-700 bg-rose-50 border-rose-100";
  return "text-amber-700 bg-amber-50 border-amber-100";
}

function workerEstadoColor(e: TrabajadorAsignado["estado"]): string {
  if (e === "Al día") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (e === "Pendiente") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
}

function vacantesPos(p: Posicion): number {
  return Math.max(0, p.dotacionRequerida - p.asignados);
}

function isSobredotado(p: Posicion): boolean {
  return p.asignados > p.dotacionRequerida;
}

function coberturaLabel(p: Posicion): string {
  if (isSobredotado(p)) return "Sobredotado";
  if (vacantesPos(p) === 0) return "Cubierta";
  if (vacantesPos(p) >= p.dotacionRequerida) return "Vacante";
  return "Parcial";
}

function coberturaPct(p: Posicion): number {
  if (p.dotacionRequerida === 0) return 0;
  return Math.round((p.asignados / p.dotacionRequerida) * 100);
}

function nextCodigo(posiciones: Posicion[]): string {
  const nums = posiciones.map((p) => { const m = p.codigo.match(/^DOT-(\d+)$/); return m ? parseInt(m[1]) : 0; }).filter((n) => n > 0);
  return `DOT-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
}

function emptyForm(firstCentro: string, cargos: CargoOption[]): PosicionForm {
  const firstCargo = cargos[0];
  return {
    codigo: "", centroNombre: firstCentro,
    cargoNombre: firstCargo?.nombre ?? "",
    dotacionRequerida: 1, asignados: 0,
    turno: "Diurno", modalidad: "Presencial",
    ubicacion: "", riesgosClave: firstCargo?.riesgos ?? "",
    requiereDS44: firstCargo?.ds44 ?? false, estado: "activo",
  };
}

function mapDbPosicionToUi(row: DotacionRow): Posicion {
  WORKERS_BY_POSICION[row.id] = row.trabajadoresAsignados.map((trabajador) => ({
    id: trabajador.id,
    nombre: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
    rut: trabajador.rut ?? "Sin RUT",
    estado: trabajador.estado === "activo" ? "Al día" : trabajador.estado === "inactivo" ? "Pendiente" : "Crítico",
    completitudDoc: trabajador.estado === "activo" ? 100 : trabajador.estado === "inactivo" ? 60 : 35,
    capacitaciones: trabajador.estado === "activo" ? 8 : trabajador.estado === "inactivo" ? 4 : 2,
  }));

  return {
    id: row.id,
    codigo: `DOT-${row.id.slice(0, 4).toUpperCase()}`,
    centroNombre: row.centroTrabajo.nombre,
    cargoNombre: row.cargo.nombre,
    dotacionRequerida: row.cantidad,
    asignados: row.asignados,
    turno: "Diurno",
    modalidad: "Presencial",
    ubicacion: "",
    riesgosClave: "",
    requiereDS44: row.esCritica,
    estado: row.estado === "inactiva" ? "inactivo" : "activo",
    creadoEl: row.createdAt.toISOString().slice(0, 10),
  };
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function DotacionPage() {
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [centrosRef, setCentrosRef] = useState<RefCentro[]>([]);
  const [cargosRef, setCargosRef] = useState<CargoOption[]>([]);
  const [loading, setLoading] = useState(false);

  const CENTROS = centrosRef.map((c) => c.nombre);
  const CARGOS = cargosRef;
  const firstCentro = CENTROS[0] ?? "Casa Matriz";

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([getDotacion(), getCentrosTrabajo(), getCargos()])
      .then(([dotacionRows, centrosRows, cargosRows]) => {
        if (!mounted) return;

        const mappedPosiciones = dotacionRows.map((row) => mapDbPosicionToUi(row));
        const mappedCentros = centrosRows.map((row) => ({ id: row.id, nombre: row.nombre }));
        const mappedCargos = cargosRows.map((row) => ({
          id: row.id,
          nombre: row.nombre,
          riesgos: row.perfilSST ?? row.descripcion ?? "",
          ds44: row.esCritico,
        }));

        setPosiciones(mappedPosiciones);
        setCentrosRef(mappedCentros);
        setCargosRef(mappedCargos);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const [search, setSearch]     = useState("");
  const [fCentro, setFCentro]   = useState("todos");
  const [fCargo, setFCargo]     = useState("todos");
  const [fEstado, setFEstado]   = useState<"todos" | Estado>("todos");
  const [fTurno, setFTurno]     = useState<"todos" | Turno>("todos");
  const [fDs44, setFDs44]       = useState(false);

  const [drawerPos, setDrawerPos] = useState<Posicion | null>(null);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<PosicionForm>(emptyForm(firstCentro, CARGOS));
  const isEdit = editingId !== null;

  /* KPIs */
  const activas      = posiciones.filter((p) => p.estado === "activo");
  const kpiTotal     = activas.length;
  const kpiCubiertas = activas.filter((p) => !isSobredotado(p) && vacantesPos(p) === 0).length;
  const kpiVacantes  = activas.reduce((s, p) => s + vacantesPos(p), 0);
  const kpiCentros   = new Set(activas.map((p) => p.centroNombre)).size;
  const kpiSobredotadas = activas.filter((p) => isSobredotado(p)).length;

  /* Filtered */
  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posiciones.filter((p) => {
      if (q && !`${p.codigo} ${p.centroNombre} ${p.cargoNombre} ${p.ubicacion}`.toLowerCase().includes(q)) return false;
      if (fCentro !== "todos" && p.centroNombre !== fCentro) return false;
      if (fCargo !== "todos" && p.cargoNombre !== fCargo) return false;
      if (fEstado !== "todos" && p.estado !== fEstado) return false;
      if (fTurno !== "todos" && p.turno !== fTurno) return false;
      if (fDs44 && !(p.requiereDS44 && vacantesPos(p) > 0)) return false;
      return true;
    });
  }, [posiciones, search, fCentro, fCargo, fEstado, fTurno, fDs44]);

  /* Handlers */
  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm(firstCentro, CARGOS), codigo: nextCodigo(posiciones) });
    setModalOpen(true);
  }, [firstCentro, CARGOS, posiciones]);

  const openEdit = useCallback((p: Posicion) => {
    setEditingId(p.id);
    setForm({
      codigo: p.codigo, centroNombre: p.centroNombre, cargoNombre: p.cargoNombre,
      dotacionRequerida: p.dotacionRequerida, asignados: p.asignados,
      turno: p.turno, modalidad: p.modalidad,
      ubicacion: p.ubicacion, riesgosClave: p.riesgosClave,
      requiereDS44: p.requiereDS44, estado: p.estado,
    });
    setModalOpen(true);
    setDrawerPos(null);
  }, []);

  const toggleEstado = async (id: string) => {
    const current = posiciones.find((p) => p.id === id);
    if (!current) return;

    const centro = centrosRef.find((c) => c.nombre === current.centroNombre);
    const cargo = CARGOS.find((c) => c.nombre === current.cargoNombre);
    if (!centro || !cargo) {
      alert("No fue posible resolver centro/cargo para actualizar la posición.");
      return;
    }

    if (current.estado === "activo") {
      const updated = await desactivarPosicion(id);
      const mapped = mapDbPosicionToUi(updated);
      setPosiciones((prev) => prev.map((p) => (p.id === id ? { ...p, ...mapped } : p)));
      setDrawerPos((prev) => (prev?.id === id ? { ...prev, ...mapped } : prev));
      return;
    }

    const updated = await actualizarPosicion(id, {
      centroTrabajoId: centro.id,
      cargoId: cargo.id,
      cantidad: current.dotacionRequerida,
      estado: "activa",
      esCritica: current.requiereDS44,
    });
    const mapped = mapDbPosicionToUi(updated);
    setPosiciones((prev) => prev.map((p) => (p.id === id ? { ...p, ...mapped } : p)));
    setDrawerPos((prev) => (prev?.id === id ? { ...prev, ...mapped } : prev));
  };

  const deletePos = async (id: string) => {
    if (!confirm("¿Desactivar esta posición?")) return;
    const updated = await desactivarPosicion(id);
    const mapped = mapDbPosicionToUi(updated);
    setPosiciones((prev) => prev.map((p) => (p.id === id ? { ...p, ...mapped } : p)));
    if (drawerPos?.id === id) setDrawerPos(mapped);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? (isNaN(+value) ? 0 : +value) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const centro = centrosRef.find((c) => c.nombre === form.centroNombre);
    const cargo = CARGOS.find((c) => c.nombre === form.cargoNombre);

    if (!centro || !cargo) {
      alert("Selecciona un centro y cargo válidos.");
      return;
    }

    if (isEdit && editingId) {
      try {
        const updated = await actualizarPosicion(editingId, {
          centroTrabajoId: centro.id,
          cargoId: cargo.id,
          cantidad: form.dotacionRequerida,
          estado: form.estado === "activo" ? "activa" : "inactiva",
          esCritica: form.requiereDS44,
        });

        const mapped = mapDbPosicionToUi(updated);
        const enriched = {
          ...mapped,
          codigo: form.codigo,
          asignados: form.asignados,
          turno: form.turno,
          modalidad: form.modalidad,
          ubicacion: form.ubicacion,
          riesgosClave: form.riesgosClave,
        };
        setPosiciones((prev) => prev.map((p) => (p.id === editingId ? enriched : p)));
        setDrawerPos((prev) => (prev?.id === editingId ? enriched : prev));
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo actualizar la posición");
        return;
      }
    } else {
      try {
        const created = await crearPosicion({
          centroTrabajoId: centro.id,
          cargoId: cargo.id,
          cantidad: form.dotacionRequerida,
          estado: form.estado === "activo" ? "activa" : "inactiva",
          esCritica: form.requiereDS44,
        });

        const mapped = mapDbPosicionToUi(created);
        const enriched = {
          ...mapped,
          codigo: form.codigo || nextCodigo(posiciones),
          asignados: form.asignados,
          turno: form.turno,
          modalidad: form.modalidad,
          ubicacion: form.ubicacion,
          riesgosClave: form.riesgosClave,
        };
        setPosiciones((prev) => [enriched, ...prev]);
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo crear la posición");
        return;
      }
    }
    setModalOpen(false);
  };

  const drawerWorkers: TrabajadorAsignado[] = drawerPos ? (WORKERS_BY_POSICION[drawerPos.id] ?? []) : [];

  const clearFilters = () => { setSearch(""); setFCentro("todos"); setFCargo("todos"); setFEstado("todos"); setFTurno("todos"); setFDs44(false); };
  const hasFilters = search || fCentro !== "todos" || fCargo !== "todos" || fEstado !== "todos" || fTurno !== "todos" || fDs44;

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">

        {/* ── HEADER ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dotación</h1>
            </div>
            <p className="text-sm text-slate-500 max-w-xl pl-[52px]">
              Posiciones operativas por centro de trabajo. Cada posición vincula un cargo maestro con su cobertura real, turno y cumplimiento DS44.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Nueva posición
          </button>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={<Layers className="h-5 w-5 text-indigo-600" />}     label="Posiciones activas"  value={kpiTotal}        bg="bg-indigo-50" />
          <KpiCard icon={<UserCheck className="h-5 w-5 text-emerald-600" />} label="Cubiertas"            value={kpiCubiertas}    bg="bg-emerald-50" />
          <KpiCard icon={<Users className="h-5 w-5 text-amber-600" />}       label="Vacantes totales"     value={kpiVacantes}     bg="bg-amber-50"   highlight={kpiVacantes > 0} />
          <KpiCard icon={<Building2 className="h-5 w-5 text-sky-600" />}     label="Centros activos"      value={kpiCentros}      bg="bg-sky-50" />
          <KpiCard icon={<TrendingUp className="h-5 w-5 text-purple-600" />} label="Sobredotadas"         value={kpiSobredotadas} bg="bg-purple-50"  highlight={kpiSobredotadas > 0} />
        </div>

        {/* ── FILTROS ── */}
        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Buscar */}
              <div className="flex-1 min-w-[220px]">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código, centro, cargo…" className="pl-9 rounded-xl" />
                </div>
              </div>

              <FilterSelect label="Centro"   value={fCentro} onChange={setFCentro} options={[{ value: "todos", label: "Todos" }, ...CENTROS.map((c) => ({ value: c, label: c }))]} />
              <FilterSelect label="Cargo"    value={fCargo}  onChange={setFCargo}  options={[{ value: "todos", label: "Todos" }, ...CARGOS.map((c)  => ({ value: c.nombre, label: c.nombre }))]} />
              <FilterSelect label="Estado"   value={fEstado} onChange={(v) => setFEstado(v as "todos" | Estado)} options={[{ value: "todos", label: "Todos" }, { value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }]} />
              <FilterSelect label="Turno"    value={fTurno}  onChange={(v) => setFTurno(v as "todos" | Turno)}   options={[{ value: "todos", label: "Todos" }, { value: "Diurno", label: "Diurno" }, { value: "Nocturno", label: "Nocturno" }, { value: "Mixto", label: "Mixto" }, { value: "Especial", label: "Especial" }]} />

              {/* DS44 */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">DS44 crítico</Label>
                <button
                  type="button"
                  onClick={() => setFDs44((v) => !v)}
                  className={`mt-1 h-10 px-4 rounded-xl border text-sm font-medium transition ${fDs44 ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <AlertTriangle className={`inline h-4 w-4 mr-1.5 ${fDs44 ? "text-white" : "text-rose-500"}`} />
                  {fDs44 ? "Solo críticos" : "Todos"}
                </button>
              </div>

              {hasFilters && (
                <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mt-6 transition">
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">{filtradas.length} de {posiciones.length} posiciones</p>
          </CardContent>
        </Card>

        {/* ── TABLA ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Centro</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3 text-center">Req.</th>
                  <th className="px-4 py-3 text-center">Asig.</th>
                  <th className="px-4 py-3 text-center">Vac.</th>
                  <th className="px-4 py-3">Turno</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3 text-center">DS44</th>
                  <th className="px-4 py-3">Cobertura</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setDrawerPos((prev) => prev?.id === p.id ? null : p)}
                    className={`group hover:bg-slate-50/60 transition-colors cursor-pointer ${drawerPos?.id === p.id ? "bg-indigo-50/40" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{p.centroNombre}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.codigo}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{p.cargoNombre}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-700">{p.dotacionRequerida}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block font-semibold ${isSobredotado(p) ? "text-purple-700" : "text-slate-700"}`}>
                        {p.asignados}
                        {isSobredotado(p) && <span className="ml-1 text-[10px] font-bold text-purple-600">+{p.asignados - p.dotacionRequerida}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[24px] rounded-full px-2 py-0.5 text-xs font-bold border ${vacantesPos(p) > 0 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                        {vacantesPos(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{p.turno}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{p.modalidad}</td>
                    <td className="px-4 py-3.5 text-center">
                      {p.requiereDS44 ? (
                        <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${vacantesPos(p) > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                          {vacantesPos(p) > 0 ? "⚠ Crítico" : "✓ OK"}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${coverageColor(p)}`}>
                        {coberturaLabel(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${p.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        {p.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDrawerPos((prev) => prev?.id === p.id ? null : p)} className="rounded-lg px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 transition font-medium">Ver</button>
                        <button onClick={() => openEdit(p)} className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition">Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtradas.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">
                <SlidersHorizontal className="mx-auto h-8 w-8 mb-3 text-slate-300" />
                {loading ? "Cargando posiciones..." : "No se encontraron posiciones con los filtros aplicados."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          DRAWER LATERAL
      ═══════════════════════════════════════════ */}
      <div className={`fixed inset-y-0 right-0 z-40 flex flex-col w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300 ${drawerPos ? "translate-x-0" : "translate-x-full"}`}>
        {drawerPos && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{drawerPos.codigo}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${drawerPos.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                    {drawerPos.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                  {isSobredotado(drawerPos) && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                      <TrendingUp className="h-3 w-3" /> Sobredotado
                    </span>
                  )}
                  {drawerPos.requiereDS44 && vacantesPos(drawerPos) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                      <AlertTriangle className="h-3 w-3" /> DS44 Crítico
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{drawerPos.cargoNombre}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />{drawerPos.centroNombre}
                </p>
              </div>
              <button onClick={() => setDrawerPos(null)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Cobertura stats */}
              <div className="grid grid-cols-3 gap-3">
                <DrawerStat label="Requeridos" value={drawerPos.dotacionRequerida} color="text-slate-700" />
                <DrawerStat label="Asignados"  value={drawerPos.asignados}          color={isSobredotado(drawerPos) ? "text-purple-700" : "text-emerald-700"} />
                <DrawerStat label="Vacantes"   value={vacantesPos(drawerPos)}        color={vacantesPos(drawerPos) > 0 ? "text-amber-600" : "text-slate-400"} />
              </div>

              {/* Barra cobertura */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Cobertura</span>
                  <span className={`font-semibold ${isSobredotado(drawerPos) ? "text-purple-700" : ""}`}>
                    {coberturaPct(drawerPos)}%{isSobredotado(drawerPos) ? " — exceso" : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isSobredotado(drawerPos) ? "bg-purple-500" : vacantesPos(drawerPos) === 0 ? "bg-emerald-500" : vacantesPos(drawerPos) >= drawerPos.dotacionRequerida ? "bg-rose-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.min(100, coberturaPct(drawerPos))}%` }}
                  />
                </div>
              </div>

              {/* Detalles operativos */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Detalles operativos</p>
                <InfoRow icon={<Clock className="h-4 w-4 text-slate-400" />}    label="Turno"      value={drawerPos.turno} />
                <InfoRow icon={<Building2 className="h-4 w-4 text-slate-400" />} label="Modalidad"  value={drawerPos.modalidad} />
                <InfoRow icon={<MapPin className="h-4 w-4 text-slate-400" />}    label="Ubicación"  value={drawerPos.ubicacion || "—"} />
                <InfoRow icon={<Shield className="h-4 w-4 text-slate-400" />}    label="DS44"       value={drawerPos.requiereDS44 ? "Incluido en matriz" : "No aplica"} />
              </div>

              {/* Riesgos */}
              {drawerPos.riesgosClave && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Riesgos clave
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{drawerPos.riesgosClave}</p>
                </div>
              )}

              {/* Trabajadores */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Personas asignadas ({drawerWorkers.length})
                </p>
                {drawerWorkers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                    Sin trabajadores asignados
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drawerWorkers.map((w) => (
                      <div key={w.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
                        <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${w.estado === "Al día" ? "bg-emerald-500" : w.estado === "Pendiente" ? "bg-amber-500" : "bg-rose-500"}`}>
                          {w.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{w.nombre}</p>
                          <p className="text-[11px] text-slate-400">{w.rut}</p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${workerEstadoColor(w.estado)}`}>
                          {w.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cumplimiento mock */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cumplimiento (posición)</p>
                <ComplianceBar
                  icon={<FileCheck className="h-4 w-4 text-sky-500" />}
                  label="Documental promedio"
                  pct={drawerWorkers.length > 0 ? Math.round(drawerWorkers.reduce((s, w) => s + w.completitudDoc, 0) / drawerWorkers.length) : 0}
                />
                <ComplianceBar
                  icon={<BookOpen className="h-4 w-4 text-indigo-500" />}
                  label="Capacitaciones promedio"
                  pct={drawerWorkers.length > 0 ? Math.min(100, Math.round((drawerWorkers.reduce((s, w) => s + w.capacitaciones, 0) / drawerWorkers.length / 10) * 100)) : 0}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex gap-2">
              <button onClick={() => openEdit(drawerPos)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Editar
              </button>
              <button
                onClick={() => toggleEstado(drawerPos.id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${drawerPos.estado === "activo" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {drawerPos.estado === "activo" ? "Desactivar" : "Reactivar"}
              </button>
              <button onClick={() => deletePos(drawerPos.id)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition border border-rose-100">
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Overlay mobile */}
      {drawerPos && (
        <div className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden" onClick={() => setDrawerPos(null)} />
      )}

      {/* ═══════════════════════════════════════════
          MODAL CREAR / EDITAR
      ═══════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {isEdit ? "Editar posición" : "Nueva posición"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define el centro, cargo base, dotación requerida y condiciones operativas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Código */}
              <div>
                <Label htmlFor="m-codigo">Código</Label>
                <Input id="m-codigo" name="codigo" value={form.codigo} onChange={handleInput} className="mt-1 rounded-xl" required />
              </div>

              {/* Centro */}
              <div>
                <Label>Centro de trabajo</Label>
                <Select value={form.centroNombre} onValueChange={(v) => setForm((p) => ({ ...p, centroNombre: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>{CENTROS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Cargo */}
              <div>
                <Label>Cargo base</Label>
                <Select value={form.cargoNombre} onValueChange={(v) => { const c = CARGOS.find((x) => x.nombre === v); setForm((p) => ({ ...p, cargoNombre: v, riesgosClave: c?.riesgos ?? p.riesgosClave, requiereDS44: c?.ds44 ?? p.requiereDS44 })); }}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>{CARGOS.map((c) => <SelectItem key={c.nombre} value={c.nombre}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Dotación */}
              <div>
                <Label htmlFor="m-dot">Dotación requerida</Label>
                <Input id="m-dot" name="dotacionRequerida" type="number" min={1} value={form.dotacionRequerida} onChange={handleInput} className="mt-1 rounded-xl" />
              </div>

              {/* Turno */}
              <div>
                <Label>Turno</Label>
                <Select value={form.turno} onValueChange={(v) => setForm((p) => ({ ...p, turno: v as Turno }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Diurno", "Nocturno", "Mixto", "Especial"] as Turno[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Modalidad */}
              <div>
                <Label>Modalidad</Label>
                <Select value={form.modalidad} onValueChange={(v) => setForm((p) => ({ ...p, modalidad: v as Modalidad }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Presencial", "Híbrido", "Remoto"] as Modalidad[]).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v as Estado }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ubicación */}
              <div>
                <Label htmlFor="m-ubi">Ubicación / referencia</Label>
                <Input id="m-ubi" name="ubicacion" value={form.ubicacion} onChange={handleInput} placeholder="Ej: Sector torre A, piso 10…" className="mt-1 rounded-xl" />
              </div>

              {/* Riesgos */}
              <div className="sm:col-span-2">
                <Label htmlFor="m-riesgos">Riesgos clave</Label>
                <textarea
                  id="m-riesgos" name="riesgosClave" value={form.riesgosClave} onChange={handleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[72px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Ej: Trabajo en altura, izaje de cargas…"
                />
              </div>

              {/* DS44 */}
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="m-ds44" name="requiereDS44" checked={form.requiereDS44} onChange={handleInput} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                <Label htmlFor="m-ds44" className="cursor-pointer">Incluir en matriz DS44</Label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                {isEdit ? "Guardar cambios" : "Crear posición"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function KpiCard({ icon, label, value, bg, highlight }: {
  icon: React.ReactNode; label: string; value: number; bg: string; highlight?: boolean;
}) {
  return (
    <Card className={`border border-slate-200 shadow-sm rounded-2xl ${highlight ? "ring-1 ring-rose-200" : ""}`}>
      <CardContent className="p-5">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg} mb-3`}>{icon}</div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${highlight ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-[140px]">
      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function DrawerStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="text-slate-500 min-w-[80px] shrink-0">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function ComplianceBar({ icon, label, pct }: { icon: React.ReactNode; label: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        <span className={`font-semibold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
