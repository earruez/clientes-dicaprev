
"use client";

import React, { useState } from "react";

// Vista previa del menú Aprobaciones (mock UI)
// Esta pantalla se alimentaría en producción de:
// - Documentos de Centros de Trabajo
// - Documentos de Contratistas
// - (Opcional) Documentos Generales / Trabajadores

const CARDS_MOCK = [
  { title: "Documentos Generales", count: 4, status: "Crítico", color: "bg-rose-100 text-rose-700" },
  { title: "Centros de trabajo", count: 9, status: "Por revisar", color: "bg-amber-100 text-amber-700" },
  { title: "Contratistas", count: 5, status: "En proceso", color: "bg-blue-100 text-blue-700" },
  { title: "Trabajadores", count: 12, status: "Crítico", color: "bg-rose-100 text-rose-700" },
];

const ROWS_MOCK = [
  {
    id: 1,
    documento: "Certificado Mutual vigente",
    origen: "Contratista · Servicios Integrales Andino SpA",
    tipo: "Contratista",
    solicitadoPor: "María R.",
    fecha: "13-11-2025",
    estado: "Pendiente",
    prioridad: "Alta",
  },
  {
    id: 2,
    documento: "Listado de trabajadores actualizada",
    origen: "Centro de trabajo · Obra Condominio Los Álamos",
    tipo: "Centro de trabajo",
    solicitadoPor: "Carlos H.",
    fecha: "12-11-2025",
    estado: "Pendiente",
    prioridad: "Media",
  },
  {
    id: 3,
    documento: "Contrato de prestación de servicios",
    origen: "Contratista · Mantención Eléctrica Norte S.A.",
    tipo: "Contratista",
    solicitadoPor: "Andrea P.",
    fecha: "11-11-2025",
    estado: "Rechazado",
    prioridad: "Alta",
  },
  {
    id: 4,
    documento: "Lista de asistencia semanal",
    origen: "Centro de trabajo · Obra Mall Sur",
    tipo: "Centro de trabajo",
    solicitadoPor: "Jefe de Obra",
    fecha: "10-11-2025",
    estado: "Aprobado",
    prioridad: "Baja",
  },
];

export default function AprobacionesPreview() {
  const [tab, setTab] = useState<"pendientes" | "aprobados" | "rechazados">("pendientes");
  const [filtroOrigen, setFiltroOrigen] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(1);

  const filtered = ROWS_MOCK.filter((row) => {
    // Tab lógica
    if (tab === "pendientes" && row.estado !== "Pendiente") return false;
    if (tab === "aprobados" && row.estado !== "Aprobado") return false;
    if (tab === "rechazados" && row.estado !== "Rechazado") return false;

    // Filtro origen
    if (filtroOrigen === "centro" && row.tipo !== "Centro de trabajo") return false;
    if (filtroOrigen === "contratista" && row.tipo !== "Contratista") return false;

    // Filtro prioridad
    if (filtroPrioridad !== "todas" && row.prioridad.toLowerCase() !== filtroPrioridad) return false;

    // Buscar
    const t = search.toLowerCase().trim();
    if (t) {
      const blob = `${row.documento} ${row.origen} ${row.solicitadoPor}`.toLowerCase();
      if (!blob.includes(t)) return false;
    }

    return true;
  });

  const selected = filtered.find((r) => r.id === selectedId) || filtered[0] || ROWS_MOCK[0];

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 flex flex-col gap-8">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Aprobaciones</h1>
        <p className="text-sm text-slate-500">
          Revisa, aprueba o rechaza documentación proveniente de centros de trabajo y contratistas.
        </p>
      </div>

      {/* TARJETAS RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {CARDS_MOCK.map((c, i) => (
          <div key={i} className="bg-white border shadow-sm rounded-2xl p-5 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">{c.title}</p>
            <p className="text-3xl font-semibold text-slate-900">{c.count}</p>
            <span className={`text-xs px-2 py-1 rounded-md w-max ${c.color}`}>{c.status}</span>
            <button className="mt-1 text-xs underline text-sky-600">Revisar ahora</button>
          </div>
        ))}
      </div>

      {/* CONTENIDO PRINCIPAL: TABLA + REVISIÓN RÁPIDA */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr,1.2fr] gap-6 items-start">
        {/* PANEL IZQUIERDO: LISTA / TABLA */}
        <div className="bg-white border shadow-sm rounded-2xl p-6 flex flex-col gap-4">
          {/* TABS */}
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs font-medium">
              <button
                onClick={() => setTab("pendientes")}
                className={`px-3 py-1 rounded-full transition ${
                  tab === "pendientes" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setTab("aprobados")}
                className={`px-3 py-1 rounded-full transition ${
                  tab === "aprobados" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Aprobados
              </button>
              <button
                onClick={() => setTab("rechazados")}
                className={`px-3 py-1 rounded-full transition ${
                  tab === "rechazados" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Rechazados
              </button>
            </div>

            {/* Botón aprobar todo (modo PRO) */}
            {tab === "pendientes" && (
              <button className="text-xs px-3 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
                Aprobar todo (validado)
              </button>
            )}
          </div>

          {/* FILTROS */}
          <div className="flex flex-wrap gap-3 items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Busca por documento, obra o contratista..."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <select
                value={filtroOrigen}
                onChange={(e) => setFiltroOrigen(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-700"
              >
                <option value="todos">Origen: Todos</option>
                <option value="centro">Centros de trabajo</option>
                <option value="contratista">Contratistas</option>
              </select>

              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-700"
              >
                <option value="todas">Prioridad: Todas</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          {/* TABLA */}
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs mx-2">
              <thead>
                <tr className="text-slate-500 text-[11px] border-b">
                  <th className="py-2 text-left font-normal">Documento</th>
                  <th className="py-2 text-left font-normal">Origen</th>
                  <th className="py-2 text-left font-normal">Solicitado por</th>
                  <th className="py-2 text-left font-normal">Prioridad</th>
                  <th className="py-2 text-left font-normal">Estado</th>
                  <th className="py-2 text-right font-normal">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                      No hay documentos en este filtro.
                    </td>
                  </tr>
                )}
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b hover:bg-slate-50 cursor-pointer ${
                      selected?.id === row.id ? "bg-slate-50" : "bg-white"
                    }`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="py-3 align-top">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 text-[13px]">
                          {row.documento}
                        </span>
                        <span className="text-[11px] text-slate-400">{row.fecha}</span>
                      </div>
                    </td>
                    <td className="py-3 align-top">
                      <span className="text-[11px] text-slate-600">{row.origen}</span>
                    </td>
                    <td className="py-3 align-top text-[11px] text-slate-600">{row.solicitadoPor}</td>
                    <td className="py-3 align-top">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          row.prioridad === "Alta"
                            ? "bg-rose-100 text-rose-700"
                            : row.prioridad === "Media"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {row.prioridad}
                      </span>
                    </td>
                    <td className="py-3 align-top">
                      {row.estado === "Pendiente" && (
                        <span className="text-[11px] font-medium text-amber-700">Pendiente</span>
                      )}
                      {row.estado === "Aprobado" && (
                        <span className="text-[11px] font-medium text-emerald-700">Aprobado</span>
                      )}
                      {row.estado === "Rechazado" && (
                        <span className="text-[11px] font-medium text-rose-700">Rechazado</span>
                      )}
                    </td>
                    <td className="py-3 align-top text-right space-x-1">
                      <button className="text-emerald-600 text-[11px] underline">Aprobar</button>
                      <button className="text-rose-600 text-[11px] underline">Rechazar</button>
                      <button className="text-sky-600 text-[11px] underline">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO: REVISIÓN RÁPIDA / DETALLE */}
        <div className="bg-white border shadow-sm rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Revisión rápida</h2>
              <p className="text-[11px] text-slate-500">
                Revisa el documento seleccionado y registra tu decisión.
              </p>
            </div>

            <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
              Modo PRO
            </span>
          </div>

          {/* Resumen del documento seleccionado */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Documento</p>
            <p className="text-sm font-semibold text-slate-900">{selected.documento}</p>
            <p className="text-[11px] text-slate-500">{selected.origen}</p>
            <p className="text-[11px] text-slate-500">
              Solicitado por <span className="font-medium text-slate-700">{selected.solicitadoPor}</span> el {" "}
              <span>{selected.fecha}</span>
            </p>
          </div>

          {/* Checklist / requisitos mock */}
          <div className="flex flex-col gap-2 text-[11px]">
            <p className="text-xs font-medium text-slate-700 mb-1">Checklist de requisitos</p>
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-3 w-3" />
                <span>Legible y vigente</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-3 w-3" />
                <span>Coincide con RUT de contratista / centro</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-3 w-3" />
                <span>Subido en formato requerido (PDF)</span>
              </label>
            </div>
          </div>

          {/* Comentario de revisión */}
          <div className="flex flex-col gap-1 text-[11px]">
            <label className="text-xs font-medium text-slate-700">Comentario de revisión</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Opcional si apruebas, obligatorio si rechazas..."
            />
          </div>

          {/* Acciones grandes */}
          <div className="flex flex-col gap-2 mt-1">
            <button className="w-full h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm">
              ✔ Aprobar documento
            </button>
            <button className="w-full h-9 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-100">
              ✖ Rechazar documento
            </button>
            <button className="w-full h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] border border-dashed border-slate-300">
              Ver historial de aprobaciones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
