type ModuleInPreparationProps = {
  moduleName: string;
  detail?: string;
};

export default function ModuleInPreparation({ moduleName, detail }: ModuleInPreparationProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-amber-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Produccion inicial</p>
      <h1 className="mt-1 text-lg font-semibold">{moduleName}: Modulo en preparacion</h1>
      <p className="mt-2 text-sm text-amber-800">
        {detail ?? "Esta vista aun depende de datos mock/demo y se habilitara cuando este conectada a datos reales."}
      </p>
    </div>
  );
}
