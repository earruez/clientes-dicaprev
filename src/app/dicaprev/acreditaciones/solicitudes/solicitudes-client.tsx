"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { asignarAcreditacionAContratista } from "@/actions/contratistas";
import NuevaAcreditacionWizard from "../components/NuevaAcreditacionWizard";

type AcreditacionItem = {
  id: string;
  mandante: string;
  proyecto: string;
  estado: string;
  contratistaId: string | null;
  trabajadores: number;
  vehiculos: number;
  updatedAt: string;
};

type CrearAcreditacionResult =
  | { ok: true; acreditacion: { id: string } }
  | { id: string };

const ESTADO_LABEL: Record<string, string> = {
  en_preparacion: "En preparación",
  listo_para_enviar: "Listo para enviar",
  enviado: "Enviado",
  observada: "Observada",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  cerrada: "Cerrada",
  vencido: "Vencido",
};

function formatEstado(estado: string) {
  return ESTADO_LABEL[estado] ?? estado;
}

export default function SolicitudesClient({
  initialAcreditaciones,
  mandantes,
  contratistas,
  plantillas,
  trabajadores,
  vehiculos,
  onCrearAction,
}: {
  initialAcreditaciones: AcreditacionItem[];
  mandantes: Array<{ id: string; nombre: string; rut: string; tipo: string }>;
  contratistas: Array<{ id: string; nombre: string; rut: string }>;
  plantillas: Array<{ id: string; nombre: string; descripcion: string; mandanteId: string | null; requisitosCount: number }>;
  trabajadores: Array<{ id: string; nombre: string; rut: string; cargo: string }>;
  vehiculos: Array<{ id: string; etiqueta: string; patente: string }>;
  onCrearAction: (data: {
    mandanteId: string;
    plantillaId: string;
    nombreProyecto?: string;
    obraFaena?: string;
    trabajadorIds?: string[];
    vehiculoIds?: string[];
  }) => Promise<CrearAcreditacionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openWizard, setOpenWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [crearError, setCrearError] = useState<string | null>(null);
  const [relaciones, setRelaciones] = useState<Record<string, string>>({});
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [relacionActual, setRelacionActual] = useState<Record<string, string>>({});
  const [vinculoAviso, setVinculoAviso] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialAcreditaciones;
    return initialAcreditaciones.filter((a) => a.mandante.toLowerCase().includes(q) || a.proyecto.toLowerCase().includes(q));
  }, [initialAcreditaciones, search]);

  async function vincular(item: AcreditacionItem) {
    const seleccionado = relaciones[item.id] ?? (relacionActual[item.id] || item.contratistaId || "");
    if (!seleccionado) return setCrearError("Selecciona una empresa contratista");
    if (vinculando) return;
    setVinculando(item.id);
    setCrearError(null); setVinculoAviso("");
    try {
      await asignarAcreditacionAContratista(seleccionado, item.id);
      setRelacionActual((old) => ({ ...old, [item.id]: seleccionado }));
      setVinculoAviso("Contratista asociado a la acreditación. No se modificaron sus documentos.");
      router.refresh();
    } catch (err) {
      setCrearError(err instanceof Error ? err.message : "No se pudo asociar el contratista");
    } finally {
      setVinculando(null);
    }
  }

  function handleCrear(data: {
    mandanteId: string;
    plantillaId: string;
    nombreProyecto?: string;
    obraFaena?: string;
    trabajadorIds: string[];
    vehiculoIds: string[];
  }) {
    startTransition(async () => {
      try {
        setCrearError(null);
        const created = await onCrearAction(data);
        const createdId = ("acreditacion" in created ? created.acreditacion?.id : created.id) ?? null;

        if (!createdId) {
          throw new Error("La acción de creación no devolvió el id de la acreditación.");
        }

        setOpenWizard(false);
        router.push(`/dicaprev/acreditaciones/${createdId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear la acreditación";
        setCrearError(message);
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-6">
      <div className="mx-auto max-w-[1300px] space-y-5">
        <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Solicitudes de acreditación</h1>
            <p className="mt-1 text-sm text-slate-500">Acreditaciones por mandante y proyecto. Vincula el contratista aquí, no en su ficha permanente.</p>
          </div>
          <button
            onClick={() => setOpenWizard(true)}
            className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva acreditación
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por mandante o proyecto"
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
            />
          </label>
        </div>

        {vinculoAviso && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{vinculoAviso}</p>}
        <div className="grid gap-3 md:hidden">
          {filtered.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-sm font-bold text-slate-900">{item.proyecto}</h2><p className="mt-1 text-xs text-slate-500">{item.mandante}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{formatEstado(item.estado)}</span></div>
            <p className="mt-3 text-xs text-slate-500">{item.trabajadores} trabajadores · {item.vehiculos} vehículos · {new Date(item.updatedAt).toLocaleDateString("es-CL")}</p>
            <label className="mt-4 block space-y-1"><span className="text-xs font-semibold text-slate-600">Empresa contratista asociada (opcional)</span>
              <select className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={relaciones[item.id] ?? relacionActual[item.id] ?? item.contratistaId ?? ""} onChange={(e) => setRelaciones((old) => ({ ...old, [item.id]: e.target.value }))}>
                <option value="">Sin contratista asociado</option>{contratistas.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.rut ? " · " + c.rut : ""}</option>)}
              </select>
            </label>
            <div className="mt-3 flex gap-2"><button disabled={!!vinculando || !(relaciones[item.id] ?? relacionActual[item.id] ?? item.contratistaId)} onClick={() => void vincular(item)} className="min-h-10 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{vinculando === item.id ? "Guardando…" : "Asociar contratista"}</button><button onClick={() => router.push("/dicaprev/acreditaciones/" + item.id)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700">Ver acreditación</button></div>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Mandante / Proyecto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Trabajadores</th>
                <th className="px-4 py-3">Vehículos</th>
                <th className="px-4 py-3">Actualizado</th>
                <th className="px-4 py-3">Contratista asociado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.mandante}</p>
                    <p className="text-xs text-slate-500">{item.proyecto}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatEstado(item.estado)}</td>
                  <td className="px-4 py-3 text-slate-700">{item.trabajadores}</td>
                  <td className="px-4 py-3 text-slate-700">{item.vehiculos}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(item.updatedAt).toLocaleDateString("es-CL")}</td>
                  <td className="min-w-[220px] px-4 py-3">
                    <div className="flex gap-2">
                      <select aria-label={"Contratista para " + item.proyecto} className="min-w-[145px] rounded-lg border border-slate-200 px-2 text-xs" value={relaciones[item.id] ?? relacionActual[item.id] ?? item.contratistaId ?? ""} onChange={(e) => setRelaciones((old) => ({ ...old, [item.id]: e.target.value }))}>
                        <option value="">Sin asociar</option>{contratistas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      <button type="button" disabled={!!vinculando || !(relaciones[item.id] ?? relacionActual[item.id] ?? item.contratistaId)} onClick={() => void vincular(item)} className="rounded-lg bg-emerald-700 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Asociar</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/dicaprev/acreditaciones/${item.id}`)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ver expediente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openWizard && (
        <NuevaAcreditacionWizard
          onClose={() => setOpenWizard(false)}
          onCrear={handleCrear}
          mandantes={mandantes}
          plantillas={plantillas}
          trabajadores={trabajadores}
          vehiculos={vehiculos}
        />
      )}

      {crearError && (
        <div className="fixed bottom-16 right-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-sm">
          {crearError}
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          Creando acreditación...
        </div>
      )}
    </div>
  );
}
