import { BookOpen, ExternalLink, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { getInduccionesTrabajador } from "@/actions/inducciones";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/server/auth/permissions";
import BackfillInduccionesButton from "./BackfillInduccionesButton";

const ESTADO_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
  }
> = {
  pendiente: {
    label: "Pendiente",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
  },
  en_progreso: {
    label: "En progreso",
    variant: "default",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  completada: {
    label: "Completada",
    variant: "outline",
    icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
  },
  cancelada: {
    label: "Cancelada",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
};

export default async function InduccionesPage() {
  const inducciones = await getInduccionesTrabajador();
  let canManageDocumentacion = false;

  try {
    await requirePermission("canManageDocumentacion");
    canManageDocumentacion = true;
  } catch {
    canManageDocumentacion = false;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo Personas"
          title="Inducciones Digitales"
          description={`Listado de inducciones generadas — ${inducciones.length} registro${inducciones.length !== 1 ? "s" : ""}`}
          icon={<BookOpen className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canManageDocumentacion ? <BackfillInduccionesButton /> : null}
              <Link
                href="/dicaprev/trabajadores"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
              >
                ← Trabajadores
              </Link>
            </div>
          }
        />

        {inducciones.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No hay inducciones registradas</p>
            <p className="mt-1 text-xs text-slate-400">
              Las inducciones se generan desde el perfil de cada trabajador.
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
                    Estado
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Documentos
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inducciones.map((ind) => {
                  const cfg = ESTADO_CONFIG[ind.estado] ?? ESTADO_CONFIG.pendiente;
                  const progreso =
                    ind.firmasTotales > 0
                      ? `${ind.firmasFirmadas} / ${ind.firmasTotales}`
                      : "Sin documentos";
                  const todoFirmado =
                    ind.firmasTotales > 0 && ind.firmasFirmadas === ind.firmasTotales;

                  return (
                    <tr key={ind.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">
                          {ind.trabajador.nombres} {ind.trabajador.apellidos}
                        </p>
                        {ind.trabajador.cargo && (
                          <p className="text-xs text-slate-500">{ind.trabajador.cargo}</p>
                        )}
                        {ind.trabajador.rut && (
                          <p className="text-xs text-slate-400">{ind.trabajador.rut}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={cfg.variant}
                          className="flex w-fit items-center gap-1"
                        >
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            todoFirmado
                              ? "font-semibold text-emerald-600"
                              : "text-slate-600"
                          }
                        >
                          {progreso}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {new Date(ind.createdAt).toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/induccion/${ind.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 hover:underline"
                        >
                          Ver inducción
                          <ExternalLink className="h-3 w-3" />
                        </Link>
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
