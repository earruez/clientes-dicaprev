"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList } from "lucide-react";

type EstadoHist = "vigente" | "vencido" | "pendiente";

type RegistroCap = {
  id: number;
  trabajador: string;
  rut: string;
  cargo: string;
  empresa: string;
  curso: string;
  fecha: string;
  vigenciaHasta?: string;
  estado: EstadoHist;
  nota?: number;
};

const HISTORIAL_MOCK: RegistroCap[] = [
  {
    id: 1,
    trabajador: "Juan Pérez",
    rut: "11.111.111-1",
    cargo: "Operario",
    empresa: "Contratista Andes",
    curso: "Inducción General SST",
    fecha: "10-02-2025",
    vigenciaHasta: "10-02-2027",
    estado: "vigente",
    nota: 5.8,
  },
  {
    id: 2,
    trabajador: "Juan Pérez",
    rut: "11.111.111-1",
    cargo: "Operario",
    empresa: "Contratista Andes",
    curso: "Trabajo en Altura Fija y Móvil",
    fecha: "15-03-2024",
    vigenciaHasta: "15-03-2025",
    estado: "vencido",
    nota: 4.2,
  },
  {
    id: 3,
    trabajador: "María López",
    rut: "12.222.222-2",
    cargo: "Maestra",
    empresa: "Contratista Andes",
    curso: "Uso y Mantención de EPP",
    fecha: "05-01-2025",
    vigenciaHasta: "05-01-2027",
    estado: "vigente",
    nota: 6.0,
  },
  {
    id: 4,
    trabajador: "Pedro González",
    rut: "13.333.333-3",
    cargo: "Supervisor",
    empresa: "Constructora Principal",
    curso: "Inducción General SST",
    fecha: "08-11-2023",
    vigenciaHasta: "08-11-2025",
    estado: "vigente",
    nota: 4.8,
  },
];

const estadoHistStyle: Record<
  EstadoHist,
  { label: string; className: string }
> = {
  vigente: {
    label: "Vigente",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full",
  },
  vencido: {
    label: "Vencido",
    className:
      "bg-rose-50 text-rose-700 border border-rose-200 rounded-full",
  },
  pendiente: {
    label: "Pendiente",
    className:
      "bg-amber-50 text-amber-700 border border-amber-200 rounded-full",
  },
};

export default function HistorialCapacitacionPage() {
  const [registros] = useState<RegistroCap[]>(HISTORIAL_MOCK);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [openFicha, setOpenFicha] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] =
    useState<string>("");

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (
        search.trim() &&
        !(
          r.trabajador.toLowerCase().includes(search.toLowerCase()) ||
          r.rut.toLowerCase().includes(search.toLowerCase())
        )
      )
        return false;
      if (estadoFiltro !== "todos" && r.estado !== estadoFiltro) return false;
      return true;
    });
  }, [registros, search, estadoFiltro]);

  const resumen = useMemo(() => {
    const total = registros.length;
    const vigentes = registros.filter((r) => r.estado === "vigente").length;
    const vencidos = registros.filter((r) => r.estado === "vencido").length;
    const pendientes = registros.filter((r) => r.estado === "pendiente").length;
    return { total, vigentes, vencidos, pendientes };
  }, [registros]);

  const abrirFicha = (rut: string) => {
    setTrabajadorSeleccionado(rut);
    setOpenFicha(true);
  };

  const fichaRegistros = useMemo(
    () => registros.filter((r) => r.rut === trabajadorSeleccionado),
    [registros, trabajadorSeleccionado]
  );

  const fichaNombre = fichaRegistros[0]?.trabajador;

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* BREADCRUMB + SUB-NAV */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/dicaprev/trabajadores/dotacion" className="hover:text-slate-700 transition-colors">Trabajadores</Link>
          <span>›</span>
          <span className="text-slate-600 font-medium">Capacitaciones</span>
        </div>
        <div className="flex gap-0 border-b border-slate-200">
          <Link href="/dicaprev/capacitacion/calendario" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Calendario</Link>
          <Link href="/dicaprev/capacitacion/historial" className="px-4 py-2 text-sm font-semibold border-b-2 border-cyan-500 text-cyan-700">Historial</Link>
          <Link href="/dicaprev/capacitacion/evaluaciones" className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors">Evaluaciones</Link>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Historial de Capacitaciones
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Registro completo de capacitaciones por trabajador — vigencias, notas y estado de cumplimiento. Útil para auditorías, organismos administradores y DS44.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-xl">Exportar a Excel</Button>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Registros totales</p>
            <p className="text-2xl font-semibold text-slate-900">
              {resumen.total}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Vigentes</p>
            <p className="text-2xl font-semibold text-emerald-700">
              {resumen.vigentes}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Vencidos</p>
            <p className="text-2xl font-semibold text-rose-700">
              {resumen.vencidos}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-3 space-y-1">
            <p className="text-xs text-slate-500">Pendientes</p>
            <p className="text-2xl font-semibold text-amber-700">
              {resumen.pendientes}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS + TABLA */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Input
              placeholder="Buscar por nombre o RUT…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
  setSearch(e.target.value)
}

              className="h-8 text-xs bg-white rounded-xl md:w-72"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Select
                value={estadoFiltro}
                onValueChange={setEstadoFiltro}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl w-[170px] bg-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    Trabajador
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    RUT
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    Cargo
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    Empresa / Contratista
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    Curso
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    Fecha
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    Vigencia hasta
                  </th>
                  <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                    Estado
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center"
                    >
                      <ClipboardList className="mx-auto h-9 w-9 text-slate-200 mb-3" />
                      <p className="text-sm font-medium text-slate-500">Sin registros que coincidan</p>
                      <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o busca por nombre del trabajador.</p>
                    </td>
                  </tr>
                )}
                {filtrados.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3 py-2 text-slate-800">
                      {r.trabajador}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.rut}</td>
                    <td className="px-3 py-2 text-slate-600">{r.cargo}</td>
                    <td className="px-3 py-2 text-slate-600">{r.empresa}</td>
                    <td className="px-3 py-2 text-slate-700">{r.curso}</td>
                    <td className="px-3 py-2 text-slate-600">{r.fecha}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {r.vigenciaHasta || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-[11px] ${estadoHistStyle[r.estado].className}`}>
                        {estadoHistStyle[r.estado].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] px-2"
                          onClick={() => abrirFicha(r.rut)}
                        >
                          Ver ficha
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] px-2"
                        >
                          Certificado
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            * En producción puedes conectar este historial con los registros
            reales de asistencia y evaluaciones, y descargar certificados o
            respaldos firmados digitalmente.
          </p>
        </CardContent>
      </Card>

      {/* FICHA TRABAJADOR */}
      <Dialog open={openFicha} onOpenChange={setOpenFicha}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Ficha de capacitación del trabajador
            </DialogTitle>
          </DialogHeader>
          {fichaRegistros.length > 0 && (
            <div className="space-y-3 mt-1">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                <p className="text-slate-500 mb-1">Trabajador</p>
                <p className="font-medium text-slate-900">
                  {fichaNombre} · {trabajadorSeleccionado}
                </p>
                <p className="text-slate-500 mt-2">Empresa / Cargo</p>
                <p className="text-slate-800">
                  {fichaRegistros[0].empresa} · {fichaRegistros[0].cargo}
                </p>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-slate-100 bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                        Curso
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                        Fecha
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                        Vigencia
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                        Nota
                      </th>
                      <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichaRegistros.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-50"
                      >
                        <td className="px-3 py-2 text-slate-800">
                          {r.curso}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.fecha}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.vigenciaHasta || "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          {r.nota ? r.nota.toFixed(1) : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 text-[11px] ${estadoHistStyle[r.estado].className}`}>
                            {estadoHistStyle[r.estado].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button size="sm" className="rounded-xl text-[11px]">
                  Descargar ficha en PDF
                </Button>
              </div>
            </div>
          )}
          {fichaRegistros.length === 0 && (
            <p className="text-xs text-slate-500">
              No se encontraron registros para este trabajador.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
