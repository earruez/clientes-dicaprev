"use client";

import Image from "next/image";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Link from "next/link";

/* =========================
   DATOS SIMULADOS
   ========================= */
const empresa = {
  nombre: "Constructora Andes SpA",
  logo: "/logo-dicaprev.png",
  cumplimientoGeneral: 82,
  plan: "Plan Pro",
};

const kpis = {
  documentos: { vigente: 28, porVencer: 6, vencido: 3 },
  actividades: { esteMes: 12, pendientes: 4, proximas: 2 },
  obrasActivas: 3,
};

const totalDocumentos =
  kpis.documentos.vigente +
  kpis.documentos.porVencer +
  kpis.documentos.vencido;

const actividadesPendientes = [
  { titulo: "Inspección semanal", fecha: "2025-11-12" },
  { titulo: "Capacitación uso de EPP", fecha: "2025-11-15" },
];

const proximasActividades = [
  { titulo: "Reunión Comité Paritario", fecha: "2025-11-20" },
  { titulo: "Actualización Matriz de Riesgos", fecha: "2025-11-25" },
];

const proximosVencimientos = [
  { doc: "Reglamento Interno", obra: "Central", vence: "2025-12-01" },
  { doc: "Plan de Emergencia", obra: "Planta Norte", vence: "2025-12-05" },
  { doc: "Matriz IPER", obra: "Matriz", vence: "2025-12-10" },
];

const ds44Cumplimiento = 84;
const cumplimientoDS44Data = [{ name: "DS44", pct: ds44Cumplimiento }];

/* =========================
   COMPONENTES
   ========================= */

function KpiCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
        <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">
          Cumplimiento General
        </p>
        <p className="mt-3 text-3xl font-semibold text-emerald-600">
          {empresa.cumplimientoGeneral}%
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
          Documentos (totales)
        </p>
        <p className="mt-3 text-3xl font-semibold text-slate-900">
          {totalDocumentos}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Vigentes {kpis.documentos.vigente} · Por vencer {kpis.documentos.porVencer} ·
          Vencidos {kpis.documentos.vencido}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
          Actividades Pendientes
        </p>
        <p className="mt-3 text-3xl font-semibold text-amber-500">
          {kpis.actividades.pendientes}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
        <p className="text-xs font-semibold text-sky-500 uppercase tracking-wide">
          Obras activas
        </p>
        <p className="mt-3 text-3xl font-semibold text-sky-600">
          {kpis.obrasActivas}
        </p>
      </div>
    </div>
  );
}

function AlertasCriticas() {
  const items = [
    { label: "Docs vencidos", value: kpis.documentos.vencido, tone: "text-rose-700 bg-rose-50 border-rose-200" },
    { label: "Por vencer (≤30 días)", value: kpis.documentos.porVencer, tone: "text-amber-700 bg-amber-50 border-amber-200" },
    { label: "Obras <80% cumplimiento", value: 1, tone: "text-sky-700 bg-sky-50 border-sky-200" },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Alertas críticas</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((x) => (
          <div
            key={x.label}
            className={`rounded-2xl border px-4 py-3 ${x.tone}`}
          >
            <div className="text-xs font-medium uppercase tracking-wide">{x.label}</div>
            <div className="mt-2 text-2xl font-semibold">{x.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutEstados() {
  const data = [
    { name: "Vigente", value: kpis.documentos.vigente, color: "#22c55e" },
    { name: "Por vencer", value: kpis.documentos.porVencer, color: "#f97316" },
    { name: "Vencido", value: kpis.documentos.vencido, color: "#ef4444" },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Estado de Documentos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={90} dataKey="value" nameKey="name">
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="space-y-2 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex justify-between">
              <span className="text-slate-700">{d.name}</span>
              <span className="font-medium">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CumplimientoDS44() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Cumplimiento DS44</h2>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cumplimientoDS44Data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="pct" fill="#22c55e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Cumplimiento actual DS44:{" "}
        <span className="font-semibold text-emerald-600">
          {ds44Cumplimiento}%
        </span>
      </p>
    </div>
  );
}

function QuickActions() {
  const items = [
    { label: "Documentación por obra", href: "/dicaprev/documentos/por-obra" },
    { label: "Documentos Generales", href: "/dicaprev/documentos/generales" },
    { label: "Subir documento", href: "/dicaprev/documentos" },
    { label: "Registrar capacitación", href: "/dicapprev/actividades/registro" },
    { label: "Nueva inspección", href: "/dicaprev/actividades/inspecciones" },
    { label: "Comité Paritario", href: "/dicaprev/comite-paritario" },
    { label: "Protocolos", href: "/dicaprev/protocolos" },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Acceso rápido</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-center text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProximosVencimientos() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Próximos vencimientos</h2>
      <ul className="space-y-2 text-sm">
        {proximosVencimientos.map((v, i) => (
          <li key={i} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
            <span className="text-slate-700">{v.doc} — {v.obra}</span>
            <span className="text-slate-500">{v.vence}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActividadesPendientesLista() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Actividades pendientes</h2>
      <ul className="space-y-2 text-sm">
        {actividadesPendientes.map((a, i) => (
          <li key={i} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
            <span className="text-slate-700">{a.titulo}</span>
            <span className="text-slate-500">{a.fecha}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProximasActividadesLista() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Próximas actividades</h2>
      <ul className="space-y-2 text-sm">
        {proximasActividades.map((a, i) => (
          <li key={i} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
            <span className="text-slate-700">{a.titulo}</span>
            <span className="text-slate-500">{a.fecha}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================
   PÁGINA PRINCIPAL (solo contenido)
   ========================= */

export default function Page() {
  return (
    <div className="space-y-6">
      {/* Header premium */}
      <header className="mb-6 rounded-3xl bg-white shadow-sm border border-slate-100 px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src={empresa.logo}
              alt="Logo empresa"
              width={56}
              height={56}
              className="rounded-xl border border-slate-100 bg-slate-50"
              priority
            />
            <div>
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">
                Panel de Prevención — DICAPREV
              </p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
                {empresa.nombre}
              </h1>
              <p className="text-sm text-slate-500">
                {empresa.plan} · Cumplimiento{" "}
                <span className="font-semibold text-emerald-600">
                  {empresa.cumplimientoGeneral}%
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs md:text-sm">
            <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
              Cumplimiento global: {empresa.cumplimientoGeneral}%
            </span>
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700">
              Docs totales: {totalDocumentos}
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-amber-700">
              Por vencer: {kpis.documentos.porVencer}
            </span>
            <span className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-rose-700">
              Vencidos: {kpis.documentos.vencido}
            </span>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <KpiCards />
      <AlertasCriticas />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutEstados />
        <CumplimientoDS44 />
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProximosVencimientos />
        <ActividadesPendientesLista />
        <ProximasActividadesLista />
      </div>
    </div>
  );
}

