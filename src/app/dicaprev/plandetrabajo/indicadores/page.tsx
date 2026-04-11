export default function IndicadoresPlanPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-600 text-2xl">
        📈
      </div>
      <h1 className="text-2xl font-semibold text-slate-800">
        Indicadores del plan de trabajo
      </h1>
      <p className="max-w-sm text-sm text-slate-500">
        Esta vista está en desarrollo. Aquí se mostrarán los indicadores de avance, cumplimiento y efectividad del programa anual.
      </p>
    </div>
  );
}
