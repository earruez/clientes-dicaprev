import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Paperclip,
  Building2,
  Link2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { normalizarArchivoSeguroUrl } from "@/lib/documentacion/archivo-seguro";
import {
  crearEvidenciaManual,
  getEvidenciasDashboard,
  revisarEvidencia,
} from "@/actions/cumplimiento/evidencias";

const ESTADO_CFG: Record<"valida" | "pendiente" | "rechazada" | "vencida", { label: string; cls: string }> = {
  valida: {
    label: "Valida",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  rechazada: {
    label: "Rechazada",
    cls: "bg-rose-50 text-rose-700 border border-rose-200",
  },
  vencida: {
    label: "Vencida",
    cls: "bg-slate-100 text-slate-700 border border-slate-200",
  },
};

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

async function actionCrearEvidencia(formData: FormData) {
  "use server";

  await crearEvidenciaManual({
    titulo: String(formData.get("titulo") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
    origen: String(formData.get("origen") ?? "manual"),
    archivoUrl: String(formData.get("archivoUrl") ?? "") || null,
    archivoNombre: String(formData.get("archivoNombre") ?? "") || null,
    hallazgoId: String(formData.get("hallazgoId") ?? "") || null,
    obligacionClave: String(formData.get("obligacionClave") ?? "") || null,
  });
}

async function actionValidar(formData: FormData) {
  "use server";

  await revisarEvidencia({
    evidenciaId: String(formData.get("evidenciaId") ?? ""),
    estado: "valida",
    observacionRevision: String(formData.get("observacionRevision") ?? ""),
  });
}

async function actionRechazar(formData: FormData) {
  "use server";

  await revisarEvidencia({
    evidenciaId: String(formData.get("evidenciaId") ?? ""),
    estado: "rechazada",
    observacionRevision: String(formData.get("observacionRevision") ?? ""),
  });
}

export default async function EvidenciasPage() {
  const view = await getEvidenciasDashboard();

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">
        <StandardPageHeader
          moduleLabel="Cumplimiento"
          title="Evidencias generales"
          description="Repositorio maestro de evidencias de cumplimiento de DS44 y otros módulos."
          icon={Paperclip}
        />

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-5 pb-5">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-end">
                <span className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors group-open:bg-slate-700">
                  Crear evidencia
                </span>
              </summary>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <form action={actionCrearEvidencia} className="grid gap-3 md:grid-cols-2">
                  <input
                    name="titulo"
                    placeholder="Titulo evidencia"
                    required
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                  />
                  <input
                    name="origen"
                    placeholder="Origen (manual, documento, checklist, epp, etc.)"
                    defaultValue="manual"
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                  />
                  <textarea
                    name="descripcion"
                    placeholder="Descripcion"
                    required
                    className="min-h-[88px] rounded-md border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                  />
                  <select name="hallazgoId" className="h-10 rounded-md border border-slate-200 px-3 text-sm">
                    <option value="">Vincular a hallazgo (opcional)</option>
                    {view.opciones.hallazgos.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                  <select name="obligacionClave" className="h-10 rounded-md border border-slate-200 px-3 text-sm">
                    <option value="">Vincular a obligación (opcional)</option>
                    {view.opciones.obligaciones.map((o) => (
                      <option key={o.clave} value={o.clave}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="archivoNombre"
                    placeholder="Nombre archivo"
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                  />
                  <input
                    name="archivoUrl"
                    placeholder="URL archivo"
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                  />
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" className="rounded-full px-5 py-2.5 text-sm font-medium shadow-sm shrink-0">
                      Guardar evidencia
                    </Button>
                  </div>
                </form>
              </div>
            </details>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total",
              value: view.total,
              sub: "Evidencias registradas",
              icon: <FileText className="h-5 w-5" />,
              cls: "from-slate-50 to-slate-100 text-slate-700",
            },
            {
              label: "Validas",
              value: view.validas,
              sub: "Aprobadas en revision",
              icon: <CheckCircle2 className="h-5 w-5" />,
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Pendientes",
              value: view.pendientes,
              sub: "Por revision",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Rechazadas/Vencidas",
              value: view.rechazadasOVencidas,
              sub: "No conformes",
              icon: <AlertTriangle className="h-5 w-5" />,
              cls: "from-rose-50 to-rose-100 text-rose-700",
            },
          ].map((kpi) => (
            <Card key={kpi.label} className={`border-none shadow-sm bg-gradient-to-br ${kpi.cls}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {kpi.icon}
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{kpi.label}</p>
                </div>
                <p className="text-3xl font-semibold">{kpi.value}</p>
                <p className="mt-1 text-[11px] opacity-80">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          {view.rows.length === 0 ? (
            <CardContent className="py-16 text-center">
              <Paperclip className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-600 text-sm font-medium">Sin evidencias registradas</p>
              <p className="text-xs text-slate-400 mt-1">Crea una evidencia manual vinculada a hallazgo u obligación.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {[
                      "Origen",
                      "Titulo",
                      "Relacionado con",
                      "Fecha",
                      "Estado",
                      "Archivo",
                      "Revision",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {view.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.origen}</td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <span className="font-medium text-slate-800 line-clamp-2">{row.titulo}</span>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{row.descripcion}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[280px]">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="line-clamp-2">{row.relacionadoCon}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmt(row.fecha)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            ESTADO_CFG[row.estado].cls,
                          )}
                        >
                          {ESTADO_CFG[row.estado].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {normalizarArchivoSeguroUrl(row.archivoUrl) ? (
                          <a
                            href={normalizarArchivoSeguroUrl(row.archivoUrl) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-800"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {row.archivoNombre ?? "Abrir"}
                          </a>
                        ) : (
                          <span className="text-slate-300">Sin URL</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs min-w-[230px]">
                        {row.estado === "pendiente" ? (
                          <div className="flex flex-col gap-2">
                            <form action={actionValidar} className="flex gap-2">
                              <input type="hidden" name="evidenciaId" value={row.id} />
                              <input
                                name="observacionRevision"
                                placeholder="Obs. validacion"
                                className="h-8 flex-1 rounded-md border border-slate-200 px-2 text-[11px]"
                              />
                              <Button type="submit" variant="outline" className="h-8 px-2 text-[11px]">
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Validar
                              </Button>
                            </form>
                            <form action={actionRechazar} className="flex gap-2">
                              <input type="hidden" name="evidenciaId" value={row.id} />
                              <input
                                name="observacionRevision"
                                placeholder="Obs. rechazo"
                                className="h-8 flex-1 rounded-md border border-slate-200 px-2 text-[11px]"
                              />
                              <Button type="submit" variant="outline" className="h-8 px-2 text-[11px]">
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Rechazar
                              </Button>
                            </form>
                          </div>
                        ) : row.estado === "valida" ? (
                          <div className="space-y-1 text-emerald-700">
                            <p className="font-medium">Validada</p>
                            {row.fechaValidacion ? (
                              <p className="text-[11px] text-slate-500">{fmt(row.fechaValidacion)}</p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-slate-500">Sin acciones</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
