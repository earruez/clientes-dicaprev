"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock, Plus, ShieldAlert, XCircle } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cerrarInvestigacion,
  crearAccidenteInvestigacion,
  crearAccionCorrectiva,
  getAccidenteInvestigaciones,
  getOpcionesAccidentes,
  actualizarEstadoAccionCorrectiva,
  type AccidenteInvestigacionRow,
  type EstadoAccionCorrectivaInput,
} from "@/actions/accidentes";

type OpcionesAccidentes = {
  trabajadores: { id: string; nombre: string; rut: string | null }[];
  centros: { id: string; nombre: string }[];
  responsables: { id: string; nombre: string }[];
};

const ESTADO_INVESTIGACION: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  abierta: {
    label: "Abierta",
    color: "text-amber-700",
    icon: <Clock className="h-3.5 w-3.5 text-amber-600" />,
  },
  en_investigacion: {
    label: "En investigacion",
    color: "text-sky-700",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-sky-600" />,
  },
  cerrada: {
    label: "Cerrada",
    color: "text-emerald-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  },
};

const ESTADO_ACCION: Record<
  EstadoAccionCorrectivaInput,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente",
    color: "text-slate-700",
    icon: <Clock className="h-3.5 w-3.5 text-slate-500" />,
  },
  en_proceso: {
    label: "En proceso",
    color: "text-amber-700",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />,
  },
  completada: {
    label: "Completada",
    color: "text-emerald-700",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  },
  cancelada: {
    label: "Cancelada",
    color: "text-red-700",
    icon: <XCircle className="h-3.5 w-3.5 text-red-600" />,
  },
};

export default function AccidentesPageClient() {
  const [rows, setRows] = useState<AccidenteInvestigacionRow[]>([]);
  const [opciones, setOpciones] = useState<OpcionesAccidentes>({
    trabajadores: [],
    centros: [],
    responsables: [],
  });

  const [showAccidenteForm, setShowAccidenteForm] = useState(false);
  const [showAccionForm, setShowAccionForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [trabajadorId, setTrabajadorId] = useState("");
  const [centroTrabajoId, setCentroTrabajoId] = useState("");
  const [fechaAccidente, setFechaAccidente] = useState("");
  const [tipo, setTipo] = useState("accidente");
  const [gravedad, setGravedad] = useState("leve");
  const [descripcion, setDescripcion] = useState("");
  const [causaProbable, setCausaProbable] = useState("");

  const [investigacionId, setInvestigacionId] = useState("");
  const [accionDescripcion, setAccionDescripcion] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [plazo, setPlazo] = useState("");

  function loadAll() {
    startTransition(async () => {
      try {
        const [investigaciones, opts] = await Promise.all([
          getAccidenteInvestigaciones(),
          getOpcionesAccidentes(),
        ]);
        setRows(investigaciones);
        setOpciones(opts);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al cargar accidentes");
      }
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  const totalPendientes = useMemo(
    () => rows.reduce((acc, r) => acc + r.accionesPendientes, 0),
    [rows],
  );

  function resetAccidenteForm() {
    setTrabajadorId("");
    setCentroTrabajoId("");
    setFechaAccidente("");
    setTipo("accidente");
    setGravedad("leve");
    setDescripcion("");
    setCausaProbable("");
  }

  function resetAccionForm() {
    setInvestigacionId("");
    setAccionDescripcion("");
    setResponsableId("");
    setPlazo("");
  }

  function submitAccidente(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await crearAccidenteInvestigacion({
          trabajadorId,
          centroTrabajoId,
          fechaAccidente,
          tipo,
          gravedad,
          descripcion,
          causaProbable: causaProbable || undefined,
        });

        setSuccessMsg("Accidente/incidente registrado correctamente");
        setShowAccidenteForm(false);
        resetAccidenteForm();
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible registrar accidente");
      }
    });
  }

  function submitAccion(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await crearAccionCorrectiva({
          investigacionId,
          descripcion: accionDescripcion,
          responsableId,
          plazo,
        });

        setSuccessMsg("Accion correctiva creada correctamente");
        setShowAccionForm(false);
        resetAccionForm();
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible crear accion correctiva");
      }
    });
  }

  function onCambiarEstadoAccion(accionId: string, estado: EstadoAccionCorrectivaInput) {
    startTransition(async () => {
      try {
        await actualizarEstadoAccionCorrectiva(accionId, estado);
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible actualizar accion");
      }
    });
  }

  function onCerrarInvestigacion(id: string) {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await cerrarInvestigacion(id);
        setSuccessMsg("Investigacion cerrada correctamente");
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible cerrar investigacion");
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Modulo SST"
          title="Investigacion de accidentes"
          description={`Registro de incidentes y acciones correctivas - ${rows.length} investigacion(es), ${totalPendientes} accion(es) pendiente(s)`}
          icon={<ShieldAlert className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            <>
              <Button
                onClick={() => {
                  setShowAccidenteForm((v) => !v);
                  setShowAccionForm(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar accidente/incidente
              </Button>
              <Button
                onClick={() => {
                  setShowAccionForm((v) => !v);
                  setShowAccidenteForm(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="rounded-2xl bg-sky-700 text-white hover:bg-sky-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva accion correctiva
              </Button>
            </>
          }
        />

        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {successMsg}
          </div>
        )}

        {showAccidenteForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Registrar accidente/incidente</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitAccidente} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Trabajador *</Label>
                  <select
                    value={trabajadorId}
                    onChange={(e) => setTrabajadorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {opciones.trabajadores.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}{t.rut ? ` - ${t.rut}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Centro de trabajo *</Label>
                  <select
                    value={centroTrabajoId}
                    onChange={(e) => setCentroTrabajoId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {opciones.centros.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={fechaAccidente}
                    onChange={(e) => setFechaAccidente(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    required
                  >
                    <option value="accidente">Accidente</option>
                    <option value="incidente">Incidente</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Gravedad *</Label>
                  <select
                    value={gravedad}
                    onChange={(e) => setGravedad(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    required
                  >
                    <option value="leve">Leve</option>
                    <option value="moderada">Moderada</option>
                    <option value="grave">Grave</option>
                    <option value="fatal">Fatal</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Descripcion *</Label>
                  <Input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Causa probable</Label>
                  <Input value={causaProbable} onChange={(e) => setCausaProbable(e.target.value)} />
                </div>

                <div className="flex items-end gap-3 md:col-span-2">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAccidenteForm(false);
                      resetAccidenteForm();
                    }}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showAccionForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Crear accion correctiva</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitAccion} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Investigacion *</Label>
                  <select
                    value={investigacionId}
                    onChange={(e) => setInvestigacionId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {rows.map((r) => (
                      <option key={r.id} value={r.id}>
                        {new Date(r.fechaAccidente).toLocaleDateString("es-CL")} - {r.trabajador} ({r.tipo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Descripcion accion *</Label>
                  <Input
                    value={accionDescripcion}
                    onChange={(e) => setAccionDescripcion(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Responsable *</Label>
                  <select
                    value={responsableId}
                    onChange={(e) => setResponsableId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {opciones.responsables.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Plazo *</Label>
                  <Input type="date" value={plazo} onChange={(e) => setPlazo(e.target.value)} required />
                </div>

                <div className="flex items-end gap-3 md:col-span-2">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Guardar accion
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAccionForm(false);
                      resetAccionForm();
                    }}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {rows.map((row) => {
            const estadoInv = ESTADO_INVESTIGACION[row.estado];
            const canClose = row.accionesPendientes === 0 && row.estado !== "cerrada";

            return (
              <Card key={row.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 px-6 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        {new Date(row.fechaAccidente).toLocaleDateString("es-CL")} - {row.tipo}
                      </p>
                      <h3 className="text-base font-semibold text-slate-800">
                        {row.trabajador} - {row.centroTrabajo}
                      </h3>
                      <p className="text-sm text-slate-600">{row.descripcion}</p>
                      {row.causaProbable && (
                        <p className="text-xs text-slate-500">Causa probable: {row.causaProbable}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        Gravedad: {row.gravedad}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${estadoInv.color}`}>
                        {estadoInv.icon}
                        {estadoInv.label}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        Pendientes: {row.accionesPendientes}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => onCerrarInvestigacion(row.id)}
                        disabled={!canClose || isPending}
                        className="bg-emerald-700 text-white hover:bg-emerald-800"
                      >
                        Cerrar investigacion
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 py-5">
                  {row.acciones.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin acciones correctivas registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {row.acciones.map((accion) => {
                        const estadoAccion = ESTADO_ACCION[accion.estado];
                        return (
                          <div
                            key={accion.id}
                            className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-12 md:items-center"
                          >
                            <div className="md:col-span-5">
                              <p className="text-sm font-medium text-slate-800">{accion.descripcion}</p>
                              <p className="text-xs text-slate-500">Responsable: {accion.responsable}</p>
                            </div>
                            <div className="md:col-span-3 text-xs text-slate-600">
                              Plazo: {new Date(accion.plazo).toLocaleDateString("es-CL")}
                            </div>
                            <div className={`md:col-span-2 inline-flex items-center gap-1 text-xs font-semibold ${estadoAccion.color}`}>
                              {estadoAccion.icon}
                              {estadoAccion.label}
                            </div>
                            <div className="md:col-span-2">
                              <select
                                value={accion.estado}
                                onChange={(e) =>
                                  onCambiarEstadoAccion(
                                    accion.id,
                                    e.target.value as EstadoAccionCorrectivaInput,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                disabled={isPending || row.estado === "cerrada"}
                              >
                                <option value="pendiente">Pendiente</option>
                                <option value="en_proceso">En proceso</option>
                                <option value="completada">Completada</option>
                                <option value="cancelada">Cancelada</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {rows.length === 0 && (
            <Card className="rounded-2xl border border-dashed border-slate-300 bg-white">
              <CardContent className="px-6 py-10 text-center text-sm text-slate-500">
                No hay investigaciones registradas.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
