"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type TrainingStatus = "pendiente" | "vigente" | "porVencer" | "vencido";

type Role = {
  id: string;
  nombre: string;
  critico?: boolean;
};

type Course = {
  id: string;
  nombre: string;
  categoria: string;
  obligatorio: boolean;
  vigenciaMeses?: number;
  critico?: boolean;
  modalidad: "presencial" | "elearning" | "mixto";
  duracionHoras?: number;
  tieneCursoDigital?: boolean;
};

type Requirement = {
  roleId: string;
  courseId: string;
  status: TrainingStatus;
  ultimaFecha?: string;
  proximaFecha?: string;
};

const ROLES_MOCK: Role[] = [
  { id: "operario", nombre: "Operario de Obra", critico: true },
  { id: "maestro", nombre: "Maestro Especialista" },
  { id: "supervisor", nombre: "Supervisor / Jefe de Obra", critico: true },
  { id: "admin", nombre: "Administrativo / Oficina Técnica" },
];

const COURSES_MOCK: Course[] = [
  {
    id: "induccion-general",
    nombre: "Inducción General SST (DS40 / DS44)",
    categoria: "Obligatoria",
    obligatorio: true,
    vigenciaMeses: 24,
    critico: true,
    modalidad: "presencial",
    duracionHoras: 2,
    tieneCursoDigital: true,
  },
  {
    id: "trabajo-altura",
    nombre: "Trabajo en Altura Fija y Móvil",
    categoria: "Riesgos Críticos",
    obligatorio: true,
    vigenciaMeses: 12,
    critico: true,
    modalidad: "mixto",
    duracionHoras: 4,
    tieneCursoDigital: true,
  },
  {
    id: "manejo-epp",
    nombre: "Uso y Mantención de EPP",
    categoria: "General",
    obligatorio: true,
    vigenciaMeses: 24,
    modalidad: "presencial",
    duracionHoras: 2,
    tieneCursoDigital: false,
  },
  {
    id: "manipulacion-quimicos",
    nombre: "Manipulación de Sustancias Peligrosas",
    categoria: "Riesgos Específicos",
    obligatorio: false,
    vigenciaMeses: 24,
    modalidad: "elearning",
    duracionHoras: 3,
    tieneCursoDigital: true,
  },
  {
    id: "ergonomia",
    nombre: "Ergonomía y Trastornos Musculoesqueléticos",
    categoria: "Salud Ocupacional",
    obligatorio: false,
    vigenciaMeses: 36,
    modalidad: "elearning",
    duracionHoras: 2,
    tieneCursoDigital: true,
  },
];

const INITIAL_REQUIREMENTS: Requirement[] = [
  {
    roleId: "operario",
    courseId: "induccion-general",
    status: "vigente",
    ultimaFecha: "10-02-2025",
    proximaFecha: "10-02-2027",
  },
  {
    roleId: "operario",
    courseId: "trabajo-altura",
    status: "porVencer",
    ultimaFecha: "15-03-2024",
    proximaFecha: "15-03-2025",
  },
  {
    roleId: "operario",
    courseId: "manejo-epp",
    status: "vigente",
  },
  {
    roleId: "maestro",
    courseId: "induccion-general",
    status: "vigente",
  },
  {
    roleId: "maestro",
    courseId: "trabajo-altura",
    status: "pendiente",
  },
  {
    roleId: "supervisor",
    courseId: "induccion-general",
    status: "vigente",
  },
  {
    roleId: "supervisor",
    courseId: "manejo-epp",
    status: "porVencer",
  },
  {
    roleId: "admin",
    courseId: "induccion-general",
    status: "pendiente",
  },
];

const statusConfig: Record<
  TrainingStatus,
  { label: string; className: string }
> = {
  pendiente: {
    label: "Pendiente",
    className:
      "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100",
  },
  vigente: {
    label: "Vigente",
    className:
      "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100",
  },
  porVencer: {
    label: "Por vencer",
    className:
      "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100",
  },
  vencido: {
    label: "Vencido",
    className:
      "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100",
  },
};

function nextStatus(current: TrainingStatus): TrainingStatus {
  if (current === "pendiente") return "vigente";
  if (current === "vigente") return "porVencer";
  if (current === "porVencer") return "vencido";
  return "pendiente";
}

export default function PlanCapacitacionPage() {
  const [anio, setAnio] = useState<string>("2025");
  const [filtroCritico, setFiltroCritico] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [requirements, setRequirements] =
    useState<Requirement[]>(INITIAL_REQUIREMENTS);

  const [openEditCell, setOpenEditCell] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<Requirement | null>(null);

  const cursosFiltrados = useMemo(() => {
    let base = [...COURSES_MOCK];
    if (filtroCritico) {
      base = base.filter((c) => c.critico || c.categoria === "Riesgos Críticos");
    }
    if (search.trim()) {
      base = base.filter((c) =>
        c.nombre.toLowerCase().includes(search.toLowerCase())
      );
    }
    return base;
  }, [filtroCritico, search]);

  const cursosDigitales = useMemo(
    () => COURSES_MOCK.filter((c) => c.tieneCursoDigital),
    []
  );

  const resumen = useMemo(() => {
    const total = requirements.length || 1;
    const vigentes = requirements.filter((r) => r.status === "vigente").length;
    const porVencer = requirements.filter((r) => r.status === "porVencer").length;
    const vencidos = requirements.filter((r) => r.status === "vencido").length;
    const pendientes = requirements.filter((r) => r.status === "pendiente").length;
    const cumplimiento = Math.round((vigentes / total) * 100);
    return { total, vigentes, porVencer, vencidos, pendientes, cumplimiento };
  }, [requirements]);

  const handleCellClick = (roleId: string, courseId: string) => {
    const existing =
      requirements.find(
        (r) => r.roleId === roleId && r.courseId === courseId
      ) || {
        roleId,
        courseId,
        status: "pendiente" as TrainingStatus,
      };
    setSelectedCell(existing);
    setOpenEditCell(true);
  };

  const handleQuickCycle = (roleId: string, courseId: string) => {
    setRequirements((prev) => {
      const idx = prev.findIndex(
        (r) => r.roleId === roleId && r.courseId === courseId
      );
      if (idx === -1) {
        return [
          ...prev,
          { roleId, courseId, status: "vigente" as TrainingStatus },
        ];
      }
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        status: nextStatus(updated[idx].status),
      };
      return updated;
    });
  };

  const handleSaveCell = () => {
    if (!selectedCell) return;
    setRequirements((prev) => {
      const idx = prev.findIndex(
        (r) =>
          r.roleId === selectedCell.roleId && r.courseId === selectedCell.courseId
      );
      if (idx === -1) {
        return [...prev, selectedCell];
      }
      const updated = [...prev];
      updated[idx] = selectedCell;
      return updated;
    });
    setOpenEditCell(false);
  };

  const getRequirementFor = (roleId: string, courseId: string) =>
    requirements.find((r) => r.roleId === roleId && r.courseId === courseId);

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Plan de Capacitación
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Matriz de capacitación por rol, alineada a DS40 / DS44 y normativa
            de SST. Define qué curso requiere cada perfil y controla su
            vigencia en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={anio} onValueChange={(value: string) => setAnio(value)}>
            <SelectTrigger className="w-[120px] bg-white shadow-sm">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Button className="rounded-xl shadow-sm">Exportar matriz</Button>
        </div>
      </div>

      {/* FLUJO DE TRABAJO */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
            <div className="px-3 py-1 rounded-full bg-slate-900 text-slate-50">
              1. Diseña la matriz por rol (esta vista)
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              2. Programa sesiones en Calendario
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              3. Marca asistencia en Participación
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              4. Registra resultados en Evaluaciones e Historial
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Este plan se integra con el Plan de Trabajo DS44, el módulo de
            Vencimientos y la participación real de trabajadores por obra.
          </p>
        </CardContent>
      </Card>

      {/* RESUMEN KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="col-span-1 md:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">
                Cumplimiento general del plan
              </p>
              <Badge className="bg-slate-900 text-slate-50 px-2 py-1 rounded-lg text-xs">
                {anio}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">
                {resumen.cumplimiento}%
              </span>
              <span className="text-xs text-slate-500">
                sobre {resumen.total} exigencias
              </span>
            </div>
            <Progress value={resumen.cumplimiento} className="h-2 rounded-full" />
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600">
                  Vigentes: {resumen.vigentes}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="text-slate-600">
                  Por vencer: {resumen.porVencer}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-slate-600">
                  Vencidos: {resumen.vencidos}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-slate-600">
                  Pendientes: {resumen.pendientes}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <p className="text-sm font-medium text-slate-600">Roles críticos</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {ROLES_MOCK.filter((r) => r.critico).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-700">{r.nombre}</span>
                <Badge className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                  Riesgo crítico
                </Badge>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 pt-2">
              Los roles marcados como críticos priorizan capacitaciones de riesgos
              fatales, trabajos en altura, líneas de vida, espacios confinados,
              etc.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <p className="text-sm font-medium text-slate-600">
              Alertas próximas 60 días
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">
                Trabajo en Altura · Operarios
              </span>
              <Badge className="bg-orange-50 text-orange-700 border border-orange-200 rounded-lg">
                18 por vencer
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">
                Inducción General · Nuevos ingresos
              </span>
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                7 pendientes
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 pt-2">
              Estas alertas se integrarán con el módulo de vencimientos,
              calendario y notificaciones automáticas por correo / WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MATRIZ + LISTA + BIBLIOTECA DIGITAL */}
      <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Matriz por rol vs curso
              </p>
              <p className="text-xs text-slate-500 max-w-xl">
                Haz clic en una celda para editar la exigencia o doble clic para
                rotar estados (vigente → por vencer → vencido → pendiente).
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Checkbox
                  id="critico"
                  checked={filtroCritico}
                  onCheckedChange={(value: boolean | "indeterminate") =>
                    setFiltroCritico(Boolean(value))
                  }
                />
                <Label htmlFor="critico" className="text-xs text-slate-600">
                  Ver solo riesgos críticos / obligatorios
                </Label>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <Input
              placeholder="Buscar curso (ej. Trabajo en altura)…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="bg-white shadow-sm text-sm md:w-80"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl border-slate-200">
                Plantilla DS44
              </Button>
              <Button className="rounded-xl">Agregar curso al plan</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="matriz" className="w-full">
            <TabsList className="bg-transparent px-4 pt-4 pb-0 justify-start">
              <TabsTrigger value="matriz" className="rounded-full text-xs">
                Vista matriz
              </TabsTrigger>
              <TabsTrigger value="lista" className="rounded-full text-xs">
                Vista lista de cursos
              </TabsTrigger>
              <TabsTrigger value="biblioteca" className="rounded-full text-xs">
                Biblioteca digital
              </TabsTrigger>
            </TabsList>

            {/* TAB MATRIZ */}
            <TabsContent value="matriz" className="px-4 pb-4 pt-2">
              <div className="w-full overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-1 text-xs">
                  <thead>
                    <tr>
                      <th className="text-left text-[11px] font-medium text-slate-500 w-52 px-2">
                        Rol / Cargo
                      </th>
                      {cursosFiltrados.map((c) => (
                        <th
                          key={c.id}
                          className="text-left text-[11px] font-medium text-slate-500 px-2 min-w-[180px]"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span>{c.nombre}</span>
                            <span className="text-[10px] text-slate-400">
                              {c.categoria} ·{" "}
                              {c.vigenciaMeses
                                ? `Vigencia ${c.vigenciaMeses} meses`
                                : "Sin vigencia definida"}{" "}
                              · {c.modalidad === "elearning"
                                ? "E-learning"
                                : c.modalidad === "mixto"
                                ? "Mixto"
                                : "Presencial"}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLES_MOCK.map((role) => (
                      <tr key={role.id}>
                        <td className="align-top px-2 py-1.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-slate-800">
                              {role.nombre}
                            </span>
                            {role.critico && (
                              <span className="text-[10px] text-rose-500 font-medium">
                                Rol crítico
                              </span>
                            )}
                          </div>
                        </td>
                        {cursosFiltrados.map((course) => {
                          const req = getRequirementFor(role.id, course.id);
                          const status: TrainingStatus = req?.status || "pendiente";
                          const cfg = statusConfig[status];

                          return (
                            <td
                              key={`${role.id}-${course.id}`}
                              className="px-2 py-1.5 align-top"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleCellClick(role.id, course.id)
                                }
                                onDoubleClick={() =>
                                  handleQuickCycle(role.id, course.id)
                                }
                                className={`w-full text-left rounded-xl px-2 py-1.5 text-[11px] transition-colors ${cfg.className}`}
                                title="Doble clic: rotar estado rápido"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-medium">
                                    {cfg.label}
                                  </span>
                                  {course.obligatorio && (
                                    <span className="text-[9px] uppercase tracking-wide">
                                      Obligatorio
                                    </span>
                                  )}
                                </div>
                                {req?.proximaFecha && (
                                  <p className="text-[10px] mt-0.5 text-slate-500">
                                    Próx. capacitación: {req.proximaFecha}
                                  </p>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                * Esta matriz define las exigencias por rol. La asistencia real se
                registra en Participación y el detalle por sesión en Calendario e
                Historial.
              </p>
            </TabsContent>

            {/* TAB LISTA */}
            <TabsContent value="lista" className="px-4 pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {cursosFiltrados.map((c) => {
                  const totalRoles = ROLES_MOCK.length;
                  const vigentes = requirements.filter(
                    (r) => r.courseId === c.id && r.status === "vigente"
                  ).length;
                  const cobertura = Math.round((vigentes / totalRoles) * 100);

                  return (
                    <Card
                      key={c.id}
                      className="border-slate-200 shadow-sm rounded-2xl"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {c.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {c.categoria} ·{" "}
                              {c.vigenciaMeses
                                ? `Vigencia ${c.vigenciaMeses} meses`
                                : "Sin vigencia definida"}{" "}
                              · {c.modalidad === "elearning"
                                ? "E-learning"
                                : c.modalidad === "mixto"
                                ? "Mixto"
                                : "Presencial"}
                            </p>
                            {c.duracionHoras && (
                              <p className="text-[11px] text-slate-400">
                                Duración estimada: {c.duracionHoras} h
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {c.critico && (
                              <Badge className="bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px]">
                                Riesgo crítico
                              </Badge>
                            )}
                            {c.tieneCursoDigital && (
                              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px]">
                                Curso digital
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-semibold text-slate-900">
                            {cobertura}%
                          </span>
                          <span className="text-[11px] text-slate-500">
                            roles con capacitación vigente
                          </span>
                        </div>
                        <Progress
                          value={cobertura}
                          className="h-1.5 rounded-full"
                        />
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Roles totales: {totalRoles}</span>
                          <span>Vigentes: {vigentes}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-[11px] h-7 px-3"
                            onClick={() => {
                              const roleId = ROLES_MOCK[0].id;
                              handleCellClick(roleId, c.id);
                            }}
                          >
                            Editar exigencias
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-xl text-[11px] h-7 px-3"
                          >
                            Ver próximos vencimientos
                          </Button>
                          {c.tieneCursoDigital && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-[11px] h-7 px-3"
                            >
                              Abrir curso digital
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB BIBLIOTECA DIGITAL */}
            <TabsContent value="biblioteca" className="px-4 pb-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {cursosDigitales.map((c) => (
                  <Card
                    key={c.id}
                    className="border-slate-200 shadow-sm rounded-2xl"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {c.nombre}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {c.categoria} · Curso digital{" "}
                            {c.modalidad === "mixto" && "(mixto)"}
                          </p>
                          {c.duracionHoras && (
                            <p className="text-[11px] text-slate-400">
                              Duración aproximada: {c.duracionHoras} h
                            </p>
                          )}
                        </div>
                        <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px]">
                          Biblioteca digital
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-[11px]">
                      <p className="text-slate-500">
                        Este curso puede asignarse a trabajadores de acuerdo a su
                        rol y controlarse desde Participación y Evaluaciones.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl text-[11px] h-7 px-3"
                        >
                          Abrir curso digital
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-[11px] h-7 px-3"
                          onClick={() => {
                            // En producción aquí podrías abrir un modal
                            // para seleccionar roles / trabajadores.
                            console.log("Asignar curso digital:", c.id);
                          }}
                        >
                          Asignar a roles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                La biblioteca digital se conecta con Evaluaciones para las
                pruebas online y con Participación para marcar automáticamente la
                aprobación de los trabajadores.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MODAL EDICIÓN */}
      <Dialog open={openEditCell} onOpenChange={setOpenEditCell}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Configurar exigencia de capacitación
            </DialogTitle>
          </DialogHeader>
          {selectedCell && (
            <div className="space-y-4 mt-1">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1.5">
                <p className="text-slate-500">Rol / cargo</p>
                <p className="font-medium text-slate-800">
                  {
                    ROLES_MOCK.find((r) => r.id === selectedCell.roleId)
                      ?.nombre
                  }
                </p>
                <p className="text-slate-500 mt-2">Curso</p>
                <p className="font-medium text-slate-800">
                  {
                    COURSES_MOCK.find((c) => c.id === selectedCell.courseId)
                      ?.nombre
                  }
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <Select
                    value={selectedCell.status}
                    onValueChange={(value: string) =>
                      setSelectedCell((prev) =>
                        prev ? { ...prev, status: value as TrainingStatus } : prev
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="porVencer">Por vencer</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Última capacitación (opcional)
                    </Label>
                    <Input
                      placeholder="dd-mm-aaaa"
                      value={selectedCell.ultimaFecha || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSelectedCell((prev) =>
                          prev
                            ? { ...prev, ultimaFecha: e.target.value }
                            : prev
                        )
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Próxima capacitación / vencimiento
                    </Label>
                    <Input
                      placeholder="dd-mm-aaaa"
                      value={selectedCell.proximaFecha || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSelectedCell((prev) =>
                          prev
                            ? { ...prev, proximaFecha: e.target.value }
                            : prev
                        )
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="aplicar-todos" />
                  <Label
                    htmlFor="aplicar-todos"
                    className="text-[11px] text-slate-600"
                  >
                    Esta configuración se reflejará en el módulo Participación
                    para los trabajadores que tengan este rol.
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setOpenEditCell(false)}
            >
              Cancelar
            </Button>
            <Button size="sm" className="rounded-xl" onClick={handleSaveCell}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
