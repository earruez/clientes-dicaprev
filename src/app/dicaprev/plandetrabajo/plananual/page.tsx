"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";

// ============================
// Estilos reutilizables (premium)
// ============================

const primaryCtaBtn =
  "inline-flex items-center justify-center rounded-full px-5 h-10 text-xs md:text-sm font-semibold " +
  "text-white bg-gradient-to-r from-emerald-500 to-teal-500 " +
  "hover:from-emerald-600 hover:to-teal-600 " +
  "shadow-[0_12px_30px_rgba(16,185,129,0.35)]";

const subtleOutlineBtn =
  "inline-flex items-center justify-center rounded-full px-4 h-9 text-xs font-medium " +
  "border border-slate-200 bg-white text-slate-700 " +
  "hover:border-emerald-300 hover:text-emerald-700 shadow-sm";

// ======================================
// Mock data types
// ======================================

type EstadoActividad = "pendiente" | "vencida" | "realizada";

type Actividad = {
  id: number;
  nombre: string;
  normativa: string[];
  categoria: string;
  periodicidad: string;
  mes: string;
  responsable: string;
  centroTrabajo?: string;
  contratista?: string;
  critica?: boolean;
  estado: EstadoActividad;
};

const ACTIVIDADES_MOCK: Actividad[] = [
  {
    id: 1,
    nombre: "Reunión mensual Comité Paritario",
    normativa: ["Ley 16.744", "CPHS"],
    categoria: "Comité Paritario",
    periodicidad: "Mensual",
    mes: "Enero",
    responsable: "Encargado de Prevención",
    centroTrabajo: "Obra Costanera Norte",
    estado: "realizada",
  },
  {
    id: 2,
    nombre: "Capacitación Inducción Trabajadores Nuevos",
    normativa: ["DS72", "Código del Trabajo"],
    categoria: "Capacitación",
    periodicidad: "Mensual",
    mes: "Febrero",
    responsable: "RRHH + Prevención",
    centroTrabajo: "Planta Quilicura",
    estado: "pendiente",
    critica: true,
  },
  {
    id: 3,
    nombre: "Inspección general de obras DS44",
    normativa: ["DS44"],
    categoria: "Inspección",
    periodicidad: "Trimestral",
    mes: "Marzo",
    responsable: "Prevencionista Asesor",
    centroTrabajo: "Obra Edificio Parque Sur",
    estado: "vencida",
    critica: true,
  },
  {
    id: 4,
    nombre: "Revisión y actualización Reglamento Interno",
    normativa: ["Código del Trabajo"],
    categoria: "Documentación",
    periodicidad: "Anual",
    mes: "Abril",
    responsable: "Gerencia + Prevención",
    estado: "pendiente",
  },
  {
    id: 5,
    nombre: "Mantención anual de extintores",
    normativa: ["DS594"],
    categoria: "Mantención",
    periodicidad: "Anual",
    mes: "Mayo",
    responsable: "Proveedor externo acreditado",
    centroTrabajo: "Todos los centros",
    estado: "realizada",
  },
];

const PLANES_NORMATIVA_MOCK = [
  { nombre: "DS44", cumplimiento: 72 },
  { nombre: "DS67", cumplimiento: 65 },
  { nombre: "Ley 16.744", cumplimiento: 58 },
  { nombre: "Protocolos MINSAL", cumplimiento: 83 },
  { nombre: "Internos", cumplimiento: 61 },
];

const PLANES_CATEGORIA_MOCK = [
  { nombre: "Capacitaciones", cumplimiento: 66 },
  { nombre: "Inspecciones", cumplimiento: 58 },
  { nombre: "Comité Paritario", cumplimiento: 92 },
  { nombre: "Mantenciones", cumplimiento: 78 },
  { nombre: "Documentación", cumplimiento: 54 },
];

// Helper UI
function estadoBadge(estado: EstadoActividad) {
  switch (estado) {
    case "realizada":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">
          Realizada
        </Badge>
      );
    case "vencida":
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-200">
          Vencida
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
          Pendiente
        </Badge>
      );
  }
}

function criticaChip() {
  return (
    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
      Crítica
    </span>
  );
}

// ======================================
// Page component
// ======================================

const PlanTrabajoAnualPage = () => {
  const [anio, setAnio] = useState("2025");
  const [tab, setTab] = useState("general");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>("todos");
  const [filtroNormativa, setFiltroNormativa] = useState<string | undefined>("todas");

  const [openNuevaActividad, setOpenNuevaActividad] = useState(false);
  const [openEvidencia, setOpenEvidencia] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] =
    useState<Actividad | null>(null);

  const [openAsistente, setOpenAsistente] = useState(false);
  const [pasoAsistente, setPasoAsistente] = useState(1);

  const [openInfo, setOpenInfo] = useState(false);
  const [infoTitle, setInfoTitle] = useState<string | null>(null);
  const [infoDescription, setInfoDescription] = useState<string | null>(null);

  const nextYear = useMemo(() => {
    const n = Number(anio);
    return Number.isNaN(n) ? anio : String(n + 1);
  }, [anio]);

  const cumplimientoGeneral = useMemo(() => 81, []);
  const actividadesVencidas = useMemo(
    () => ACTIVIDADES_MOCK.filter((a) => a.estado === "vencida").length,
    []
  );
  const actividadesPendientes = useMemo(
    () => ACTIVIDADES_MOCK.filter((a) => a.estado === "pendiente").length,
    []
  );
  const actividadesRealizadas = useMemo(
    () => ACTIVIDADES_MOCK.filter((a) => a.estado === "realizada").length,
    []
  );

  const actividadesFiltradas = useMemo(() => {
    return ACTIVIDADES_MOCK.filter((a) => {
      const matchBusqueda =
        !busqueda ||
        a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.categoria.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.responsable.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.normativa.some((n) => n.toLowerCase().includes(busqueda.toLowerCase()));

      const matchEstado =
        !filtroEstado || filtroEstado === "todos" ? true : a.estado === filtroEstado;

      const matchNormativa =
        !filtroNormativa || filtroNormativa === "todas"
          ? true
          : a.normativa.includes(filtroNormativa);

      return matchBusqueda && matchEstado && matchNormativa;
    });
  }, [busqueda, filtroEstado, filtroNormativa]);

  const normativasUnicas = useMemo(() => {
    const set = new Set<string>();
    ACTIVIDADES_MOCK.forEach((a) => a.normativa.forEach((n) => set.add(n)));
    return Array.from(set);
  }, []);

  const abrirInfo = (title: string, description: string) => {
    setInfoTitle(title);
    setInfoDescription(description);
    setOpenInfo(true);
  };

  const manejarSubirEvidencia = (actividad: Actividad) => {
    setActividadSeleccionada(actividad);
    setOpenEvidencia(true);
  };

  const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ] as const;
  type Mes = (typeof MESES)[number];

  type ActividadMatriz = {
    id: number;
    nombre: string;
    mesesSeleccionados: Mes[];
  };

  const construirBaseMatriz = (): ActividadMatriz[] =>
    ACTIVIDADES_MOCK.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      mesesSeleccionados: [a.mes as Mes],
    }));

  const [actividadesMatriz, setActividadesMatriz] = useState<ActividadMatriz[]>(
    construirBaseMatriz
  );

  const toggleMesActividad = (actividadId: number, mes: Mes) => {
    setActividadesMatriz((prev) =>
      prev.map((act) => {
        if (act.id !== actividadId) return act;
        const existe = act.mesesSeleccionados.includes(mes);
        const mesesSeleccionados = existe
          ? act.mesesSeleccionados.filter((m) => m !== mes)
          : [...act.mesesSeleccionados, mes];
        return { ...act, mesesSeleccionados };
      })
    );
  };

  const aplicarPatronMeses = (
    actividadId: number,
    tipo: "mensual" | "trimestral" | "anual"
  ) => {
    setActividadesMatriz((prev) =>
      prev.map((act) => {
        if (act.id !== actividadId) return act;
        let mesesSeleccionados: Mes[] = [];
        if (tipo === "mensual") {
          mesesSeleccionados = [...MESES];
        } else if (tipo === "trimestral") {
          mesesSeleccionados = MESES.filter((_, i) => i % 3 === 2) as Mes[]; // Mar, Jun, Sep, Dic
        } else if (tipo === "anual") {
          mesesSeleccionados = ["Mayo"];
        }
        return { ...act, mesesSeleccionados };
      })
    );
  };

  const aplicarPlantillaRecomendada = () => {
    setActividadesMatriz(construirBaseMatriz());
    abrirInfo(
      "Plantilla aplicada",
      "Se reconstruyó el plan anual utilizando la plantilla base según las actividades actuales (demo)."
    );
  };

  const limpiarMesesMatriz = () => {
    setActividadesMatriz((prev) =>
      prev.map((act) => ({ ...act, mesesSeleccionados: [] }))
    );
    abrirInfo(
      "Matriz limpiada",
      "Se limpiaron los meses seleccionados para todas las actividades (demo)."
    );
  };

  const avanzarPasoAsistente = () =>
    setPasoAsistente((prev) => (prev < 3 ? prev + 1 : prev));

  const retrocederPasoAsistente = () =>
    setPasoAsistente((prev) => (prev > 1 ? prev - 1 : prev));

  const finalizarAsistente = () => {
    setOpenAsistente(false);
    setTab("matriz");
    abrirInfo(
      "Asistente completado",
      "Este es un flujo demostrativo. En producción se usarán los datos ingresados para sugerir actividades y distribuirlas en la matriz anual."
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 px-6 py-8 flex flex-col gap-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Plan de Trabajo Anual
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Gestiona de forma integral todas las actividades de prevención de tu empresa:
            normativa legal, planes internos, obras y contratistas, en un solo módulo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Select value={anio} onValueChange={setAnio}>
            <SelectTrigger className="w-[130px] bg-white shadow-sm border-slate-200 rounded-full h-9 text-xs">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>

          <Button
            className={subtleOutlineBtn}
            onClick={() =>
              abrirInfo(
                "Copiar plan al año siguiente",
                `En producción, este botón creará el plan ${nextYear} copiando la estructura del plan ${anio}, dejando todas las actividades en estado pendiente y sin evidencias.`
              )
            }
          >
            Copiar plan a {nextYear}
          </Button>

          <Button
            className={subtleOutlineBtn}
            onClick={() =>
              abrirInfo(
                "Descargar plan en PDF",
                "En esta versión demo no se genera el PDF, pero aquí se conectará con el generador de reportes DICAPREV."
              )
            }
          >
            Descargar PDF
          </Button>

          <Button
            className={primaryCtaBtn}
            onClick={() => setOpenNuevaActividad(true)}
          >
            + Nueva actividad
          </Button>
        </div>
      </div>

      {/* RESUMEN SUPERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-medium">
                  Resumen general {anio}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Cumplimiento del Plan de Trabajo
                </h2>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full">
                Anual
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Cumplimiento global</span>
                <span className="text-sm font-semibold text-slate-900">
                  {cumplimientoGeneral}%
                </span>
              </div>
              <Progress value={cumplimientoGeneral} className="h-2.5" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 uppercase tracking-wide">
                  Realizadas
                </span>
                <span className="text-xl font-semibold text-slate-900">
                  {actividadesRealizadas}
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 inline-flex w-fit">
                  Actividades con evidencia
                </span>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 flex flex-col gap-1.5">
                <span className="text-xs text-amber-700 uppercase tracking-wide">
                  Pendientes
                </span>
                <span className="text-xl font-semibold text-amber-900">
                  {actividadesPendientes}
                </span>
                <span className="text-[11px] text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 inline-flex w-fit">
                  Programadas próximos meses
                </span>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 flex flex-col gap-1.5">
                <span className="text-xs text-red-700 uppercase tracking-wide">
                  Vencidas
                </span>
                <span className="text-xl font-semibold text-red-900">
                  {actividadesVencidas}
                </span>
                <span className="text-[11px] text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5 inline-flex w-fit">
                  Revisión prioritaria
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-rows-2 gap-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400 font-medium">
                  Por normativa
                </span>
                <span className="text-[11px] text-slate-400">Visión transversal</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {PLANES_NORMATIVA_MOCK.map((n) => (
                <div key={n.nombre} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium text-slate-700">
                    {n.nombre}
                  </div>
                  <div className="flex-1">
                    <Progress value={n.cumplimiento} className="h-1.5" />
                  </div>
                  <div className="w-10 text-right text-xs text-slate-500">
                    {n.cumplimiento}%
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400 font-medium">
                  Por tipo de actividad
                </span>
                <span className="text-[11px] text-slate-400">
                  Capacitaciones, inspecciones, etc.
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {PLANES_CATEGORIA_MOCK.map((c) => (
                <div key={c.nombre} className="flex items-center gap-3">
                  <div className="w-32 text-xs font-medium text-slate-700 truncate">
                    {c.nombre}
                  </div>
                  <div className="flex-1">
                    <Progress value={c.cumplimiento} className="h-1.5" />
                  </div>
                  <div className="w-10 text-right text-xs text-slate-500">
                    {c.cumplimiento}%
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ASISTENTE DEFINICIÓN DEL PLAN */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-medium">
              Asistente de diseño
            </p>
            <h3 className="text-sm font-semibold text-slate-900">
              Construye tu plan anual en pocos pasos
            </h3>
            <p className="text-xs text-slate-500 max-w-xl">
              Define normativas aplicables, rubro, tamaño de empresa y genera automáticamente
              una propuesta de plan anual que luego puedes ajustar en la matriz mes a mes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto justify-end">
            <Button
              className={subtleOutlineBtn}
              onClick={() => setTab("matriz")}
            >
              Ver matriz anual
            </Button>
            <Button
              className={primaryCtaBtn + " h-9 px-4"}
              onClick={() => {
                setPasoAsistente(1);
                setOpenAsistente(true);
              }}
            >
              Iniciar asistente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TABS PRINCIPALES */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Tabs value={tab} onValueChange={setTab} className="w-full md:w-auto">
              <TabsList className="bg-slate-100/80 p-1 rounded-full h-auto">
                <TabsTrigger
                  value="general"
                  className="rounded-full px-4 py-1.5 text-xs md:text-sm"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="matriz"
                  className="rounded-full px-4 py-1.5 text-xs md:text-sm"
                >
                  Diseño anual (Matriz)
                </TabsTrigger>
                <TabsTrigger
                  value="gantt"
                  className="rounded-full px-4 py-1.5 text-xs md:text-sm"
                >
                  Vista Gantt
                </TabsTrigger>
                <TabsTrigger
                  value="centros"
                  className="rounded-full px-4 py-1.5 text-xs md:text-sm"
                >
                  Por centro de trabajo
                </TabsTrigger>
                <TabsTrigger
                  value="contratistas"
                  className="rounded-full px-4 py-1.5 text-xs md:text-sm"
                >
                  Por contratista
                </TabsTrigger>
                <TabsTrigger
                  value="normativa"
                  className="rounded-full px-4 py-1.5 text-xs md:text-sm"
                >
                  Por normativa
                </TabsTrigger>
                <TabsTrigger
                  value="evidencias"
                  className="rounded-full px-4 py-1.5 text-xs md:text-sm"
                >
                  Evidencias
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 min-w-[160px]">
                <Input
                  placeholder="Buscar actividad, responsable, normativa..."
                  value={busqueda}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBusqueda(e.target.value)
                  }
                  className="pl-3 pr-3 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-full"
                />
              </div>

              <Select
                value={filtroEstado}
                onValueChange={(v) => setFiltroEstado(v)}
              >
                <SelectTrigger className="h-9 w-[130px] bg-slate-50 border-slate-200 text-xs rounded-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="vencida">Vencidas</SelectItem>
                  <SelectItem value="realizada">Realizadas</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filtroNormativa}
                onValueChange={(v) => setFiltroNormativa(v)}
              >
                <SelectTrigger className="h-9 w-[150px] bg-slate-50 border-slate-200 text-xs rounded-full">
                  <SelectValue placeholder="Normativa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {normativasUnicas.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* TAB GENERAL: tabla de actividades */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsContent value="general" className="mt-4">
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="max-h-[520px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-xs text-slate-500">
                      <tr>
                        <th className="text-left font-medium px-4 py-2.5 w-10">
                          <Checkbox className="scale-90" />
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[220px]">
                          Actividad
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[160px]">
                          Normativa
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[140px]">
                          Categoría
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[110px]">
                          Periodicidad
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[90px]">
                          Mes
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[160px]">
                          Responsable
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[180px]">
                          Centro / Contratista
                        </th>
                        <th className="text-left font-medium px-2 py-2.5 min-w-[120px]">
                          Estado
                        </th>
                        <th className="text-right font-medium px-4 py-2.5 min-w-[130px]">
                          Evidencia
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {actividadesFiltradas.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 align-top">
                            <Checkbox className="scale-90" />
                          </td>
                          <td className="px-2 py-2.5 align-top">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900 text-[13px]">
                                  {a.nombre}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {a.critica && criticaChip()}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {a.normativa.map((n) => (
                                <span
                                  key={n}
                                  className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-700 border border-slate-200"
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 align-top text-[13px] text-slate-700">
                            {a.categoria}
                          </td>
                          <td className="px-2 py-2.5 align-top text-[13px] text-slate-700">
                            {a.periodicidad}
                          </td>
                          <td className="px-2 py-2.5 align-top text-[13px] text-slate-700">
                            {a.mes}
                          </td>
                          <td className="px-2 py-2.5 align-top text-[13px] text-slate-700">
                            {a.responsable}
                          </td>
                          <td className="px-2 py-2.5 align-top text-[13px] text-slate-700">
                            <div className="flex flex-col gap-0.5">
                              {a.centroTrabajo && <span>{a.centroTrabajo}</span>}
                              {a.contratista && (
                                <span className="text-[11px] text-slate-500">
                                  Contratista: {a.contratista}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 align-top">
                            <div className="flex flex-col gap-1">
                              {estadoBadge(a.estado)}
                              {a.estado === "vencida" && (
                                <span className="text-[11px] text-red-500">
                                  Revisar a la brevedad
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 align-top text-right">
                            <div className="flex flex-col gap-1 items-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs px-3 border-slate-200 rounded-full"
                                onClick={() => manejarSubirEvidencia(a)}
                              >
                                Subir evidencia
                              </Button>
                              <button
                                className="text-[11px] text-slate-400 hover:text-slate-600"
                                onClick={() =>
                                  abrirInfo(
                                    "Historial de evidencias",
                                    "En la versión productiva podrás revisar el historial completo de evidencias cargadas para esta actividad."
                                  )
                                }
                              >
                                Ver historial
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {actividadesFiltradas.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-4 py-10 text-center text-sm text-slate-400"
                          >
                            No se encontraron actividades con los filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* TAB MATRIZ: diseño anual */}
            <TabsContent value="matriz" className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Diseño del plan anual por meses
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xl">
                      Marca en qué meses se ejecutará cada actividad. Usa accesos rápidos para
                      marcar todo el año, solo trimestres o una vez al año.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto justify-end">
                    <Button
                      className={subtleOutlineBtn + " h-9 text-[11px] px-3"}
                      onClick={limpiarMesesMatriz}
                    >
                      Limpiar meses
                    </Button>
                    <Button
                      className={subtleOutlineBtn + " h-9 text-[11px] px-3"}
                      onClick={aplicarPlantillaRecomendada}
                    >
                      Aplicar plantilla recomendada
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-4 py-2.5 min-w-[220px]">
                        Actividad
                      </th>
                      {MESES.map((mes) => (
                        <th
                          key={mes}
                          className="text-center font-medium px-2 py-2.5 min-w-[52px]"
                        >
                          {mes.slice(0, 3)}
                        </th>
                      ))}
                      <th className="text-right font-medium px-4 py-2.5 min-w-[170px]">
                        Accesos rápidos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {actividadesMatriz.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 align-top text-[11px] md:text-[13px] text-slate-800">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{act.nombre}</span>
                            <span className="text-[11px] text-slate-400">
                              Define los meses en que se ejecutará esta actividad.
                            </span>
                          </div>
                        </td>
                        {MESES.map((mes) => (
                          <td
                            key={mes}
                            className="px-2 py-2.5 align-middle text-center"
                          >
                            <Checkbox
                              className="scale-75 mx-auto"
                              checked={act.mesesSeleccionados.includes(mes)}
                              onCheckedChange={() =>
                                toggleMesActividad(act.id, mes as Mes)
                              }
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2.5 align-top">
                          <div className="flex flex-col gap-1 items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2 border-slate-200 rounded-full"
                              onClick={() => aplicarPatronMeses(act.id, "mensual")}
                            >
                              Mensual (todo el año)
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2 border-slate-200 rounded-full"
                              onClick={() => aplicarPatronMeses(act.id, "trimestral")}
                            >
                              Trimestral
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2 border-slate-200 rounded-full"
                              onClick={() => aplicarPatronMeses(act.id, "anual")}
                            >
                              Una vez al año
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB GANTT: vista calendario anual */}
            <TabsContent value="gantt" className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Vista Gantt del plan anual
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xl">
                      Visualiza el plan de trabajo como una carta Gantt, identificando meses
                      con mayor carga de actividades y priorizando aquellas críticas o vencidas.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto justify-end">
                    <Button
                      className={subtleOutlineBtn + " h-9 text-[11px] px-3"}
                      onClick={() =>
                        abrirInfo(
                          "Exportar Gantt a PDF",
                          "En producción, esta acción generará un reporte tipo carta Gantt en PDF para presentar el plan anual ante gerencia o autoridades."
                        )
                      }
                    >
                      Exportar Gantt a PDF
                    </Button>
                    <Button
                      className={subtleOutlineBtn + " h-9 text-[11px] px-3"}
                      onClick={() =>
                        abrirInfo(
                          "Filtro de actividades críticas",
                          "En la versión real podrás filtrar esta vista para mostrar solo actividades críticas o vencidas."
                        )
                      }
                    >
                      Ver solo actividades críticas
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 overflow-auto bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-4 py-2.5 min-w-[220px]">
                        Actividad
                      </th>
                      {MESES.map((mes) => (
                        <th
                          key={mes}
                          className="text-center font-medium px-2 py-2.5 min-w-[52px]"
                        >
                          {mes.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {actividadesMatriz.map((act) => {
                      const actividadBase = ACTIVIDADES_MOCK.find(
                        (a) => a.id === act.id
                      );
                      return (
                        <tr key={act.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 align-top text-[11px] md:text-[13px] text-slate-800">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{act.nombre}</span>
                              <span className="text-[11px] text-slate-400">
                                Barra coloreada según estado general de la actividad.
                              </span>
                            </div>
                          </td>
                          {MESES.map((mes) => {
                            const isSelected = act.mesesSeleccionados.includes(mes);
                            let colorClass = "bg-emerald-500";
                            if (actividadBase?.estado === "pendiente") {
                              colorClass = "bg-amber-400";
                            } else if (actividadBase?.estado === "vencida") {
                              colorClass = "bg-red-500";
                            }
                            return (
                              <td
                                key={mes}
                                className="px-2 py-2.5 align-middle text-center"
                              >
                                {isSelected ? (
                                  <div
                                    className={`mx-auto h-1.5 w-10 rounded-full ${colorClass}`}
                                  />
                                ) : (
                                  <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-100" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB CENTROS: vista mock */}
            <TabsContent value="centros" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Obra Costanera Norte", "Planta Quilicura", "Edificio Parque Sur"].map(
                  (centro) => (
                    <Card
                      key={centro}
                      className="border border-slate-100 bg-slate-50/80 rounded-xl"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-medium">
                              Centro de trabajo
                            </p>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {centro}
                            </h3>
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] rounded-full">
                            78% Plan
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">
                              Cumplimiento
                            </span>
                            <span className="text-xs font-medium text-slate-800">
                              78%
                            </span>
                          </div>
                          <Progress value={78} className="h-1.5" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Próximas actividades</span>
                          <span className="font-medium text-slate-700">
                            3 este mes
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Actividades vencidas</span>
                          <span className="font-medium text-red-500">
                            1 crítica
                          </span>
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-3 border-slate-200 rounded-full"
                            onClick={() =>
                              abrirInfo(
                                "Detalle del plan por centro",
                                "En producción podrás ver el desglose completo del plan anual, actividades y evidencias específicas de este centro de trabajo."
                              )
                            }
                          >
                            Ver detalle del plan
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </TabsContent>

            {/* TAB CONTRATISTAS: mock */}
            <TabsContent value="contratistas" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Contratista Andina Spa", "Servicios Industriales Norte"].map((c) => (
                  <Card
                    key={c}
                    className="border border-slate-100 bg-white rounded-xl"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-medium">
                            Contratista
                          </p>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {c}
                          </h3>
                        </div>
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] rounded-full">
                          Plan asociado
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-[13px] text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Actividades programadas</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Realizadas</span>
                        <span className="font-medium text-emerald-700">9</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Vencidas</span>
                        <span className="font-medium text-red-500">1</span>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-3 border-slate-200 rounded-full"
                          onClick={() =>
                            abrirInfo(
                              "Plan del contratista",
                              "Aquí podrás revisar el plan anual asociado al contratista, sus obligaciones y estado de cumplimiento."
                            )
                          }
                        >
                          Ver plan del contratista
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB NORMATIVA: mock */}
            <TabsContent value="normativa" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANES_NORMATIVA_MOCK.map((n) => (
                  <Card
                    key={n.nombre}
                    className="border border-slate-100 bg-white rounded-xl"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-medium">
                            Normativa
                          </p>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {n.nombre}
                          </h3>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] rounded-full">
                          {n.cumplimiento}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-[13px] text-slate-700">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">
                            Cumplimiento
                          </span>
                          <span className="text-xs font-medium text-slate-800">
                            {n.cumplimiento}%
                          </span>
                        </div>
                        <Progress value={n.cumplimiento} className="h-1.5" />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Visualiza rápidamente cómo se está cumpliendo el plan asociado a
                        esta norma en todos los centros de trabajo.
                      </p>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-3 border-slate-200 rounded-full"
                          onClick={() =>
                            abrirInfo(
                              "Actividades vinculadas a la normativa",
                              "En la versión productiva podrás ver el listado completo de actividades asociadas a esta norma, su estado y evidencias."
                            )
                          }
                        >
                          Ver actividades vinculadas
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB EVIDENCIAS: mock */}
            <TabsContent value="evidencias" className="mt-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-4 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Gestión de evidencias del plan
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xl">
                      Centraliza certificados, listas de asistencia, fotografías y registros
                      que respaldan el cumplimiento de tu plan de trabajo anual.
                    </p>
                  </div>
                  <Button
                    className={primaryCtaBtn + " h-9 text-xs px-4"}
                    onClick={() =>
                      abrirInfo(
                        "Repositorio de evidencias",
                        "Aquí se abrirá el repositorio completo de evidencias filtrado por plan anual, centro de trabajo y estado de revisión."
                      )
                    }
                  >
                    Ver repositorio de evidencias
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-600">
                  <div className="rounded-lg bg-white border border-slate-100 px-3 py-3 flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-slate-700">
                      Evidencias críticas pendientes
                    </span>
                    <span className="text-2xl font-semibold text-red-500">4</span>
                    <span>Capacitaciones, inspecciones DS44 y mantenciones.</span>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-100 px-3 py-3 flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-slate-700">
                      Evidencias subidas este mes
                    </span>
                    <span className="text-2xl font-semibold text-emerald-600">
                      18
                    </span>
                    <span>Documentos en revisión por el asesor DICAPREV.</span>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-100 px-3 py-3 flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-slate-700">
                      Evidencias rechazadas
                    </span>
                    <span className="text-2xl font-semibold text-amber-500">
                      2
                    </span>
                    <span>Requieren actualización de formato o firma.</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MODAL NUEVA ACTIVIDAD */}
      <Dialog open={openNuevaActividad} onOpenChange={setOpenNuevaActividad}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Nueva actividad del plan de trabajo
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">
                Nombre de la actividad
              </Label>
              <Input
                placeholder="Ej. Capacitación uso correcto de EPP"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Categoría</Label>
              <Select>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capacitacion">Capacitación</SelectItem>
                  <SelectItem value="inspeccion">Inspección</SelectItem>
                  <SelectItem value="comite">Comité Paritario</SelectItem>
                  <SelectItem value="mantencion">Mantención</SelectItem>
                  <SelectItem value="documentacion">Documentación</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">
                Normativa asociada
              </Label>
              <Input
                placeholder="Ej. DS44, DS67, Ley 16.744"
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-slate-400">
                Puedes listar varias normativas separadas por coma.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Periodicidad</Label>
              <Select>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="puntual">Puntual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Mes programado</Label>
              <Select>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecciona mes" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Enero",
                    "Febrero",
                    "Marzo",
                    "Abril",
                    "Mayo",
                    "Junio",
                    "Julio",
                    "Agosto",
                    "Septiembre",
                    "Octubre",
                    "Noviembre",
                    "Diciembre",
                  ].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Responsable</Label>
              <Input
                placeholder="Ej. Encargado de Prevención"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Centro de trabajo</Label>
              <Input placeholder="Opcional" className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">
                Contratista (si aplica)
              </Label>
              <Input placeholder="Opcional" className="h-9 text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs text-slate-600">
                Descripción / Alcance
              </Label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:border-emerald-400"
                placeholder="Describe brevemente el objetivo de esta actividad, alcance, participantes y tipo de evidencia que se espera adjuntar."
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox id="critica" className="scale-90" />
              <Label htmlFor="critica" className="text-xs text-slate-600">
                Marcar como actividad crítica (priorizar seguimiento y evidencias)
              </Label>
            </div>
          </div>
          <DialogFooter className="pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="text-[11px] text-slate-400">
              Este formulario es solo demostrativo. En producción se conectará al flujo
              real del plan de trabajo y Firestore.
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-9 text-xs border-slate-200 rounded-full"
                onClick={() => setOpenNuevaActividad(false)}
              >
                Cancelar
              </Button>
              <Button className={primaryCtaBtn + " h-9 text-xs px-5"}>
                Guardar actividad
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL SUBIR EVIDENCIA */}
      <Dialog open={openEvidencia} onOpenChange={setOpenEvidencia}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Subir evidencia
              {actividadSeleccionada && (
                <span className="block text-xs font-normal text-slate-500 mt-1">
                  {actividadSeleccionada.nombre}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Archivo</Label>
              <div className="flex items-center gap-3">
                <Input type="file" className="h-9 text-xs" />
              </div>
              <p className="text-[11px] text-slate-400">
                Puedes subir listas de asistencia, certificados, registros fotográficos u
                otros documentos de respaldo.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-600">Comentario interno</Label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:border-emerald-400"
                placeholder="Ej. Capacitación realizada el 12-11-2025, participaron 18 trabajadores."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="marcar-realizada" className="scale-90" />
              <Label
                htmlFor="marcar-realizada"
                className="text-xs text-slate-600"
              >
                Marcar actividad como realizada al guardar esta evidencia
              </Label>
            </div>
          </div>
          <DialogFooter className="pt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 text-xs border-slate-200 rounded-full"
              onClick={() => setOpenEvidencia(false)}
            >
              Cancelar
            </Button>
            <Button className={primaryCtaBtn + " h-9 text-xs px-5"}>
              Guardar evidencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ASISTENTE DE DISEÑO */}
      <Dialog open={openAsistente} onOpenChange={setOpenAsistente}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Asistente para definir el plan anual
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 space-y-4">
            <div className="flex items-center gap-2 text-xs">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={
                    "flex-1 h-1.5 rounded-full " +
                    (step <= pasoAsistente ? "bg-emerald-500" : "bg-slate-200")
                  }
                />
              ))}
            </div>

            {pasoAsistente === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Paso 1 · Datos de la empresa
                </h3>
                <p className="text-xs text-slate-500">
                  Esta información permitirá sugerir un plan base según rubro, tamaño de
                  empresa y normativas aplicables.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">Rubro principal</Label>
                    <Select>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecciona rubro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construccion">Construcción</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="servicios">Servicios</SelectItem>
                        <SelectItem value="comercio">Comercio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">
                      N° aproximado de trabajadores
                    </Label>
                    <Select>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-25">1 - 25</SelectItem>
                        <SelectItem value="26-100">26 - 100</SelectItem>
                        <SelectItem value="101-250">101 - 250</SelectItem>
                        <SelectItem value=">250">Más de 250</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">
                      ¿Trabaja con contratistas?
                    </Label>
                    <Select>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600">
                      Cantidad de centros de trabajo
                    </Label>
                    <Input
                      placeholder="Ej. 3 obras activas"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {pasoAsistente === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Paso 2 · Normativas aplicables
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona las normativas y lineamientos que quieres considerar en el
                  plan. En base a esto se sugerirán actividades mínimas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {[
                    "DS44",
                    "DS67",
                    "Ley 16.744",
                    "Código del Trabajo",
                    "Protocolos MINSAL",
                    "Reglamento Interno",
                  ].map((norma) => (
                    <label
                      key={norma}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer hover:border-emerald-300"
                    >
                      <Checkbox className="scale-90" />
                      <span className="text-[11px] text-slate-700">{norma}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {pasoAsistente === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Paso 3 · Estrategia del plan
                </h3>
                <p className="text-xs text-slate-500">
                  Define la intensidad del plan y la distribución sugerida de actividades
                  durante el año.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-emerald-300">
                    <span className="block text-[11px] font-semibold text-slate-800">
                      Plan mínimo legal
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-1">
                      Solo actividades obligatorias por normativa vigente.
                    </span>
                  </button>
                  <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-3 text-left shadow-[0_0_0_1px_rgba(16,185,129,0.3)]">
                    <span className="block text-[11px] font-semibold text-emerald-800">
                      Plan recomendado DICAPREV
                    </span>
                    <span className="block text-[11px] text-emerald-700 mt-1">
                      Equilibrio entre cumplimiento legal y cultura preventiva.
                    </span>
                  </button>
                  <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-emerald-300">
                    <span className="block text-[11px] font-semibold text-slate-800">
                      Plan avanzado
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-1">
                      Mayor frecuencia de actividades, auditorías y seguimiento.
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  En la versión productiva, tu selección generará una propuesta de
                  actividades que luego podrás ajustar en la matriz mensual.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 flex justify-between items-center gap-3">
            <div className="text-[11px] text-slate-400">
              Asistente demostrativo · No se guardan datos reales en esta versión.
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-9 text-xs border-slate-200 rounded-full"
                onClick={() => setOpenAsistente(false)}
              >
                Cerrar
              </Button>
              {pasoAsistente > 1 && (
                <Button
                  variant="outline"
                  className="h-9 text-xs border-slate-200 rounded-full"
                  onClick={retrocederPasoAsistente}
                >
                  Anterior
                </Button>
              )}
              {pasoAsistente < 3 && (
                <Button
                  className={primaryCtaBtn + " h-9 text-xs px-5"}
                  onClick={avanzarPasoAsistente}
                >
                  Siguiente
                </Button>
              )}
              {pasoAsistente === 3 && (
                <Button
                  className={primaryCtaBtn + " h-9 text-xs px-5"}
                  onClick={finalizarAsistente}
                >
                  Finalizar asistente
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL INFO GENERAL (acciones demo) */}
      <Dialog open={openInfo} onOpenChange={setOpenInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-900">
              {infoTitle || "Función en desarrollo"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            {infoDescription ||
              "En la versión productiva esta acción estará conectada al flujo real del plan de trabajo anual DICAPREV."}
          </p>
          <DialogFooter className="pt-4 flex justify-end">
            <Button
              className={primaryCtaBtn + " h-8 text-xs px-4"}
              onClick={() => setOpenInfo(false)}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanTrabajoAnualPage;
