import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAnaliticaActivacionEmpresa } from "@/actions/empresa/resumen";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { BarChart3, CheckCircle2, Clock3, Users } from "lucide-react";

const PASOS_LABEL: Record<"inicio" | "generacion" | "firma" | "completado", string> = {
  inicio: "Inicio",
  generacion: "Generacion",
  firma: "Firma",
  completado: "Completado",
};

const DETENCION_LABEL: Record<"inicio" | "generacion" | "firma", string> = {
  inicio: "Se detienen antes de generar",
  generacion: "Se detienen antes de firmar",
  firma: "Se detienen antes de completar",
};

const CONVERSION_LABEL: Record<"inicioAGeneracion" | "generacionAFirma" | "firmaACompletado", string> = {
  inicioAGeneracion: "Inicio -> Generacion",
  generacionAFirma: "Generacion -> Firma",
  firmaACompletado: "Firma -> Completado",
};

const TIEMPO_ETAPA_LABEL: Record<"inicioAGeneracion" | "generacionAFirma" | "firmaACompletado", string> = {
  inicioAGeneracion: "Inicio a generacion",
  generacionAFirma: "Generacion a firma",
  firmaACompletado: "Firma a completado",
};

export default async function ReporteActivacionPage() {
  const analitica = await getAnaliticaActivacionEmpresa();

  const maxFunnel = Math.max(
    analitica.funnel.inicio,
    analitica.funnel.generacion,
    analitica.funnel.firma,
    analitica.funnel.completado,
    1,
  );

  const pasosFunnel: Array<"inicio" | "generacion" | "firma" | "completado"> = [
    "inicio",
    "generacion",
    "firma",
    "completado",
  ];

  return (
    <div className="space-y-6 p-6">
      <StandardPageHeader
        moduleLabel="Modulo Plan"
        title="Reporte de Activacion"
        description="Metricas de avance del flujo de activacion de usuarios."
        icon={<BarChart3 className="h-6 w-6" />}
        iconWrapClassName="bg-indigo-700"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total usuarios</p>
              <p className="text-2xl font-bold text-slate-900">{analitica.totalUsuarios}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Activacion completa</p>
              <p className="text-2xl font-bold text-slate-900">{analitica.porcentajeActivacionCompleta}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Tiempo promedio de activacion</p>
              <p className="text-2xl font-bold text-slate-900">{analitica.tiempoPromedioActivacionMinutos} min</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Funnel de activacion</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {pasosFunnel.map((paso) => {
            const valor = analitica.funnel[paso];
            const widthPct = Math.round((valor / maxFunnel) * 100);
            return (
              <div key={paso} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{PASOS_LABEL[paso]}</span>
                  <span className="text-slate-500">{valor} usuarios</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${widthPct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Pasos donde se detienen</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {analitica.pasosDondeSeDetienen.map((item) => (
            <div key={item.paso} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-700">{DETENCION_LABEL[item.paso]}</span>
              <span className="font-semibold text-slate-900">
                {item.usuarios} ({item.porcentajeSobreEtapa}% etapa, {item.porcentajeSobreInicio}% inicio)
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Conversion entre pasos</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.keys(analitica.conversionEntreEtapas) as Array<keyof typeof analitica.conversionEntreEtapas>).map((key) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-700">{CONVERSION_LABEL[key]}</span>
                <span className="font-semibold text-slate-900">{analitica.conversionEntreEtapas[key]}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Tiempo promedio por etapa</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.keys(analitica.tiempoPromedioPorEtapaMinutos) as Array<keyof typeof analitica.tiempoPromedioPorEtapaMinutos>).map((key) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-700">{TIEMPO_ETAPA_LABEL[key]}</span>
                <span className="font-semibold text-slate-900">{analitica.tiempoPromedioPorEtapaMinutos[key]} min</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
