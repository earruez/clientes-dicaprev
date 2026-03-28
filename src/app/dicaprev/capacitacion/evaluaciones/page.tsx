"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

type TipoEval = "teorica" | "practica" | "mixta";

type ResultadoEval = {
  id: number;
  trabajador: string;
  rut: string;
  nota: number;
  aprobado: boolean;
};

type Evaluacion = {
  id: number;
  curso: string;
  tipo: TipoEval;
  notaMinima: number;
  fecha: string;
  total: number;
  aprobados: number;
  resultados: ResultadoEval[];
};

const EVALUACIONES_MOCK: Evaluacion[] = [
  {
    id: 1,
    curso: "Inducción General SST Obra Los Álamos",
    tipo: "teorica",
    notaMinima: 4,
    fecha: "2025-11-05",
    total: 22,
    aprobados: 20,
    resultados: [
      {
        id: 1,
        trabajador: "Juan Pérez",
        rut: "11.111.111-1",
        nota: 5.5,
        aprobado: true,
      },
      {
        id: 2,
        trabajador: "María López",
        rut: "12.222.222-2",
        nota: 4.3,
        aprobado: true,
      },
      {
        id: 3,
        trabajador: "Pedro González",
        rut: "13.333.333-3",
        nota: 3.8,
        aprobado: false,
      },
    ],
  },
  {
    id: 2,
    curso: "Trabajo en Altura · Supervisores",
    tipo: "mixta",
    notaMinima: 4,
    fecha: "2025-11-10",
    total: 12,
    aprobados: 11,
    resultados: [],
  },
];

export default function EvaluacionesCapacitacionPage() {
  const [evaluaciones, setEvaluaciones] =
    useState<Evaluacion[]>(EVALUACIONES_MOCK);
  const [search, setSearch] = useState<string>("");
  const [selectedEval, setSelectedEval] = useState<Evaluacion | null>(null);
  const [openDetalle, setOpenDetalle] = useState<boolean>(false);
  const [openNueva, setOpenNueva] = useState<boolean>(false);

  const [nueva, setNueva] = useState<Partial<Evaluacion>>({
    curso: "",
    tipo: "teorica",
    notaMinima: 4,
    fecha: "",
  });

  const filtradas = useMemo(() => {
    return evaluaciones.filter((e) =>
      e.curso.toLowerCase().includes(search.toLowerCase())
    );
  }, [evaluaciones, search]);

  const handleAbrirDetalle = (ev: Evaluacion) => {
    setSelectedEval(ev);
    setOpenDetalle(true);
  };

  const handleCrearEval = () => {
    if (!nueva.curso || !nueva.fecha || !nueva.tipo || !nueva.notaMinima) {
      return;
    }
    const nuevaEval: Evaluacion = {
      id: evaluaciones.length + 1,
      curso: nueva.curso,
      tipo: nueva.tipo as TipoEval,
      notaMinima: Number(nueva.notaMinima),
      fecha: nueva.fecha,
      total: 0,
      aprobados: 0,
      resultados: [],
    };
    setEvaluaciones((prev) => [...prev, nuevaEval]);
    setNueva({ curso: "", tipo: "teorica", notaMinima: 4, fecha: "" });
    setOpenNueva(false);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Evaluaciones y Notas
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Registra resultados de evaluaciones teóricas y prácticas,
            calcula porcentajes de aprobación y genera evidencia para
            auditorías y DS44.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200"
          >
            Descargar reporte consolidado
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => setOpenNueva(true)}
          >
            Crear evaluación
          </Button>
        </div>
      </div>

      {/* LISTA EVALUACIONES */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Input
              placeholder="Buscar por nombre de curso…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="h-8 text-xs bg-white rounded-xl md:w-72"
            />
            <p className="text-[11px] text-slate-500">
              * Próximo nivel: integrar cuestionarios en línea y feedback
              inmediato al trabajador.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {filtradas.length === 0 && (
            <p className="text-xs text-slate-500">
              No hay evaluaciones con los filtros actuales.
            </p>
          )}

          {filtradas.map((e) => {
            const aprobPct =
              e.total === 0 ? 0 : Math.round((e.aprobados / e.total) * 100);
            return (
              <div
                key={e.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xs"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    {e.curso}
                  </p>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <Badge className="bg-slate-50 text-slate-700 border border-slate-200 rounded-full">
                      {e.tipo === "teorica"
                        ? "Teórica"
                        : e.tipo === "practica"
                        ? "Práctica"
                        : "Mixta"}
                    </Badge>
                    <Badge className="bg-slate-900 text-slate-50 rounded-full">
                      Nota mínima {e.notaMinima.toFixed(1).replace(".0", "")}
                    </Badge>
                    <Badge className="bg-slate-50 text-slate-600 border border-slate-100 rounded-full">
                      {e.fecha}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Aprobación
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {aprobPct}%
                      </span>
                    </div>
                    <Progress
                      value={aprobPct}
                      className="h-1.5 rounded-full min-w-[120px]"
                    />
                    <p className="text-[11px] text-slate-500">
                      {e.aprobados}/{e.total} trabajadores aprobados
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-[11px]"
                      onClick={() => handleAbrirDetalle(e)}
                    >
                      Ver resultados
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl text-[11px]"
                    >
                      Exportar detalle
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* MODAL DETALLE EVALUACION */}
      <Dialog open={openDetalle} onOpenChange={setOpenDetalle}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Resultados de evaluación
            </DialogTitle>
          </DialogHeader>
          {selectedEval && (
            <div className="space-y-3 mt-1">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                <p className="text-slate-500 mb-1">Curso</p>
                <p className="font-medium text-slate-900">
                  {selectedEval.curso}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-slate-900 text-slate-50 rounded-full">
                    Nota mínima {selectedEval.notaMinima}
                  </Badge>
                  <Badge className="bg-slate-50 text-slate-700 border border-slate-200 rounded-full">
                    {selectedEval.tipo === "teorica"
                      ? "Teórica"
                      : selectedEval.tipo === "practica"
                      ? "Práctica"
                      : "Mixta"}
                  </Badge>
                  <Badge className="bg-slate-50 text-slate-600 border border-slate-100 rounded-full">
                    {selectedEval.fecha}
                  </Badge>
                </div>
              </div>

              <Tabs defaultValue="tabla" className="w-full">
                <TabsList className="bg-transparent px-0 pb-2 justify-start">
                  <TabsTrigger
                    value="tabla"
                    className="rounded-full text-xs px-4 py-1.5"
                  >
                    Tabla de resultados
                  </TabsTrigger>
                  <TabsTrigger
                    value="resumen"
                    className="rounded-full text-xs px-4 py-1.5"
                  >
                    Resumen
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tabla">
                  <div className="w-full overflow-x-auto rounded-xl border border-slate-100 bg-white">
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
                            Nota
                          </th>
                          <th className="text-left px-3 py-2 text-[11px] text-slate-500">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEval.resultados.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-xs text-slate-500 py-4"
                            >
                              Aún no se han cargado resultados individuales
                              para esta evaluación.
                            </td>
                          </tr>
                        )}
                        {selectedEval.resultados.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-slate-50"
                          >
                            <td className="px-3 py-2 text-slate-800">
                              {r.trabajador}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {r.rut}
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              {r.nota.toFixed(1)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  r.aprobado
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {r.aprobado ? "Aprobado" : "Reprobado"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="resumen">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Card className="border-slate-200 shadow-sm rounded-xl">
                      <CardContent className="p-3 space-y-1">
                        <p className="text-slate-500">Total evaluados</p>
                        <p className="text-xl font-semibold text-slate-900">
                          {selectedEval.total}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-sm rounded-xl">
                      <CardContent className="p-3 space-y-1">
                        <p className="text-slate-500">Aprobados</p>
                        <p className="text-xl font-semibold text-emerald-700">
                          {selectedEval.aprobados}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">
                    * Esta vista se conectará con la generación automática de
                    certificados y el historial del trabajador.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpenDetalle(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NUEVA EVALUACION */}
      <Dialog open={openNueva} onOpenChange={setOpenNueva}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Crear nueva evaluación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label className="text-xs">Curso asociado</Label>
              <Input
                className="h-8 text-xs rounded-xl"
                placeholder="Ej. Inducción general SST Obra Los Álamos"
                value={nueva.curso || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNueva((prev) => ({ ...prev, curso: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={(nueva.tipo as TipoEval) || "teorica"}
                  onValueChange={(value: string) =>
                    setNueva((prev) => ({ ...prev, tipo: value as TipoEval }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teorica">Teórica</SelectItem>
                    <SelectItem value="practica">Práctica</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota mínima</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 text-xs rounded-xl"
                  value={nueva.notaMinima ?? 4}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNueva((prev) => ({
                      ...prev,
                      notaMinima: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                className="h-8 text-xs rounded-xl"
                value={nueva.fecha || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNueva((prev) => ({ ...prev, fecha: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpenNueva(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={handleCrearEval}
            >
              Crear evaluación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
