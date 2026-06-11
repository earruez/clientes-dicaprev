"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  asignarAcreditacionAContratista,
  crearContratista,
  crearContratistaDocumento,
  getContratistas,
  getOpcionesContratistas,
  type ContratistaRow,
} from "@/actions/contratistas";

type EstadoUI = {
  label: string;
  color: string;
  icon: React.ReactNode;
};

const ESTADO_GLOBAL: Record<string, EstadoUI> = {
  pendiente: {
    label: "Pendiente",
    color: "text-slate-600",
    icon: <Clock className="h-3.5 w-3.5 text-slate-500" />,
  },
  en_revision: {
    label: "En revisión",
    color: "text-amber-600",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  },
  aprobado: {
    label: "Aprobado",
    color: "text-emerald-600",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  },
  rechazado: {
    label: "Rechazado",
    color: "text-red-600",
    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  },
  vencido: {
    label: "Vencido",
    color: "text-red-700",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,
  },
};

export default function ContratistasPageClient() {
  const [rows, setRows] = useState<ContratistaRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showContratistaForm, setShowContratistaForm] = useState(false);
  const [showDocumentoForm, setShowDocumentoForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  const [contratistaIdDoc, setContratistaIdDoc] = useState("");
  const [docNombre, setDocNombre] = useState("");
  const [docTipo, setDocTipo] = useState("");
  const [docArchivoNombre, setDocArchivoNombre] = useState("");
  const [docArchivoUrl, setDocArchivoUrl] = useState("");
  const [docFechaEmision, setDocFechaEmision] = useState("");
  const [docFechaVenc, setDocFechaVenc] = useState("");
  const [docObs, setDocObs] = useState("");

  const [acreditacionByContratista, setAcreditacionByContratista] = useState<Record<string, string>>({});
  const [opcionesAcreditacion, setOpcionesAcreditacion] = useState<
    { id: string; nombre: string; estado: string }[]
  >([]);

  function loadAll() {
    startTransition(async () => {
      try {
        const [contratistas, opciones] = await Promise.all([
          getContratistas(),
          getOpcionesContratistas(),
        ]);
        setRows(contratistas);
        setOpcionesAcreditacion(opciones.acreditaciones);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al cargar contratistas");
      }
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  const totalDocs = useMemo(
    () => rows.reduce((acc, r) => acc + r.totalDocumentos, 0),
    [rows],
  );

  function resetContratistaForm() {
    setNombre("");
    setRut("");
    setRazonSocial("");
    setEmail("");
    setTelefono("");
  }

  function resetDocumentoForm() {
    setContratistaIdDoc("");
    setDocNombre("");
    setDocTipo("");
    setDocArchivoNombre("");
    setDocArchivoUrl("");
    setDocFechaEmision("");
    setDocFechaVenc("");
    setDocObs("");
  }

  function submitContratista(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await crearContratista({
          nombre,
          rut,
          razonSocial,
          email,
          telefono,
        });
        setSuccessMsg("Contratista creado correctamente");
        setShowContratistaForm(false);
        resetContratistaForm();
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible crear contratista");
      }
    });
  }

  function submitDocumento(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!contratistaIdDoc) {
      setErrorMsg("Debe seleccionar contratista");
      return;
    }

    startTransition(async () => {
      try {
        await crearContratistaDocumento({
          contratistaId: contratistaIdDoc,
          nombre: docNombre,
          tipo: docTipo || undefined,
          archivoNombre: docArchivoNombre || undefined,
          archivoUrl: docArchivoUrl || undefined,
          fechaEmision: docFechaEmision || undefined,
          fechaVencimiento: docFechaVenc || undefined,
          observaciones: docObs || undefined,
        });
        setSuccessMsg("Documento cargado correctamente");
        setShowDocumentoForm(false);
        resetDocumentoForm();
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible cargar documento");
      }
    });
  }

  function onAsignarAcreditacion(contratistaId: string) {
    const acreditacionId = acreditacionByContratista[contratistaId];
    if (!acreditacionId) return;

    startTransition(async () => {
      try {
        await asignarAcreditacionAContratista(contratistaId, acreditacionId);
        setSuccessMsg("Acreditación vinculada al contratista");
        loadAll();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No fue posible vincular acreditación");
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo Contratistas"
          title="Contratistas"
          description={`Carpeta documental y estado de acreditación — ${rows.length} contratista${rows.length !== 1 ? "s" : ""} · ${totalDocs} documentos`}
          icon={<Building2 className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            <>
              <Button
                onClick={() => {
                  setShowContratistaForm((v) => !v);
                  setShowDocumentoForm(false);
                }}
                className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo contratista
              </Button>
              <Button
                onClick={() => {
                  setShowDocumentoForm((v) => !v);
                  setShowContratistaForm(false);
                }}
                className="rounded-2xl bg-sky-700 text-white hover:bg-sky-800"
              >
                <FileText className="mr-2 h-4 w-4" />
                Cargar documento
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

        {showContratistaForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Crear contratista</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitContratista} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>RUT</Label>
                  <Input value={rut} onChange={(e) => setRut(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Razón social</Label>
                  <Input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
                <div className="flex items-end gap-3">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowContratistaForm(false);
                      resetContratistaForm();
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

        {showDocumentoForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Cargar documento de contratista</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitDocumento} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5 md:col-span-3">
                  <Label>Contratista *</Label>
                  <div className="relative">
                    <select
                      value={contratistaIdDoc}
                      onChange={(e) => setContratistaIdDoc(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-900"
                      required
                    >
                      <option value="">Seleccionar…</option>
                      {rows.map((r) => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Nombre documento *</Label>
                  <Input value={docNombre} onChange={(e) => setDocNombre(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Input value={docTipo} onChange={(e) => setDocTipo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Archivo nombre</Label>
                  <Input value={docArchivoNombre} onChange={(e) => setDocArchivoNombre(e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Archivo URL</Label>
                  <Input value={docArchivoUrl} onChange={(e) => setDocArchivoUrl(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha emisión</Label>
                  <Input type="date" value={docFechaEmision} onChange={(e) => setDocFechaEmision(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Fecha vencimiento</Label>
                  <Input type="date" value={docFechaVenc} onChange={(e) => setDocFechaVenc(e.target.value)} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Observaciones</Label>
                  <Input value={docObs} onChange={(e) => setDocObs(e.target.value)} />
                </div>

                <div className="flex items-end gap-3 md:col-span-3">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Guardar documento
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDocumentoForm(false);
                      resetDocumentoForm();
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Contratista</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado global</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Documentos</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Vencimientos</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acreditación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    No hay contratistas registrados.
                  </td>
                </tr>
              )}

              {rows.map((r) => {
                const cfg = ESTADO_GLOBAL[r.estadoGlobal] || ESTADO_GLOBAL.pendiente;
                return (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{r.nombre}</p>
                      {r.razonSocial && <p className="text-xs text-slate-500">{r.razonSocial}</p>}
                      {r.rut && <p className="text-xs text-slate-400">RUT {r.rut}</p>}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {r.documentosVencidos > 0
                          ? `${r.documentosVencidos} vencido(s)`
                          : "Sin vencidos"}
                      </p>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-700">Total: {r.totalDocumentos}</p>
                      <div className="mt-1 max-h-28 space-y-1 overflow-y-auto pr-1">
                        {r.documentos.slice(0, 5).map((d) => {
                          const dCfg = ESTADO_GLOBAL[d.estado] || ESTADO_GLOBAL.pendiente;
                          return (
                            <p key={d.id} className="text-xs text-slate-600">
                              <span className={`mr-1 inline-flex items-center gap-1 ${dCfg.color}`}>
                                {dCfg.icon}
                              </span>
                              {d.nombre}
                            </p>
                          );
                        })}
                        {r.documentos.length > 5 && (
                          <p className="text-xs text-slate-400">+ {r.documentos.length - 5} más</p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {r.proximoVencimiento ? (
                        <p className="text-xs text-slate-700">
                          Próximo: {new Date(r.proximoVencimiento).toLocaleDateString("es-CL")}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Sin fecha</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-600">Activas: {r.acreditacionesActivas}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative min-w-[180px]">
                          <select
                            value={acreditacionByContratista[r.id] || ""}
                            onChange={(e) =>
                              setAcreditacionByContratista((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-7 text-xs text-slate-900"
                          >
                            <option value="">Vincular acreditación…</option>
                            {opcionesAcreditacion.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nombre} ({a.estado})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAsignarAcreditacion(r.id)}
                          disabled={!acreditacionByContratista[r.id] || isPending}
                          className="h-7 px-2 text-xs"
                        >
                          Asignar
                        </Button>
                      </div>
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
