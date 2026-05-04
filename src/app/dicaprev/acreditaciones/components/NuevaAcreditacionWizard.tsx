"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  FileText,
  Layers,
  Car,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  EMPRESA_OPERADORA,
  MANDANTES_MOCK,
  PLANTILLAS_MOCK,
  TRABAJADORES_MOCK,
  VEHICULOS_MOCK,
} from "../mock-data";
import type {
  WizardAcreditacionData,
  Mandante,
  TipoAcreditacion,
  Trabajador,
  Vehiculo,
} from "../types";

// ── Configuración de pasos ───────────────────────────────────────────

const PASOS = [
  { idx: 0, label: "Mandante", icon: <Building2 className="h-4 w-4" /> },
  { idx: 1, label: "Tipo", icon: <FileText className="h-4 w-4" /> },
  { idx: 2, label: "Plantilla", icon: <Layers className="h-4 w-4" /> },
  { idx: 3, label: "Trabajadores", icon: <Users className="h-4 w-4" /> },
  { idx: 4, label: "Vehículos", icon: <Car className="h-4 w-4" /> },
  { idx: 5, label: "Confirmación", icon: <CheckCircle2 className="h-4 w-4" /> },
];

const TIPO_OPTIONS: { value: TipoAcreditacion; label: string; desc: string }[] = [
  { value: "municipal", label: "Permiso Municipal", desc: "Contratos con municipalidades o entidades públicas locales." },
  { value: "enel", label: "Empresa eléctrica (Enel)", desc: "Contratistas para distribuidoras eléctricas Enel." },
  { value: "cge", label: "Empresa eléctrica (CGE)", desc: "Contratistas para distribuidoras eléctricas CGE." },
  { value: "mandante_general", label: "Mandante General", desc: "Empresas del sector privado (constructoras, industria, etc.)." },
  { value: "via_publica", label: "Trabajo en vía pública", desc: "Obras que requieren permiso de vía pública." },
  { value: "contratista", label: "Acreditación contratista", desc: "Acreditación genérica para empresa contratista." },
  { value: "mineria", label: "Minería", desc: "Faenas en yacimientos o industria minera." },
  { value: "sanitaria", label: "Empresa sanitaria", desc: "Obras en redes de agua potable o alcantarillado." },
];

// ── Props ─────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onCrear: (data: WizardAcreditacionData) => void;
}

// ── Wizard ────────────────────────────────────────────────────────────

export default function NuevaAcreditacionWizard({ onClose, onCrear }: Props) {
  const [paso, setPaso] = useState(0);
  const [data, setData] = useState<WizardAcreditacionData>({
    mandante: null,
    tipo: null,
    plantilla: null,
    trabajadores: [],
    vehiculos: [],
  });
  const [search, setSearch] = useState("");

  const plantillasFiltradas = PLANTILLAS_MOCK.filter((p) => {
    if (!p.activa) return false;
    if (data.mandante && p.mandanteId !== data.mandante.id) return false;
    if (data.tipo && p.tipo !== data.tipo) return false;
    return true;
  });

  function avanzar() {
    if (paso < PASOS.length - 1) { setSearch(""); setPaso((p) => p + 1); }
  }
  function retroceder() {
    if (paso > 0) { setSearch(""); setPaso((p) => p - 1); }
  }

  function puedeContinuar(): boolean {
    if (paso === 0) return data.mandante !== null;
    if (paso === 1) return data.tipo !== null;
    if (paso === 2) return data.plantilla !== null;
    if (paso === 3) return data.trabajadores.length > 0;
    return true;
  }

  function toggleTrabajador(t: Trabajador) {
    setData((prev) => {
      const ya = prev.trabajadores.find((x) => x.id === t.id);
      return {
        ...prev,
        trabajadores: ya
          ? prev.trabajadores.filter((x) => x.id !== t.id)
          : [...prev.trabajadores, t],
      };
    });
  }

  function toggleVehiculo(v: Vehiculo) {
    setData((prev) => {
      const ya = prev.vehiculos.find((x) => x.id === v.id);
      return {
        ...prev,
        vehiculos: ya
          ? prev.vehiculos.filter((x) => x.id !== v.id)
          : [...prev.vehiculos, v],
      };
    });
  }

  const reqTotal = data.plantilla?.requisitos.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nueva acreditación</h2>
            <p className="text-xs text-slate-400 mt-0.5">Paso {paso + 1} de {PASOS.length}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Empresa operadora (contexto fijo) */}
        <div className="mx-7 mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Empresa operadora</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{EMPRESA_OPERADORA.razonSocial}</p>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0">{EMPRESA_OPERADORA.rut}</span>
        </div>

        {/* Stepper */}
        <div className="px-7 pt-4 pb-3">
          <div className="flex items-center gap-1">
            {PASOS.map((p, i) => (
              <React.Fragment key={p.idx}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      i < paso
                        ? "bg-emerald-500 text-white"
                        : i === paso
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {i < paso ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={cn("text-[9px] mt-1 font-medium hidden sm:block", i === paso ? "text-slate-800" : "text-slate-400")}>
                    {p.label}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mb-3", i < paso ? "bg-emerald-400" : "bg-slate-100")} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="flex-1 overflow-y-auto px-7 py-4 min-h-[260px]">

          {/* Paso 0: Mandante */}
          {paso === 0 && (
            <Step title="Selecciona el mandante / entidad destino">
              <SearchBar value={search} onChange={setSearch} placeholder="Buscar mandante…" />
              <div className="grid gap-3 mt-3">
                {MANDANTES_MOCK.filter(
                  (m) => !search || m.nombre.toLowerCase().includes(search.toLowerCase())
                ).map((m) => (
                  <SelCard
                    key={m.id}
                    selected={data.mandante?.id === m.id}
                    onClick={() => setData((d) => ({ ...d, mandante: m, plantilla: null }))}
                    title={m.nombre}
                    sub={m.rut ?? "Sin RUT"}
                    badge={TIPO_MANDANTE_LABEL[m.tipo]}
                    icon={<Building2 className="h-5 w-5 text-slate-500" />}
                  />
                ))}
              </div>
            </Step>
          )}

          {/* Paso 1: Tipo */}
          {paso === 1 && (
            <Step title="Selecciona el tipo de acreditación">
              <div className="grid gap-2.5">
                {TIPO_OPTIONS.map((t) => (
                  <SelCard
                    key={t.value}
                    selected={data.tipo === t.value}
                    onClick={() => setData((d) => ({ ...d, tipo: t.value, plantilla: null }))}
                    title={t.label}
                    sub={t.desc}
                  />
                ))}
              </div>
            </Step>
          )}

          {/* Paso 2: Plantilla */}
          {paso === 2 && (
            <Step title="Selecciona la plantilla de requisitos">
              {plantillasFiltradas.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  No hay plantillas activas para la combinación de mandante + tipo seleccionada.
                  Las plantillas deben configurarse en la sección <strong>Acreditaciones / Plantillas</strong>.
                </div>
              ) : (
                <div className="grid gap-3">
                  {plantillasFiltradas.map((p) => (
                    <SelCard
                      key={p.id}
                      selected={data.plantilla?.id === p.id}
                      onClick={() => setData((d) => ({ ...d, plantilla: p }))}
                      title={p.nombre}
                      sub={p.descripcion}
                      badge={`${p.requisitos.length} requisitos`}
                      icon={<Layers className="h-5 w-5 text-slate-500" />}
                    />
                  ))}
                </div>
              )}
            </Step>
          )}

          {/* Paso 3: Trabajadores */}
          {paso === 3 && (
            <Step title="Selecciona los trabajadores que serán incluidos">
              <SearchBar value={search} onChange={setSearch} placeholder="Buscar trabajador…" />
              <div className="grid gap-2.5 mt-3">
                {TRABAJADORES_MOCK.filter(
                  (t) => !search || t.nombre.toLowerCase().includes(search.toLowerCase())
                ).map((t) => {
                  const sel = !!data.trabajadores.find((x) => x.id === t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTrabajador(t)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors",
                        sel
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0", sel ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600")}>
                        {sel ? <CheckCircle2 className="h-4 w-4" /> : t.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{t.nombre}</p>
                        <p className="text-xs text-slate-500">{t.rut} · {t.cargo}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {data.trabajadores.length > 0 && (
                <p className="mt-3 text-xs text-emerald-700 font-medium">
                  {data.trabajadores.length} trabajador{data.trabajadores.length !== 1 ? "es" : ""} seleccionado{data.trabajadores.length !== 1 ? "s" : ""}
                </p>
              )}
            </Step>
          )}

          {/* Paso 4: Vehículos */}
          {paso === 4 && (
            <Step title="Selecciona los vehículos / equipos (opcional)">
              <div className="grid gap-2.5">
                {VEHICULOS_MOCK.map((v) => {
                  const sel = !!data.vehiculos.find((x) => x.id === v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleVehiculo(v)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors",
                        sel
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", sel ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500")}>
                        <Car className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{v.modelo}</p>
                        <p className="text-xs text-slate-500">{v.patente} · {v.año}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-400">Sin vehículos es válido si la acreditación no los requiere.</p>
            </Step>
          )}

          {/* Paso 5: Confirmación */}
          {paso === 5 && (
            <Step title="Resumen — Confirma la acreditación">
              <div className="space-y-3">
                <FieldRow label="Empresa" value={EMPRESA_OPERADORA.razonSocial} />
                <FieldRow label="Mandante" value={data.mandante?.nombre ?? "—"} />
                <FieldRow label="Tipo" value={TIPO_OPTIONS.find((t) => t.value === data.tipo)?.label ?? "—"} />
                <FieldRow label="Plantilla" value={data.plantilla?.nombre ?? "—"} />
                <FieldRow label="Requisitos totales" value={String(reqTotal)} highlight />
                <FieldRow
                  label="Trabajadores"
                  value={data.trabajadores.map((t) => t.nombre).join(", ") || "—"}
                />
                {data.vehiculos.length > 0 && (
                  <FieldRow
                    label="Vehículos"
                    value={data.vehiculos.map((v) => `${v.modelo} (${v.patente})`).join(", ")}
                  />
                )}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                Al confirmar, el sistema cargará los <strong>{reqTotal} requisitos</strong> de la plantilla
                y clasificará los documentos existentes como <em>completos</em>, <em>faltantes</em> o <em>vencidos</em>.
              </div>
            </Step>
          )}
        </div>

        {/* Footer acciones */}
        <div className="px-7 py-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={retroceder}
            disabled={paso === 0}
            className="rounded-xl h-10 px-5 text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Atrás
          </Button>

          {paso < PASOS.length - 1 ? (
            <Button
              onClick={avanzar}
              disabled={!puedeContinuar()}
              className="rounded-xl h-10 px-6 text-sm bg-slate-900 hover:bg-slate-800 text-white"
            >
              Continuar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => onCrear(data)}
              className="rounded-xl h-10 px-6 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Crear acreditación
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes internos ──────────────────────────────────────────

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      {children}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <Input
        className="pl-9 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelCard({
  selected,
  onClick,
  title,
  sub,
  badge,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  badge?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border text-left transition-all w-full",
        selected
          ? "border-slate-900 bg-slate-900 text-white shadow-md"
          : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
      )}
    >
      {icon && (
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            selected ? "bg-white/15" : "bg-slate-100"
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm leading-snug", selected ? "text-white" : "text-slate-900")}>
          {title}
        </p>
        <p className={cn("text-xs leading-snug mt-0.5 line-clamp-2", selected ? "text-white/70" : "text-slate-500")}>
          {sub}
        </p>
      </div>
      {badge && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold border",
            selected ? "bg-white/20 text-white border-white/30" : "bg-slate-100 text-slate-600 border-slate-200"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function FieldRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right", highlight ? "text-emerald-700 font-bold" : "text-slate-800")}>
        {value}
      </span>
    </div>
  );
}

const TIPO_MANDANTE_LABEL: Record<Mandante["tipo"], string> = {
  municipalidad: "Municipalidad",
  empresa_electrica: "Empresa eléctrica",
  constructora: "Constructora",
  minera: "Minería",
  privado: "Privado",
  otro: "Otro",
};
