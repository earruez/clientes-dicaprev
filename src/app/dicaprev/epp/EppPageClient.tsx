"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  HardHat,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  crearEntregaEpp,
  getEntregasEpp,
  getOpcionesTrabajadoresParaEpp,
  EPP_PREDETERMINADOS,
  type EntregaEppListItem,
  type DetalleInput,
} from "@/actions/epp";

// ─── Tipos locales ─────────────────────────────────────────────────────────

type TrabajadorOpcion = {
  id: string;
  label: string;
  rut: string | null;
  cargo: string | null;
};

type DetalleForm = {
  nombre: string;
  cantidad: number;
  talla: string;
  observacion: string;
  esPersonalizado: boolean;
};

// ─── Config visual de estado ───────────────────────────────────────────────

const ESTADO_FIRMA: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente firma",
    color: "text-amber-600",
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  },
  firmado: {
    label: "Firmado",
    color: "text-emerald-600",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  },
  expirado: {
    label: "Expirado",
    color: "text-slate-400",
    icon: <XCircle className="h-3.5 w-3.5 text-slate-400" />,
  },
  rechazado: {
    label: "Rechazado",
    color: "text-red-600",
    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  },
};

// ─── Componente principal ─────────────────────────────────────────────────

export default function EppPageClient() {
  const [entregas, setEntregas] = useState<EntregaEppListItem[]>([]);
  const [trabajadores, setTrabajadores] = useState<TrabajadorOpcion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [trabajadorId, setTrabajadorId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [detalles, setDetalles] = useState<DetalleForm[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ firmaLink: string } | null>(null);

  // Load initial data
  useEffect(() => {
    startTransition(async () => {
      try {
        const [e, t] = await Promise.all([
          getEntregasEpp(),
          getOpcionesTrabajadoresParaEpp(),
        ]);
        setEntregas(e);
        setTrabajadores(t);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Error al cargar datos");
      }
    });
  }, []);

  function refreshEntregas() {
    startTransition(async () => {
      const updated = await getEntregasEpp();
      setEntregas(updated);
    });
  }

  // ─── Detalles form helpers ─────────────────────────────────────────────

  function agregarItemPredeterminado(nombre: string) {
    if (detalles.some((d) => d.nombre === nombre)) return;
    setDetalles((prev) => [
      ...prev,
      { nombre, cantidad: 1, talla: "", observacion: "", esPersonalizado: false },
    ]);
  }

  function agregarItemPersonalizado() {
    setDetalles((prev) => [
      ...prev,
      { nombre: "", cantidad: 1, talla: "", observacion: "", esPersonalizado: true },
    ]);
  }

  function actualizarDetalle(idx: number, field: keyof DetalleForm, value: string | number | boolean) {
    setDetalles((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)),
    );
  }

  function eliminarDetalle(idx: number) {
    setDetalles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ─── Submit ────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!trabajadorId) {
      setFormError("Debe seleccionar un trabajador");
      return;
    }
    const detallesValidos = detalles.filter((d) => d.nombre.trim() && d.cantidad > 0);
    if (!detallesValidos.length) {
      setFormError("Debe agregar al menos un ítem EPP con nombre y cantidad válidos");
      return;
    }

    const trabajador = trabajadores.find((t) => t.id === trabajadorId);
    if (!trabajador) return;

    const payload: DetalleInput[] = detallesValidos.map((d) => ({
      nombre: d.nombre.trim(),
      cantidad: d.cantidad,
      talla: d.talla.trim() || undefined,
      observacion: d.observacion.trim() || undefined,
    }));

    startTransition(async () => {
      try {
        const res = await crearEntregaEpp({
          empresaId: "", // resolved server-side from session
          trabajadorId,
          observaciones: observaciones.trim() || undefined,
          detalles: payload,
        });
        setResultado({ firmaLink: res.firmaLink });
        setShowForm(false);
        resetForm();
        refreshEntregas();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Error al crear la entrega");
      }
    });
  }

  function resetForm() {
    setTrabajadorId("");
    setObservaciones("");
    setDetalles([]);
    setFormError(null);
  }

  function handleCancelForm() {
    setShowForm(false);
    resetForm();
    setResultado(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo SST"
          title="Entrega de EPP"
          description={`Registro de entrega de equipos de protección personal — ${entregas.length} entrega${entregas.length !== 1 ? "s" : ""}`}
          icon={<HardHat className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            !showForm ? (
              <Button
                onClick={() => { setShowForm(true); setResultado(null); }}
                disabled={isPending}
                className="rounded-2xl bg-sky-700 text-white hover:bg-sky-800"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva entrega
              </Button>
            ) : null
          }
        />

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {/* Resultado de creación */}
        {resultado && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Entrega creada correctamente
                </p>
                <p className="text-xs text-emerald-600">
                  Comparte el link de firma con el trabajador.
                </p>
              </div>
            </div>
            <Link
              href={resultado.firmaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Abrir firma
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Formulario nueva entrega */}
        {showForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Nueva entrega de EPP</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Trabajador */}
                <div className="space-y-1.5">
                  <Label htmlFor="trabajador-select">Trabajador *</Label>
                  <div className="relative">
                    <select
                      id="trabajador-select"
                      value={trabajadorId}
                      onChange={(e) => setTrabajadorId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      disabled={isPending}
                    >
                      <option value="">Seleccionar trabajador…</option>
                      {trabajadores.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}{t.rut ? ` — ${t.rut}` : ""}
                          {t.cargo ? ` (${t.cargo})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Ítems EPP */}
                <div className="space-y-3">
                  <Label>Ítems EPP *</Label>
                  <div className="flex flex-wrap gap-2">
                    {EPP_PREDETERMINADOS.map((item) => {
                      const seleccionado = detalles.some((d) => d.nombre === item.nombre);
                      return (
                        <button
                          key={item.codigo}
                          type="button"
                          onClick={() => agregarItemPredeterminado(item.nombre)}
                          disabled={seleccionado || isPending}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                            seleccionado
                              ? "border-sky-300 bg-sky-50 text-sky-700 opacity-60"
                              : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                          }`}
                        >
                          {seleccionado ? "✓ " : "+ "}
                          {item.nombre}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={agregarItemPersonalizado}
                      disabled={isPending}
                      className="rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700"
                    >
                      + Otro
                    </button>
                  </div>

                  {/* Tabla de ítems seleccionados */}
                  {detalles.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Ítem</th>
                            <th className="w-20 px-3 py-2 text-left text-xs font-semibold text-slate-500">Cant.</th>
                            <th className="w-24 px-3 py-2 text-left text-xs font-semibold text-slate-500">Talla</th>
                            <th className="w-8 px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detalles.map((d, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2">
                                {d.esPersonalizado ? (
                                  <Input
                                    value={d.nombre}
                                    onChange={(e) => actualizarDetalle(idx, "nombre", e.target.value)}
                                    placeholder="Nombre del ítem"
                                    className="h-8 rounded-lg text-xs"
                                    disabled={isPending}
                                  />
                                ) : (
                                  <span className="text-slate-800">{d.nombre}</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={d.cantidad}
                                  onChange={(e) =>
                                    actualizarDetalle(idx, "cantidad", Math.max(1, parseInt(e.target.value) || 1))
                                  }
                                  className="h-8 w-16 rounded-lg text-xs"
                                  disabled={isPending}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  value={d.talla}
                                  onChange={(e) => actualizarDetalle(idx, "talla", e.target.value)}
                                  placeholder="S / M / 42…"
                                  className="h-8 rounded-lg text-xs"
                                  disabled={isPending}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => eliminarDetalle(idx)}
                                  disabled={isPending}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                <div className="space-y-1.5">
                  <Label htmlFor="obs-epp">Observaciones</Label>
                  <Input
                    id="obs-epp"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    disabled={isPending}
                    className="rounded-xl"
                  />
                </div>

                {formError && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelForm}
                    disabled={isPending}
                    className="rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-sky-700 text-white hover:bg-sky-800"
                  >
                    {isPending ? "Creando…" : "Crear entrega y enviar a firma"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Listado de entregas */}
        {entregas.length === 0 && !isPending ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <HardHat className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No hay entregas registradas</p>
            <p className="mt-1 text-xs text-slate-400">
              Cree la primera entrega con el botón &ldquo;Nueva entrega&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Trabajador
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ítems
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Firma
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entregas.map((ent) => {
                  const firmaConfig =
                    ESTADO_FIRMA[ent.firmaEstado ?? "pendiente"] ?? ESTADO_FIRMA.pendiente;
                  return (
                    <tr key={ent.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">
                          {ent.trabajador.nombres} {ent.trabajador.apellidos}
                        </p>
                        {ent.trabajador.cargo && (
                          <p className="text-xs text-slate-500">{ent.trabajador.cargo}</p>
                        )}
                        {ent.trabajador.rut && (
                          <p className="text-xs text-slate-400">{ent.trabajador.rut}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-600">
                          {ent.detalles.map((d) => `${d.cantidad}x ${d.nombre}`).join(", ")}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${firmaConfig.color}`}
                        >
                          {firmaConfig.icon}
                          {firmaConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {new Date(ent.fechaEntrega).toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-5 py-3.5">
                        {ent.firmaToken && ent.firmaEstado === "pendiente" && (
                          <Link
                            href={`/firma/${ent.firmaToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 hover:underline"
                          >
                            Enviar a firma
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {ent.firmaEstado === "firmado" && (
                          <span className="text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            Firmado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
