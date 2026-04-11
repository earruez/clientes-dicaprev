"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Copy,
  ToggleLeft,
  ToggleRight,
  Building2,
  Users,
  ShieldCheck,
  Car,
  Paperclip,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANTILLAS_MOCK } from "../mock-data";
import type {
  PlantillaAcreditacion,
  RequisitoPlantilla,
  CategoriaRequisito,
  TipoAcreditacion,
} from "../types";

// ── Configuración visual ─────────────────────────────────────────────

const CATEGORIA_CFG: Record<CategoriaRequisito, { label: string; icon: React.ReactNode; cls: string }> = {
  empresa: { label: "Empresa", icon: <Building2 className="h-3.5 w-3.5" />, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  trabajador: { label: "Trabajador", icon: <Users className="h-3.5 w-3.5" />, cls: "bg-violet-50 text-violet-700 border-violet-200" },
  sst: { label: "SST", icon: <ShieldCheck className="h-3.5 w-3.5" />, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vehiculo: { label: "Vehículo", icon: <Car className="h-3.5 w-3.5" />, cls: "bg-orange-50 text-orange-700 border-orange-200" },
  anexo: { label: "Anexo", icon: <Paperclip className="h-3.5 w-3.5" />, cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const APLICA_LABEL: Record<RequisitoPlantilla["aplicaA"], string> = {
  empresa: "Empresa",
  trabajador: "Por trabajador",
  vehiculo: "Por vehículo",
};

const TIPO_LABEL: Record<TipoAcreditacion, string> = {
  municipal: "Municipal",
  enel: "Enel",
  cge: "CGE",
  mandante_general: "Mandante general",
  via_publica: "Vía pública",
  contratista: "Contratista",
  mineria: "Minería",
  sanitaria: "Sanitaria",
};

// ── Página ────────────────────────────────────────────────────────────

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState(PLANTILLAS_MOCK);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoAcreditacion | "todos">("todos");
  const [filtroActiva, setFiltroActiva] = useState<"todos" | "activa" | "inactiva">("todos");
  const [expandida, setExpandida] = useState<string | null>(null);

  const filtradas = plantillas.filter((p) => {
    const txt = search.toLowerCase();
    const coincide = !txt || p.nombre.toLowerCase().includes(txt) || p.mandante.toLowerCase().includes(txt);
    return (
      coincide &&
      (filtroTipo === "todos" || p.tipo === filtroTipo) &&
      (filtroActiva === "todos" || (filtroActiva === "activa" ? p.activa : !p.activa))
    );
  });

  function toggleActiva(id: string) {
    setPlantillas((prev) => prev.map((p) => (p.id === id ? { ...p, activa: !p.activa } : p)));
  }

  function duplicar(p: PlantillaAcreditacion) {
    const nueva: PlantillaAcreditacion = {
      ...p,
      id: `plt-${Date.now()}`,
      nombre: `${p.nombre} (copia)`,
      activa: false,
      creadoEl: new Date().toISOString().slice(0, 10),
      actualizadoEl: new Date().toISOString().slice(0, 10),
      requisitos: p.requisitos.map((r) => ({ ...r, id: `${r.id}-c`, plantillaId: `plt-${Date.now()}` })),
    };
    setPlantillas((prev) => [nueva, ...prev]);
  }

  const kpis = [
    { label: "Total plantillas", val: plantillas.length },
    { label: "Activas", val: plantillas.filter((p) => p.activa).length },
    { label: "Tipos cubiertos", val: new Set(plantillas.map((p) => p.tipo)).size },
    { label: "Mandantes", val: new Set(plantillas.map((p) => p.mandante)).size },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-screen-xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Plantillas de acreditación</h1>
            <p className="text-sm text-slate-500 mt-1">
              Define los requisitos documentales exigidos por cada mandante o entidad
            </p>
          </div>
          <Button className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva plantilla
          </Button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{k.val}</p>
            </div>
          ))}
        </div>

        {/* Aviso conceptual */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold">¿Cómo funcionan las plantillas?</p>
            <p className="mt-1 text-blue-600">
              Cada plantilla define los documentos requeridos por un mandante específico.
              Al crear una acreditación, el sistema carga exactamente estos requisitos
              y clasifica los documentos disponibles como <em>completos</em>, <em>faltantes</em> o <em>vencidos</em>.
              Sin plantilla no hay expediente.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar plantilla o mandante…"
              className="pl-9 text-sm bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
            <SelectTrigger className="w-full sm:w-44 text-sm bg-white">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {(Object.keys(TIPO_LABEL) as TipoAcreditacion[]).map((k) => (
                <SelectItem key={k} value={k}>{TIPO_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroActiva} onValueChange={(v) => setFiltroActiva(v as typeof filtroActiva)}>
            <SelectTrigger className="w-full sm:w-40 text-sm bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Activas e inactivas</SelectItem>
              <SelectItem value="activa">Solo activas</SelectItem>
              <SelectItem value="inactiva">Solo inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de plantillas */}
        <div className="space-y-3">
          {filtradas.map((p) => (
            <PlantillaCard
              key={p.id}
              plantilla={p}
              expandida={expandida === p.id}
              onToggleExpand={() => setExpandida((prev) => (prev === p.id ? null : p.id))}
              onToggleActiva={() => toggleActiva(p.id)}
              onDuplicar={() => duplicar(p)}
            />
          ))}

          {filtradas.length === 0 && (
            <div className="py-16 text-center">
              <Layers className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No hay plantillas con los filtros aplicados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PlantillaCard ─────────────────────────────────────────────────────

function PlantillaCard({
  plantilla,
  expandida,
  onToggleExpand,
  onToggleActiva,
  onDuplicar,
}: {
  plantilla: PlantillaAcreditacion;
  expandida: boolean;
  onToggleExpand: () => void;
  onToggleActiva: () => void;
  onDuplicar: () => void;
}) {
  const categorias = Array.from(new Set(plantilla.requisitos.map((r) => r.categoria)));
  const obligatorios = plantilla.requisitos.filter((r) => r.obligatorio).length;
  const docPorTrabajador = plantilla.requisitos.filter((r) => r.aplicaA === "trabajador").length;
  const docVehiculo = plantilla.requisitos.filter((r) => r.aplicaA === "vehiculo").length;

  return (
    <div className={cn("rounded-2xl border bg-white shadow-sm overflow-hidden transition-shadow", expandida ? "shadow-md" : "hover:shadow-md")}>
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          <Layers className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 leading-snug">{plantilla.nombre}</p>
              <p className="text-xs text-slate-500 mt-0.5">{plantilla.mandante}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                plantilla.activa ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                {plantilla.activa ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {plantilla.activa ? "Activa" : "Inactiva"}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {TIPO_LABEL[plantilla.tipo] ?? plantilla.tipo}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{plantilla.descripcion}</p>

          {/* Chips categorías */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {categorias.map((cat) => (
              <span
                key={cat}
                className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", CATEGORIA_CFG[cat].cls)}
              >
                {CATEGORIA_CFG[cat].icon}
                {CATEGORIA_CFG[cat].label}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span><strong className="text-slate-900">{plantilla.requisitos.length}</strong> requisitos</span>
            <span><strong className="text-slate-900">{obligatorios}</strong> obligatorios</span>
            {docPorTrabajador > 0 && <span><strong className="text-slate-900">{docPorTrabajador}</strong> por trabajador</span>}
            {docVehiculo > 0 && <span><strong className="text-slate-900">{docVehiculo}</strong> por vehículo</span>}
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleExpand}
          className="rounded-xl text-xs h-8"
        >
          {expandida ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
          {expandida ? "Ocultar requisitos" : "Ver requisitos"}
        </Button>
        <Button variant="outline" size="sm" onClick={onDuplicar} className="rounded-xl text-xs h-8">
          <Copy className="h-3.5 w-3.5 mr-1" />
          Duplicar
        </Button>
        <button
          onClick={onToggleActiva}
          className={cn("flex items-center gap-1.5 rounded-xl border px-3 h-8 text-xs font-medium transition-colors",
            plantilla.activa
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          )}
        >
          {plantilla.activa
            ? <ToggleRight className="h-3.5 w-3.5" />
            : <ToggleLeft className="h-3.5 w-3.5" />}
          {plantilla.activa ? "Desactivar" : "Activar"}
        </button>
      </div>

      {/* Detalle requisitos expandido */}
      {expandida && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3">
          {(["empresa", "trabajador", "sst", "vehiculo", "anexo"] as CategoriaRequisito[]).map((cat) => {
            const reqs = plantilla.requisitos.filter((r) => r.categoria === cat);
            if (reqs.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold", CATEGORIA_CFG[cat].cls)}>
                    {CATEGORIA_CFG[cat].icon}
                    {CATEGORIA_CFG[cat].label}
                  </span>
                  <span className="text-[11px] text-slate-400">{reqs.length} documentos</span>
                </div>
                <div className="space-y-1.5 pl-2">
                  {reqs.map((r) => (
                    <RequisitoRow key={r.id} req={r} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── RequisitoRow ──────────────────────────────────────────────────────

function RequisitoRow({ req }: { req: RequisitoPlantilla }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-sm">
      <div className={cn("mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0",
        req.obligatorio ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>
        {req.obligatorio
          ? <CheckCircle2 className="h-2.5 w-2.5" />
          : <Circle className="h-2.5 w-2.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium leading-snug", req.obligatorio ? "text-slate-900" : "text-slate-500")}>
          {req.nombreDocumento}
          {!req.obligatorio && <span className="ml-1.5 text-[10px] text-slate-400 font-normal">opcional</span>}
        </p>
        {req.observacionAyuda && (
          <p className="text-[11px] text-slate-400 mt-0.5">{req.observacionAyuda}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
          {APLICA_LABEL[req.aplicaA]}
        </span>
        {req.requiereVencimiento && (
          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
            Vence
          </span>
        )}
        {req.requiereRevisionManual && (
          <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
            Revisión
          </span>
        )}
      </div>
    </div>
  );
}
