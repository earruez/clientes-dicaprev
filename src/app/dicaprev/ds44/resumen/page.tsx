"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CalendarDays,
  Building2,
  ListChecks,
  CheckCircle2,
} from "lucide-react";

const proximosVencimientos = [
  {
    centro: "Centro de trabajo Los Maitenes",
    tipo: "Cert. Extintores",
    fecha: "05-12-2025",
    criticidad: "Alta",
  },
  {
    centro: "Centro Modular Talagante",
    tipo: "Matriz IPER",
    fecha: "10-12-2025",
    criticidad: "Media",
  },
  {
    centro: "Centro Logístico Pudahuel",
    tipo: "Plan de Emergencia",
    fecha: "18-12-2025",
    criticidad: "Alta",
  },
  {
    centro: "Centro Santiago Poniente",
    tipo: "Capacitación Inducción",
    fecha: "22-12-2025",
    criticidad: "Baja",
  },
];

const centrosTrabajo = [
  { nombre: "Centro de trabajo Los Maitenes", cumplimiento: 94, estado: "Sólido" },
  { nombre: "Centro Modular Talagante", cumplimiento: 81, estado: "Con brechas" },
  { nombre: "Centro Logístico Pudahuel", cumplimiento: 76, estado: "Prioritario" },
  { nombre: "Centro Santiago Poniente", cumplimiento: 68, estado: "Crítico" },
];

const planTrabajo = [
  {
    etiqueta: "Q4 · 2025",
    titulo: "Cerrar hallazgos críticos y actualizar evidencias",
    detalle: "Centrado en centros con cumplimiento < 80%.",
    avance: 65,
  },
  {
    etiqueta: "Q1 · 2026",
    titulo: "Normalizar documentación base DS44",
    detalle: "Reglamentos, IPER, planes de emergencia y registros claves.",
    avance: 30,
  },
  {
    etiqueta: "Q2 · 2026",
    titulo: "Consolidar cultura preventiva",
    detalle: "Capacitaciones, participación de Comités y auditorías internas.",
    avance: 10,
  },
];

export default function DS44ResumenPage() {
  const cumplimientoGeneral = 82;
  const hallazgosAbiertos = 16;
  const obligacionesCriticas = 6;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto space-y-8 px-4 lg:px-0">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Centro DS44 · Resumen
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Visión ejecutiva del avance de implementación DS44 en tus centros de trabajo.
            </p>
          </div>
        </header>

        {/* BLOQUE PRINCIPAL AZUL PREMIUM */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-2xl px-6 md:px-10 py-8 md:py-10">
          {/* Título */}
          <p className="text-[11px] font-semibold tracking-[0.25em] text-emerald-300 uppercase">
            CUMPLIMIENTO GENERAL DS44
          </p>
          <p className="mt-3 text-xl md:text-2xl text-slate-50">
            Basado en obligaciones, evidencias y hallazgos gestionados.
          </p>

          {/* Layout interno */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr] items-start">
            {/* IZQUIERDA */}
            <div className="flex flex-col gap-6">
              {/* Círculo + progreso */}
              <div className="flex items-center gap-6">
                <div className="relative h-32 w-32 rounded-full border border-emerald-400/80 bg-slate-950 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.35)]">
                  <span className="text-3xl font-semibold text-emerald-300">
                    {cumplimientoGeneral}%
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-emerald-300/90">
                    cumplimiento
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Avance del plan de implementación DS44
                  </p>

                  <div className="h-2 w-full rounded-full bg-slate-900/80 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{ width: `${cumplimientoGeneral}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300/80">
                    Integrando obligaciones exigidas, evidencias vigentes e indicadores de hallazgos.
                  </p>
                </div>
              </div>

              {/* Chips */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>100% documentación base vigente en</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-300">
                    2 centros
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-100">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Centros con brechas moderadas</span>
                  </div>
                  <span className="text-sm font-medium text-amber-300">
                    2 centros
                  </span>
                </div>
              </div>
            </div>

            {/* DERECHA */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-4">
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-300 uppercase">
                    Hallazgos abiertos
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-amber-300">
                    {hallazgosAbiertos}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-300/85">
                    Priorizados según criticidad y fecha compromiso.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-4">
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-slate-300 uppercase">
                    Obligaciones críticas
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-rose-300">
                    {obligacionesCriticas}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-300/85">
                    Requieren evidencias en el corto plazo.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-5 py-4">
                <p className="text-[11px] font-semibold tracking-[0.25em] text-emerald-200 uppercase">
                  Prioridad inmediata
                </p>
                <p className="mt-2 text-sm text-emerald-50">
                  Cerrar hallazgos críticos y actualizar evidencias en centros con
                  cumplimiento inferior al{" "}
                  <span className="font-semibold">80%</span>.
                </p>
                <p className="mt-1 text-[12px] text-emerald-100/85">
                  Este foco impacta directamente el indicador global DS44.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUES INFERIORES (BLANCOS, ESTILO APP) */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Próximos vencimientos */}
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-600" />
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-500">
                  Próximos vencimientos
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {proximosVencimientos.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-slate-700">{item.tipo}</p>
                  <p className="text-[11px] text-slate-500">{item.centro}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Vence: <span className="text-slate-700">{item.fecha}</span>
                    </span>
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                        (item.criticidad === "Alta"
                          ? "bg-rose-100 text-rose-700 border border-rose-300"
                          : item.criticidad === "Media"
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : "bg-sky-100 text-sky-700 border border-sky-300")
                      }
                    >
                      {item.criticidad}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Centros de trabajo */}
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-500">
                  Centros de trabajo
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {centrosTrabajo.map((centro, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-slate-700">
                    {centro.nombre}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <Progress value={centro.cumplimiento} className="h-1.5" />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Cumplimiento{" "}
                        <span className="text-slate-700">
                          {centro.cumplimiento}%
                        </span>
                      </p>
                    </div>
                    <span className="ml-2 inline-flex items-center rounded-full bg-white border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600">
                      {centro.estado}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Plan de trabajo */}
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-fuchsia-600" />
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-500">
                  Plan de trabajo DS44
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {planTrabajo.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-300 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      {item.etiqueta}
                    </span>

                    <span className="text-[11px] text-slate-500">
                      Avance:{" "}
                      <span className="text-slate-700">{item.avance}%</span>
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-700">
                    {item.titulo}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.detalle}</p>
                  <div className="mt-2">
                    <Progress value={item.avance} className="h-1.5" />
                  </div>
                </div>
              ))}

              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span>Contenido mock por ahora; luego se conecta a DS44 real.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
