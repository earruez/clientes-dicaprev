"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlanNav } from "../components/plan-nav";
import { ActivityFormFields, type ActivityFormModel } from "../components/activity-form-fields";
import { ActivitiesFilters, ActivitiesTable, EstadoBadge } from "../components/plan-ui";
import { MESES_SHORT, type ActividadPlan, type MesShort } from "../mock-data";
import {
  canMutatePlanActivities,
  getPlanSnapshot,
  hydratePlanStore,
  subscribePlan,
  updatePlanActivity,
} from "../store";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

type EditFormState = { id: number } & ActivityFormModel;

function getPrimaryMonth(actividad: ActividadPlan): MesShort {
  const found = MESES_SHORT.find((m) => actividad.meses[m] !== "no_aplica");
  return found ?? "Ene";
}

export default function ActividadesPlanPage() {
  const [snapshot, setSnapshot] = useState(getPlanSnapshot());
  const [anio, setAnio] = useState("2026");
  const [estado, setEstado] = useState("todos");
  const [normativa, setNormativa] = useState("todas");
  const [centro, setCentro] = useState("todos");
  const [responsable, setResponsable] = useState("todos");
  const [search, setSearch] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [selectedActividadId, setSelectedActividadId] = useState<number | null>(null);

  useEffect(() => {
    hydratePlanStore();
    setSnapshot(getPlanSnapshot());
    return subscribePlan(() => setSnapshot(getPlanSnapshot()));
  }, []);

  const actividades = snapshot.actividades;
  const canEditActivities = canMutatePlanActivities();
  const blockedByReviewOrApproved = snapshot.estadoPlan === "en_revision" || snapshot.estadoPlan === "aprobado";

  const normativas = Array.from(new Set(actividades.map((a) => a.normativa)));
  const centros = Array.from(new Set(actividades.map((a) => a.centroContratista)));
  const responsables = Array.from(new Set(actividades.map((a) => a.responsable)));

  const data = useMemo(() => {
    return actividades.filter((a) => {
      const matchEstado = estado === "todos" || a.estado === estado;
      const matchNormativa = normativa === "todas" || a.normativa === normativa;
      const matchCentro = centro === "todos" || a.centroContratista === centro;
      const matchResponsable = responsable === "todos" || a.responsable === responsable;
      const matchSearch = !search || [a.actividad, a.normativa, a.categoria].join(" ").toLowerCase().includes(search.toLowerCase());
      return matchEstado && matchNormativa && matchCentro && matchResponsable && matchSearch;
    });
  }, [actividades, centro, estado, normativa, responsable, search]);

  const selectedActividad = useMemo(
    () => actividades.find((a) => a.id === selectedActividadId) ?? null,
    [actividades, selectedActividadId]
  );

  const evidenciasActividad = useMemo(() => {
    if (!selectedActividadId) return [];
    return snapshot.evidencias.filter((e) => e.actividadId === selectedActividadId);
  }, [selectedActividadId, snapshot.evidencias]);

  const timelineActividad = useMemo(() => {
    if (!selectedActividadId) return [];
    return snapshot.historial
      .filter((h) => h.actividadId === selectedActividadId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [selectedActividadId, snapshot.historial]);

  function openViewModal(actividad: ActividadPlan) {
    setSelectedActividadId(actividad.id);
    setOpenView(true);
  }

  function openEditModal(actividad: ActividadPlan) {
    if (!canEditActivities) {
      setInfoMessage("El plan está bloqueado porque se encuentra en revisión/aprobado.");
      return;
    }

    setSelectedActividadId(actividad.id);
    setEditForm({
      id: actividad.id,
      actividad: actividad.actividad,
      normativa: actividad.normativa,
      categoria: actividad.categoria,
      periodicidad: actividad.periodicidad,
      mes: getPrimaryMonth(actividad),
      responsable: actividad.responsable,
      centroContratista: actividad.centroContratista,
      estado: actividad.estado,
      requiereEvidencia: actividad.requiereEvidencia,
    });
    setOpenEdit(true);
  }

  function handleEditFromDetail() {
    if (!selectedActividad) return;
    setOpenView(false);
    openEditModal(selectedActividad);
  }

  function updateForm<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleSaveEdit() {
    if (!editForm) return;
    if (!canEditActivities) {
      setInfoMessage("El plan está bloqueado porque se encuentra en revisión/aprobado.");
      return;
    }

    if (
      editForm.actividad.trim().length < 3 ||
      editForm.normativa.trim().length < 2 ||
      editForm.categoria.trim().length < 2 ||
      editForm.responsable.trim().length < 2 ||
      editForm.centroContratista.trim().length < 2
    ) {
      setInfoMessage("Completa los campos requeridos antes de guardar.");
      return;
    }

    updatePlanActivity(editForm.id, {
      actividad: editForm.actividad,
      normativa: editForm.normativa,
      categoria: editForm.categoria,
      periodicidad: editForm.periodicidad,
      mes: editForm.mes,
      responsable: editForm.responsable,
      centroContratista: editForm.centroContratista,
      estado: editForm.estado,
      requiereEvidencia: editForm.requiereEvidencia,
    });
    setOpenEdit(false);
    setInfoMessage("Actividad actualizada. Cambios sincronizados en Resumen, Matriz y Evidencias.");
  }

  return (
    <div className="p-6 space-y-5">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Actividades"
        description="Gestión detallada del plan anual con filtros ejecutivos."
        icon={ClipboardList}
      />

      <PlanNav />

      {infoMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </div>
      ) : null}

      {blockedByReviewOrApproved ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El plan está bloqueado porque se encuentra en revisión/aprobado.
        </div>
      ) : null}

      <ActivitiesFilters
        anio={anio}
        estado={estado}
        normativa={normativa}
        centro={centro}
        responsable={responsable}
        search={search}
        normativas={normativas}
        centros={centros}
        responsables={responsables}
        onAnioChange={setAnio}
        onEstadoChange={setEstado}
        onNormativaChange={setNormativa}
        onCentroChange={setCentro}
        onResponsableChange={setResponsable}
        onSearchChange={setSearch}
      />

      <ActivitiesTable
        data={data}
        onEdit={openEditModal}
        onView={openViewModal}
        disableEdit={!canEditActivities}
        disableEditReason="El plan está bloqueado porque se encuentra en revisión/aprobado."
      />

      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Ver detalle de actividad</DialogTitle>
            <DialogDescription>
              Informacion en modo solo lectura con evidencias asociadas e historial.
            </DialogDescription>
          </DialogHeader>

          {selectedActividad ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <DetailField label="Nombre actividad" value={selectedActividad.actividad} />
                <DetailField label="Normativa" value={selectedActividad.normativa} />
                <DetailField label="Categoria" value={selectedActividad.categoria} />
                <DetailField label="Periodicidad" value={selectedActividad.periodicidad} />
                <DetailField label="Mes" value={getPrimaryMonth(selectedActividad)} />
                <DetailField label="Responsable" value={selectedActividad.responsable} />
                <DetailField label="Centro / Contratista" value={selectedActividad.centroContratista} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Estado</p>
                  <div className="mt-1"><EstadoBadge estado={selectedActividad.estado} /></div>
                </div>
                <DetailField
                  label="Requiere evidencia"
                  value={selectedActividad.requiereEvidencia ? "Si" : "No"}
                />
                <DetailField label="Estado de evidencia" value={selectedActividad.evidencia} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-800">Evidencias asociadas</h3>
                {evidenciasActividad.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                    Esta actividad aun no tiene archivos cargados.
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {evidenciasActividad.map((e) => (
                      <li key={e.id} className="rounded-lg border border-slate-200 px-3 py-2">
                        <p className="text-sm font-medium text-slate-800">{e.archivo}</p>
                        <p className="text-xs text-slate-500">{e.fecha} · {e.estado}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-800">Historial / timeline</h3>
                {timelineActividad.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                    Sin eventos registrados para esta actividad.
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {timelineActividad.map((h) => (
                      <li key={h.id} className="rounded-lg border border-slate-200 px-3 py-2">
                        <p className="text-sm font-medium text-slate-800">{h.accion}</p>
                        <p className="text-xs text-slate-500">{h.fecha} · {h.usuario} · {h.archivo}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenView(false)}>Cerrar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditFromDetail} disabled={!canEditActivities}>
              Editar actividad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Editar actividad</DialogTitle>
            <DialogDescription>
              Modifica la actividad y sincroniza los cambios en todo el modulo Plan.
            </DialogDescription>
          </DialogHeader>

          {editForm ? (
            <ActivityFormFields
              value={editForm}
              onChange={(key, next) => updateForm(key as keyof EditFormState, next as EditFormState[keyof EditFormState])}
            />
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveEdit} disabled={!canEditActivities}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
