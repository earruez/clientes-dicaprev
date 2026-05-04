
"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  TrainingStatus,
  Role,
  Course,
  Requirement,
  nextStatus,
  TemplatePlan,
} from "./components/utils";

import HeaderPlan from "./components/HeaderPlan";
import TabsPlan from "./components/TabsPlan";
import Matriz from "./components/Matriz";
import CursosPorCargo from "./components/CursosPorCargo";
import Plantillas from "./components/Plantillas";
import Normativa from "./components/Normativa";
import EditCellModal from "./components/EditCellModal";
import ApplyTemplateModal from "./components/ApplyTemplateModal";

const TEMPLATES: TemplatePlan[] = [
  {
    id: "tpl-ds44",
    nombre: "Plan base DS44",
    descripcion: "Plantilla mínima DS44 para pruebas.",
    tipo: "ds44",
    norma: "DS44, DS40, Ley 16.744",
    roles: [],
    cursos: [],
    requisitos: [],
  },
  {
    id: "tpl-minera",
    nombre: "Plan Minero base",
    descripcion: "Plantilla genérica para contratistas mineros.",
    tipo: "minera",
    norma: "Estándares mineros / DS72 / DS132",
    roles: [],
    cursos: [],
    requisitos: [],
  },
  {
    id: "tpl-retail",
    nombre: "Plan Retail / Servicios",
    descripcion: "Plantilla para retail, supermercados y servicios.",
    tipo: "retail",
    norma: "Ley 16.744, DS40, Protocolos MINSAL",
    roles: [],
    cursos: [],
    requisitos: [],
  },
  {
    id: "tpl-constructora",
    nombre: "Plan Constructora",
    descripcion: "Plantilla estándar para empresas constructoras.",
    tipo: "constructora",
    norma: "DS40, DS44, Ley 20.123",
    roles: [],
    cursos: [],
    requisitos: [],
  },
  {
    id: "tpl-interna",
    nombre: "Plan interno de la empresa",
    descripcion: "Plantilla interna editable por la empresa.",
    tipo: "interna",
    norma: "Reglamento interno / Política SST",
    roles: [],
    cursos: [],
    requisitos: [],
  },
];

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
    normativa: ["DS40", "DS44", "Ley 16.744"],
  },
  {
    id: "trabajo-altura",
    nombre: "Trabajo en Altura Fija y Móvil",
    categoria: "Riesgos Críticos",
    obligatorio: true,
    vigenciaMeses: 12,
    critico: true,
    modalidad: "mixto",
    normativa: ["DS40", "DS594"],
  },
  {
    id: "manejo-epp",
    nombre: "Uso y Mantención de EPP",
    categoria: "General",
    obligatorio: true,
    vigenciaMeses: 24,
    critico: false,
    modalidad: "presencial",
    normativa: ["DS40", "DS44"],
  },
  {
    id: "manipulacion-quimicos",
    nombre: "Manipulación de Sustancias Peligrosas",
    categoria: "Riesgos Específicos",
    obligatorio: false,
    vigenciaMeses: 24,
    critico: false,
    modalidad: "elearning",
    normativa: ["DS148"],
  },
  {
    id: "ergonomia",
    nombre: "Ergonomía y Trastornos Musculoesqueléticos",
    categoria: "Salud Ocupacional",
    obligatorio: false,
    vigenciaMeses: 36,
    critico: false,
    modalidad: "elearning",
    normativa: ["Protocolos MINSAL"],
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

export default function PlanCapacitacionPage() {
  const [anio, setAnio] = useState<string>("2025");
  const [roles, setRoles] = useState<Role[]>(ROLES_MOCK);
  const [courses, setCourses] = useState<Course[]>(COURSES_MOCK);
  const [requirements, setRequirements] =
    useState<Requirement[]>(INITIAL_REQUIREMENTS);

  const [search, setSearch] = useState<string>("");
  const [filtroCritico, setFiltroCritico] = useState<boolean>(false);

  const [editCellOpen, setEditCellOpen] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<Requirement | null>(null);

  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplatePlan | null>(null);

  const cursosFiltrados = useMemo(() => {
    let base: Course[] = [...courses];
    if (filtroCritico) {
      base = base.filter(
        (c: Course) => c.critico || c.categoria === "Riesgos Críticos"
      );
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      base = base.filter((c: Course) =>
        c.nombre.toLowerCase().includes(term)
      );
    }
    return base;
  }, [courses, filtroCritico, search]);

  const resumen = useMemo(() => {
    const total = requirements.length || 1;
    const vigentes = requirements.filter(
      (r: Requirement) => r.status === "vigente"
    ).length;
    const porVencer = requirements.filter(
      (r: Requirement) => r.status === "porVencer"
    ).length;
    const vencidos = requirements.filter(
      (r: Requirement) => r.status === "vencido"
    ).length;
    const pendientes = requirements.filter(
      (r: Requirement) => r.status === "pendiente"
    ).length;
    const cumplimiento = Math.round((vigentes / total) * 100);
    return { total, vigentes, porVencer, vencidos, pendientes, cumplimiento };
  }, [requirements]);

  const getRequirementFor = (roleId: string, courseId: string) =>
    requirements.find(
      (r: Requirement) => r.roleId === roleId && r.courseId === courseId
    );

  const handleCellClick = (roleId: string, courseId: string) => {
    const existing =
      requirements.find(
        (r: Requirement) => r.roleId === roleId && r.courseId === courseId
      ) || {
        roleId,
        courseId,
        status: "pendiente" as TrainingStatus,
      };
    setSelectedCell(existing);
    setEditCellOpen(true);
  };

  const handleCellDoubleClick = (roleId: string, courseId: string) => {
    setRequirements((prev: Requirement[]) => {
      const idx = prev.findIndex(
        (r: Requirement) => r.roleId === roleId && r.courseId === courseId
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

  const handleSaveRequirement = (updated: Requirement) => {
    setRequirements((prev: Requirement[]) => {
      const idx = prev.findIndex(
        (r: Requirement) =>
          r.roleId === updated.roleId && r.courseId === updated.courseId
      );
      if (idx === -1) return [...prev, updated];
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  };

  const handleApplyTemplate = (
    template: TemplatePlan,
    mode: "merge" | "replace"
  ) => {
    if (!template) return;

    setRoles((prevRoles: Role[]) => {
      const existingIds = new Set(prevRoles.map((r: Role) => r.id));
      const newRolesFromTemplate: Role[] =
        template.roles?.filter((rt: Role) => !existingIds.has(rt.id)) || [];
      if (mode === "replace") {
        return template.roles || prevRoles;
      }
      return [...prevRoles, ...newRolesFromTemplate];
    });

    setCourses((prevCourses: Course[]) => {
      const existingIds = new Set(prevCourses.map((c: Course) => c.id));
      const newCourses: Course[] =
        (template.cursos || []).filter(
          (ct: Course) => !existingIds.has(ct.id)
        ) || [];
      if (mode === "replace") {
        return template.cursos || prevCourses;
      }
      return [...prevCourses, ...newCourses];
    });

    setRequirements((prevReq: Requirement[]) => {
      if (!template.requisitos || mode === "replace") {
        return template.requisitos || prevReq;
      }
      const existingKeys = new Set(
        prevReq.map((r: Requirement) => `${r.roleId}-${r.courseId}`)
      );
      const newOnes: Requirement[] =
        template.requisitos.filter(
          (rq: Requirement) =>
            !existingKeys.has(`${rq.roleId}-${rq.courseId}`)
        ) || [];
      return [...prevReq, ...newOnes];
    });
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      <HeaderPlan anio={anio} onChangeYear={setAnio} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="col-span-1 md:col-span-2 border-slate-200 shadow-sm rounded-2xl">
          <div className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-slate-500">
                Cumplimiento general del plan
              </p>
              <Badge className="bg-emerald-600 text-white rounded-full px-3 py-1 text-xs">
                {anio}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-semibold text-slate-900">
                {resumen.cumplimiento}%
              </span>
              <span className="text-xs text-slate-500">
                sobre {resumen.total} exigencias
              </span>
            </div>
            <Progress
              value={resumen.cumplimiento}
              className="h-2 rounded-full"
            />
            <div className="flex flex-wrap gap-3 text-xs mt-3">
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
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <div className="p-4">
            <p className="text-sm font-medium text-slate-600 mb-2">
              Roles críticos
            </p>
            <div className="space-y-1.5 text-xs">
              {roles
                .filter((r: Role) => r.critico)
                .map((r: Role) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-slate-700">{r.nombre}</span>
                    <Badge className="bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2 py-0.5">
                      Riesgo crítico
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <div className="p-4">
            <p className="text-sm font-medium text-slate-600 mb-2">
              Alertas próximas 60 días
            </p>
            <p className="text-xs text-slate-500">
              Estas alertas se conectarán con el módulo de Vencimientos y
              Participación para enviar correos y WhatsApp.
            </p>
          </div>
        </Card>
      </div>

      <TabsPlan>
        <Matriz
          roles={roles}
          courses={courses}
          cursosFiltrados={cursosFiltrados}
          requirements={requirements}
          filtroCritico={filtroCritico}
          onChangeFiltroCritico={setFiltroCritico}
          search={search}
          onChangeSearch={setSearch}
          getRequirementFor={getRequirementFor}
          onCellClick={handleCellClick}
          onCellDoubleClick={handleCellDoubleClick}
        />
        <CursosPorCargo
          roles={roles}
          courses={courses}
          requirements={requirements}
        />
        <Plantillas
          templates={TEMPLATES}
          onOpenApplyTemplate={(tpl: TemplatePlan) => {
            setSelectedTemplate(tpl);
            setApplyTemplateOpen(true);
          }}
        />
        <Normativa courses={courses} />
      </TabsPlan>

      <EditCellModal
        open={editCellOpen}
        onOpenChange={setEditCellOpen}
        selectedCell={selectedCell}
        roles={roles}
        courses={courses}
        onSave={(req: Requirement) => {
          handleSaveRequirement(req);
          setSelectedCell(req);
        }}
      />

      <ApplyTemplateModal
        open={applyTemplateOpen}
        template={selectedTemplate}
        onOpenChange={setApplyTemplateOpen}
        onApply={(mode: "merge" | "replace") => {
          if (selectedTemplate) {
            handleApplyTemplate(selectedTemplate, mode);
          }
        }}
      />
    </div>
  );
}
