"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardList, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Ds44PlanAccion, Ds44PlanImplementacionData } from "./actions";

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

const PLAZO_CONF: Array<{ key: "7" | "15" | "30" | "60"; titulo: string; subtitulo: string }> = [
  { key: "7", titulo: "7 dias", subtitulo: "Brechas criticas" },
  { key: "15", titulo: "15 dias", subtitulo: "Brechas altas" },
  { key: "30", titulo: "30 dias", subtitulo: "Brechas medias" },
  { key: "60", titulo: "60 dias", subtitulo: "Mejoras bajas" },
];

function formatFecha(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

export default function PlanImplementacionDs44Client({ data }: { data: Ds44PlanImplementacionData }) {
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
              El plan se construye automaticamente desde las brechas detectadas en el ultimo diagnostico guardado.
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
              Se recomienda seguimiento periodico, actualizacion de evidencia y repetir diagnostico ante cambios operativos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dicaprev/ds44/diagnostico">Ver diagnostico</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dicaprev/cumplimiento/evidencias">Revisar evidencias</Link>
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
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.5fr_1fr] lg:items-center">
            <div className="space-y-4">
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                Que resolver primero
              </Badge>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{data.proximoHito?.titulo}</h2>
                <p className="mt-2 text-sm text-slate-600">{data.proximoHito?.detalle}</p>
              </div>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={data.proximoHito?.href ?? "/dicaprev/ds44/diagnostico"}>
                  {data.proximoHito?.cta ?? "Ver siguiente paso"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
              <p className="font-semibold text-slate-900">Foco inmediato</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total acciones</span>
                  <span className="font-semibold text-slate-900">{data.resumen.totalAcciones}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Criticas</span>
                  <span className="font-semibold text-rose-700">{data.resumen.criticas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Vencidas</span>
                  <span className="font-semibold text-rose-700">{data.resumen.vencidas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Proximas (7 dias)</span>
                  <span className="font-semibold text-amber-700">{data.resumen.proximas}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CalendarClock className="h-4 w-4 text-slate-500" />
              Timeline 7 / 15 / 30 / 60 dias
            </h2>
            <p className="text-sm text-slate-500">Distribucion de acciones por prioridad y plazo sugerido.</p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PLAZO_CONF.map((col) => {
              const acciones = data.timeline[col.key];
              const visibles = acciones.slice(0, 3);

              return (
                <div key={col.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{col.titulo}</p>
                  <p className="text-xs text-slate-500">{col.subtitulo}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{acciones.length}</p>

                  <div className="mt-3 space-y-2">
                    {visibles.length === 0 ? (
                      <p className="text-xs text-slate-500">Sin acciones en este tramo.</p>
                    ) : (
                      visibles.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                          <p className="text-xs font-medium text-slate-700">{item.preguntaTexto}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {acciones.length > 3 ? (
                    <p className="mt-2 text-xs text-slate-500">Ver detalle en la seccion de acciones.</p>
                  ) : null}
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
            <p className="text-sm text-slate-500">Acciones priorizadas para cerrar brechas, asignar responsables y preparar evidencia.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.acciones.map((accion) => (
              <div key={accion.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={PRIORIDAD_BADGE[accion.prioridad]}>
                    {PRIORIDAD_LABEL[accion.prioridad]}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                    Estado: Pendiente
                  </Badge>
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                    {accion.plazoSugeridoLabel}
                  </Badge>
                </div>

                <h3 className="text-base font-semibold text-slate-900">{accion.preguntaTexto}</h3>

                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Accion recomendada</p>
                    <p className="mt-1 text-slate-700">{accion.recomendacion}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Evidencia esperada</p>
                    <p className="mt-1 text-slate-700">{accion.evidenciaEsperada || "Definir evidencia"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Responsable sugerido</p>
                    <p className="mt-1 text-slate-700">{accion.responsableSugerido}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Frente operativo</p>
                    <p className="mt-1 text-slate-700">{accion.frenteOperativo}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Plazo sugerido</p>
                    <p className="mt-1 text-slate-700">{accion.plazoSugeridoLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Fecha objetivo</p>
                    <p className="mt-1 text-slate-700">{formatFecha(accion.fechaObjetivo)}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button asChild size="sm" variant="outline">
                    <Link href={accion.rutaSugerida}>
                      Ir al frente sugerido
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          Resumen ejecutivo
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {renderResumenCard("Total acciones", data.resumen.totalAcciones)}
          {renderResumenCard("Criticas", data.resumen.criticas, "alert")}
          {renderResumenCard("Altas", data.resumen.altas, "warn")}
          {renderResumenCard("Sin evidencia", data.resumen.sinEvidencia)}
        </div>
      </section>
    </div>
  );
}