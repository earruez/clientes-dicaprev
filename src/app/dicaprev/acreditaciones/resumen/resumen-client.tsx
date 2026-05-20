"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Layers, Plus, Search } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  estado: string;
  mandanteId: string;
  mandante: string;
  proyecto: string;
  responsableId: string | null;
  responsable: string;
  trabajadores: number;
  vehiculos: number;
  faltantes: number;
  vencidos: number;
  progreso: number;
  urgencia: "alta" | "media" | "baja";
  motivo: string;
  fechaVencimiento: string | null;
  updatedAt: string;
};

type Kpis = {
  totalActivas: number;
  enPreparacion: number;
  listasParaEnviar: number;
  observadasRechazadas: number;
  vencenEstaSemana: number;
  promedioAvance: number;
};

const ESTADO_LABEL: Record<string, string> = {
  en_preparacion: "En preparación",
  listo_para_enviar: "Lista para enviar",
  enviado: "Enviado",
  observada: "Observada",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  cerrada: "Cerrada",
  vencido: "Vencido",
};

export default function ResumenAcreditacionesClient({
  kpis,
  rows,
  colaPrioritaria,
  mandantes,
  responsables,
}: {
  kpis: Kpis;
  rows: Row[];
  colaPrioritaria: Row[];
  mandantes: Array<{ id: string; nombre: string }>;
  responsables: Array<{ id: string; nombre: string }>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [mandante, setMandante] = useState<string>("todos");
  const [responsable, setResponsable] = useState<string>("todos");
  const [urgencia, setUrgencia] = useState<string>("todos");
  const [soloObservaciones, setSoloObservaciones] = useState(false);
  const [soloVencimientos, setSoloVencimientos] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const passSearch =
        !q ||
        row.mandante.toLowerCase().includes(q) ||
        row.proyecto.toLowerCase().includes(q) ||
        row.responsable.toLowerCase().includes(q);
      const passEstado = estado === "todos" || row.estado === estado;
      const passMandante = mandante === "todos" || row.mandanteId === mandante;
      const passResponsable =
        responsable === "todos" ||
        (responsable === "sin_asignar" ? !row.responsableId : row.responsableId === responsable);
      const passUrgencia = urgencia === "todos" || row.urgencia === urgencia;
      const passObs = !soloObservaciones || row.estado === "observada" || row.estado === "rechazado";
      const passVenc = !soloVencimientos || row.vencidos > 0 || row.estado === "vencido";
      return passSearch && passEstado && passMandante && passResponsable && passUrgencia && passObs && passVenc;
    });
  }, [rows, search, estado, mandante, responsable, urgencia, soloObservaciones, soloVencimientos]);

  return (
    <div className="min-h-screen bg-slate-50/60 p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Acreditaciones</h1>
              <p className="mt-1 text-sm text-slate-500">
                Gestión de expedientes por mandante, trabajadores, vehículos y requisitos documentales.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/dicaprev/acreditaciones/plantillas")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Layers className="h-4 w-4" />
                Plantillas
              </button>
              <button
                onClick={() => router.push("/dicaprev/acreditaciones/solicitudes")}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Nueva acreditación
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Kpi label="Total activas" value={kpis.totalActivas} />
          <Kpi label="En preparación" value={kpis.enPreparacion} />
          <Kpi label="Listas para enviar" value={kpis.listasParaEnviar} />
          <Kpi label="Observadas / rechazadas" value={kpis.observadasRechazadas} />
          <Kpi label="Vencen esta semana" value={kpis.vencenEstaSemana} />
          <Kpi label="Promedio avance" value={`${kpis.promedioAvance}%`} />
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="mb-3 text-sm font-semibold text-amber-900">Cola prioritaria</p>
          {colaPrioritaria.length === 0 ? (
            <p className="text-sm text-amber-700">No hay acreditaciones urgentes.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              {colaPrioritaria.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/dicaprev/acreditaciones/${item.id}`)}
                  className="rounded-xl border border-amber-200 bg-white p-3 text-left hover:border-amber-300"
                >
                  <p className="truncate text-xs font-semibold text-slate-900">{item.mandante}</p>
                  <p className="truncate text-xs text-slate-500">{item.proyecto}</p>
                  <p className="mt-2 text-xs text-amber-700">{item.motivo}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                    <AlertTriangle className="h-3 w-3" />
                    {ESTADO_LABEL[item.estado]}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
            <label className="relative md:col-span-2 xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mandante, proyecto o responsable"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm"
              />
            </label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
              <option value="todos">Estado</option>
              {Object.entries(ESTADO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select value={mandante} onChange={(e) => setMandante(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
              <option value="todos">Mandante</option>
              {mandantes.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
              <option value="todos">Responsable</option>
              <option value="sin_asignar">Sin asignar</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
            <select value={urgencia} onChange={(e) => setUrgencia(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
              <option value="todos">Urgencia</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
              <input type="checkbox" checked={soloObservaciones} onChange={(e) => setSoloObservaciones(e.target.checked)} />
              Solo observaciones
            </label>
            <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
              <input type="checkbox" checked={soloVencimientos} onChange={(e) => setSoloVencimientos(e.target.checked)} />
              Solo vencimientos
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500">No hay acreditaciones todavía.</p>
              <button
                onClick={() => router.push("/dicaprev/acreditaciones/solicitudes")}
                className="mt-3 inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white"
              >
                Crear primera acreditación
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500">No hay resultados para los filtros aplicados.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setEstado("todos");
                  setMandante("todos");
                  setResponsable("todos");
                  setUrgencia("todos");
                  setSoloObservaciones(false);
                  setSoloVencimientos(false);
                }}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mandante / Proyecto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Avance documental</th>
                    <th className="px-4 py-3">Trabajadores</th>
                    <th className="px-4 py-3">Vehículos</th>
                    <th className="px-4 py-3">Faltantes</th>
                    <th className="px-4 py-3">Vencimientos</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3">Última actualización</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/dicaprev/acreditaciones/${row.id}`)}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.mandante}</p>
                        <p className="text-xs text-slate-500">{row.proyecto}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ESTADO_LABEL[row.estado]}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-700">{row.progreso}%</p>
                        <Progress value={row.progreso} className="mt-1 h-1.5 w-32" />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.trabajadores}</td>
                      <td className="px-4 py-3 text-slate-700">{row.vehiculos}</td>
                      <td className="px-4 py-3 text-slate-700">{row.faltantes}</td>
                      <td className={cn("px-4 py-3", row.vencidos > 0 ? "font-semibold text-rose-600" : "text-slate-700")}>{row.vencidos}</td>
                      <td className="px-4 py-3 text-slate-700">{row.responsable}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(row.updatedAt).toLocaleDateString("es-CL")}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                          Ver
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
