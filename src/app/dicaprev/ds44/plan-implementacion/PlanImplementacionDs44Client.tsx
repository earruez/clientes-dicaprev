"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, ClipboardList, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { guardarDs44PlanAccion } from "./actions";
import {
  type Ds44PlanAccion,
  type Ds44PlanEstado,
  type Ds44PlanImplementacionData,
  type Ds44PlanOrden,
  type Ds44ResponsableDisponible,
} from "./types";

type Props = {
  data: Ds44PlanImplementacionData;
};

type FormState = {
  responsableTrabajadorId: string;
  fechaCompromiso: string;
  estado: Ds44PlanEstado;
  observacionTecnica: string;
};

const PRIORIDAD_LABEL: Record<Ds44PlanAccion["prioridad"], string> = {
  critica: "Critica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORIDAD_BADGE: Record<Ds44PlanAccion["prioridad"], string> = {
  critica: "border-rose-200 bg-rose-50 text-rose-700",
  alta: "border-amber-200 bg-amber-50 text-amber-700",
  media: "border-blue-200 bg-blue-50 text-blue-700",
  baja: "border-slate-200 bg-slate-50 text-slate-700",
};

const ESTADO_LABEL: Record<Ds44PlanEstado, string> = {
  pendiente: "Pendiente",
  planificada: "Planificada",
  en_proceso: "En proceso",
  cerrada: "Cerrada",
};

const ESTADO_BADGE: Record<Ds44PlanEstado, string> = {
  pendiente: "border-slate-200 bg-slate-100 text-slate-700",
  planificada: "border-blue-200 bg-blue-50 text-blue-700",
  en_proceso: "border-amber-200 bg-amber-50 text-amber-700",
  cerrada: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const ORDEN_CONF: Array<{ key: Ds44PlanOrden; titulo: string; subtitulo: string }> = [
  { key: "inmediatas", titulo: "Inmediatas", subtitulo: "Brechas criticas" },
  { key: "altas", titulo: "Altas", subtitulo: "Brechas altas" },
  { key: "medias", titulo: "Medias", subtitulo: "Brechas medias" },
  { key: "seguimiento", titulo: "Seguimiento", subtitulo: "Brechas bajas" },
];

function formatFecha(value: string | null): string {
  if (!value) return "Sin fecha definida";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha definida";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toInputDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getResponsableLabel(item: Ds44ResponsableDisponible): string {
  const cargo = item.cargoNombre || "Sin cargo asignado";
  return `${item.nombreCompleto} - ${cargo}`;
}

function getResponsableDisplay(accion: Ds44PlanAccion): string {
  if (accion.responsableTrabajadorNombre) {
    if (accion.responsableTrabajadorCargo) {
      return `${accion.responsableTrabajadorNombre} - ${accion.responsableTrabajadorCargo}`;
    }
    return accion.responsableTrabajadorNombre;
  }

  if (accion.responsableReal) {
    return accion.responsableReal;
  }

  return "A definir por prevencionista";
}

function guessResponsableId(accion: Ds44PlanAccion, responsables: Ds44ResponsableDisponible[]): string {
  if (accion.responsableTrabajadorId) return accion.responsableTrabajadorId;
  if (!accion.responsableReal) return "";

  const target = accion.responsableReal.trim().toLowerCase();
  const found = responsables.find((item) => item.nombreCompleto.trim().toLowerCase() === target);
  return found?.id ?? "";
}

function getFormInitial(accion: Ds44PlanAccion, responsables: Ds44ResponsableDisponible[]): FormState {
  return {
    responsableTrabajadorId: guessResponsableId(accion, responsables),
    fechaCompromiso: toInputDate(accion.fechaCompromiso),
    estado: accion.estado,
    observacionTecnica: accion.observacionTecnica ?? "",
  };
}

function renderResumenCard(label: string, value: number, tone: "base" | "warn" | "alert" = "base") {
  const valueClass =
    tone === "alert" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function PlanImplementacionDs44Client({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const accionesByClave = useMemo(() => {
    return new Map(data.acciones.map((item) => [item.preguntaClave, item]));
  }, [data.acciones]);

  const responsablesRecomendados = useMemo(
    () => data.responsablesDisponibles.filter((item) => item.recomendado),
    [data.responsablesDisponibles],
  );
  const otrosResponsables = useMemo(
    () => data.responsablesDisponibles.filter((item) => !item.recomendado),
    [data.responsablesDisponibles],
  );

  function startPlanning(accion: Ds44PlanAccion) {
    setEditingKey(accion.preguntaClave);
    setForm(getFormInitial(accion, data.responsablesDisponibles));
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  function cancelPlanning() {
    setEditingKey(null);
    setForm(null);
    setErrorMsg(null);
  }

  function onSave(preguntaClave: string) {
    if (!form) return;

    if (!form.responsableTrabajadorId) {
      setErrorMsg("Selecciona un responsable valido de la empresa.");
      return;
    }

    if (!form.fechaCompromiso.trim()) {
      setErrorMsg("Define una fecha compromiso real para planificar esta accion.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await guardarDs44PlanAccion({
          preguntaClave,
          responsableTrabajadorId: form.responsableTrabajadorId,
          fechaCompromiso: form.fechaCompromiso,
          estado: form.estado,
          observacionTecnica: form.observacionTecnica,
        });

        setSuccessMsg("Accion DS44 planificada correctamente.");
        setEditingKey(null);
        setForm(null);
        router.refresh();
      } catch (error) {
        if (error instanceof Error) {
          setErrorMsg(error.message);
          return;
        }

        setErrorMsg("No fue posible guardar la planificacion DS44.");
      }
    });
  }

  if (data.estadoGeneracion === "sin_diagnostico") {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            Paso previo requerido
          </Badge>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Primero completa el diagnostico DS44 para generar el plan de implementacion.</h2>
            <p className="mt-2 text-sm text-slate-600">
              El plan se construye desde brechas del diagnostico y luego lo planifica el prevencionista con fechas reales.
            </p>
          </div>
          <Button asChild>
            <Link href="/dicaprev/ds44/diagnostico">
              Ir al diagnostico
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.estadoGeneracion === "sin_brechas") {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Estado controlado
          </Badge>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">No hay brechas activas desde el diagnostico actual.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Se recomienda seguimiento periodico y revisar el diagnostico ante cambios operativos o nuevos riesgos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dicaprev/ds44/diagnostico">Ver diagnostico</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dicaprev/ds44">Volver a DS44</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              Orden sugerido por criticidad
            </Badge>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">NextPrev prioriza las acciones. El prevencionista define responsables y fechas reales.</h2>
              <p className="mt-2 text-sm text-slate-600">
                NextPrev ordena acciones por criticidad. El prevencionista debe definir el plazo real considerando factibilidad tecnica, recursos disponibles, coordinacion con la empresa y nivel de riesgo.
              </p>
            </div>
            {data.resumen.vencidasReales > 0 ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Hay acciones DS44 con fecha compromiso vencida.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex justify-end">
          <Button asChild>
            <Link href="/dicaprev/ds44/evidencias">
              Gestionar evidencias
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          Resumen ejecutivo
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {renderResumenCard("Total acciones", data.resumen.totalAcciones)}
          {renderResumenCard("Criticas", data.resumen.criticas, "alert")}
          {renderResumenCard("Planificadas", data.resumen.planificadas, "warn")}
          {renderResumenCard("Plazos por definir", data.resumen.plazosPorDefinir)}
        </div>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Orden sugerido por criticidad</h2>
            <p className="text-sm text-slate-500">
              Priorizacion sugerida por NextPrev. La fecha compromiso real la define el prevencionista al planificar cada accion.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ORDEN_CONF.map((col) => {
              const acciones = data.columnas[col.key];
              const visibles = acciones.slice(0, 4);

              return (
                <div key={col.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{col.titulo}</p>
                  <p className="text-xs text-slate-500">{col.subtitulo}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{acciones.length}</p>

                  <div className="mt-3 space-y-2">
                    {visibles.length === 0 ? (
                      <p className="text-xs text-slate-500">Sin acciones en esta columna.</p>
                    ) : (
                      visibles.map((item) => (
                        <div key={`col-${item.preguntaClave}`} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                          <p className="text-xs font-medium text-slate-700 line-clamp-2">{item.preguntaTexto}</p>
                          <p className="mt-1 text-[11px] text-slate-500">Estado: {ESTADO_LABEL[item.estado]}</p>
                          <p className="text-[11px] text-slate-500">{item.fechaCompromiso ? formatFecha(item.fechaCompromiso) : "Sin fecha definida"}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 w-full text-xs"
                            onClick={() => startPlanning(item)}
                          >
                            Planificar
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4 text-slate-500" />
              Plan por acciones
            </h2>
            <p className="text-sm text-slate-500">Brecha detectada, recomendacion del sistema y planificacion operativa del prevencionista.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.responsablesDisponibles.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay trabajadores activos disponibles para asignar como responsables. Primero carga trabajadores de la empresa.
              </div>
            ) : null}

            {errorMsg ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMsg}</div>
            ) : null}
            {successMsg ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMsg}</div>
            ) : null}

            {data.acciones.map((accion) => {
              const isEditing = editingKey === accion.preguntaClave;
              const localAccion = accionesByClave.get(accion.preguntaClave) ?? accion;

              return (
                <div key={accion.preguntaClave} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={PRIORIDAD_BADGE[localAccion.prioridad]}>
                      {PRIORIDAD_LABEL[localAccion.prioridad]}
                    </Badge>
                    <Badge variant="outline" className={ESTADO_BADGE[localAccion.estado]}>
                      {ESTADO_LABEL[localAccion.estado]}
                    </Badge>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">{localAccion.preguntaTexto}</h3>

                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Accion sugerida</p>
                      <p className="mt-1 text-slate-700">{localAccion.accionSugerida}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Evidencia esperada</p>
                      <p className="mt-1 text-slate-700">{localAccion.evidenciaEsperada || "Sin evidencia sugerida"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Responsable sugerido</p>
                      <p className="mt-1 text-slate-700">{localAccion.responsableSugerido || "A definir"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Responsable actual</p>
                      <p className="mt-1 text-slate-700">{getResponsableDisplay(localAccion)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Plazo</p>
                      <p className="mt-1 text-slate-700">{localAccion.fechaCompromiso ? formatFecha(localAccion.fechaCompromiso) : "A definir por prevencionista"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Frente operativo</p>
                      <p className="mt-1 text-slate-700">{localAccion.frenteOperativo}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Observacion tecnica</p>
                      <p className="mt-1 text-slate-700">{localAccion.observacionTecnica || "Sin observacion tecnica"}</p>
                    </div>
                  </div>

                  {isEditing && form ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Responsable</label>
                        <select
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                          value={form.responsableTrabajadorId}
                          onChange={(event) =>
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    responsableTrabajadorId: event.target.value,
                                  }
                                : prev,
                            )
                          }
                        >
                          <option value="">Selecciona un responsable de la empresa</option>
                          {responsablesRecomendados.length > 0 ? (
                            <optgroup label="Recomendados">
                              {responsablesRecomendados.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {getResponsableLabel(item)}
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                          {otrosResponsables.length > 0 ? (
                            <optgroup label="Otros trabajadores">
                              {otrosResponsables.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {getResponsableLabel(item)}
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          Se priorizan gerencia, jefaturas, supervisores, administracion y prevencion SST.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha compromiso</label>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                          value={form.fechaCompromiso}
                          onChange={(event) => setForm((prev) => prev ? { ...prev, fechaCompromiso: event.target.value } : prev)}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado</label>
                        <select
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                          value={form.estado}
                          onChange={(event) =>
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    estado: event.target.value as Ds44PlanEstado,
                                  }
                                : prev,
                            )
                          }
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="planificada">Planificada</option>
                          <option value="en_proceso">En proceso</option>
                          <option value="cerrada">Cerrada</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Observacion tecnica</label>
                        <textarea
                          rows={3}
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                          placeholder="Indica criterio tecnico, dependencias, recursos necesarios o justificacion del plazo."
                          value={form.observacionTecnica}
                          onChange={(event) =>
                            setForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    observacionTecnica: event.target.value,
                                  }
                                : prev,
                            )
                          }
                        />
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" onClick={cancelPlanning} disabled={isPending}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => onSave(accion.preguntaClave)}
                          disabled={isPending || data.responsablesDisponibles.length === 0 || !form.responsableTrabajadorId}
                        >
                          {isPending ? "Guardando..." : "Guardar planificacion"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => startPlanning(localAccion)}>
                        Planificar accion
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={localAccion.rutaSugerida || "/dicaprev/ds44"}>
                          Ir al frente sugerido
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
              NextPrev ordena acciones por criticidad. El prevencionista debe definir el plazo real considerando factibilidad tecnica, recursos disponibles, coordinacion con la empresa y nivel de riesgo.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
