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
} from "lucide-react";
import { cn } from "@/lib/utils";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { getEvidenciasCumplimientoView } from "./actions";

const ESTADO_CFG: Record<"valida" | "pendiente" | "rechazada", { label: string; cls: string }> = {
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
};

function fmt(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

export default async function EvidenciasPage() {
  const view = await getEvidenciasCumplimientoView();

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 lg:px-0">
        <StandardPageHeader
          moduleLabel="Cumplimiento DS44"
          title="Evidencias"
          description="Vista derivada desde documentos y hallazgos reales en Prisma."
          icon={Paperclip}
          actions={
            <Button disabled className="hidden sm:inline-flex rounded-full px-5 py-2.5 text-sm font-medium shadow-sm shrink-0">
              Modelo dedicado pendiente
            </Button>
          }
        />

        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p>{view.todoModelo}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Documentos derivados",
              value: view.totalDocumentos,
              sub: `${view.totalHallazgosAbiertos} hallazgos abiertos`,
              icon: <FileText className="h-5 w-5" />,
              cls: "from-slate-50 to-slate-100 text-slate-700",
            },
            {
              label: "Validas",
              value: view.totalValidas,
              sub: "Vigentes en registro documental",
              icon: <CheckCircle2 className="h-5 w-5" />,
              cls: "from-emerald-50 to-emerald-100 text-emerald-700",
            },
            {
              label: "Pendientes",
              value: view.totalPendientes,
              sub: "Por vencer o en carga",
              icon: <Clock className="h-5 w-5" />,
              cls: "from-amber-50 to-amber-100 text-amber-700",
            },
            {
              label: "Rechazadas",
              value: view.totalRechazadas,
              sub: "Vencidas o rechazadas",
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
              <p className="text-slate-600 text-sm font-medium">Sin evidencias derivables desde documentos reales</p>
              <p className="text-xs text-slate-400 mt-1">Cuando exista el modelo EvidenciaCumplimiento se habilitara trazabilidad completa.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {[
                      "Evidencia",
                      "Obligacion",
                      "Entidad",
                      "Fecha",
                      "Estado",
                      "Hallazgo abierto",
                      "Archivo",
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
                      <td className="px-4 py-3 max-w-[260px]">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-800 line-clamp-2">{row.titulo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">
                        {row.obligacionNombre ?? <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {row.centroNombre ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {row.centroNombre}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmt(row.fecha)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", ESTADO_CFG[row.estado].cls)}>
                          {ESTADO_CFG[row.estado].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[300px]">
                        {row.hallazgoAbiertoRelacionado ? (
                          <span className="inline-flex items-start gap-1.5 text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{row.hallazgoAbiertoRelacionado}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">Sin hallazgo abierto vinculado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.archivoUrl ? (
                          <a
                            href={row.archivoUrl}
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
