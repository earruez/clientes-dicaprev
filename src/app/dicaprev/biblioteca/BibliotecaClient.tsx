"use client";

import React, { useMemo, useState } from "react";
import type { DocumentoUnificado } from "./actions";
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

type BibliotecaStats = {
  total: number;
  completo: number;
  vencido: number;
  porVencer: number;
  faltante: number;
  byCategory: {
    empresa: number;
    trabajador: number;
    vehiculo: number;
    sst: number;
  };
};

const CATEGORIA_LABELS: Record<string, string> = {
  empresa: "Empresa",
  trabajador: "Trabajador",
  sst: "SST",
  vehiculo: "Vehiculo",
  anexo: "Anexo",
};

const ESTADO_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary"; icon: React.ElementType }> = {
  completo: { label: "Vigente", variant: "default", icon: CheckCircle2 },
  vigente: { label: "Vigente", variant: "default", icon: CheckCircle2 },
  vencido: { label: "Vencido", variant: "destructive", icon: AlertTriangle },
  faltante: { label: "Faltante", variant: "secondary", icon: AlertTriangle },
  por_vencer: { label: "Por vencer", variant: "secondary", icon: AlertTriangle },
  pendiente_carga: { label: "Pendiente carga", variant: "secondary", icon: AlertTriangle },
  no_aplica: { label: "No aplica", variant: "secondary", icon: AlertTriangle },
};

export default function BibliotecaClient({
  initialDocs,
  initialStats,
}: {
  initialDocs: DocumentoUnificado[];
  initialStats: BibliotecaStats;
}) {
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const [estado, setEstado] = useState("todos");

  const filtrados = useMemo(() => {
    return initialDocs.filter((d) => {
      const matchSearch = d.nombre.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoria === "todos" || d.categoria === categoria || d.aplicaA === categoria;
      const matchEst = estado === "todos" || d.estado === estado;
      return matchSearch && matchCat && matchEst;
    });
  }, [initialDocs, search, categoria, estado]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <BookOpen className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Biblioteca documental</h1>
          <p className="text-sm text-slate-500">
            Centro unificado de documentos de empresa, trabajadores, vehiculos, SST y cumplimiento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: initialStats.total, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Vigentes", value: initialStats.completo, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Vencidos", value: initialStats.vencido, color: "text-red-700", bg: "bg-red-50" },
          { label: "Faltantes", value: initialStats.faltante || 0, color: "text-slate-500", bg: "bg-slate-50" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl ${k.bg} p-4`}>
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="empresa">Empresa</SelectItem>
            <SelectItem value="trabajador">Trabajador</SelectItem>
            <SelectItem value="sst">SST</SelectItem>
            <SelectItem value="vehiculo">Vehiculo</SelectItem>
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
            <SelectItem value="por_vencer">Por vencer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Origen</th>
              <th className="px-4 py-3 text-left">Titular</th>
              <th className="px-4 py-3 text-left">Vencimiento</th>
              <th className="px-4 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No se encontraron documentos.
                </td>
              </tr>
            ) : (
              filtrados.map((doc) => {
                const est = ESTADO_CONFIG[doc.estado] ?? ESTADO_CONFIG.faltante;
                const Icon = est.icon;
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-medium text-slate-800">{doc.nombre}</span>
                      </div>
                      {doc.nombreArchivo ? (
                        <p className="mt-0.5 pl-6 text-xs text-slate-400">{doc.nombreArchivo}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <span className="inline-block px-2 py-1 bg-slate-100 rounded">
                        {CATEGORIA_LABELS[doc.categoria] ?? doc.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {doc.sistemaOrigen === "empresa_db" && "Empresa"}
                      {doc.sistemaOrigen === "trabajador_db" && "Trabajador"}
                      {doc.sistemaOrigen === "vehiculo_db" && "Vehiculo"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {doc.titularNombre || doc.vehiculoPatente || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {doc.fechaVencimiento ? new Date(doc.fechaVencimiento).toLocaleDateString("es-CL") : <span className="text-slate-400">Sin vencimiento</span>}
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
