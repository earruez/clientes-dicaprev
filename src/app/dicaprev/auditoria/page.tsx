"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  getLogs,
  getLogsFiltrados,
  subscribe,
  type AuditLog,
  type AccionAudit,
  type ModuloAudit,
} from "@/lib/auditoria/audit-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ClipboardList,
  RefreshCw,
  Eye,
  User,
  Calendar,
  Package,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Config de visualización ──────────────────────────────────────────────── //

const ACCION_CFG: Record<
  AccionAudit,
  { label: string; cls: string }
> = {
  crear:           { label: "Creación",       cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  editar:          { label: "Edición",         cls: "bg-sky-50 text-sky-700 border border-sky-200" },
  eliminar:        { label: "Eliminación",     cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  aprobar:         { label: "Aprobación",      cls: "bg-teal-50 text-teal-700 border border-teal-200" },
  rechazar:        { label: "Rechazo",         cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  enviar:          { label: "Envío",           cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  subir_documento: { label: "Subida doc.",     cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  cambiar_estado:  { label: "Cambio estado",   cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  ver:             { label: "Consulta",        cls: "bg-slate-50 text-slate-500 border border-slate-200" },
};

const MODULO_CFG: Record<ModuloAudit, { label: string; dot: string }> = {
  trabajadores:   { label: "Trabajadores",  dot: "bg-cyan-500" },
  documentos:     { label: "Documentos",    dot: "bg-blue-500" },
  cumplimiento:   { label: "Cumplimiento",  dot: "bg-amber-500" },
  acreditaciones: { label: "Acreditaciones",dot: "bg-teal-500" },
  vehiculos:      { label: "Vehículos",     dot: "bg-violet-500" },
  capacitacion:   { label: "Capacitación",  dot: "bg-fuchsia-500" },
  empresa:        { label: "Empresa",       dot: "bg-emerald-500" },
};

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-CL")} ${d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Component ────────────────────────────────────────────────────────────── //

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>(() => getLogs());
  const [search, setSearch] = useState("");
  const [modulo, setModulo] = useState<ModuloAudit | "todos">("todos");
  const [accion, setAccion] = useState<AccionAudit | "todas">("todas");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Sync with store updates (when other pages register actions)
  useEffect(() => {
    const unsub = subscribe(() => setLogs(getLogs()));
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const base = getLogsFiltrados({
      modulo: modulo === "todos" ? undefined : modulo,
      accion: accion === "todas" ? undefined : accion,
    });
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (l) =>
        l.descripcion.toLowerCase().includes(q) ||
        l.usuarioNombre.toLowerCase().includes(q) ||
        l.entidadTipo.toLowerCase().includes(q) ||
        l.entidadId.toLowerCase().includes(q)
    );
  }, [logs, search, modulo, accion]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleReset() {
    setSearch("");
    setModulo("todos");
    setAccion("todas");
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Auditoría del sistema
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Registro de todas las acciones realizadas por usuarios en el SaaS.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">{filtered.length} eventos</span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 text-slate-600"
              onClick={handleReset}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Limpiar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar por descripción, usuario o entidad…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50 text-sm"
            />
          </div>

          <Select value={modulo} onValueChange={(v) => setModulo(v as ModuloAudit | "todos")}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl border-slate-200 text-sm bg-white">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los módulos</SelectItem>
              {(Object.keys(MODULO_CFG) as ModuloAudit[]).map((m) => (
                <SelectItem key={m} value={m}>{MODULO_CFG[m].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={accion} onValueChange={(v) => setAccion(v as AccionAudit | "todas")}>
            <SelectTrigger className="w-[170px] h-9 rounded-xl border-slate-200 text-sm bg-white">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las acciones</SelectItem>
              {(Object.keys(ACCION_CFG) as AccionAudit[]).map((a) => (
                <SelectItem key={a} value={a}>{ACCION_CFG[a].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_140px_160px_44px] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Descripción</span>
            <span>Módulo</span>
            <span>Acción</span>
            <span>Fecha</span>
            <span />
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No se encontraron eventos para los filtros aplicados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[1fr_140px_140px_160px_44px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50/70 transition-colors"
                >
                  {/* Descripción + entidad */}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{log.descripcion}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-400">{log.entidadTipo}</span>
                      <span className="text-[11px] text-slate-300">·</span>
                      <span className="text-[11px] font-mono text-slate-400">{log.entidadId}</span>
                      <span className="text-[11px] text-slate-300">·</span>
                      <User className="h-3 w-3 text-slate-300 shrink-0" />
                      <span className="text-[11px] text-slate-400">{log.usuarioNombre}</span>
                    </div>
                  </div>

                  {/* Módulo */}
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", MODULO_CFG[log.modulo]?.dot ?? "bg-slate-400")} />
                    <span className="text-xs text-slate-600 truncate">{MODULO_CFG[log.modulo]?.label ?? log.modulo}</span>
                  </div>

                  {/* Acción */}
                  <div>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", ACCION_CFG[log.accion]?.cls ?? "bg-slate-100 text-slate-600")}>
                      {ACCION_CFG[log.accion]?.label ?? log.accion}
                    </span>
                  </div>

                  {/* Fecha */}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                    <span className="text-xs text-slate-500 whitespace-nowrap">{fmtFecha(log.fecha)}</span>
                  </div>

                  {/* Detalle */}
                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Detail modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Detalle del evento</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1"><User className="h-3 w-3" /> Usuario</p>
                  <p className="text-slate-800">{selectedLog.usuarioNombre}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1"><Calendar className="h-3 w-3" /> Fecha</p>
                  <p className="text-slate-800">{fmtFecha(selectedLog.fecha)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1"><Package className="h-3 w-3" /> Módulo</p>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", MODULO_CFG[selectedLog.modulo]?.dot ?? "bg-slate-400")} />
                    <span className="text-slate-800">{MODULO_CFG[selectedLog.modulo]?.label}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1"><Tag className="h-3 w-3" /> Acción</p>
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", ACCION_CFG[selectedLog.accion]?.cls ?? "bg-slate-100 text-slate-600")}>
                    {ACCION_CFG[selectedLog.accion]?.label}
                  </span>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Entidad</p>
                  <p className="text-slate-800">{selectedLog.entidadTipo} <span className="font-mono text-slate-500 text-xs">({selectedLog.entidadId})</span></p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Descripción</p>
                  <p className="text-slate-800 leading-relaxed">{selectedLog.descripcion}</p>
                </div>
              </div>

              {(selectedLog.antes || selectedLog.despues) && (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  {selectedLog.antes && (
                    <div className="p-3 bg-rose-50/50 border-b border-slate-100">
                      <p className="text-[10px] text-rose-500 font-semibold uppercase mb-1">Antes</p>
                      <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-all">{JSON.stringify(selectedLog.antes, null, 2)}</pre>
                    </div>
                  )}
                  {selectedLog.despues && (
                    <div className="p-3 bg-emerald-50/50">
                      <p className="text-[10px] text-emerald-600 font-semibold uppercase mb-1">Después</p>
                      <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-all">{JSON.stringify(selectedLog.despues, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
