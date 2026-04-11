"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderOpen,
  Plus,
  Layers,
  History,
  ChevronRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACREDITACIONES_MOCK,
  EMPRESA_OPERADORA,
  generarDocumentosInstancia,
} from "../mock-data";
import type { EstadoAcreditacion } from "../types";

// ── Config visual ────────────────────────────────────────────────────

const ESTADO_CFG: Record<
  EstadoAcreditacion,
  { label: string; badgeCls: string; icon: React.ReactNode }
> = {
  en_preparacion: {
    label: "En preparación",
    badgeCls: "text-slate-600 bg-slate-100 border-slate-200",
    icon: <Clock className="h-3 w-3" />,
  },
  listo_para_enviar: {
    label: "Listo para enviar",
    badgeCls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  enviado: {
    label: "Enviado",
    badgeCls: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <Send className="h-3 w-3" />,
  },
  aprobado: {
    label: "Aprobado",
    badgeCls: "text-green-700 bg-green-50 border-green-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rechazado: {
    label: "Rechazado",
    badgeCls: "text-rose-700 bg-rose-50 border-rose-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  vencido: {
    label: "Vencido",
    badgeCls: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  observada: {
    label: "Observada",
    badgeCls: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  cerrada: {
    label: "Cerrada",
    badgeCls: "text-slate-500 bg-slate-100 border-slate-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL");
}

// ── Página ────────────────────────────────────────────────────────────

export default function AcreditacionesResumenPage() {
  const router = useRouter();

  const acreditaciones = ACREDITACIONES_MOCK.filter(
    (a) => a.empresaId === EMPRESA_OPERADORA.id
  );

  const total = acreditaciones.length;
  const enPreparacion = acreditaciones.filter((a) => a.estado === "en_preparacion").length;
  const listasEnviar = acreditaciones.filter((a) => a.estado === "listo_para_enviar").length;
  const enviadas = acreditaciones.filter((a) => a.estado === "enviado").length;
  const aprobadas = acreditaciones.filter((a) => a.estado === "aprobado").length;
  const problemas = acreditaciones.filter(
    (a) => a.estado === "rechazado" || a.estado === "vencido"
  ).length;

  const requierenAtencion = acreditaciones.filter(
    (a) =>
      a.estado === "en_preparacion" ||
      a.estado === "rechazado" ||
      a.estado === "vencido"
  );

  const kpis = [
    { label: "Total activas", value: total, cls: "bg-white border-slate-200 text-slate-900" },
    { label: "En preparación", value: enPreparacion, cls: "bg-slate-50 border-slate-200 text-slate-700" },
    { label: "Listas para enviar", value: listasEnviar, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    { label: "Enviadas", value: enviadas, cls: "bg-blue-50 border-blue-200 text-blue-700" },
    { label: "Aprobadas", value: aprobadas, cls: "bg-green-50 border-green-200 text-green-700" },
    { label: "Rechazadas / Vencidas", value: problemas, cls: "bg-rose-50 border-rose-200 text-rose-700" },
  ];

  const accesos = [
    {
      label: "Nueva acreditación",
      desc: "Iniciar un nuevo expediente",
      icon: <Plus className="h-5 w-5" />,
      cls: "bg-slate-900 text-white hover:bg-slate-800",
      href: "/dicaprev/acreditaciones/solicitudes",
    },
    {
      label: "Solicitudes activas",
      desc: "Gestionar expedientes en curso",
      icon: <FolderOpen className="h-5 w-5" />,
      cls: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
      href: "/dicaprev/acreditaciones/solicitudes",
    },
    {
      label: "Plantillas",
      desc: "Configurar requisitos por mandante",
      icon: <Layers className="h-5 w-5" />,
      cls: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
      href: "/dicaprev/acreditaciones/plantillas",
    },
    {
      label: "Historial de gestión",
      desc: "Resultados y métricas históricas",
      icon: <History className="h-5 w-5" />,
      cls: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
      href: "/dicaprev/acreditaciones/historial",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-screen-xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Acreditaciones — Resumen
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Estado general de los expedientes activos
            </p>
          </div>
          {/* Empresa operadora chip */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 shrink-0">
            <Building2 className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Empresa operadora
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {EMPRESA_OPERADORA.razonSocial}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={cn("rounded-2xl border p-4 shadow-sm", k.cls)}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">
                {k.label}
              </p>
              <p className="text-3xl font-bold mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Requieren atención */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Requieren atención</h2>
            <button
              onClick={() => router.push("/dicaprev/acreditaciones/solicitudes")}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              Ver todas <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {requierenAtencion.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-700">
                Todo en orden — sin expedientes que requieran atención inmediata.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {requierenAtencion.map((ac) => {
                const cfg = ESTADO_CFG[ac.estado];
                const docs = generarDocumentosInstancia(ac);
                const pendientes = docs.filter(
                  (d) => d.obligatorio && d.estado !== "completo"
                ).length;

                return (
                  <button
                    key={ac.id}
                    onClick={() =>
                      router.push(`/dicaprev/acreditaciones/${ac.id}`)
                    }
                    className="text-left rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm leading-snug truncate">
                          {ac.mandante}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {ac.plantillaNombre}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0",
                          cfg.badgeCls
                        )}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>

                    {ac.observaciones && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 leading-snug mb-3">
                        {ac.observaciones}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {ac.trabajadores.length} trabajador
                        {ac.trabajadores.length !== 1 ? "es" : ""}
                      </span>
                      {pendientes > 0 && (
                        <span className="text-rose-600 font-medium">
                          {pendientes} doc{pendientes !== 1 ? "s" : ""} pendiente
                          {pendientes !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                      <span>Actualizado {fmt(ac.actualizadoEl)}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {accesos.map((acc) => (
              <button
                key={acc.label}
                onClick={() => router.push(acc.href)}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-2xl p-5 transition-all shadow-sm text-left",
                  acc.cls
                )}
              >
                {acc.icon}
                <div>
                  <p className="font-semibold text-sm">{acc.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{acc.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
