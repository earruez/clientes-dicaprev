"use client";

import React, { useState } from "react";
import { FileSignature } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

type DocumentoFirma = {
  id: string;
  nombre: string;
  empresa: string;
  obra: string;
  tipo: string;
  firmantes: number;
  estado: "Pendiente" | "En proceso" | "Enviado" | "Firmado" | "Vencido";
  vencimiento: string;
  actualizado: string;
  progreso: number;
};

function EstadoPill({
  estado,
  compact,
}: {
  estado: DocumentoFirma["estado"];
  compact?: boolean;
}) {
  const config: Record<
    DocumentoFirma["estado"],
    { label: string; bg: string; border: string; text: string; dot: string }
  > = {
    Pendiente: {
      label: "Pendiente",
      bg: "bg-amber-50",
      border: "border-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-400",
    },
    "En proceso": {
      label: "En proceso",
      bg: "bg-sky-50",
      border: "border-sky-100",
      text: "text-sky-700",
      dot: "bg-sky-400",
    },
    Enviado: {
      label: "Enviado",
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-700",
      dot: "bg-slate-400",
    },
    Firmado: {
      label: "Firmado",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    Vencido: {
      label: "Vencido",
      bg: "bg-rose-50",
      border: "border-rose-100",
      text: "text-rose-700",
      dot: "bg-rose-500",
    },
  };

  const cfg = config[estado] ?? config["Enviado"];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 ${
        compact ? "py-0.5 text-[10px]" : "py-1 text-[11px]"
      } rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
}

export default function Page() {
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [showNewModal, setShowNewModal] = useState(false);

  const documentos: DocumentoFirma[] = [
    {
      id: "1",
      nombre: "Contrato marco contratistas 2025",
      empresa: "MVP CHILE SPA",
      obra: "Obra Los Alerces",
      tipo: "Contrato",
      firmantes: 3,
      estado: "Enviado",
      vencimiento: "30-11-2025",
      actualizado: "12-11-2025",
      progreso: 67,
    },
    {
      id: "2",
      nombre: "Reglamento interno · Condominio El Roble",
      empresa: "Condominio El Roble",
      obra: "Administración central",
      tipo: "Reglamento interno",
      firmantes: 5,
      estado: "Pendiente",
      vencimiento: "25-11-2025",
      actualizado: "11-11-2025",
      progreso: 10,
    },
    {
      id: "3",
      nombre: "Matriz DS44 · Condominio Vista Andina",
      empresa: "Comité Administración Vista Andina",
      obra: "DS44",
      tipo: "DS44",
      firmantes: 2,
      estado: "Firmado",
      vencimiento: "—",
      actualizado: "10-11-2025",
      progreso: 100,
    },
    {
      id: "4",
      nombre: "Acreditación contratista Litoral SpA",
      empresa: "Litoral SpA",
      obra: "Obra Costanera Norte",
      tipo: "Acreditación contratistas",
      firmantes: 4,
      estado: "Vencido",
      vencimiento: "05-11-2025",
      actualizado: "06-11-2025",
      progreso: 50,
    },
  ];

  const seleccionado =
    documentos.find((d) => d.id === selectedId) ?? documentos[0];

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6 text-slate-900">
      <StandardPageHeader
        moduleLabel="Documentación"
        title="Firma digital"
        description="Gestión centralizada de documentos para firma electrónica de empresas, centros de trabajo y contratistas."
        icon={FileSignature}
        actions={
          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex flex-wrap gap-3 justify-end">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-1 min-w-[180px]">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Uso del mes</span>
                  <span>12 / 50 firmas</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-[24%] bg-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Plan PRO DICAPREV · se renovará el 01-12-2025
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-1 min-w-[200px]">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Estado integración</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Conectado
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Proveedor: SimpleFirma (demo)
                </p>
                <p className="text-[11px] text-slate-400">
                  Última sincronización: 12-11-2025 · 12:34
                </p>
              </div>
            </div>
          </div>
        }
      />

      {/* FILTROS Y CTA */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px] max-w-[360px]">
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 placeholder:text-slate-400"
              placeholder="Buscar por documento, empresa, obra o RUT…"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
              Ctrl + F
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100">
              Estado ▾
            </button>
            <button className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100">
              Tipo ▾
            </button>
            <button className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100">
              Más filtros ▾
            </button>
            <button className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-1">
              ⚙<span>Config. rápida</span>
            </button>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 shadow-sm"
          >
            <span className="text-base">＋</span>
            <span>Nueva solicitud de firma</span>
          </button>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="flex-1 flex flex-col gap-4">
          {/* TABS MOCK */}
          <div className="bg-white border border-slate-200 rounded-2xl px-3 pt-3 pb-0 shadow-sm">
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <button className="px-3 py-1.5 rounded-full bg-slate-900 text-slate-50">
                Bandeja de firmas
              </button>
              <button className="px-3 py-1.5 rounded-full text-slate-500 hover:bg-slate-100">
                Plantillas de firma
              </button>
              <button className="px-3 py-1.5 rounded-full text-slate-500 hover:bg-slate-100">
                Configuración avanzada
              </button>
            </div>

            {/* RESUMEN RÁPIDO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-3">
              {[
                { label: "Pendientes", value: 4, color: "bg-amber-500" },
                { label: "En proceso", value: 7, color: "bg-sky-500" },
                { label: "Completadas", value: 18, color: "bg-emerald-500" },
                { label: "Vencidas", value: 2, color: "bg-rose-500" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{item.label}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TABLA PRINCIPAL */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Bandeja de firmas</span>
              <span>Mostrando {documentos.length} solicitudes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Documento</th>
                    <th className="text-left font-medium px-4 py-2">Empresa / Obra</th>
                    <th className="text-left font-medium px-4 py-2">Tipo</th>
                    <th className="text-left font-medium px-4 py-2">Firmantes</th>
                    <th className="text-left font-medium px-4 py-2">Estado</th>
                    <th className="text-left font-medium px-4 py-2">Vencimiento</th>
                    <th className="text-left font-medium px-4 py-2">% completado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documentos.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        selectedId === doc.id ? "bg-emerald-50/60" : "bg-white"
                      }`}
                      onClick={() => setSelectedId(doc.id)}
                    >
                      <td className="px-4 py-2 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-slate-900 line-clamp-1">
                            {doc.nombre}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Última actualización: {doc.actualizado}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-900 line-clamp-1">
                            {doc.empresa}
                          </span>
                          <span className="text-[11px] text-slate-400 line-clamp-1">
                            {doc.obra}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                          {doc.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top text-xs text-slate-700">
                        {doc.firmantes}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <EstadoPill estado={doc.estado} />
                      </td>
                      <td className="px-4 py-2 align-top text-xs text-slate-700">
                        {doc.vencimiento}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${doc.progreso}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {doc.progreso}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Mostrando 1–4 de 24</span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50">
                  «
                </button>
                <button className="px-2 py-1 rounded-full bg-slate-900 text-slate-50 text-[11px]">
                  1
                </button>
                <button className="px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[11px]">
                  2
                </button>
                <button className="px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[11px]">
                  3
                </button>
                <button className="px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50">
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL LATERAL DETALLE */}
        <aside className="w-full lg:w-[340px] xl:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-medium">
                Detalle de la solicitud
              </p>
              <h2 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                {seleccionado.nombre}
              </h2>
            </div>
            <EstadoPill estado={seleccionado.estado} compact />
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Progreso de firma</span>
              <span className="font-medium text-slate-700">
                {seleccionado.progreso}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${seleccionado.progreso}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Firmantes completados:{" "}
              {Math.round((seleccionado.progreso / 100) * seleccionado.firmantes)}{" "}
              de {seleccionado.firmantes}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-500">
              Firmantes (mock)
            </p>
            <div className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Juan Pérez · Mandante</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Firmado
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">María Gómez · Contratista</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[10px] text-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Pendiente
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">RRHH Contratista</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  Enviado
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-500">
              Línea de tiempo
            </p>
            <ol className="space-y-1.5 text-[11px] text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>
                  Creado · 10-11-2025 10:23
                  <span className="block text-slate-400">
                    Usuario: admin@nextprev.cl
                  </span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>
                  Enviado a firmantes · 10-11-2025 10:30
                  <span className="block text-slate-400">
                    Envío automático plataforma
                  </span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>
                  Próximo recordatorio en 2 días
                  <span className="block text-slate-400">
                    Config. por defecto de la cuenta
                  </span>
                </span>
              </li>
            </ol>
          </div>

          <div className="mt-1 flex flex-col gap-2">
            <p className="text-[11px] font-medium text-slate-500">
              Acciones rápidas
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left">
                Reenviar correo
              </button>
              <button className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left">
                Copiar link de firma
              </button>
              <button className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left">
                Descargar PDF firmado
              </button>
              <button className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-left">
                Anular solicitud
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-medium">
                  Nueva solicitud de firma
                </p>
                <h2 className="text-sm font-semibold text-slate-900 mt-1">
                  Crear flujo rápido de firma digital
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  En la versión productiva, aquí se conectará con tu proveedor de firma electrónica para enviar el documento.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-500 text-xs hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-[11px]">
              {/* Paso 1: Documento */}
              <div className="space-y-1.5">
                <p className="font-medium text-slate-600">1. Documento a firmar</p>
                <div className="flex flex-col gap-2">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                    placeholder="Nombre interno del documento (ej: Contrato marco contratistas 2025)"
                  />
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2 hover:bg-slate-100 text-slate-600">
                    <span className="text-sm">⬆</span>
                    <span>Subir archivo PDF (mock)</span>
                  </button>
                </div>
              </div>

              {/* Paso 2: Firmantes */}
              <div className="space-y-1.5">
                <p className="font-medium text-slate-600">2. Firmantes</p>
                <p className="text-[11px] text-slate-500">
                  En la app real podrás buscar usuarios, contratistas y correos frecuentes.
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                      placeholder="Nombre / correo firmante 1"
                    />
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                      Mandante
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                      placeholder="Nombre / correo firmante 2"
                    />
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                      Contratista
                    </span>
                  </div>
                  <button className="text-[11px] text-emerald-600 hover:text-emerald-700 text-left">
                    + Agregar otro firmante
                  </button>
                </div>
              </div>

              {/* Paso 3: Vencimiento */}
              <div className="space-y-1.5">
                <p className="font-medium text-slate-600">3. Vencimiento y recordatorios</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">Fecha límite</p>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">Recordatorios</p>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500">
                      <option>Automáticos cada 3 días</option>
                      <option>Automáticos cada 7 días</option>
                      <option>Sin recordatorios automáticos</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">
                Demo DICAPREV · Esta vista es solo mockup, no envía documentos reales.
              </p>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Cancelar
                </button>
                <button className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  Crear borrador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
