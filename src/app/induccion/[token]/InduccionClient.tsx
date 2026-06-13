"use client";

import Link from "next/link";
import { CheckCircle2, Clock, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InduccionPublicaView } from "@/actions/inducciones";

type Props = {
  induccion: InduccionPublicaView;
};

const ESTADO_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente",
    variant: "secondary",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  en_progreso: {
    label: "En progreso",
    variant: "default",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  completada: {
    label: "Completada",
    variant: "outline",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  },
  cancelada: {
    label: "Cancelada",
    variant: "destructive",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const FIRMA_ESTADO_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente firma",
    color: "text-amber-600",
    icon: <Clock className="h-4 w-4 text-amber-500" />,
  },
  firmado: {
    label: "Firmado",
    color: "text-emerald-600",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  rechazado: {
    label: "Rechazado",
    color: "text-red-600",
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
  expirado: {
    label: "Expirado",
    color: "text-slate-400",
    icon: <XCircle className="h-4 w-4 text-slate-400" />,
  },
};

export default function InduccionClient({ induccion }: Props) {
  const estadoConfig = ESTADO_CONFIG[induccion.estado] ?? ESTADO_CONFIG.pendiente;
  const firmasFirmadas = induccion.firmas.filter((f) => f.estado === "firmado").length;
  const totalFirmas = induccion.firmas.length;
  const totalDocumentosGenerados = induccion.documentosGenerados.length;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                Inducción Digital — NextPrev
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                {induccion.nombreTrabajador}
              </h1>
              {induccion.rutTrabajador && (
                <p className="text-sm text-slate-500">RUT {induccion.rutTrabajador}</p>
              )}
              {induccion.cargoTrabajador && (
                <p className="text-sm text-slate-500">{induccion.cargoTrabajador}</p>
              )}
            </div>
            <Badge
              variant={estadoConfig.variant}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              {estadoConfig.icon}
              {estadoConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <span>
              <span className="font-semibold text-slate-900">{firmasFirmadas}</span>
              {" / "}
              <span className="text-slate-500">{totalFirmas}</span> documentos firmados
            </span>
            {induccion.fechaInicio && (
              <span>
                Inicio:{" "}
                {new Date(induccion.fechaInicio).toLocaleDateString("es-CL")}
              </span>
            )}
            {induccion.fechaTermino && (
              <span>
                Término:{" "}
                {new Date(induccion.fechaTermino).toLocaleDateString("es-CL")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documentos generados */}
      {totalDocumentosGenerados === 0 ? (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="px-6 py-8 text-center">
            <p className="text-sm text-slate-500">
              No hay documentos generados para esta inducción.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-800">Documentos generados</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Revise cada documento y firme los que se encuentren pendientes.
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {induccion.documentosGenerados.map((documento) => {
              const firmaConfig =
                FIRMA_ESTADO_CONFIG[documento.firma?.estado ?? "pendiente"] ??
                FIRMA_ESTADO_CONFIG.pendiente;
              const resumen = documento.contenidoMarkdown
                .replaceAll("\n", " ")
                .slice(0, 180)
                .trim();

              return (
                <div
                  key={documento.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {firmaConfig.icon}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {documento.titulo}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        Tipo: {documento.tipo}
                      </p>
                      {resumen.length > 0 && (
                        <p className="truncate text-xs text-slate-500">{resumen}</p>
                      )}
                      {documento.firma?.estado === "firmado" && documento.firma.firmadoAt && (
                        <p className="text-xs text-emerald-600">
                          Firmado el{" "}
                          {new Date(documento.firma.firmadoAt).toLocaleString("es-CL")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {documento.firma?.estado === "pendiente" && documento.firma.token ? (
                      <Link
                        href={`/firma/${documento.firma.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
                      >
                        Firmar
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className={`text-xs font-medium ${firmaConfig.color}`}>
                        {firmaConfig.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-slate-400">Generado por NextPrev</p>
    </div>
  );
}
