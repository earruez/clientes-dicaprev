"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  ShieldCheck,
  Car,
  Paperclip,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Library,
  Link2,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BIBLIOTECA_MOCK } from "@/app/dicaprev/biblioteca/mock-biblioteca";
import { evaluarEstadoDocumento } from "@/app/dicaprev/acreditaciones/mock-data";
import type { DocumentoBase, CategoriaRequisito } from "@/app/dicaprev/acreditaciones/types";

// ── Tipos de tab ──────────────────────────────────────────────────────

type TabKey = CategoriaRequisito | "todos" | "vencimientos";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "todos", label: "Todos", icon: <Library className="h-4 w-4" /> },
  { key: "empresa", label: "Empresa", icon: <Building2 className="h-4 w-4" /> },
  { key: "sst", label: "SST", icon: <ShieldCheck className="h-4 w-4" /> },
  { key: "vehiculo", label: "Vehículos", icon: <Car className="h-4 w-4" /> },
  { key: "anexo", label: "Anexos", icon: <Paperclip className="h-4 w-4" /> },
  { key: "vencimientos", label: "Vencimientos", icon: <Clock className="h-4 w-4" /> },
];

// ── Config visual ─────────────────────────────────────────────────────

const ESTADO_CFG: Record<DocumentoBase["estado"], { label: string; cls: string; icon: React.ReactNode }> = {
  completo: {
    label: "Vigente",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  vencido: {
    label: "Vencido",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  faltante: {
    label: "Faltante",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const CAT_CFG: Record<CategoriaRequisito, { label: string; cls: string; icon: React.ReactNode }> = {
  empresa: { label: "Empresa", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <Building2 className="h-3 w-3" /> },
  trabajador: { label: "Trabajador", cls: "bg-violet-50 text-violet-700 border-violet-200", icon: <Building2 className="h-3 w-3" /> },
  sst: { label: "SST", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <ShieldCheck className="h-3 w-3" /> },
  vehiculo: { label: "Vehículo", cls: "bg-orange-50 text-orange-700 border-orange-200", icon: <Car className="h-3 w-3" /> },
  anexo: { label: "Anexo", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <Paperclip className="h-3 w-3" /> },
};

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

function diasParaVencer(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - new Date("2026-04-09").getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Página ────────────────────────────────────────────────────────────

export default function DocumentacionEmpresaPage() {
  const [docs, setDocs] = useState<DocumentoBase[]>(() =>
    BIBLIOTECA_MOCK.map((d) => ({ ...d, estado: evaluarEstadoDocumento(d) }))
  );
  const [tab, setTab] = useState<TabKey>("todos");
  const [search, setSearch] = useState("");

  const filtrados = docs.filter((d) => {
    const txt = search.toLowerCase();
    const coincide =
      !txt ||
      d.nombre.toLowerCase().includes(txt) ||
      (d.titularNombre ?? "").toLowerCase().includes(txt);

    if (tab === "vencimientos") {
      const dias = diasParaVencer(d.fechaVencimiento);
      return coincide && d.fechaVencimiento !== undefined && dias !== null && dias <= 60;
    }
    return coincide && (tab === "todos" || d.categoria === (tab as CategoriaRequisito));
  });

  // Para la tab vencimientos, ordenar por días más urgente primero
  const docsMostrar =
    tab === "vencimientos"
      ? [...filtrados].sort((a, b) => {
          const da = diasParaVencer(a.fechaVencimiento) ?? 9999;
          const db = diasParaVencer(b.fechaVencimiento) ?? 9999;
          return da - db;
        })
      : filtrados;

  const vigentes = docs.filter((d) => d.estado === "completo").length;
  const vencidos = docs.filter((d) => d.estado === "vencido").length;
  const porVencer = docs.filter((d) => {
    const dias = diasParaVencer(d.fechaVencimiento);
    return d.estado === "completo" && dias !== null && dias <= 30;
  }).length;

  const toggleReusable = (id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, reusableEnAcreditaciones: !d.reusableEnAcreditaciones } : d))
    );
  };

  function tabCount(key: TabKey): number {
    if (key === "todos") return docs.length;
    if (key === "vencimientos") {
      return docs.filter((d) => {
        const dias = diasParaVencer(d.fechaVencimiento);
        return d.fechaVencimiento !== undefined && dias !== null && dias <= 60;
      }).length;
    }
    return docs.filter((d) => d.categoria === (key as CategoriaRequisito)).length;
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-screen-xl mx-auto flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Empresa</p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Documentación</h1>
              <p className="text-sm text-slate-500 mt-1">
                Repositorio central de documentos de empresa, SST y vehículos. Las acreditaciones los consumen automáticamente.
              </p>
            </div>
          </div>
          <Button className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Subir documento
          </Button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total documentos", val: docs.length, cls: "text-slate-900" },
            { label: "Vigentes", val: vigentes, cls: "text-emerald-600" },
            { label: "Vencidos", val: vencidos, cls: "text-amber-600" },
            {
              label: "Vencen en 30 días",
              val: porVencer,
              cls: porVencer > 0 ? "text-orange-500" : "text-slate-900",
            },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
              <p className={cn("text-3xl font-bold mt-1", k.cls)}>{k.val}</p>
            </div>
          ))}
        </div>

        {/* Aviso integración con Acreditaciones */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
          <Link2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold">Integración automática con Acreditaciones</p>
            <p className="mt-0.5 text-blue-600">
              Al generar un expediente, el sistema busca en esta biblioteca los documentos
              que satisfacen los requisitos de la plantilla.{" "}
              <span className="font-medium">Vigente → vinculado ✔</span> ·{" "}
              <span className="font-medium">Vencido → ⚠</span> ·{" "}
              <span className="font-medium">Sin documento → faltante ✖</span>
            </p>
          </div>
        </div>

        {/* Tabs + búsqueda */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {TABS.map((t) => {
              const count = tabCount(t.key);
              const isUrgent = t.key === "vencimientos" && count > 0;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    tab === t.key
                      ? isUrgent
                        ? "bg-amber-500 text-white"
                        : "bg-slate-900 text-white"
                      : isUrgent
                      ? "text-amber-600 hover:bg-amber-50"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {t.icon}
                  {t.label}
                  <span
                    className={cn(
                      "text-[10px] font-bold rounded-full px-1.5 py-0.5",
                      tab === t.key
                        ? "bg-white/20 text-white"
                        : isUrgent
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar documento o titular…"
              className="pl-9 text-sm bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Alerta de vencimientos urgentes */}
        {tab === "vencimientos" && vencidos > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-semibold">{vencidos} documento{vencidos > 1 ? "s" : ""} vencido{vencidos > 1 ? "s" : ""}</p>
              <p className="text-amber-600 mt-0.5">
                Estos documentos bloquean el envío de expedientes de acreditación. Renuévalos lo antes posible.
              </p>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_130px_110px_110px_100px] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
            {["Documento", "Categoría", "Titular", "Emisión", "Vencimiento", "Estado"].map((h) => (
              <p key={h} className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{h}</p>
            ))}
          </div>

          {docsMostrar.length === 0 && (
            <div className="py-16 text-center">
              <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                {tab === "vencimientos"
                  ? "No hay documentos próximos a vencer en 60 días."
                  : "No hay documentos con los filtros aplicados."}
              </p>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {docsMostrar.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                showDias={tab === "vencimientos"}
                onToggleReusable={() => toggleReusable(doc.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fila de documento ─────────────────────────────────────────────────

function DocRow({
  doc,
  showDias,
  onToggleReusable,
}: {
  doc: DocumentoBase;
  showDias: boolean;
  onToggleReusable: () => void;
}) {
  const estadoCfg = ESTADO_CFG[doc.estado];
  const catCfg = CAT_CFG[doc.categoria];
  const dias = diasParaVencer(doc.fechaVencimiento);

  return (
    <div className="grid grid-cols-[1fr_140px_130px_110px_110px_100px] gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors items-center">
      {/* Nombre */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 truncate leading-snug">{doc.nombre}</p>
          {doc.reusableEnAcreditaciones ? (
            <span
              title="Vinculable a acreditaciones — click para desactivar"
              className="shrink-0 inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 cursor-pointer hover:bg-blue-100"
              onClick={onToggleReusable}
            >
              <Link2 className="h-2.5 w-2.5" />
              Vinculable
            </span>
          ) : (
            <span
              title="No vinculable — click para activar"
              className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 cursor-pointer hover:bg-slate-100"
              onClick={onToggleReusable}
            >
              No vinc.
            </span>
          )}
        </div>
        {doc.observaciones && (
          <p className="text-[11px] text-amber-600 mt-0.5 truncate">{doc.observaciones}</p>
        )}
      </div>

      {/* Categoría */}
      <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium w-fit", catCfg.cls)}>
        {catCfg.icon}
        {catCfg.label}
      </span>

      {/* Titular */}
      <p className="text-sm text-slate-600 truncate">{doc.titularNombre ?? "Empresa"}</p>

      {/* Emisión */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        {fmt(doc.fechaEmision)}
      </div>

      {/* Vencimiento */}
      <div>
        <p className={cn("text-xs", doc.estado === "vencido" ? "text-amber-600 font-semibold" : "text-slate-500")}>
          {fmt(doc.fechaVencimiento)}
        </p>
        {showDias && dias !== null && (
          <p
            className={cn(
              "text-[10px] font-semibold mt-0.5",
              dias < 0 ? "text-rose-600" : dias <= 10 ? "text-amber-600" : "text-slate-400"
            )}
          >
            {dias < 0 ? `Vencido hace ${Math.abs(dias)}d` : `En ${dias} días`}
          </p>
        )}
      </div>

      {/* Estado */}
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium w-fit", estadoCfg.cls)}>
        {estadoCfg.icon}
        {estadoCfg.label}
      </span>
    </div>
  );
}
