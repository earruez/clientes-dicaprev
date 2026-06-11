"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ShieldAlert,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarEstadoAccionCorrectiva,
  cerrarInvestigacion,
  crearAccidenteInvestigacion,
  crearAccionCorrectiva,
  getAccidenteInvestigaciones,
  getOpcionesAccidentes,
  type AccidenteInvestigacionRow,
  type EstadoAccionCorrectiva,
} from "@/actions/accidentes";

const ESTADO_INVESTIGACION: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  abierta: {
    label: "Abierta",
    color: "text-amber-600",
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  },
  en_investigacion: {
    label: "En investigación",
    color: "text-sky-600",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-sky-500" />,
  },
  cerrada: {
    label: "Cerrada",
    color: "text-emerald-600",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  },
};

const GRAVEDAD_CFG: Record<string, string> = {
  baja: "text-emerald-600",
  media: "text-amber-600",
  alta: "text-red-600",
  critica: "text-red-700",
};

const ESTADOS_ACCION: EstadoAccionCorrectiva[] = ["pendiente", "en_progreso", "completada"];

export default function AccidentesPageClient() {
  const [rows, setRows] = useState<AccidenteInvestigacionRow[]>([]);
  const [opciones, setOpciones] = useState<{
    trabajadores: { id: string; nombre: string; rut: string | null }[];
    centros: { id: string; nombre: string }[];
    usuarios: { id: string; nombre: string; email: string }[];
  }>({ trabajadores: [], centros: [], usuarios: [] });

  const [isPending, startTransition] = useTransition();
  const [showInvestigacionForm, setShowInvestigacionForm] = useState(false);
  const [showAccionForm, setShowAccionForm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form investigación
  const [trabajadorId, setTrabajadorId] = useState("");
  const [centroTrabajoId, setCentroTrabajoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState("incidente");
  const [gravedad, setGravedad] = useState("media");
  const [descripcion, setDescripcion] = useState("");
  const [causaProbable, setCausaProbable] = useState("");

  // Form acción correctiva
  const [investigacionId, setInvestigacionId] = useState("");
  const [accionDescripcion, setAccionDescripcion] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [responsableNombre, setResponsableNombre] = useState("");
  const [plazo, setPlazo] = useState("");

  function loadAll() {
    startTransition(async () => {
      try {
        const [accidentes, opts] = await Promise.all([
          getAccidenteInvestigaciones(),
          getOpcionesAccidentes(),
        ]);
        setRows(accidentes);
        setOpciones(opts);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al cargar accidentes");
      }
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  function resetInvestigacionForm() {
    setTrabajadorId("");
    setCentroTrabajoId("");
    setFecha("");
    setTipo("incidente");
    setGravedad("media");
    setDescripcion("");
    setCausaProbable("");
  }

  function resetAccionForm() {
    setInvestigacionId("");
    setAccionDescripcion("");
    setResponsableId("");
    setResponsableNombre("");
    setPlazo("");
  }

  function submitInvestigacion(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await crearAccidenteInvestigacion({
          trabajadorId: trabajadorId || undefined,
          centroTrabajoId: centroTrabajoId || undefined,
          fecha,
          tipo,
          gravedad,
          descripcion,
          causaProbable: causaProbable || undefined,
        });

        setSuccessMsg("Investigación registrada correctamente");
        setShowInvestigacionForm(false);
        resetInvestigacionForm();
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible registrar investigación");
      }
    });
  }

  function submitAccion(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!investigacionId) {
      setErrorMsg("Debe seleccionar una investigación");
      return;
    }

    startTransition(async () => {
      try {
        await crearAccionCorrectiva({
          investigacionId,
          descripcion: accionDescripcion,
          responsableId: responsableId || undefined,
          responsableNombre: responsableNombre || undefined,
          plazo,
        });

        setSuccessMsg("Acción correctiva creada");
        setShowAccionForm(false);
        resetAccionForm();
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible crear acción");
      }
    });
  }

  function onCambioEstadoAccion(accionId: string, estado: EstadoAccionCorrectiva) {
    startTransition(async () => {
      try {
        await actualizarEstadoAccionCorrectiva(accionId, estado);
        setSuccessMsg("Estado de acción actualizado");
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible actualizar estado de acción");
      }
    });
  }

  function onCerrarInvestigacion(id: string) {
    startTransition(async () => {
      try {
        await cerrarInvestigacion(id);
        setSuccessMsg("Investigación cerrada");
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible cerrar investigación");
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo Cumplimiento"
          title="Investigación de Accidentes"
          description={`Registro de accidentes e incidentes — ${rows.length} investigación${rows.length !== 1 ? "es" : ""}`}
          icon={<ShieldAlert className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            <>
              <Button
                onClick={() => {
                  setShowInvestigacionForm((v) => !v);
                  setShowAccionForm(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="rounded-2xl bg-sky-700 text-white hover:bg-sky-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar accidente/incidente
              </Button>
              <Button
                onClick={() => {
                  setShowAccionForm((v) => !v);
                  setShowInvestigacionForm(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva acción correctiva
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

        {showInvestigacionForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Registrar investigación</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitInvestigacion} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Trabajador</Label>
                  <div className="relative">
                    <select
                      value={trabajadorId}
                      onChange={(e) => setTrabajadorId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm"
                    >
                      <option value="">No asignar</option>
                      {opciones.trabajadores.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}{t.rut ? ` — ${t.rut}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Centro</Label>
                  <div className="relative">
                    <select
                      value={centroTrabajoId}
                      onChange={(e) => setCentroTrabajoId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm"
                    >
                      <option value="">No asignar</option>
                      {opciones.centros.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Fecha *</Label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <div className="relative">
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm"
                    >
                      <option value="incidente">Incidente</option>
                      <option value="accidente">Accidente</option>
                      <option value="cuasi_accidente">Cuasi accidente</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Gravedad *</Label>
                  <div className="relative">
                    <select
                      value={gravedad}
                      onChange={(e) => setGravedad(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm"
                    >
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label>Descripción *</Label>
                  <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label>Causa probable</Label>
                  <Input value={causaProbable} onChange={(e) => setCausaProbable(e.target.value)} />
                </div>

                <div className="flex gap-3 md:col-span-3">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Guardar investigación
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowInvestigacionForm(false);
                      resetInvestigacionForm();
                    }}
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
              <h2 className="text-base font-semibold text-slate-800">Crear acción correctiva</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitAccion} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5 md:col-span-3">
                  <Label>Investigación *</Label>
                  <div className="relative">
                    <select
                      value={investigacionId}
                      onChange={(e) => setInvestigacionId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm"
                      required
                    >
                      <option value="">Seleccionar…</option>
                      {rows
                        .filter((r) => r.estado !== "cerrada")
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {new Date(r.fecha).toLocaleDateString("es-CL")} — {r.tipo} — {r.descripcion.slice(0, 60)}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-3">
                  <Label>Descripción de la acción *</Label>
                  <Input value={accionDescripcion} onChange={(e) => setAccionDescripcion(e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <Label>Responsable (usuario)</Label>
                  <div className="relative">
                    <select
                      value={responsableId}
                      onChange={(e) => setResponsableId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm"
                    >
                      <option value="">No asignar</option>
                      {opciones.usuarios.map((u) => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Responsable (texto)</Label>
                  <Input value={responsableNombre} onChange={(e) => setResponsableNombre(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Plazo *</Label>
                  <Input type="date" value={plazo} onChange={(e) => setPlazo(e.target.value)} required />
                </div>

                <div className="flex gap-3 md:col-span-3">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Guardar acción
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAccionForm(false);
                      resetAccionForm();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha / Tipo</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado / Gravedad</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones correctivas</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    No hay investigaciones registradas.
                  </td>
                </tr>
              )}

              {rows.map((r) => {
                const cfg = ESTADO_INVESTIGACION[r.estado] || ESTADO_INVESTIGACION.abierta;
                return (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{new Date(r.fecha).toLocaleDateString("es-CL")}</p>
                      <p className="text-xs text-slate-500">{r.tipo}</p>
                      {r.trabajador && <p className="text-xs text-slate-500">{r.trabajador.nombre}</p>}
                      {r.centroTrabajo && <p className="text-xs text-slate-400">{r.centroTrabajo.nombre}</p>}
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-700">{r.descripcion}</p>
                      {r.causaProbable && <p className="mt-1 text-xs text-slate-500">Causa: {r.causaProbable}</p>}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <p className={`mt-1 text-xs font-semibold ${GRAVEDAD_CFG[r.gravedad] || "text-slate-600"}`}>
                        Gravedad: {r.gravedad}
                      </p>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="mb-1 text-xs text-slate-600">Pendientes: {r.accionesPendientes}</p>
                      <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                        {r.acciones.map((a) => (
                          <div key={a.id} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
                            <p className="text-xs text-slate-700">{a.descripcion}</p>
                            <p className="text-[11px] text-slate-500">
                              {a.responsableNombre || "Sin responsable"} · Plazo {new Date(a.plazo).toLocaleDateString("es-CL")}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">Estado:</span>
                              <select
                                value={a.estado}
                                onChange={(e) => onCambioEstadoAccion(a.id, e.target.value as EstadoAccionCorrectiva)}
                                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
                              >
                                {ESTADOS_ACCION.map((st) => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                        {r.acciones.length === 0 && (
                          <p className="text-xs text-slate-400">Sin acciones registradas</p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {r.estado === "cerrada" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Cerrada
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCerrarInvestigacion(r.id)}
                          className="h-7 rounded-lg px-2 text-xs"
                        >
                          Cerrar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
