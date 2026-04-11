"use client";

import React, { useState, useMemo, useCallback, ChangeEvent, FormEvent, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Network, Users, Layers, ShieldAlert, ChevronRight, X, Pencil,
  AlertTriangle, BookOpen, CheckCircle2, Building2, Mail, Phone,
  Shield, FileText, GraduationCap, Search, Plus, MapPin, Tag, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  empresaStore,
  type EmpresaArea as Area,
  type AreaStatus,
  type EmpresaCargo as Cargo,
  type CargoEstado,
  type CargoTipoUI,
} from "@/lib/empresa/empresa-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = "areas" | "cargos";
type CargoForm = Omit<Cargo, "id" | "creadoEl" | "trabajadores" | "centros">;
type AreaForm = {
  nombre: string; codigo: string; descripcion: string;
  responsable: string; correoResponsable: string; telefonoResponsable: string;
  estado: AreaStatus;
};

const EMPTY_AREA_FORM: AreaForm = {
  nombre: "", codigo: "", descripcion: "",
  responsable: "", correoResponsable: "", telefonoResponsable: "", estado: "activa",
};

function emptyCargoForm(): CargoForm {
  const areas = empresaStore.getAreas();
  return {
    nombre: "", codigo: "",
    areaId: areas[0]?.id ?? "", areaNombre: areas[0]?.nombre ?? "",
    tipo: "Operativo", descripcion: "", perfilSST: "",
    riesgosClave: "", requiereDS44: false,
    documentosBase: [], capacitacionesBase: [], estado: "activo",
  };
}

function nextCodigoCargo(cargos: Cargo[]): string {
  return `CAR-${String(cargos.length + 1).padStart(3, "0")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tipoColor(tipo: CargoTipoUI): string {
  const map: Record<CargoTipoUI, string> = {
    "Prevención":     "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Supervisión":    "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Operativo":      "bg-sky-50 text-sky-700 border-sky-100",
    "Técnico":        "bg-violet-50 text-violet-700 border-violet-100",
    "Administración": "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[tipo] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CumplimientoBar({ value, small }: { value: number; small?: boolean }) {
  const color = value >= 85 ? "bg-emerald-500" : value >= 60 ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className={cn("bg-slate-100 rounded-full overflow-hidden shrink-0", small ? "h-1.5 w-20" : "h-2 w-28")}>
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("font-semibold text-slate-700", small ? "text-xs" : "text-sm")}>{value}%</span>
    </div>
  );
}

function AreaKpiCard({ label, value, icon, accent, sub }: {
  label: string; value: string | number; icon: React.ReactNode; accent: string; sub?: string;
}) {
  return (
    <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accent)}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function CargoKpiCard({ icon, label, value, bg, highlight }: {
  icon: React.ReactNode; label: string; value: number; bg: string; highlight?: boolean;
}) {
  return (
    <Card className={cn("border border-slate-200 shadow-sm rounded-2xl", highlight && "ring-1 ring-rose-200")}>
      <CardContent className="p-5">
        <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3", bg)}>{icon}</div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={cn("mt-1 text-2xl font-bold", highlight ? "text-rose-600" : "text-slate-900")}>{value}</p>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AreasCargosPage() {

  // ── Shared state ──
  const [mainTab, setMainTab] = useState<MainTab>("areas");
  const [plantillaActiva, setPlantillaActiva] = useState<string | null>(null);

  // ── Areas state ──
  const [areas, setAreas]                   = useState<Area[]>(() => empresaStore.getAreas());
  const [aSearch, setASearch]               = useState("");
  const [aEstado, setAEstado]               = useState<AreaStatus | "todas">("todas");
  const [aConTrab, setAConTrab]             = useState(false);
  const [aDs44, setADs44]                   = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [aModalOpen, setAModalOpen]         = useState(false);
  const [editingAreaId, setEditingAreaId]   = useState<string | null>(null);
  const [aForm, setAForm]                   = useState<AreaForm>(EMPTY_AREA_FORM);
  const [aDeleteTarget, setADeleteTarget]   = useState<Area | null>(null);

  // ── Cargos state ──
  const [cargos, setCargos]                     = useState<Cargo[]>(() => empresaStore.getCargos());
  const [cSearch, setCSearch]                   = useState("");
  const [cFArea, setCFArea]                     = useState("todas");
  const [cFEstado, setCFEstado]                 = useState<"todos" | CargoEstado>("todos");
  const [cFTipo, setCFTipo]                     = useState<"todos" | CargoTipoUI>("todos");
  const [cFDs44, setCFDs44]                     = useState(false);
  const [drawerCargo, setDrawerCargo]           = useState<Cargo | null>(null);
  const [cDeleteTarget, setCDeleteTarget]       = useState<Cargo | null>(null);
  const [cModalOpen, setCModalOpen]             = useState(false);
  const [editingCargoId, setEditingCargoId]     = useState<string | null>(null);
  const [cForm, setCForm]                       = useState<CargoForm>(emptyCargoForm());
  const [docInput, setDocInput]                 = useState("");
  const [capInput, setCapInput]                 = useState("");

  // ── Init ──
  useEffect(() => {
    empresaStore.init();
    const s = empresaStore.getActiveStructure();
    setAreas(s.areas);
    setCargos(s.cargos);
    setPlantillaActiva(s.tipoPlantilla);
  }, []);

  // ── Store sync helpers ──
  function updateAreas(updater: (prev: Area[]) => Area[]) {
    setAreas((prev) => { const next = updater(prev); empresaStore.setAreas(next); return next; });
  }
  function updateCargos(updater: (prev: Cargo[]) => Cargo[]) {
    setCargos((prev) => { const next = updater(prev); empresaStore.setCargos(next); return next; });
  }

  // ── Cross-tab navigation: area → view its cargos ──
  function verCargosDeArea(areaId: string) {
    setCFArea(areaId);
    setMainTab("cargos");
    setSelectedAreaId(null);
  }

  // ─── Areas KPIs ───
  const aActivas     = useMemo(() => areas.filter((a) => a.estado === "activa").length, [areas]);
  const aTotalCargos = useMemo(() => areas.reduce((acc, a) => acc + a.cargosNombres.length, 0), [areas]);
  const aTotalDot    = useMemo(() => areas.reduce((acc, a) => acc + a.dotacionTotal, 0), [areas]);
  const aTotalTrab   = useMemo(() => areas.reduce((acc, a) => acc + a.trabajadores, 0), [areas]);
  const aAreasDs44   = useMemo(() => areas.filter((a) => a.tieneDs44).length, [areas]);

  const aFiltradas = useMemo(() => {
    const q = aSearch.trim().toLowerCase();
    return areas.filter((a) => {
      if (q && !`${a.nombre} ${a.codigo} ${a.responsable}`.toLowerCase().includes(q)) return false;
      if (aEstado !== "todas" && a.estado !== aEstado) return false;
      if (aConTrab && a.trabajadores === 0) return false;
      if (aDs44 && !a.tieneDs44) return false;
      return true;
    });
  }, [areas, aSearch, aEstado, aConTrab, aDs44]);

  const selectedArea = useMemo(() => areas.find((a) => a.id === selectedAreaId) ?? null, [areas, selectedAreaId]);

  // ─── Areas handlers ───
  function aOpenCreate() {
    setEditingAreaId(null);
    setAForm(EMPTY_AREA_FORM);
    setAModalOpen(true);
  }
  function aOpenEdit(area: Area) {
    setEditingAreaId(area.id);
    setAForm({
      nombre: area.nombre, codigo: area.codigo, descripcion: area.descripcion,
      responsable: area.responsable, correoResponsable: area.correoResponsable,
      telefonoResponsable: area.telefonoResponsable ?? "", estado: area.estado,
    });
    setAModalOpen(true);
  }
  function aHandleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editingAreaId) {
      updateAreas((prev) => prev.map((a) => a.id === editingAreaId ? { ...a, ...aForm } : a));
    } else {
      const newArea: Area = {
        id: `a-${Date.now()}`, creadaEl: new Date().toISOString().slice(0, 10),
        cargosNombres: [], cargosIds: [], dotacionTotal: 0, asignadosTotal: 0,
        vacantesTotal: 0, trabajadores: 0, cumplimientoPromedio: 0, tieneDs44: false,
        ...aForm,
      };
      updateAreas((prev) => [newArea, ...prev]);
    }
    setAModalOpen(false);
  }
  function aToggleEstado(id: string) {
    updateAreas((prev) => prev.map((a) => a.id === id ? { ...a, estado: a.estado === "activa" ? "inactiva" : "activa" } : a));
  }

  // ─── Cargos KPIs ───
  const cActivos    = cargos.filter((c) => c.estado === "activo");
  const kpiCActivos = cActivos.length;
  const kpiCTrab    = cActivos.reduce((s, c) => s + c.trabajadores, 0);
  const kpiCDs44    = cActivos.filter((c) => c.requiereDS44).length;
  const kpiCDocs    = cActivos.reduce((s, c) => s + c.documentosBase.length, 0);
  const kpiCCaps    = cActivos.reduce((s, c) => s + c.capacitacionesBase.length, 0);

  const cFiltrados = useMemo(() => {
    const q = cSearch.trim().toLowerCase();
    return cargos.filter((c) => {
      if (q && !`${c.nombre} ${c.codigo} ${c.areaNombre} ${c.tipo}`.toLowerCase().includes(q)) return false;
      if (cFArea !== "todas" && c.areaId !== cFArea) return false;
      if (cFEstado !== "todos" && c.estado !== cFEstado) return false;
      if (cFTipo !== "todos" && c.tipo !== cFTipo) return false;
      if (cFDs44 && !c.requiereDS44) return false;
      return true;
    });
  }, [cargos, cSearch, cFArea, cFEstado, cFTipo, cFDs44]);

  // ─── Cargos handlers ───
  const cOpenCreate = useCallback(() => {
    setEditingCargoId(null);
    setCForm({ ...emptyCargoForm(), codigo: nextCodigoCargo(cargos) });
    setDocInput(""); setCapInput("");
    setCModalOpen(true);
  }, [cargos]);

  const cOpenEdit = useCallback((c: Cargo) => {
    setEditingCargoId(c.id);
    setCForm({
      nombre: c.nombre, codigo: c.codigo, areaId: c.areaId, areaNombre: c.areaNombre,
      tipo: c.tipo, descripcion: c.descripcion, perfilSST: c.perfilSST,
      riesgosClave: c.riesgosClave, requiereDS44: c.requiereDS44,
      documentosBase: [...c.documentosBase], capacitacionesBase: [...c.capacitacionesBase],
      estado: c.estado,
    });
    setDocInput(""); setCapInput("");
    setCModalOpen(true);
    setDrawerCargo(null);
  }, []);

  function cToggleEstado(id: string) {
    updateCargos((prev) => prev.map((c) => c.id === id ? { ...c, estado: c.estado === "activo" ? "inactivo" : "activo" } : c));
    setDrawerCargo((prev) => prev?.id === id ? { ...prev, estado: prev.estado === "activo" ? "inactivo" : "activo" } : prev);
  }
  function cHandleInput(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setCForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }
  function addDoc() {
    const v = docInput.trim();
    if (v && !cForm.documentosBase.includes(v)) setCForm((p) => ({ ...p, documentosBase: [...p.documentosBase, v] }));
    setDocInput("");
  }
  function removeDoc(d: string) { setCForm((p) => ({ ...p, documentosBase: p.documentosBase.filter((x) => x !== d) })); }
  function addCap() {
    const v = capInput.trim();
    if (v && !cForm.capacitacionesBase.includes(v)) setCForm((p) => ({ ...p, capacitacionesBase: [...p.capacitacionesBase, v] }));
    setCapInput("");
  }
  function removeCap(c: string) { setCForm((p) => ({ ...p, capacitacionesBase: p.capacitacionesBase.filter((x) => x !== c) })); }
  function cHandleSubmit(e: FormEvent) {
    e.preventDefault();
    const area = empresaStore.getAreas().find((a) => a.id === cForm.areaId);
    const merged = { ...cForm, areaNombre: area?.nombre ?? cForm.areaNombre };
    if (editingCargoId) {
      updateCargos((prev) => prev.map((c) => c.id === editingCargoId ? { ...c, ...merged } : c));
      setDrawerCargo((prev) => prev?.id === editingCargoId ? { ...prev, ...merged } : prev);
    } else {
      const nuevo: Cargo = {
        id: `c-${Date.now()}`, ...merged,
        trabajadores: 0, centros: [], creadoEl: new Date().toISOString().slice(0, 10),
      };
      updateCargos((prev) => [nuevo, ...prev]);
    }
    setCModalOpen(false);
  }
  const cHasFilters = cSearch || cFArea !== "todas" || cFEstado !== "todos" || cFTipo !== "todos" || cFDs44;

  /* ─────────────────────────────── RENDER ─────────────────────────────── */

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                mainTab === "areas" ? "bg-teal-600" : "bg-violet-600",
              )}>
                {mainTab === "areas"
                  ? <Network className="h-5 w-5 text-white" />
                  : <BookOpen className="h-5 w-5 text-white" />}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Áreas y cargos</h1>
            </div>
            <p className="text-sm text-slate-500 max-w-xl pl-[3.25rem]">
              {mainTab === "areas"
                ? "Estructura organizacional. Cada área agrupa cargos, dotación y trabajadores."
                : "Catálogo maestro de roles. Define perfiles SST, documentos y capacitaciones base."}
            </p>
          </div>
          <button
            onClick={mainTab === "areas" ? aOpenCreate : cOpenCreate}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition",
              mainTab === "areas" ? "bg-teal-600 hover:bg-teal-700" : "bg-violet-600 hover:bg-violet-700",
            )}
          >
            <Plus className="h-4 w-4" />
            {mainTab === "areas" ? "Nueva área" : "Nuevo cargo"}
          </button>
        </div>

        {/* ── TAB BAR ── */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {(["areas", "cargos"] as MainTab[]).map((tab) => (
            <button key={tab} onClick={() => setMainTab(tab)}
              className={cn("relative px-5 py-2.5 text-sm font-semibold transition-colors",
                mainTab === tab ? "text-slate-900" : "text-slate-400 hover:text-slate-700")}>
              {tab === "areas" ? "Áreas" : "Cargos"}
              {mainTab === tab && (
                <span className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                  tab === "areas" ? "bg-teal-600" : "bg-violet-600")} />
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════
            TAB: ÁREAS
        ═══════════════════════════════════════════ */}
        {mainTab === "areas" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <AreaKpiCard label="Áreas activas"    value={aActivas}     icon={<Network className="h-5 w-5 text-white" />}     accent="bg-teal-600"   sub={`de ${areas.length} totales`} />
              <AreaKpiCard label="Cargos asociados" value={aTotalCargos} icon={<BookOpen className="h-5 w-5 text-white" />}    accent="bg-violet-600" sub="roles activos" />
              <AreaKpiCard label="Dotación total"   value={aTotalDot}    icon={<Layers className="h-5 w-5 text-white" />}      accent="bg-indigo-600" sub={`${areas.reduce((a, x) => a + x.asignadosTotal, 0)} asignados`} />
              <AreaKpiCard label="Trabajadores"     value={aTotalTrab}   icon={<Users className="h-5 w-5 text-white" />}       accent="bg-slate-700"  sub="vinculados a áreas" />
              <AreaKpiCard label="DS44 crítica"     value={aAreasDs44}   icon={<ShieldAlert className="h-5 w-5 text-white" />} accent="bg-rose-600"   sub="áreas con riesgo DS44" />
            </div>

            {plantillaActiva && (
              <div className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
                <span className="flex-1">Estructura desde plantilla: <strong>{plantillaActiva}</strong></span>
                <a href="/dicaprev/empresa" className="text-xs font-semibold underline underline-offset-2 hover:text-teal-600">Cambiar plantilla</a>
              </div>
            )}

            <Card className="border border-slate-200 rounded-2xl shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Buscar</Label>
                  <Input placeholder="Nombre, código o responsable…" className="mt-1 rounded-xl"
                    value={aSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => setASearch(e.target.value)} />
                </div>
                <div className="w-40">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</Label>
                  <Select value={aEstado} onValueChange={(v) => setAEstado(v as AreaStatus | "todas")}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="activa">Activas</SelectItem>
                      <SelectItem value="inactiva">Inactivas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4 pb-0.5">
                  <button type="button" onClick={() => setAConTrab((v) => !v)}
                    className={cn("flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition",
                      aConTrab ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                    <Users className="h-4 w-4" /> Con trabajadores
                  </button>
                  <button type="button" onClick={() => setADs44((v) => !v)}
                    className={cn("flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition",
                      aDs44 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                    <ShieldAlert className="h-4 w-4" /> DS44 Crítico
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Área", "Responsable", "Cargos", "Dotación", "Trabajadores", "Cumplimiento", "DS44", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 first:px-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {aFiltradas.map((area) => (
                      <tr key={area.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                              <Network className="h-4 w-4 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{area.nombre}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{area.codigo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{area.responsable}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-lg bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold w-8 h-7">
                            {area.cargosNombres.length}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-semibold text-slate-800">{area.asignadosTotal}/{area.dotacionTotal}</span>
                            {area.vacantesTotal > 0 && (
                              <span className="text-[10px] text-rose-600 font-medium">{area.vacantesTotal} vacante{area.vacantesTotal > 1 ? "s" : ""}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-semibold text-slate-800">{area.trabajadores}</span>
                        </td>
                        <td className="px-4 py-4">
                          {area.trabajadores > 0
                            ? <CumplimientoBar value={area.cumplimientoPromedio} small />
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {area.tieneDs44
                            ? <Badge className="rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-100">DS44</Badge>
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className={cn("rounded-full text-[11px] border",
                            area.estado === "activa" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200")}>
                            {area.estado === "activa" ? "Activa" : "Inactiva"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setSelectedAreaId(area.id)}
                              className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition">
                              Ver <ChevronRight className="h-3 w-3" />
                            </button>
                            {area.cargosNombres.length > 0 && (
                              <button type="button" onClick={() => verCargosDeArea(area.id)}
                                className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition">
                                Cargos
                              </button>
                            )}
                            <button type="button" onClick={() => aOpenEdit(area)}
                              className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {aFiltradas.length === 0 && (
                  <div className="py-16 text-center">
                    <Network className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                    <p className="text-sm font-medium text-slate-500">Sin áreas que coincidan</p>
                    <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o crea una nueva área.</p>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {/* ═══════════════════════════════════════════
            TAB: CARGOS
        ═══════════════════════════════════════════ */}
        {mainTab === "cargos" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <CargoKpiCard icon={<BookOpen className="h-5 w-5 text-violet-600" />}       label="Cargos activos"         value={kpiCActivos} bg="bg-violet-50" />
              <CargoKpiCard icon={<Users className="h-5 w-5 text-sky-600" />}             label="Trabajadores asignados" value={kpiCTrab}    bg="bg-sky-50" />
              <CargoKpiCard icon={<Shield className="h-5 w-5 text-rose-600" />}           label="Cargos críticos DS44"   value={kpiCDs44}    bg="bg-rose-50"    highlight={kpiCDs44 > 0} />
              <CargoKpiCard icon={<FileText className="h-5 w-5 text-amber-600" />}        label="Documentos base"        value={kpiCDocs}    bg="bg-amber-50" />
              <CargoKpiCard icon={<GraduationCap className="h-5 w-5 text-emerald-600" />} label="Capacitaciones base"   value={kpiCCaps}    bg="bg-emerald-50" />
            </div>

            {plantillaActiva && (
              <div className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" />
                <span className="flex-1">Estructura desde plantilla: <strong>{plantillaActiva}</strong></span>
                <a href="/dicaprev/empresa" className="text-xs font-semibold underline underline-offset-2 hover:text-violet-600">Cambiar plantilla</a>
              </div>
            )}

            <Card className="border border-slate-200 rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[220px]">
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Buscar</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input value={cSearch} onChange={(e) => setCSearch(e.target.value)}
                        placeholder="Nombre, código, área…" className="pl-9 rounded-xl" />
                    </div>
                  </div>
                  <FilterSelect label="Área"   value={cFArea}   onChange={setCFArea}
                    options={[{ value: "todas", label: "Todas las áreas" }, ...empresaStore.getAreas().map((a) => ({ value: a.id, label: a.nombre }))]} />
                  <FilterSelect label="Estado" value={cFEstado} onChange={(v) => setCFEstado(v as "todos" | CargoEstado)}
                    options={[{ value: "todos", label: "Todos" }, { value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }]} />
                  <FilterSelect label="Tipo"   value={cFTipo}   onChange={(v) => setCFTipo(v as "todos" | CargoTipoUI)}
                    options={[{ value: "todos", label: "Todos" }, ...["Operativo","Supervisión","Administración","Prevención","Técnico"].map((t) => ({ value: t, label: t }))]} />
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">DS44</Label>
                    <button type="button" onClick={() => setCFDs44((v) => !v)}
                      className={cn("mt-1 h-10 px-4 rounded-xl border text-sm font-medium transition",
                        cFDs44 ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                      <Shield className={cn("inline h-4 w-4 mr-1.5", cFDs44 ? "text-white" : "text-rose-500")} />
                      {cFDs44 ? "Solo DS44" : "Todos"}
                    </button>
                  </div>
                  {cHasFilters && (
                    <button type="button"
                      onClick={() => { setCSearch(""); setCFArea("todas"); setCFEstado("todos"); setCFTipo("todos"); setCFDs44(false); }}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mt-6 transition">
                      <X className="h-3.5 w-3.5" /> Limpiar
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-400">{cFiltrados.length} de {cargos.length} cargos</p>
              </CardContent>
            </Card>

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
                    {cFiltrados.map((c) => (
                      <tr key={c.id}
                        onClick={() => setDrawerCargo((prev) => prev?.id === c.id ? null : c)}
                        className={cn("group cursor-pointer hover:bg-slate-50/60 transition-colors", drawerCargo?.id === c.id && "bg-violet-50/40")}>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{c.nombre}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.codigo}</div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">{c.areaNombre}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border", tipoColor(c.tipo))}>{c.tipo}</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <p className="text-xs text-slate-500 line-clamp-2">{c.perfilSST}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {c.requiereDS44
                            ? <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold border bg-rose-50 text-rose-600 border-rose-100"><Shield className="h-3 w-3 mr-1" />Sí</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
                            <FileText className="h-3.5 w-3.5 text-amber-400" />{c.documentosBase.length}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                            <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />{c.capacitacionesBase.length}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
                            <Users className="h-3.5 w-3.5 text-sky-400" />{c.trabajadores}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                            c.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200")}>
                            {c.estado === "activo" ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setDrawerCargo((prev) => prev?.id === c.id ? null : c)}
                              className="rounded-lg px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 transition font-medium">Ver</button>
                            <button onClick={() => cOpenEdit(c)}
                              className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition">Editar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cFiltrados.length === 0 && (
                  <div className="py-16 text-center text-slate-400 text-sm">
                    <SlidersHorizontal className="mx-auto h-8 w-8 mb-3 text-slate-300" />
                    No se encontraron cargos con los filtros aplicados.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          AREA DRAWER
      ═══════════════════════════════════════════ */}
      <div aria-hidden onClick={() => setSelectedAreaId(null)}
        className={cn("fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300",
          selectedArea ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside className={cn("fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300",
        selectedArea ? "translate-x-0" : "translate-x-full")}>
        {selectedArea && (
          <>
            <div className="flex shrink-0 items-center gap-4 border-b border-slate-100 bg-teal-50 px-6 py-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600">
                <Network className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">{selectedArea.nombre}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs font-mono text-slate-500">{selectedArea.codigo}</span>
                  <Badge className={cn("rounded-full text-[11px] border",
                    selectedArea.estado === "activa" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200")}>
                    {selectedArea.estado === "activa" ? "Activa" : "Inactiva"}
                  </Badge>
                  {selectedArea.tieneDs44 && <Badge className="rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-100">DS44</Badge>}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedAreaId(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Cargos",      value: selectedArea.cargosNombres.length,  color: "text-violet-700" },
                  { label: "Dotación",    value: `${selectedArea.asignadosTotal}/${selectedArea.dotacionTotal}`, color: "text-indigo-700" },
                  { label: "Trabajadores", value: selectedArea.trabajadores,          color: "text-teal-700"   },
                  { label: "Vacantes",    value: selectedArea.vacantesTotal,          color: selectedArea.vacantesTotal > 0 ? "text-rose-700" : "text-emerald-700" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
                    <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {selectedArea.trabajadores > 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Cumplimiento documental promedio</p>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>Progreso</span>
                    <span className="font-bold text-slate-800">{selectedArea.cumplimientoPromedio}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all",
                      selectedArea.cumplimientoPromedio >= 85 ? "bg-emerald-500" : selectedArea.cumplimientoPromedio >= 60 ? "bg-amber-400" : "bg-rose-500")}
                      style={{ width: `${selectedArea.cumplimientoPromedio}%` }} />
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Descripción</p>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedArea.descripcion}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                  <Building2 className="inline h-3.5 w-3.5 mr-1" />Responsable de área
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" /><span className="font-medium">{selectedArea.responsable}</span>
                </div>
                {selectedArea.correoResponsable && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" /><span>{selectedArea.correoResponsable}</span>
                  </div>
                )}
                {selectedArea.telefonoResponsable && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" /><span>{selectedArea.telefonoResponsable}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <BookOpen className="inline h-3.5 w-3.5 mr-1" />
                    Cargos asociados ({selectedArea.cargosNombres.length})
                  </p>
                  {selectedArea.cargosNombres.length > 0 && (
                    <button type="button" onClick={() => verCargosDeArea(selectedArea.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 transition">
                      Ver todos <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {selectedArea.cargosNombres.length > 0
                  ? <div className="flex flex-wrap gap-2">
                      {selectedArea.cargosNombres.map((c) => (
                        <Badge key={c} className="rounded-full border border-violet-100 bg-violet-50 text-violet-700 text-xs font-medium px-3 py-1">{c}</Badge>
                      ))}
                    </div>
                  : <p className="text-sm text-slate-400 italic">Sin cargos asignados aún.</p>}
              </div>

              {selectedArea.dotacionTotal > 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-3">
                    <Layers className="inline h-3.5 w-3.5 mr-1" />Dotación
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-lg font-bold text-indigo-700">{selectedArea.dotacionTotal}</p><p className="text-[11px] text-slate-500">Requerida</p></div>
                    <div><p className="text-lg font-bold text-emerald-700">{selectedArea.asignadosTotal}</p><p className="text-[11px] text-slate-500">Asignados</p></div>
                    <div>
                      <p className={cn("text-lg font-bold", selectedArea.vacantesTotal > 0 ? "text-rose-700" : "text-emerald-700")}>{selectedArea.vacantesTotal}</p>
                      <p className="text-[11px] text-slate-500">Vacantes</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedArea.tieneDs44
                ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-rose-800 mb-1">Área con criticidad DS44</p>
                      <p className="text-xs text-rose-700 leading-relaxed">Uno o más cargos de esta área exigen cumplimiento de habilitaciones DS44 vigentes.</p>
                    </div>
                  </div>
                : selectedArea.cargosNombres.length > 0 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                      <p className="text-sm text-emerald-800">Esta área no tiene cargos con requisitos DS44 críticos.</p>
                    </div>
                  )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => aToggleEstado(selectedArea.id)}
                  className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition">
                  {selectedArea.estado === "activa" ? "Desactivar área" : "Reactivar área"}
                </button>
                <button type="button" onClick={() => setADeleteTarget(selectedArea)}
                  className="text-sm text-rose-500 hover:text-rose-700 underline underline-offset-2 transition">Eliminar</button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => { aOpenEdit(selectedArea); setSelectedAreaId(null); }}>
                  <Pencil className="h-4 w-4 mr-1.5" />Editar
                </Button>
                <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setSelectedAreaId(null)}>Cerrar</Button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ═══════════════════════════════════════════
          CARGO DRAWER
      ═══════════════════════════════════════════ */}
      <div className={cn("fixed inset-y-0 right-0 z-40 flex flex-col w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300",
        drawerCargo ? "translate-x-0" : "translate-x-full")}>
        {drawerCargo && (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{drawerCargo.codigo}</span>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border", tipoColor(drawerCargo.tipo))}>{drawerCargo.tipo}</span>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                    drawerCargo.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200")}>
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
              <div className="grid grid-cols-3 gap-3">
                <DrawerStat icon={<Users className="h-4 w-4 text-sky-500" />}             label="Trabajadores" value={drawerCargo.trabajadores} />
                <DrawerStat icon={<FileText className="h-4 w-4 text-amber-500" />}        label="Docs base"    value={drawerCargo.documentosBase.length} />
                <DrawerStat icon={<GraduationCap className="h-4 w-4 text-emerald-500" />} label="Caps base"    value={drawerCargo.capacitacionesBase.length} />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Descripción del rol</p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.descripcion}</p>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Perfil SST requerido
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.perfilSST}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Riesgos clave
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.riesgosClave}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Documentos base ({drawerCargo.documentosBase.length})
                </p>
                {drawerCargo.documentosBase.length === 0
                  ? <p className="text-xs text-slate-400 italic">Sin documentos base definidos</p>
                  : <ul className="space-y-1.5">{drawerCargo.documentosBase.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />{d}
                      </li>
                    ))}</ul>}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Capacitaciones base ({drawerCargo.capacitacionesBase.length})
                </p>
                {drawerCargo.capacitacionesBase.length === 0
                  ? <p className="text-xs text-slate-400 italic">Sin capacitaciones base definidas</p>
                  : <ul className="space-y-1.5">{drawerCargo.capacitacionesBase.map((cap) => (
                      <li key={cap} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />{cap}
                      </li>
                    ))}</ul>}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Centros / posiciones activas ({drawerCargo.centros.length})
                </p>
                {drawerCargo.centros.length === 0
                  ? <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">Sin posiciones de dotación activas</div>
                  : <div className="space-y-1.5">{drawerCargo.centros.map((centro) => (
                      <div key={centro} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm">
                        <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />{centro}
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
                      </div>
                    ))}</div>}
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex gap-2">
              <button onClick={() => cOpenEdit(drawerCargo)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Editar</button>
              <button onClick={() => cToggleEstado(drawerCargo.id)}
                className={cn("flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
                  drawerCargo.estado === "activo" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
                {drawerCargo.estado === "activo" ? "Desactivar" : "Reactivar"}
              </button>
              <button onClick={() => setCDeleteTarget(drawerCargo)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition border border-rose-100">Eliminar</button>
            </div>
          </>
        )}
      </div>
      {drawerCargo && <div className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden" onClick={() => setDrawerCargo(null)} />}

      {/* ═══════════════════════════════════════════
          MODAL: CREAR/EDITAR ÁREA
      ═══════════════════════════════════════════ */}
      <Dialog open={aModalOpen} onOpenChange={setAModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600">
                <Network className="h-4 w-4 text-white" />
              </div>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {editingAreaId ? "Editar área" : "Nueva área"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-500 ml-[3rem]">
              Define la información principal del área.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={aHandleSubmit} className="space-y-5 pt-2">
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">Identificación</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="a-nombre">Nombre del área</Label>
                  <Input id="a-nombre" value={aForm.nombre} onChange={(e) => setAForm((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Prevención de Riesgos" className="rounded-xl bg-white" required />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="a-codigo">Código</Label>
                  <Input id="a-codigo" value={aForm.codigo} onChange={(e) => setAForm((p) => ({ ...p, codigo: e.target.value }))}
                    placeholder="Ej: PRV-001" className="rounded-xl bg-white font-mono" required />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="a-desc">Descripción</Label>
                <textarea id="a-desc" value={aForm.descripcion} onChange={(e) => setAForm((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describe la función y alcance de esta área…" rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">Responsable</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="a-resp">Nombre responsable</Label>
                  <Input id="a-resp" value={aForm.responsable} onChange={(e) => setAForm((p) => ({ ...p, responsable: e.target.value }))}
                    placeholder="Diana Marín" className="rounded-xl bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="a-email">Correo</Label>
                  <Input id="a-email" type="email" value={aForm.correoResponsable} onChange={(e) => setAForm((p) => ({ ...p, correoResponsable: e.target.value }))}
                    placeholder="responsable@empresa.cl" className="rounded-xl bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="a-tel">Teléfono</Label>
                  <Input id="a-tel" value={aForm.telefonoResponsable} onChange={(e) => setAForm((p) => ({ ...p, telefonoResponsable: e.target.value }))}
                    placeholder="+56 9 XXXX XXXX" className="rounded-xl bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Estado</Label>
                  <Select value={aForm.estado} onValueChange={(v) => setAForm((p) => ({ ...p, estado: v as AreaStatus }))}>
                    <SelectTrigger className="rounded-xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa">Activa</SelectItem>
                      <SelectItem value="inactiva">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
                {editingAreaId ? "Guardar cambios" : "Crear área"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          MODAL: CREAR/EDITAR CARGO
      ═══════════════════════════════════════════ */}
      <Dialog open={cModalOpen} onOpenChange={setCModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {editingCargoId ? "Editar cargo" : "Nuevo cargo"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define el rol base: perfil SST, riesgos, documentos y capacitaciones obligatorias.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={cHandleSubmit} className="space-y-6 pt-1">
            <FormSection label="Información básica">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="c-nombre">Nombre del cargo</Label>
                  <Input id="c-nombre" name="nombre" value={cForm.nombre} onChange={cHandleInput}
                    className="mt-1 rounded-xl" required placeholder="Ej: Prevencionista de Riesgos" />
                </div>
                <div>
                  <Label htmlFor="c-codigo">Código</Label>
                  <Input id="c-codigo" name="codigo" value={cForm.codigo} onChange={cHandleInput}
                    className="mt-1 rounded-xl" required placeholder="Ej: PRV-001" />
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={cForm.areaId} onValueChange={(v) => setCForm((p) => ({ ...p, areaId: v, areaNombre: empresaStore.getAreas().find((a) => a.id === v)?.nombre ?? p.areaNombre }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{empresaStore.getAreas().map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={cForm.tipo} onValueChange={(v) => setCForm((p) => ({ ...p, tipo: v as CargoTipoUI }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Operativo","Supervisión","Administración","Prevención","Técnico"] as CargoTipoUI[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={cForm.estado} onValueChange={(v) => setCForm((p) => ({ ...p, estado: v as CargoEstado }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 self-end pb-1">
                  <input type="checkbox" id="c-ds44" name="requiereDS44" checked={cForm.requiereDS44} onChange={cHandleInput}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                  <Label htmlFor="c-ds44" className="cursor-pointer">Requiere DS44</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="c-desc">Descripción del rol</Label>
                <textarea id="c-desc" name="descripcion" value={cForm.descripcion} onChange={cHandleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[72px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Describe las responsabilidades principales del rol…" />
              </div>
            </FormSection>
            <FormSection label="Perfil SST y riesgos">
              <div>
                <Label htmlFor="c-sst">Perfil SST requerido</Label>
                <textarea id="c-sst" name="perfilSST" value={cForm.perfilSST} onChange={cHandleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[60px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Ej: Experto en Prevención de Riesgos. Registro SEREMI vigente…" />
              </div>
              <div>
                <Label htmlFor="c-riesgos">Riesgos clave</Label>
                <textarea id="c-riesgos" name="riesgosClave" value={cForm.riesgosClave} onChange={cHandleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[60px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Ej: Trabajo en altura, riesgo eléctrico, izaje de cargas…" />
              </div>
            </FormSection>
            <FormSection label="Documentos base obligatorios">
              <div className="flex gap-2">
                <Input value={docInput} onChange={(e) => setDocInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDoc(); } }}
                  placeholder="Ej: Credencial prevención vigente" className="rounded-xl flex-1" />
                <Button type="button" variant="outline" onClick={addDoc} className="rounded-xl px-4 shrink-0">Agregar</Button>
              </div>
              {cForm.documentosBase.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {cForm.documentosBase.map((d) => (
                    <li key={d} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-sm text-slate-700">
                      <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" /><span className="flex-1">{d}</span>
                      <button type="button" onClick={() => removeDoc(d)} className="text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
            <FormSection label="Capacitaciones base obligatorias">
              <div className="flex gap-2">
                <Input value={capInput} onChange={(e) => setCapInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCap(); } }}
                  placeholder="Ej: Trabajo en altura básico" className="rounded-xl flex-1" />
                <Button type="button" variant="outline" onClick={addCap} className="rounded-xl px-4 shrink-0">Agregar</Button>
              </div>
              {cForm.capacitacionesBase.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {cForm.capacitacionesBase.map((cap) => (
                    <li key={cap} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm text-slate-700">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-400 shrink-0" /><span className="flex-1">{cap}</span>
                      <button type="button" onClick={() => removeCap(cap)} className="text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setCModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="rounded-full px-6 bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                {editingCargoId ? "Guardar cambios" : "Crear cargo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE ÁREA dialogs ── */}
      {aDeleteTarget !== null && (aDeleteTarget.cargosIds.length > 0 || aDeleteTarget.dotacionTotal > 0 || aDeleteTarget.trabajadores > 0) && (
        <Dialog open onOpenChange={() => setADeleteTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50"><AlertTriangle className="h-4 w-4 text-rose-600" /></div>
                <DialogTitle className="text-xl font-semibold text-slate-900">No se puede eliminar</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-slate-600 ml-[3rem]"><strong>{aDeleteTarget.nombre}</strong> tiene dependencias activas.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setADeleteTarget(null)}>Cancelar</Button>
              <Button type="button" className="rounded-xl bg-slate-700 text-white" onClick={() => { aToggleEstado(aDeleteTarget.id); setADeleteTarget(null); }}>Desactivar área</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {aDeleteTarget !== null && aDeleteTarget.cargosIds.length === 0 && aDeleteTarget.dotacionTotal === 0 && aDeleteTarget.trabajadores === 0 && (
        <Dialog open onOpenChange={() => setADeleteTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50"><AlertTriangle className="h-4 w-4 text-rose-600" /></div>
                <DialogTitle className="text-xl font-semibold text-slate-900">¿Eliminar área?</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-slate-600 ml-[3rem]">
                Se eliminará <strong>{aDeleteTarget.nombre}</strong> de forma permanente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setADeleteTarget(null)}>Cancelar</Button>
              <Button type="button" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => { updateAreas((prev) => prev.filter((a) => a.id !== aDeleteTarget!.id)); if (selectedAreaId === aDeleteTarget.id) setSelectedAreaId(null); setADeleteTarget(null); }}>
                Sí, eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DELETE CARGO dialogs ── */}
      {cDeleteTarget !== null && (cDeleteTarget.trabajadores > 0 || cDeleteTarget.centros.length > 0) && (
        <Dialog open onOpenChange={() => setCDeleteTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50"><AlertTriangle className="h-4 w-4 text-rose-600" /></div>
                <DialogTitle className="text-xl font-semibold text-slate-900">No se puede eliminar</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-slate-600 ml-[3rem]"><strong>{cDeleteTarget.nombre}</strong> tiene dependencias activas.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCDeleteTarget(null)}>Cancelar</Button>
              <Button type="button" className="rounded-xl bg-slate-700 text-white" onClick={() => { cToggleEstado(cDeleteTarget.id); setCDeleteTarget(null); }}>Desactivar cargo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {cDeleteTarget !== null && cDeleteTarget.trabajadores === 0 && cDeleteTarget.centros.length === 0 && (
        <Dialog open onOpenChange={() => setCDeleteTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50"><AlertTriangle className="h-4 w-4 text-rose-600" /></div>
                <DialogTitle className="text-xl font-semibold text-slate-900">¿Eliminar cargo?</DialogTitle>
              </div>
              <DialogDescription className="text-sm text-slate-600 ml-[3rem]">
                Se eliminará <strong>{cDeleteTarget.nombre}</strong> de forma permanente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCDeleteTarget(null)}>Cancelar</Button>
              <Button type="button" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => { updateCargos((prev) => prev.filter((c) => c.id !== cDeleteTarget!.id)); if (drawerCargo?.id === cDeleteTarget.id) setDrawerCargo(null); setCDeleteTarget(null); }}>
                Sí, eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
