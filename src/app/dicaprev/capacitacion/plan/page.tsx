
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

import {
  createPlanCapacitacion,
  createPlanDesdePlantilla,
  deletePlanCapacitacion,
  generarItemsPlanDesdeReglas,
  getPlanCapacitacionById,
  getPlanesCapacitacion,
  getPlantillasPlanCapacitacion,
  updatePlanCapacitacion,
  updatePlanCapacitacionItem,
  mergePlantillaEnPlan,
  type PlanCapacitacionItemEstado,
  type PlanCapacitacionView,
} from "@/actions/capacitaciones/plan";

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

type PlantillaAction = Awaited<ReturnType<typeof getPlantillasPlanCapacitacion>>[number];

function mapEstadoItemToTraining(estado: PlanCapacitacionItemEstado): TrainingStatus {
  if (estado === "ejecutado") return "vigente";
  if (estado === "vencido") return "vencido";
  if (estado === "programado") return "porVencer";
  return "pendiente";
}

function mapTrainingToEstadoItem(status: TrainingStatus): PlanCapacitacionItemEstado {
  if (status === "vigente") return "ejecutado";
  if (status === "porVencer") return "programado";
  if (status === "vencido") return "vencido";
  return "pendiente";
}

function deriveNormativaByCategoria(categoria: string): string[] {
  const base = categoria.toLowerCase();
  if (base.includes("riesgos") || base.includes("crit")) return ["DS40", "DS594"];
  if (base.includes("salud")) return ["Protocolos MINSAL"];
  if (base.includes("oblig")) return ["DS44", "Ley 16.744"];
  return ["DS40"];
}

function roleKeyFromItem(item: PlanCapacitacionView["items"][number]): string {
  return [item.cargoId ?? "*", item.areaId ?? "*", item.centroTrabajoId ?? "*"].join("|");
}

function roleNameFromItem(item: PlanCapacitacionView["items"][number]): string {
  const parts = [item.cargoNombre, item.areaNombre, item.centroTrabajoNombre].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "General";
}

function roleIsCritico(item: PlanCapacitacionView["items"][number]): boolean {
  return !!item.obligatorio || item.estado === "vencido";
}

export default function PlanCapacitacionPage() {
  const [anio, setAnio] = useState<string>("2025");
  const [planes, setPlanes] = useState<PlanCapacitacionView[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanCapacitacionView | null>(null);
  const [plantillas, setPlantillas] = useState<PlantillaAction[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Requirement>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [todoMsg, setTodoMsg] = useState<string | null>(null);

  const [search, setSearch] = useState<string>("");
  const [filtroCritico, setFiltroCritico] = useState<boolean>(false);

  const [editCellOpen, setEditCellOpen] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<Requirement | null>(null);

  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplatePlan | null>(null);

  const loadPlanes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planesData, plantillasData] = await Promise.all([
        getPlanesCapacitacion({ anio: Number(anio), incluirCerrados: false }),
        getPlantillasPlanCapacitacion({ activa: true }),
      ]);

      setPlanes(planesData);
      setPlantillas(plantillasData);

      const nextSelectedId = selectedPlanId && planesData.some((p) => p.id === selectedPlanId)
        ? selectedPlanId
        : planesData[0]?.id ?? null;
      setSelectedPlanId(nextSelectedId);

      if (nextSelectedId) {
        const detail = await getPlanCapacitacionById(nextSelectedId);
        setSelectedPlan(detail);
      } else {
        setSelectedPlan(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar el plan de capacitación");
      setPlanes([]);
      setSelectedPlan(null);
      setPlantillas([]);
    } finally {
      setLoading(false);
    }
  }, [anio, selectedPlanId]);

  useEffect(() => {
    loadPlanes();
  }, [loadPlanes]);

  useEffect(() => {
    setOverrides({});
  }, [selectedPlanId]);

  const roles = useMemo(() => {
    const map = new Map<string, Role>();
    for (const item of selectedPlan?.items ?? []) {
      const key = roleKeyFromItem(item);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nombre: roleNameFromItem(item),
          critico: roleIsCritico(item),
        });
      }
    }
    if (map.size === 0) {
      map.set("general", { id: "general", nombre: "General", critico: false });
    }
    return Array.from(map.values());
  }, [selectedPlan]);

  const courses = useMemo(() => {
    const map = new Map<string, Course>();
    for (const item of selectedPlan?.items ?? []) {
      if (!map.has(item.capacitacionId)) {
        map.set(item.capacitacionId, {
          id: item.capacitacionId,
          nombre: item.capacitacionNombre,
          categoria: item.obligatorio ? "Obligatoria" : "General",
          obligatorio: item.obligatorio,
          vigenciaMeses: undefined,
          critico: item.obligatorio,
          modalidad: "presencial",
          normativa: deriveNormativaByCategoria(item.obligatorio ? "obligatoria" : "general"),
        });
      }
    }
    return Array.from(map.values());
  }, [selectedPlan]);

  const requirements = useMemo(() => {
    const base: Requirement[] = (selectedPlan?.items ?? []).map((item) => ({
      roleId: roleKeyFromItem(item),
      courseId: item.capacitacionId,
      status: mapEstadoItemToTraining(item.estado),
      ultimaFecha: item.updatedAt.slice(0, 10),
      proximaFecha:
        item.mesProgramado != null
          ? `${String(item.mesProgramado).padStart(2, "0")}-${anio}`
          : undefined,
      // Prisma item fields for persistence
      itemId: item.id,
      periodicidad: item.periodicidad,
      mesProgramado: item.mesProgramado,
      obligatorio: item.obligatorio,
      estadoItem: item.estado,
      observaciones: item.observaciones,
    }));

    const keyMap = new Map(base.map((req) => [`${req.roleId}|${req.courseId}`, req]));
    for (const [key, value] of Object.entries(overrides)) {
      keyMap.set(key, value);
    }
    return Array.from(keyMap.values());
  }, [selectedPlan, overrides, anio]);

  const templates = useMemo<TemplatePlan[]>(() => {
    return plantillas.map((tpl) => ({
      id: tpl.id,
      nombre: tpl.nombre,
      descripcion: tpl.descripcion ?? "Plantilla corporativa de capacitación",
      tipo: tpl.tipoEmpresa ?? "general",
      norma: "Plan base corporativo",
      roles: [],
      cursos: tpl.items.map((item) => ({
        id: item.capacitacionId,
        nombre: item.capacitacionNombre,
        categoria: item.obligatorio ? "Obligatoria" : "General",
        obligatorio: item.obligatorio,
      })),
      requisitos: [],
    }));
  }, [plantillas]);

  const handleCreatePlanBase = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const newPlan = await createPlanCapacitacion({
        nombre: `Plan anual ${anio}`,
        anio: Number(anio),
        estado: "borrador",
        version: "1.0",
      });
      setSelectedPlanId(newPlan.id);
      await loadPlanes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el plan base");
    } finally {
      setSaving(false);
    }
  }, [anio, loadPlanes]);

  const handleGenerarItemsReglas = useCallback(async () => {
    if (!selectedPlanId) {
      setError("No hay plan seleccionado para generar items");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await generarItemsPlanDesdeReglas(selectedPlanId);
      await loadPlanes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible generar items desde reglas");
    } finally {
      setSaving(false);
    }
  }, [selectedPlanId, loadPlanes]);

  const handleMoverARevision = useCallback(async () => {
    if (!selectedPlanId) return;
    setSaving(true);
    setError(null);
    try {
      await updatePlanCapacitacion(selectedPlanId, { estado: "en_revision" });
      await loadPlanes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el plan");
    } finally {
      setSaving(false);
    }
  }, [selectedPlanId, loadPlanes]);

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
    setOverrides((prev) => {
      const key = `${roleId}|${courseId}`;
      const current = prev[key] ?? getRequirementFor(roleId, courseId) ?? { roleId, courseId, status: "pendiente" as TrainingStatus };
      return {
        ...prev,
        [key]: {
          ...current,
          status: nextStatus(current.status),
        },
      };
    });
    // Abrir modal para que el usuario confirme y persista el cambio
    handleCellClick(roleId, courseId);
  };

  const handleSaveRequirement = useCallback(async (updated: Requirement) => {
    // Optimistic update
    setOverrides((prev) => ({
      ...prev,
      [`${updated.roleId}|${updated.courseId}`]: updated,
    }));

    if (!updated.itemId) {
      setTodoMsg("TODO: este ítem no tiene id persistido aún; guarda primero el plan con 'Generar items desde reglas'.");
      return;
    }

    setSaving(true);
    setError(null);
    setTodoMsg(null);
    try {
      await updatePlanCapacitacionItem(updated.itemId, {
        periodicidad: updated.periodicidad,
        mesProgramado: updated.mesProgramado,
        obligatorio: updated.obligatorio,
        estado: mapTrainingToEstadoItem(updated.status),
        observaciones: updated.observaciones,
      });
      // Refresh to sync server state
      if (selectedPlanId) {
        const detail = await getPlanCapacitacionById(selectedPlanId);
        setSelectedPlan(detail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el ítem");
      // Revert optimistic update on error
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[`${updated.roleId}|${updated.courseId}`];
        return next;
      });
    } finally {
      setSaving(false);
    }
  }, [selectedPlanId]);

  const handleApplyTemplatePersisted = useCallback(
    async (mode: "merge" | "replace") => {
      if (!selectedTemplate) return;
      setSaving(true);
      setError(null);
      setTodoMsg(null);

      try {
        if (mode === "merge") {
          if (!selectedPlanId) {
            setError("No hay plan seleccionado para aplicar la plantilla.");
            return;
          }
          const result = await mergePlantillaEnPlan(selectedPlanId, selectedTemplate.id);
          setTodoMsg(
            `Plantilla aplicada: ${result.itemsCreados} ítem(s) agregado(s), ${result.itemsOmitidos} ya existente(s) omitido(s).`,
          );
          const detail = await getPlanCapacitacionById(selectedPlanId);
          setSelectedPlan(detail);
          return;
        }

        if (selectedPlanId) {
          await deletePlanCapacitacion(
            selectedPlanId,
            `Reemplazado por plantilla ${selectedTemplate.nombre}`,
          );
        }

        const created = await createPlanDesdePlantilla(selectedTemplate.id, {
          nombre: `Plan ${selectedTemplate.nombre} ${anio}`,
          anio: Number(anio),
          estado: "borrador",
          version: "1.0",
        });

        setSelectedPlanId(created.id);
        await loadPlanes();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible aplicar la plantilla");
      } finally {
        setSaving(false);
        setApplyTemplateOpen(false);
      }
    },
    [anio, loadPlanes, selectedPlanId, selectedTemplate],
  );

  const hasPlanData = (selectedPlan?.items.length ?? 0) > 0;

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      <HeaderPlan anio={anio} onChangeYear={setAnio} />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>
            Cerrar
          </button>
        </div>
      )}

      {todoMsg && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {todoMsg}
        </div>
      )}

      {loading ? (
        <Card className="border-slate-200 shadow-sm rounded-2xl p-8 text-center">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Cargando plan de capacitación...</p>
        </Card>
      ) : null}

      {!loading && !selectedPlan ? (
        <Card className="border-slate-200 shadow-sm rounded-2xl p-8 text-center space-y-3">
          <p className="text-base font-medium text-slate-800">No existe un plan de capacitación para {anio}</p>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Crea un plan en blanco o aplica una plantilla base para comenzar. No se volverán a usar mocks en esta ruta.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button className="rounded-xl" onClick={() => void handleCreatePlanBase()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Crear plan base
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                const tpl = templates[0];
                if (!tpl) {
                  setTodoMsg("TODO: definir plantilla base cuando no existan plantillas activas.");
                  return;
                }
                setSelectedTemplate(tpl);
                setApplyTemplateOpen(true);
              }}
              disabled={saving || templates.length === 0}
            >
              Aplicar plantilla base
            </Button>
          </div>
        </Card>
      ) : null}

      {!loading && selectedPlan && (
        <div className="flex items-center justify-end gap-2 -mt-2">
          <Badge className="bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-3 py-1 text-xs">
            {planes.length} plan(es) para {anio}
          </Badge>
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 text-xs">
            {selectedPlan.nombre} · v{selectedPlan.version}
          </Badge>
          <Badge className="bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full px-3 py-1 text-xs">
            Estado: {selectedPlan.estado}
          </Badge>
          <Button size="sm" variant="outline" className="rounded-xl" disabled={saving} onClick={() => void handleGenerarItemsReglas()}>
            Generar items desde reglas
          </Button>
          <Button size="sm" className="rounded-xl" disabled={saving} onClick={() => void handleMoverARevision()}>
            Marcar en revisión
          </Button>
        </div>
      )}

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
              {hasPlanData
                ? "Alertas derivadas del plan vigente y su estado de ejecución."
                : "Sin datos suficientes para alertas. Genera items del plan para habilitar este bloque."}
            </p>
          </div>
        </Card>
      </div>

      {!loading && selectedPlan && (
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
          onGenerarItemsReglas={() => void handleGenerarItemsReglas()}
          onOpenPlantillas={() => {
            const tpl = templates[0];
            if (tpl) {
              setSelectedTemplate(tpl);
              setApplyTemplateOpen(true);
            } else {
              setTodoMsg("TODO: no hay plantillas activas disponibles para aplicar desde matriz.");
            }
          }}
        />
        <CursosPorCargo
          roles={roles}
          courses={courses}
          requirements={requirements}
        />
        <Plantillas
          templates={templates}
          onOpenApplyTemplate={(tpl: TemplatePlan) => {
            setSelectedTemplate(tpl);
            setApplyTemplateOpen(true);
          }}
        />
        <Normativa courses={courses} />
      </TabsPlan>
      )}

      <EditCellModal
        open={editCellOpen}
        onOpenChange={setEditCellOpen}
        selectedCell={selectedCell}
        roles={roles}
        courses={courses}
        saving={saving}
        onSave={(req: Requirement) => {
          void handleSaveRequirement(req);
          setSelectedCell(req);
        }}
      />

      <ApplyTemplateModal
        open={applyTemplateOpen}
        template={selectedTemplate}
        onOpenChange={setApplyTemplateOpen}
        onApply={(mode: "merge" | "replace") => {
          void handleApplyTemplatePersisted(mode);
        }}
      />
    </div>
  );
}
