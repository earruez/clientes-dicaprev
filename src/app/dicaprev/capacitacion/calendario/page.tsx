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

type Modalidad = "presencial" | "online" | "mixta";

type Sesion = {
  id: number;
  titulo: string;
  fecha: string; // yyyy-mm-dd
  hora: string;
  obra: string;
  modalidad: Modalidad;
  cupos: number;
  inscritos: number;
  estado: "planificada" | "enCurso" | "realizada" | "cancelada";
};

const SESIONES_INICIALES: Sesion[] = [
  {
    id: 1,
    titulo: "Inducción General SST Obra Los Álamos",
    fecha: "2025-11-20",
    hora: "09:00",
    obra: "Condominio Los Álamos",
    modalidad: "presencial",
    cupos: 25,
    inscritos: 18,
    estado: "planificada",
  },
  {
    id: 2,
    titulo: "Trabajo en Altura · Supervisores",
    fecha: "2025-11-22",
    hora: "15:00",
    obra: "Edificio Terra",
    modalidad: "mixta",
    cupos: 15,
    inscritos: 12,
    estado: "planificada",
  },
  {
    id: 3,
    titulo: "Uso de EPP y manejo manual de cargas",
    fecha: "2025-11-05",
    hora: "10:00",
    obra: "Planta Quilicura",
    modalidad: "presencial",
    cupos: 20,
    inscritos: 19,
    estado: "realizada",
  },
];

const OBRAS_MOCK = [
  "Todas las obras",
  "Condominio Los Álamos",
  "Edificio Terra",
  "Planta Quilicura",
];

const monthDays = Array.from({ length: 30 }).map((_, i) => i + 1);

export default function CalendarioCapacitacionPage() {
  const [sesiones, setSesiones] = useState<Sesion[]>(SESIONES_INICIALES);
  const [view, setView] = useState<"agenda" | "mes">("agenda");
  const [obraFiltro, setObraFiltro] = useState<string>("Todas las obras");
  const [modalidadFiltro, setModalidadFiltro] = useState<string>("todas");
  const [search, setSearch] = useState<string>("");

  const [openNueva, setOpenNueva] = useState<boolean>(false);
  const [nueva, setNueva] = useState<Partial<Sesion>>({
    titulo: "",
    fecha: "",
    hora: "",
    obra: "Condominio Los Álamos",
    modalidad: "presencial",
    cupos: 20,
  });

  const sesionesFiltradas = useMemo(() => {
    return sesiones.filter((s) => {
      if (
        obraFiltro !== "Todas las obras" &&
        s.obra.toLowerCase() !== obraFiltro.toLowerCase()
      ) {
        return false;
      }
      if (modalidadFiltro !== "todas" && s.modalidad !== modalidadFiltro) {
        return false;
      }
      if (
        search.trim() &&
        !s.titulo.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [sesiones, obraFiltro, modalidadFiltro, search]);

  const sesionesPorDia = useMemo(() => {
    const map: Record<number, Sesion[]> = {};
    sesionesFiltradas.forEach((s) => {
      const day = Number(s.fecha.split("-")[2] || "1");
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sesionesFiltradas]);

  const handleCrearSesion = () => {
    if (!nueva.titulo || !nueva.fecha || !nueva.hora || !nueva.obra) return;

    const nuevaSesion: Sesion = {
      id: sesiones.length + 1,
      titulo: nueva.titulo,
      fecha: nueva.fecha,
      hora: nueva.hora,
      obra: nueva.obra,
      modalidad: (nueva.modalidad || "presencial") as Modalidad,
      cupos: Number(nueva.cupos) || 20,
      inscritos: 0,
      estado: "planificada",
    };

    setSesiones((prev) => [...prev, nuevaSesion]);
    setOpenNueva(false);
    setNueva({
      titulo: "",
      fecha: "",
      hora: "",
      obra: "Condominio Los Álamos",
      modalidad: "presencial",
      cupos: 20,
    });
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Calendario de Capacitaciones
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Programa sesiones, asigna cupos y visualiza en un calendario limpio.
            Esta sección se conecta con participación, evaluaciones e historial.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200"
            onClick={() => setView(view === "agenda" ? "mes" : "agenda")}
          >
            Vista {view === "agenda" ? "mensual" : "agenda"}
          </Button>
          <Button className="rounded-xl" onClick={() => setOpenNueva(true)}>
            Programar capacitación
          </Button>
        </div>
      </div>

      {/* FILTROS */}
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Select
                value={obraFiltro}
                onValueChange={(value: string) => setObraFiltro(value)}
              >
                <SelectTrigger className="w-[220px] h-9 bg-white rounded-xl text-xs">
                  <SelectValue placeholder="Obra / centro de trabajo" />
                </SelectTrigger>
                <SelectContent>
                  {OBRAS_MOCK.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={modalidadFiltro}
                onValueChange={(value: string) => setModalidadFiltro(value)}
              >
                <SelectTrigger className="w-[160px] h-9 bg-white rounded-xl text-xs">
                  <SelectValue placeholder="Modalidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las modalidades</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="mixta">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Buscar por nombre del curso…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="h-9 text-xs bg-white rounded-xl md:w-72"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs
            value={view}
            onValueChange={(value: string) =>
              setView(value as "agenda" | "mes")
            }
          >
            <TabsList className="bg-transparent px-0 pt-0 pb-3 justify-start">
              <TabsTrigger
                value="agenda"
                className="rounded-full text-xs px-4 py-1.5"
              >
                Agenda detallada
              </TabsTrigger>
              <TabsTrigger
                value="mes"
                className="rounded-full text-xs px-4 py-1.5"
              >
                Vista mensual
              </TabsTrigger>
            </TabsList>

            {/* AGENDA */}
            <TabsContent value="agenda" className="pt-0">
              <div className="space-y-2">
                {sesionesFiltradas.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No hay capacitaciones con los filtros actuales.
                  </p>
                )}
                {sesionesFiltradas
                  .slice()
                  .sort((a, b) => a.fecha.localeCompare(b.fecha))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-slate-50 text-xs">
                          <span className="font-semibold">
                            {s.fecha.split("-")[2]}
                          </span>
                          <span className="uppercase tracking-wide text-[9px]">
                            {new Date(s.fecha).toLocaleString("es-CL", {
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {s.titulo}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {s.obra} · {s.hora} hrs · Cupos {s.inscritos}/
                            {s.cupos}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                            <Badge
                              className={`rounded-full px-2 py-0.5 text-[10px] ${
                                s.modalidad === "presencial"
                                  ? "bg-sky-50 text-sky-700 border border-sky-100"
                                  : s.modalidad === "online"
                                  ? "bg-violet-50 text-violet-700 border border-violet-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}
                            >
                              {s.modalidad === "presencial"
                                ? "Presencial"
                                : s.modalidad === "online"
                                ? "Online"
                                : "Mixta"}
                            </Badge>
                            <Badge className="rounded-full bg-slate-50 text-slate-600 border border-slate-100">
                              {s.estado === "planificada"
                                ? "Planificada"
                                : s.estado === "enCurso"
                                ? "En curso"
                                : s.estado === "realizada"
                                ? "Realizada"
                                : "Cancelada"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-[11px]"
                        >
                          Ver participantes
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl text-[11px]"
                        >
                          Enviar recordatorio
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>

            {/* VISTA MENSUAL */}
            <TabsContent value="mes" className="pt-0">
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                <div className="grid grid-cols-7 border-b border-slate-100 text-[11px] text-slate-500 bg-slate-50/70">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                    (d) => (
                      <div key={d} className="px-2 py-1.5 text-center">
                        {d}
                      </div>
                    )
                  )}
                </div>
                <div className="grid grid-cols-7 text-[11px]">
                  {monthDays.map((day) => {
                    const events = sesionesPorDia[day] || [];
                    return (
                      <div
                        key={day}
                        className="min-h-[72px] border-b border-r border-slate-100 px-1.5 py-1.5 last:border-r-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-slate-700">
                            {day}
                          </span>
                          {events.length > 0 && (
                            <span className="text-[9px] text-slate-400">
                              {events.length} cap.
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {events.slice(0, 2).map((e) => (
                            <div
                              key={e.id}
                              className="rounded-xl bg-slate-900 text-slate-50 px-1 py-0.5 text-[9px] cursor-pointer"
                              title={e.titulo}
                            >
                              <span className="block truncate">
                                {e.titulo}
                              </span>
                            </div>
                          ))}
                          {events.length > 2 && (
                            <span className="text-[9px] text-slate-400">
                              +{events.length - 2} más
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                * Vista mensual mock. En producción se puede reemplazar por un
                calendario full (drag & drop, integración Google Calendar, etc.).
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MODAL NUEVA SESIÓN */}
      <Dialog open={openNueva} onOpenChange={setOpenNueva}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Programar nueva capacitación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input
                className="h-8 text-xs rounded-xl"
                placeholder="Ej. Inducción general SST nuevos ingresos"
                value={nueva.titulo || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNueva((prev) => ({ ...prev, titulo: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <Input
                  type="time"
                  className="h-8 text-xs rounded-xl"
                  value={nueva.hora || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNueva((prev) => ({ ...prev, hora: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Obra / centro de trabajo</Label>
              <Select
                value={nueva.obra || "Condominio Los Álamos"}
                onValueChange={(value: string) =>
                  setNueva((prev) => ({ ...prev, obra: value }))
                }
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBRAS_MOCK.filter((o) => o !== "Todas las obras").map(
                    (o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modalidad</Label>
                <Select
                  value={(nueva.modalidad as Modalidad) || "presencial"}
                  onValueChange={(value: string) =>
                    setNueva((prev) => ({
                      ...prev,
                      modalidad: value as Modalidad,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cupos</Label>
                <Input
                  type="number"
                  className="h-8 text-xs rounded-xl"
                  value={nueva.cupos ?? 20}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNueva((prev) => ({
                      ...prev,
                      cupos: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setOpenNueva(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={handleCrearSesion}
            >
              Crear sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
