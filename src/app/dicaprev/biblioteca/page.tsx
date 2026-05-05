"use client";

import React, { useMemo, useState } from "react";
import { BIBLIOTECA_MOCK } from "./mock-biblioteca";
import type { DocumentoBase } from "@/app/dicaprev/acreditaciones/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Search, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

const CATEGORIA_LABELS: Record<string, string> = {
  empresa: "Empresa",
  trabajador: "Trabajador",
  sst: "SST",
  vehiculo: "Vehículo",
  anexo: "Anexo",
};

const ESTADO_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary"; icon: React.ElementType }> = {
  completo: { label: "Vigente", variant: "default", icon: CheckCircle2 },
  vencido: { label: "Vencido", variant: "destructive", icon: AlertTriangle },
  faltante: { label: "Faltante", variant: "secondary", icon: AlertTriangle },
};

export default function BibliotecaPage() {
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const [estado, setEstado] = useState("todos");

  const docs = useMemo(() => {
    return BIBLIOTECA_MOCK.filter((d: DocumentoBase) => {
      const matchSearch = d.nombre.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoria === "todos" || d.categoria === categoria;
      const matchEst = estado === "todos" || d.estado === estado;
      return matchSearch && matchCat && matchEst;
    });
  }, [search, categoria, estado]);

  const counts = useMemo(() => ({
    total: BIBLIOTECA_MOCK.length,
    completo: BIBLIOTECA_MOCK.filter((d: DocumentoBase) => d.estado === "completo").length,
    vencido: BIBLIOTECA_MOCK.filter((d: DocumentoBase) => d.estado === "vencido").length,
    faltante: BIBLIOTECA_MOCK.filter((d: DocumentoBase) => d.estado === "faltante").length,
  }), []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <BookOpen className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Biblioteca documental</h1>
          <p className="text-sm text-slate-500">
            Plantillas, formatos y documentos base reutilizables para procesos internos, trabajadores, cumplimiento y acreditaciones.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.total, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Vigentes", value: counts.completo, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Vencidos", value: counts.vencido, color: "text-red-700", bg: "bg-red-50" },
          { label: "Faltantes", value: counts.faltante, color: "text-slate-500", bg: "bg-slate-50" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl ${k.bg} p-4`}>
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar documento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {Object.entries(CATEGORIA_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="completo">Vigente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="faltante">Faltante</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Titular</th>
              <th className="px-4 py-3 text-left">Vencimiento</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {docs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No se encontraron documentos.
                </td>
              </tr>
            ) : (
              docs.map((doc: DocumentoBase) => {
                const est = ESTADO_CONFIG[doc.estado] ?? ESTADO_CONFIG.faltante;
                const Icon = est.icon;
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-medium text-slate-800">{doc.nombre}</span>
                      </div>
                      {doc.nombreArchivo && (
                        <p className="mt-0.5 pl-6 text-xs text-slate-400">{doc.nombreArchivo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {CATEGORIA_LABELS[doc.categoria] ?? doc.categoria}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {doc.titularNombre ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {doc.fechaVencimiento ?? <span className="text-slate-400">Sin vencimiento</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={est.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {est.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
