"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { KpiCard, QuickActions, TopActions, EstadoBadge, EstadoPlanBadge } from "../components/plan-ui";
import { exportPlanTrabajoPdf } from "../export-plan-pdf";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import {
  aprobarPlan,
  canMutatePlanActivities,
  createActividad,
  enviarPlanARevision,
  getPlanSnapshot,
  hydratePlanStore,
  rechazarPlan,
  subscribePlan,
  type CrearActividadInput,
  volverABorrador,
} from "../store";

type FormState = ActivityFormModel;

const initialForm: FormState = {
  actividad: "",
  normativa: "",
  categoria: "",
  periodicidad: "Mensual",
  mes: "Ene",
  responsable: "",
  centroContratista: "",
  estado: "pendiente",
  requiereEvidencia: true,
};

export default function PlanResumenPage() {
  const [snapshot, setSnapshot] = useState(getPlanSnapshot());
  const [openCreate, setOpenCreate] = useState(false);
  const [openWizard, setOpenWizard] = useState(false);
  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [openBackToDraft, setOpenBackToDraft] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [approvalUser, setApprovalUser] = useState("admin@nextprev.cl");
  const [approvalCargo, setApprovalCargo] = useState("Administrador SST");
  const [rejectUser, setRejectUser] = useState("admin@nextprev.cl");
  const [rejectCargo, setRejectCargo] = useState("Administrador SST");
  const [rejectReason, setRejectReason] = useState("");
  const [backToDraftUser, setBackToDraftUser] = useState("admin@nextprev.cl");

  useEffect(() => {
    hydratePlanStore();
    setSnapshot(getPlanSnapshot());
    return subscribePlan(() => setSnapshot(getPlanSnapshot()));
  }, []);

  const actividades = snapshot.actividades;
  const estadoPlan = snapshot.estadoPlan;
  const realizadas = actividades.filter((a) => a.estado === "realizada").length;
  const pendientes = actividades.filter((a) => a.estado === "pendiente").length;
  const vencidas = actividades.filter((a) => a.estado === "vencida").length;
  const cumplimiento = actividades.length ? Math.round((realizadas / actividades.length) * 100) : 0;
  const criticas = actividades.filter((a) => a.critica || a.estado === "vencida").slice(0, 4);
  const canEditActivities = canMutatePlanActivities();
  const blockedByReviewOrApproved = estadoPlan === "en_revision" || estadoPlan === "aprobado";

  const canSave = useMemo(() => {
    return (
      form.actividad.trim().length > 2 &&
      form.normativa.trim().length > 1 &&
      form.categoria.trim().length > 1 &&
      form.responsable.trim().length > 1 &&
      form.centroContratista.trim().length > 1
    );
  }, [form]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveActividad() {
    if (!canEditActivities) {
      setInfoMessage("No se puede crear actividad fuera de borrador.");
      return;
    }

    if (!canSave) return;
    const payload: CrearActividadInput = {
      actividad: form.actividad,
      normativa: form.normativa,
      categoria: form.categoria,
      periodicidad: form.periodicidad,
      mes: form.mes,
      responsable: form.responsable,
      centroContratista: form.centroContratista,
      estadoInicial: form.estado,
      requiereEvidencia: form.requiereEvidencia,
    };

    createActividad(payload);
    setOpenCreate(false);
    setForm(initialForm);
    setInfoMessage("Actividad creada y sincronizada en Matriz, Actividades y Evidencias.");
  }

  function handleSendToReview() {
    const ok = enviarPlanARevision("admin@nextprev.cl", "Administrador SST");
    setInfoMessage(ok ? "Plan enviado a revisión." : "No se pudo enviar a revisión.");
  }

  function handleApprove() {
    const ok = aprobarPlan({ usuario: approvalUser.trim(), cargo: approvalCargo.trim() });
    setOpenApprove(false);
    setInfoMessage(ok ? "Plan aprobado correctamente." : "No se pudo aprobar el plan.");
  }

  function handleReject() {
    const ok = rechazarPlan({
      usuario: rejectUser.trim(),
      cargo: rejectCargo.trim(),
      motivo: rejectReason.trim(),
    });
    if (ok) {
      setRejectReason("");
      setOpenReject(false);
    }
    setInfoMessage(ok ? "Plan rechazado y registrado en historial." : "Debes ingresar un motivo de rechazo.");
  }

  function handleBackToDraft() {
    const ok = volverABorrador(backToDraftUser.trim() || "admin@nextprev.cl");
    setOpenBackToDraft(false);
    setInfoMessage(ok ? "Plan vuelto a borrador." : "No se pudo volver a borrador.");
  }

  async function handleExportPdf() {
    try {
      const year = String(new Date().getFullYear());
      await exportPlanTrabajoPdf(snapshot, year);
      setInfoMessage("PDF generado correctamente.");
    } catch {
      setInfoMessage("No se pudo generar el PDF. Intenta nuevamente.");
    }
  }

  function handleFinishWizard() {
    setOpenWizard(false);
    setWizardStep(1);
    setInfoMessage("Asistente ejecutado en modo base. Puedes continuar creando actividades manualmente.");
  }

  return (
    <div className="p-6 space-y-5">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Plan de Trabajo Anual"
        description="Vista ejecutiva del programa anual de prevención."
        icon={ListTodo}
        actions={
          <TopActions
            onCreate={() => setOpenCreate(true)}
            onWizard={() => setOpenWizard(true)}
            onExport={handleExportPdf}
            disableCreate={!canEditActivities}
            disableCreateReason="Solo se puede crear actividad cuando el plan está en borrador."
          />
        }
      />

      <PlanNav />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Estado del plan</p>
            <div className="mt-2"><EstadoPlanBadge estado={estadoPlan} /></div>
            {snapshot.enviadoRevisionEn ? (
              <p className="mt-2 text-xs text-slate-500">Enviado a revisión: {snapshot.enviadoRevisionEn}</p>
            ) : null}
            {estadoPlan === "aprobado" ? (
              <p className="mt-2 text-sm text-emerald-700">
                Plan aprobado por {snapshot.aprobadoPor} ({snapshot.aprobadoCargo}) el {snapshot.aprobadoEn} · Versión v{snapshot.versionPlan}
              </p>
            ) : null}
            {estadoPlan === "rechazado" ? (
              <p className="mt-2 text-sm text-rose-700">
                Motivo de rechazo: {snapshot.motivoRechazo || "Sin motivo informado"}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {estadoPlan === "borrador" ? (
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSendToReview}>
                Enviar a revisión
              </Button>
            ) : null}

            {estadoPlan === "en_revision" ? (
              <>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpenApprove(true)}>
                  Aprobar plan
                </Button>
                <Button variant="destructive" onClick={() => setOpenReject(true)}>
                  Rechazar plan
                </Button>
              </>
            ) : null}

            {estadoPlan === "aprobado" ? (
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                Plan aprobado
              </span>
            ) : null}

            {estadoPlan === "rechazado" ? (
              <Button variant="outline" onClick={() => setOpenBackToDraft(true)}>
                Volver a borrador
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {blockedByReviewOrApproved ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El plan está bloqueado porque se encuentra en revisión/aprobado.
        </div>
      ) : null}

      {infoMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Cumplimiento anual" value={`${cumplimiento}%`} helper="Avance consolidado del ano" />
        <KpiCard label="Actividades realizadas" value={realizadas} helper="Con evidencia validada" />
        <KpiCard label="Actividades pendientes" value={pendientes} helper="Programadas sin ejecutar" />
        <KpiCard label="Actividades vencidas" value={vencidas} helper="Requieren regularizacion" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-800">Proximas actividades criticas</h2>
        </div>

        <div className="space-y-2">
          {criticas.length === 0 ? (
            <p className="text-sm text-slate-500">No hay actividades criticas por ahora.</p>
          ) : (
            criticas.map((actividad) => (
              <div
                key={actividad.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{actividad.actividad}</p>
                  <p className="text-xs text-slate-500">
                    {actividad.normativa} · {actividad.responsable}
                  </p>
                </div>
                <EstadoBadge estado={actividad.estado} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Accesos rapidos</h2>
        <QuickActions />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Gestion orientada a cumplimiento</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-700">
            <Clock3 className="h-4 w-4" />
            <span className="text-xs font-medium">Seguimiento de plazos criticos</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 p-3 text-sky-700">
            <ListTodo className="h-4 w-4" />
            <span className="text-xs font-medium">Trazabilidad por actividad y evidencia</span>
          </div>
        </div>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Crear actividad</DialogTitle>
            <DialogDescription>
              Nueva actividad para el plan anual. Se sincroniza en Matriz, Actividades y Evidencias.
            </DialogDescription>
          </DialogHeader>

          <ActivityFormFields value={form} onChange={updateForm} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveActividad} disabled={!canSave || !canEditActivities}>
              Guardar actividad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar plan</DialogTitle>
            <DialogDescription>Confirma el responsable de aprobación para dejar trazabilidad formal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Usuario</Label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={approvalUser}
                onChange={(e) => setApprovalUser(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={approvalCargo}
                onChange={(e) => setApprovalCargo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenApprove(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar plan</DialogTitle>
            <DialogDescription>El motivo de rechazo es obligatorio y quedará registrado en historial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Usuario</Label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={rejectUser}
                onChange={(e) => setRejectUser(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cargo</Label>
              <input
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={rejectCargo}
                onChange={(e) => setRejectCargo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReject(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openBackToDraft} onOpenChange={setOpenBackToDraft}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Volver a borrador</DialogTitle>
            <DialogDescription>Esta acción desbloqueará la edición del plan y registrará un evento en historial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Usuario</Label>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={backToDraftUser}
              onChange={(e) => setBackToDraftUser(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBackToDraft(false)}>Cancelar</Button>
            <Button onClick={handleBackToDraft}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openWizard} onOpenChange={setOpenWizard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asistente del plan anual</DialogTitle>
            <DialogDescription>
              Flujo guiado basico para preparar el plan del periodo.
            </DialogDescription>
          </DialogHeader>

          {wizardStep === 1 ? (
            <div className="space-y-2">
              <Label>1. Alcance del plan</Label>
              <p className="text-sm text-slate-600">Selecciona el alcance operativo del periodo actual.</p>
              <Select defaultValue="centros">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="centros">Todos los centros</SelectItem>
                  <SelectItem value="contratistas">Centros + contratistas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {wizardStep === 2 ? (
            <div className="space-y-2">
              <Label>2. Base normativa</Label>
              <p className="text-sm text-slate-600">Selecciona la base principal para sugerencias de actividades.</p>
              <Select defaultValue="ds44">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ds44">DS44</SelectItem>
                  <SelectItem value="mixto">DS44 + Ley 16.744</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {wizardStep === 3 ? (
            <div className="space-y-2">
              <Label>3. Confirmacion</Label>
              <p className="text-sm text-slate-600">
                El asistente quedo listo. En una siguiente iteracion se autogeneraran propuestas de actividades.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}>Atras</Button>
            {wizardStep < 3 ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setWizardStep((prev) => Math.min(3, prev + 1))}>
                Siguiente
              </Button>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleFinishWizard}>
                Finalizar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
