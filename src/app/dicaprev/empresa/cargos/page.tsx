// src/app/dicaprev/empresa/cargos/page.tsx
"use client";

import React, { useState, useMemo, useCallback, ChangeEvent, FormEvent, useEffect } from "react";
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
  BookOpen, Users, Shield, FileText, GraduationCap,
  AlertTriangle, Search, Plus, X, ChevronRight,
  MapPin, Layers, Tag, SlidersHorizontal, CheckCircle2,
} from "lucide-react";
import {
  empresaStore,
  type EmpresaCargo,
  type CargoEstado,
  type CargoTipoUI,
} from "@/lib/empresa/empresa-store";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Estado = CargoEstado;
type Tipo   = CargoTipoUI;
type Cargo  = EmpresaCargo;

type CargoForm = Omit<Cargo, "id" | "creadoEl" | "trabajadores" | "centros">;

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */

// Mock data centralised in empresa-store.ts. Initial state comes from the store.

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function tipoColor(tipo: Tipo): string {
  const map: Record<Tipo, string> = {
    "Prevención":    "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Supervisión":   "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Operativo":     "bg-sky-50 text-sky-700 border-sky-100",
    "Técnico":       "bg-violet-50 text-violet-700 border-violet-100",
    "Administración":"bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[tipo] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

function nextCodigo(cargos: Cargo[]): string {
  // Just return a placeholder; user defines codes manually
  return `CAR-${String(cargos.length + 1).padStart(3, "0")}`;
}

function emptyForm(): CargoForm {
  const areas = empresaStore.getAreas();
  return {
    nombre: "", codigo: "",
    areaId: areas[0]?.id ?? "", areaNombre: areas[0]?.nombre ?? "",
    tipo: "Operativo", descripcion: "", perfilSST: "",
    riesgosClave: "", requiereDS44: false,
    documentosBase: [], capacitacionesBase: [],
    estado: "activo",
  };
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CargosPage() {
  const [cargos, setCargos]       = useState<Cargo[]>(() => empresaStore.getCargos());

  /* filters */
  const [search, setSearch]       = useState("");
  const [fArea, setFArea]         = useState("todas");
  const [fEstado, setFEstado]     = useState<"todos" | Estado>("todos");
  const [fTipo, setFTipo]         = useState<"todos" | Tipo>("todos");
  const [fDs44, setFDs44]         = useState(false);

  /* drawer */
  const [drawerCargo, setDrawerCargo] = useState<Cargo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null);
  const [plantillaActiva, setPlantillaActiva] = useState<string | null>(null);

  // Initialise store on client mount and sync state
  useEffect(() => {
    empresaStore.init();
    const s = empresaStore.getActiveStructure();
    setCargos(s.cargos);
    setPlantillaActiva(s.tipoPlantilla);
  }, []);

  // Wrapper: update local state AND sync to store
  function updateCargos(updater: (prev: Cargo[]) => Cargo[]) {
    setCargos((prev) => {
      const next = updater(prev);
      empresaStore.setCargos(next);
      return next;
    });
  }

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<CargoForm>(emptyForm());

  /* docs/caps input helpers */
  const [docInput, setDocInput]   = useState("");
  const [capInput, setCapInput]   = useState("");

  const isEdit = editingId !== null;

  /* ── KPIs ── */
  const activos       = cargos.filter((c) => c.estado === "activo");
  const kpiActivos    = activos.length;
  const kpiTrabaj     = activos.reduce((s, c) => s + c.trabajadores, 0);
  const kpiDs44       = activos.filter((c) => c.requiereDS44).length;
  const kpiDocs       = activos.reduce((s, c) => s + c.documentosBase.length, 0);
  const kpiCaps       = activos.reduce((s, c) => s + c.capacitacionesBase.length, 0);

  /* ── Filtered ── */
  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cargos.filter((c) => {
      if (q && !`${c.nombre} ${c.codigo} ${c.areaNombre} ${c.tipo}`.toLowerCase().includes(q)) return false;
      if (fArea !== "todas" && c.areaId !== fArea) return false;
      if (fEstado !== "todos" && c.estado !== fEstado) return false;
      if (fTipo !== "todos" && c.tipo !== fTipo) return false;
      if (fDs44 && !c.requiereDS44) return false;
      return true;
    });
  }, [cargos, search, fArea, fEstado, fTipo, fDs44]);

  /* ── Handlers ── */
  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm(), codigo: nextCodigo(cargos) });
    setDocInput(""); setCapInput("");
    setModalOpen(true);
  }, [cargos]);

  const openEdit = useCallback((c: Cargo) => {
    setEditingId(c.id);
    setForm({ nombre: c.nombre, codigo: c.codigo, areaId: c.areaId, areaNombre: c.areaNombre, tipo: c.tipo, descripcion: c.descripcion, perfilSST: c.perfilSST, riesgosClave: c.riesgosClave, requiereDS44: c.requiereDS44, documentosBase: [...c.documentosBase], capacitacionesBase: [...c.capacitacionesBase], estado: c.estado });
    setDocInput(""); setCapInput("");
    setModalOpen(true);
    setDrawerCargo(null);
  }, []);

  const toggleEstado = (id: string) => {
    updateCargos((prev) => prev.map((c) => c.id === id ? { ...c, estado: c.estado === "activo" ? "inactivo" : "activo" } : c));
    setDrawerCargo((prev) => prev?.id === id ? { ...prev, estado: prev.estado === "activo" ? "inactivo" : "activo" } : prev);
  };

  const tryDeleteCargo = (cargo: Cargo) => {
    setDeleteTarget(cargo);
  };

  const confirmDeleteCargo = () => {
    if (!deleteTarget) return;
    updateCargos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    if (drawerCargo?.id === deleteTarget.id) setDrawerCargo(null);
    setDeleteTarget(null);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const addDoc = () => {
    const v = docInput.trim();
    if (v && !form.documentosBase.includes(v)) setForm((p) => ({ ...p, documentosBase: [...p.documentosBase, v] }));
    setDocInput("");
  };
  const removeDoc = (d: string) => setForm((p) => ({ ...p, documentosBase: p.documentosBase.filter((x) => x !== d) }));

  const addCap = () => {
    const v = capInput.trim();
    if (v && !form.capacitacionesBase.includes(v)) setForm((p) => ({ ...p, capacitacionesBase: [...p.capacitacionesBase, v] }));
    setCapInput("");
  };
  const removeCap = (c: string) => setForm((p) => ({ ...p, capacitacionesBase: p.capacitacionesBase.filter((x) => x !== c) }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const area = empresaStore.getAreas().find((a) => a.id === form.areaId);
    const merged = { ...form, areaNombre: area?.nombre ?? form.areaNombre };
    if (isEdit && editingId) {
      updateCargos((prev) => prev.map((c) => c.id === editingId ? { ...c, ...merged } : c));
      setDrawerCargo((prev) => prev?.id === editingId ? { ...prev, ...merged } : prev);
    } else {
      const nuevo: Cargo = { id: `c-${Date.now()}`, ...merged, trabajadores: 0, centros: [], creadoEl: new Date().toISOString().slice(0, 10) };
      updateCargos((prev) => [nuevo, ...prev]);
    }
    setModalOpen(false);
  };

  const clearFilters = () => { setSearch(""); setFArea("todas"); setFEstado("todos"); setFTipo("todos"); setFDs44(false); };
  const hasFilters = search || fArea !== "todas" || fEstado !== "todos" || fTipo !== "todos" || fDs44;

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="py-10 space-y-8">

        <StandardPageHeader
          moduleLabel="Módulo Empresa"
          title="Cargos"
          description="Catálogo maestro de roles del sistema. Define qué exige cada cargo en términos de perfil, riesgos, documentación obligatoria y capacitaciones base."
          icon={<BookOpen className="h-6 w-6" />}
          iconWrapClassName="bg-violet-700"
          actions={
            <button
              onClick={openCreate}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Nuevo cargo
            </button>
          }
        />

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={<BookOpen className="h-5 w-5 text-violet-600" />}      label="Cargos activos"          value={kpiActivos} bg="bg-violet-50" />
          <KpiCard icon={<Users className="h-5 w-5 text-sky-600" />}            label="Trabajadores asociados"  value={kpiTrabaj}  bg="bg-sky-50" />
          <KpiCard icon={<Shield className="h-5 w-5 text-rose-600" />}          label="Cargos críticos DS44"    value={kpiDs44}    bg="bg-rose-50" highlight={kpiDs44 > 0} />
          <KpiCard icon={<FileText className="h-5 w-5 text-amber-600" />}       label="Documentos base"         value={kpiDocs}    bg="bg-amber-50" />
          <KpiCard icon={<GraduationCap className="h-5 w-5 text-emerald-600" />} label="Capacitaciones base"   value={kpiCaps}    bg="bg-emerald-50" />
        </div>

        {/* ── PLANTILLA BANNER ── */}
        {plantillaActiva && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" />
            <span className="flex-1">
              Estructura cargada desde plantilla: <strong>{plantillaActiva}</strong>. Edita libremente desde aquí.
            </span>
            <a
              href="/dicaprev/empresa"
              className="text-xs font-semibold underline underline-offset-2 hover:text-violet-600 transition"
            >
              Cambiar plantilla
            </a>
          </div>
        )}

        {/* ── FILTROS ── */}
        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[220px]">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, código, área…" className="pl-9 rounded-xl" />
                </div>
              </div>

              <FilterSelect label="Área"   value={fArea}   onChange={setFArea}   options={[{ value: "todas", label: "Todas" }, ...empresaStore.getAreas().map((a) => ({ value: a.id, label: a.nombre }))]} />
              <FilterSelect label="Estado" value={fEstado} onChange={(v) => setFEstado(v as "todos" | Estado)} options={[{ value: "todos", label: "Todos" }, { value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }]} />
              <FilterSelect label="Tipo"   value={fTipo}   onChange={(v) => setFTipo(v as "todos" | Tipo)}     options={[{ value: "todos", label: "Todos" }, ...["Operativo","Supervisión","Administración","Prevención","Técnico"].map((t) => ({ value: t, label: t }))]} />

              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">DS44</Label>
                <button
                  type="button"
                  onClick={() => setFDs44((v) => !v)}
                  className={`mt-1 h-10 px-4 rounded-xl border text-sm font-medium transition ${fDs44 ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <Shield className={`inline h-4 w-4 mr-1.5 ${fDs44 ? "text-white" : "text-rose-500"}`} />
                  {fDs44 ? "Solo DS44" : "Todos"}
                </button>
              </div>

              {hasFilters && (
                <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mt-6 transition">
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">{filtrados.length} de {cargos.length} cargos</p>
          </CardContent>
        </Card>

        {/* ── TABLA ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Cargo</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 max-w-[180px]">Perfil SST</th>
                  <th className="px-4 py-3 text-center">DS44</th>
                  <th className="px-4 py-3 text-center">Docs base</th>
                  <th className="px-4 py-3 text-center">Caps base</th>
                  <th className="px-4 py-3 text-center">Trabaj.</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setDrawerCargo((prev) => prev?.id === c.id ? null : c)}
                    className={`group cursor-pointer hover:bg-slate-50/60 transition-colors ${drawerCargo?.id === c.id ? "bg-violet-50/40" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{c.nombre}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.codigo}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{c.areaNombre}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${tipoColor(c.tipo)}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <p className="text-xs text-slate-500 line-clamp-2">{c.perfilSST}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.requiereDS44 ? (
                        <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold border bg-rose-50 text-rose-600 border-rose-100">
                          <Shield className="h-3 w-3 mr-1" />Sí
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-amber-700">
                        <FileText className="h-3.5 w-3.5 text-amber-400" />{c.documentosBase.length}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-emerald-700">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />{c.capacitacionesBase.length}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
                        <Users className="h-3.5 w-3.5 text-sky-400" />{c.trabajadores}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${c.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        {c.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDrawerCargo((prev) => prev?.id === c.id ? null : c)} className="rounded-lg px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 transition font-medium">Ver</button>
                        <button onClick={() => openEdit(c)} className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition">Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtrados.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">
                <SlidersHorizontal className="mx-auto h-8 w-8 mb-3 text-slate-300" />
                No se encontraron cargos con los filtros aplicados.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          DRAWER LATERAL
      ═══════════════════════════════════════════ */}
      <div className={`fixed inset-y-0 right-0 z-40 flex flex-col w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300 ${drawerCargo ? "translate-x-0" : "translate-x-full"}`}>
        {drawerCargo && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{drawerCargo.codigo}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${tipoColor(drawerCargo.tipo)}`}>{drawerCargo.tipo}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${drawerCargo.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                    {drawerCargo.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                  {drawerCargo.requiereDS44 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                      <Shield className="h-3 w-3" /> DS44
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{drawerCargo.nombre}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <Tag className="h-3.5 w-3.5 shrink-0" />{drawerCargo.areaNombre}
                </p>
              </div>
              <button onClick={() => setDrawerCargo(null)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Stats rápidos */}
              <div className="grid grid-cols-3 gap-3">
                <DrawerStat icon={<Users className="h-4 w-4 text-sky-500" />}            label="Trabajadores" value={drawerCargo.trabajadores} />
                <DrawerStat icon={<FileText className="h-4 w-4 text-amber-500" />}       label="Docs base"    value={drawerCargo.documentosBase.length} />
                <DrawerStat icon={<GraduationCap className="h-4 w-4 text-emerald-500" />} label="Caps base"  value={drawerCargo.capacitacionesBase.length} />
              </div>

              {/* Descripción */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Descripción del rol</p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.descripcion}</p>
              </div>

              {/* Perfil SST */}
              <div className="rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Perfil SST requerido
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.perfilSST}</p>
              </div>

              {/* Riesgos */}
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Riesgos clave
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.riesgosClave}</p>
              </div>

              {/* Documentos base */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Documentos base ({drawerCargo.documentosBase.length})
                </p>
                {drawerCargo.documentosBase.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin documentos base definidos</p>
                ) : (
                  <ul className="space-y-1.5">
                    {drawerCargo.documentosBase.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />{d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Capacitaciones base */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Capacitaciones base ({drawerCargo.capacitacionesBase.length})
                </p>
                {drawerCargo.capacitacionesBase.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin capacitaciones base definidas</p>
                ) : (
                  <ul className="space-y-1.5">
                    {drawerCargo.capacitacionesBase.map((cap) => (
                      <li key={cap} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />{cap}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Centros donde se usa */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Centros / posiciones activas ({drawerCargo.centros.length})
                </p>
                {drawerCargo.centros.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
                    Sin posiciones de dotación activas
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {drawerCargo.centros.map((centro) => (
                      <div key={centro} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm">
                        <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        {centro}
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex gap-2">
              <button onClick={() => openEdit(drawerCargo)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Editar
              </button>
              <button
                onClick={() => toggleEstado(drawerCargo.id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${drawerCargo.estado === "activo" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {drawerCargo.estado === "activo" ? "Desactivar" : "Reactivar"}
              </button>
              <button onClick={() => tryDeleteCargo(drawerCargo)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition border border-rose-100">
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Overlay mobile */}
      {drawerCargo && (
        <div className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden" onClick={() => setDrawerCargo(null)} />
      )}

      {/* ═══════════════════════════════════════════
          MODAL CREAR / EDITAR
      ═══════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {isEdit ? "Editar cargo" : "Nuevo cargo"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define el rol base: perfil SST, riesgos, documentos y capacitaciones obligatorias.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-1">

            {/* BLOQUE: Info básica */}
            <FormSection label="Información básica">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="m-nombre">Nombre del cargo</Label>
                  <Input id="m-nombre" name="nombre" value={form.nombre} onChange={handleInput} className="mt-1 rounded-xl" required placeholder="Ej: Prevencionista de Riesgos" />
                </div>
                <div>
                  <Label htmlFor="m-codigo">Código</Label>
                  <Input id="m-codigo" name="codigo" value={form.codigo} onChange={handleInput} className="mt-1 rounded-xl" required placeholder="Ej: PRV-001" />
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={form.areaId} onValueChange={(v) => setForm((p) => ({ ...p, areaId: v, areaNombre: empresaStore.getAreas().find((a) => a.id === v)?.nombre ?? p.areaNombre }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{empresaStore.getAreas().map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as Tipo }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Operativo","Supervisión","Administración","Prevención","Técnico"] as Tipo[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="flex items-center gap-2 self-end pb-1">
                  <input type="checkbox" id="m-ds44" name="requiereDS44" checked={form.requiereDS44} onChange={handleInput} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                  <Label htmlFor="m-ds44" className="cursor-pointer">Requiere DS44</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="m-desc">Descripción del rol</Label>
                <textarea id="m-desc" name="descripcion" value={form.descripcion} onChange={handleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[72px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Describe las responsabilidades principales del rol…" />
              </div>
            </FormSection>

            {/* BLOQUE: Perfil SST y riesgos */}
            <FormSection label="Perfil SST y riesgos">
              <div>
                <Label htmlFor="m-sst">Perfil SST requerido</Label>
                <textarea id="m-sst" name="perfilSST" value={form.perfilSST} onChange={handleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[60px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Ej: Experto en Prevención de Riesgos. Registro SEREMI vigente…" />
              </div>
              <div>
                <Label htmlFor="m-riesgos">Riesgos clave</Label>
                <textarea id="m-riesgos" name="riesgosClave" value={form.riesgosClave} onChange={handleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[60px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Ej: Trabajo en altura, riesgo eléctrico, izaje de cargas…" />
              </div>
            </FormSection>

            {/* BLOQUE: Documentos base */}
            <FormSection label="Documentos base obligatorios">
              <div className="flex gap-2">
                <Input value={docInput} onChange={(e) => setDocInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDoc(); } }} placeholder="Ej: Credencial prevención vigente" className="rounded-xl flex-1" />
                <Button type="button" variant="outline" onClick={addDoc} className="rounded-xl px-4 shrink-0">Agregar</Button>
              </div>
              {form.documentosBase.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {form.documentosBase.map((d) => (
                    <li key={d} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-sm text-slate-700">
                      <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="flex-1">{d}</span>
                      <button type="button" onClick={() => removeDoc(d)} className="text-slate-400 hover:text-rose-500 transition"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>

            {/* BLOQUE: Capacitaciones base */}
            <FormSection label="Capacitaciones base obligatorias">
              <div className="flex gap-2">
                <Input value={capInput} onChange={(e) => setCapInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCap(); } }} placeholder="Ej: Trabajo en altura básico" className="rounded-xl flex-1" />
                <Button type="button" variant="outline" onClick={addCap} className="rounded-xl px-4 shrink-0">Agregar</Button>
              </div>
              {form.capacitacionesBase.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {form.capacitacionesBase.map((cap) => (
                    <li key={cap} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm text-slate-700">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="flex-1">{cap}</span>
                      <button type="button" onClick={() => removeCap(cap)} className="text-slate-400 hover:text-rose-500 transition"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="rounded-full px-6 bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                {isEdit ? "Guardar cambios" : "Crear cargo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE DIALOG ── Blocked (has deps) ── */}
      {deleteTarget !== null &&
        (deleteTarget.trabajadores > 0 || deleteTarget.centros.length > 0) && (
          <Dialog open onOpenChange={() => setDeleteTarget(null)}>
            <DialogContent className="max-w-md rounded-3xl border border-slate-200 shadow-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  </div>
                  <DialogTitle className="text-xl font-semibold text-slate-900">
                    No se puede eliminar
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-slate-600 ml-[3rem] leading-relaxed">
                  <strong>{deleteTarget.nombre}</strong> tiene dependencias activas.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 space-y-1.5 ml-1">
                {deleteTarget.trabajadores > 0 && (
                  <p className="text-sm text-slate-700">
                    &bull; <strong>{deleteTarget.trabajadores}</strong> trabajador{deleteTarget.trabajadores > 1 ? "es" : ""} con este cargo
                  </p>
                )}
                {deleteTarget.centros.length > 0 && (
                  <p className="text-sm text-slate-700">
                    &bull; <strong>{deleteTarget.centros.length}</strong> centro{deleteTarget.centros.length > 1 ? "s" : ""} con posiciones activas
                  </p>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Puedes <strong>desactivar</strong> el cargo para ocultarlo sin perder informaci&oacute;n.
              </p>
              <DialogFooter className="mt-4 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-slate-700 hover:bg-slate-800 text-white"
                  onClick={() => {
                    toggleEstado(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                >
                  Desactivar cargo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      {/* ── DELETE DIALOG ── Confirm (no deps) ── */}
      {deleteTarget !== null &&
        deleteTarget.trabajadores === 0 &&
        deleteTarget.centros.length === 0 && (
          <Dialog open onOpenChange={() => setDeleteTarget(null)}>
            <DialogContent className="max-w-md rounded-3xl border border-slate-200 shadow-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  </div>
                  <DialogTitle className="text-xl font-semibold text-slate-900">
                    &iquest;Eliminar cargo?
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-slate-600 ml-[3rem] leading-relaxed">
                  Se eliminar&aacute; <strong>{deleteTarget.nombre}</strong> de forma permanente. Esta acci&oacute;n no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </Button>
                <Button type="button" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={confirmDeleteCargo}>
                  S&iacute;, eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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

function DrawerStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {children}
    </div>
  );
}
