"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

type EstadoAsistencia = "inscrito" | "confirmado" | "asistio" | "noAsistio";

type Participante = {
  id: number;
  nombre: string;
  rut: string;
  cargo: string;
  empresa: string;
  estado: EstadoAsistencia;
};

type Sesion = {
  id: number;
  titulo: string;
  fecha: string;
  obra: string;
  cupos: number;
  participantes: Participante[];
};

const SESIONES_PARTICIPACION: Sesion[] = [
  {
    id: 1,
    titulo: "Inducción General SST Obra Los Álamos",
    fecha: "2025-11-20 09:00",
    obra: "Condominio Los Álamos",
    cupos: 25,
    participantes: [
      {
        id: 1,
        nombre: "Juan Pérez",
        rut: "11.111.111-1",
        cargo: "Operario",
        empresa: "Contratista Andes",
        estado: "confirmado",
      },
      {
        id: 2,
        nombre: "María López",
        rut: "12.222.222-2",
        cargo: "Maestra",
        empresa: "Contratista Andes",
        estado: "inscrito",
      },
      {
        id: 3,
        nombre: "Pedro González",
        rut: "13.333.333-3",
        cargo: "Supervisor",
        empresa: "Constructora Principal",
        estado: "asistio",
      },
      {
        id: 4,
        nombre: "Ana Rojas",
        rut: "14.444.444-4",
        cargo: "Prevencionista",
        empresa: "Constructora Principal",
        estado: "asistio",
      },
    ],
  },
  {
    id: 2,
    titulo: "Trabajo en Altura · Supervisores",
    fecha: "2025-11-22 15:00",
    obra: "Edificio Terra",
    cupos: 15,
    participantes: [],
  },
];

const estadoConfig: Record<
  EstadoAsistencia,
  { label: string; className: string }
> = {
  inscrito: {
    label: "Inscrito",
    className:
      "bg-slate-50 text-slate-700 border border-slate-200 rounded-full",
  },
  confirmado: {
    label: "Confirmado",
    className:
      "bg-sky-50 text-sky-700 border border-sky-200 rounded-full",
  },
  asistio: {
    label: "Asistió",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full",
  },
  noAsistio: {
    label: "No asistió",
    className:
      "bg-rose-50 text-rose-700 border border-rose-200 rounded-full",
  },
};

export default function ParticipacionCapacitacionPage() {
  const [sesionId, setSesionId] = useState<number>(1);
  const [sesiones, setSesiones] =
    useState<Sesion[]>(SESIONES_PARTICIPACION);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const sesionActual = useMemo(
    () => sesiones.find((s) => s.id === sesionId) || sesiones[0],
    [sesionId, sesiones]
  );

  const filtrados = useMemo(() => {
    if (!sesionActual) return [];
    return sesionActual.participantes.filter((p) => {
      if (
        search.trim() &&
        !(
          p.nombre.toLowerCase().includes(search.toLowerCase()) ||
          p.rut.toLowerCase().includes(search.toLowerCase())
        )
      ) {
        return false;
      }
      return true;
    });
  }, [sesionActual, search]);

  const stats = useMemo(() => {
    if (!sesionActual) return { inscritos: 0, asistio: 0, confirmados: 0 };
    const inscritos = sesionActual.participantes.length;
    const asistio = sesionActual.participantes.filter(
      (p) => p.estado === "asistio"
    ).length;
    const confirmados = sesionActual.participantes.filter(
      (p) => p.estado === "confirmado"
    ).length;
    const asistenciaPorcentaje =
      inscritos === 0 ? 0 : Math.round((asistio / inscritos) * 100);
    return { inscritos, asistio, confirmados, asistenciaPorcentaje };
  }, [sesionActual]);

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const actualizarEstadoSeleccionados = (estado: EstadoAsistencia) => {
    if (!sesionActual) return;
    setSesiones((prev) =>
      prev.map((s) => {
        if (s.id !== sesionActual.id) return s;
        return {
          ...s,
          participantes: s.participantes.map((p) =>
            selectedIds.includes(p.id) ? { ...p, estado } : p
          ),
        };
      })
    );
    setSelectedIds([]);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Participación en Capacitaciones
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Gestiona asistencia, confirma inscritos y obtiene indicadores de
            participación, todo conectado con el historial por trabajador.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-xl">Descargar lista de firma</Button>
        </div>
      </div>

      {/* RESUMEN SESIÓN */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Sesión seleccionada</p>
              <Select
                value={String(sesionId)}
onValueChange={(value: string) => setSesionId(Number(value))}
              >
                <SelectTrigger className="w-[320px] h-8 bg-white rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sesiones.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.titulo} · {s.obra} · {s.fecha}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {sesionActual && (
              <div className="grid grid-cols-3 gap-3 text-xs w-full md:w-auto">
                <div>
                  <p className="text-slate-500">Cupos</p>
                  <p className="text-slate-900 font-semibold">
                    {stats.inscritos}/{sesionActual.cupos}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Confirmados</p>
                  <p className="text-slate-900 font-semibold">
                    {stats.confirmados}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Asistencia real</p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-semibold">
                      {stats.asistenciaPorcentaje}%
                    </span>
                    <Progress
                      value={stats.asistenciaPorcentaje}
                      className="h-1.5 rounded-full flex-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <Input
              placeholder="Buscar por nombre o RUT…"
              value={search}
onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
  setSearch(e.target.value)
}
              className="h-8 text-xs bg-white rounded-xl md:w-80"
            />
            <div className="flex flex-wrap gap-2 text-xs">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedIds.length === 0}
                onClick={() => actualizarEstadoSeleccionados("confirmado")}
              >
                Marcar como confirmado
              </Button>
              <Button
                size="sm"
                className="rounded-xl"
                disabled={selectedIds.length === 0}
                onClick={() => actualizarEstadoSeleccionados("asistio")}
              >
                Marcar asistencia
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={selectedIds.length === 0}
                onClick={() => actualizarEstadoSeleccionados("noAsistio")}
              >
                Marcar como no asistió
              </Button>
            </div>
          </div>

          {/* TABLA PARTICIPANTES */}
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 w-8">
                    <Checkbox
                      checked={
                        filtrados.length > 0 &&
                        selectedIds.length === filtrados.length
                      }
                      onCheckedChange={(value: boolean | "indeterminate") =>
  setSelectedIds(
    value ? filtrados.map((p) => p.id) : []
  )
}

                    />
                  </th>
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
                    Estado
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-xs text-slate-500 py-4"
                    >
                      No hay participantes para esta sesión.
                    </td>
                  </tr>
                )}
                {filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() => toggleSelected(p.id)}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-800">{p.nombre}</td>
                    <td className="px-3 py-2 text-slate-600">{p.rut}</td>
                    <td className="px-3 py-2 text-slate-600">{p.cargo}</td>
                    <td className="px-3 py-2 text-slate-600">{p.empresa}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-[11px] ${estadoConfig[p.estado].className}`}>
                        {estadoConfig[p.estado].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-2"
                      >
                        Ver historial
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-400">
            * Los cambios de asistencia se reflejarán automáticamente en{" "}
            <span className="font-medium">Historial</span> y en los indicadores
            del Dashboard DS44.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
