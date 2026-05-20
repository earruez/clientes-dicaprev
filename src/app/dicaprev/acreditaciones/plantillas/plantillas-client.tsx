"use client";

import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { activarDesactivarPlantillaAcreditacion, duplicarPlantillaAcreditacion } from "@/actions/acreditaciones";
import { Layers, Search } from "lucide-react";

type PlantillaItem = {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  activa: boolean;
  version: number;
  mandante: string;
  requisitosCount: number;
  categorias: string[];
};

export default function PlantillasClient({ initialPlantillas }: { initialPlantillas: PlantillaItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const search = searchParams.get("q") ?? "";
  const tipo = searchParams.get("tipo") ?? "todos";
  const estado = searchParams.get("estado") ?? "todos";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPlantillas.filter((p) => {
      const passSearch = !q || p.nombre.toLowerCase().includes(q) || p.mandante.toLowerCase().includes(q);
      const passTipo = tipo === "todos" || p.tipo === tipo;
      const passEstado =
        estado === "todos" ||
        (estado === "activas" ? p.activa : !p.activa);
      return passSearch && passTipo && passEstado;
    });
  }, [initialPlantillas, search, tipo, estado]);

  const tipos = Array.from(new Set(initialPlantillas.map((p) => p.tipo))).sort();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "todos") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`/dicaprev/acreditaciones/plantillas?${params.toString()}`);
  }

  function handleToggle(id: string, activa: boolean) {
    startTransition(async () => {
      await activarDesactivarPlantillaAcreditacion(id, !activa);
      router.refresh();
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      await duplicarPlantillaAcreditacion(id);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-6">
      <div className="mx-auto max-w-[1300px] space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Plantillas de acreditación</h1>
          <p className="mt-1 text-sm text-slate-500">Catálogo operativo por mandante con filtros y control de vigencia.</p>
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              defaultValue={search}
              onChange={(e) => updateParam("q", e.target.value)}
              placeholder="Buscar plantilla o mandante"
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
            />
          </label>
          <select defaultValue={tipo} onChange={(e) => updateParam("tipo", e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
            <option value="todos">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select defaultValue={estado} onChange={(e) => updateParam("estado", e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
            <option value="todos">Activas e inactivas</option>
            <option value="activas">Solo activas</option>
            <option value="inactivas">Solo inactivas</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No hay plantillas para los filtros aplicados.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Layers className="h-4 w-4 text-slate-500" />
                      {p.nombre}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{p.mandante} · v{p.version}</p>
                    <p className="mt-2 text-sm text-slate-600">{p.descripcion || "Sin descripción"}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {p.requisitosCount} requisitos · Categorías: {p.categorias.join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium ${p.activa ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {p.activa ? "Activa" : "Inactiva"}
                    </span>
                    <button
                      disabled={pending}
                      onClick={() => handleDuplicate(p.id)}
                      className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Duplicar
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => handleToggle(p.id, p.activa)}
                      className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {p.activa ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
