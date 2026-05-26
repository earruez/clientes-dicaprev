"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  activarDesactivarPlantillaAcreditacion,
  actualizarPlantillaAcreditacion,
  crearPlantillaAcreditacion,
  duplicarPlantillaAcreditacion,
} from "@/actions/acreditaciones";
import { Layers, Plus, Search, X } from "lucide-react";

type PlantillaItem = {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  activa: boolean;
  version: number;
  mandanteId: string | null;
  mandante: string;
  requisitosCount: number;
  categorias: string[];
  requisitos: Array<{
    id: string;
    nombreDocumento: string;
    codigoDocumento: string | null;
    categoria: string;
    aplicaA: string;
    obligatorio: boolean;
    documentoRequeridoEmpresaId: string | null;
    documentoTipoTrabajadorId: string | null;
  }>;
};

type FormRequisito = {
  id?: string;
  nombreDocumento: string;
  categoria: string;
  aplicaA: string;
  obligatorio: boolean;
};

const CATEGORIAS = ["empresa", "sst", "trabajador", "vehiculo", "anexo"];
const APLICA_A = ["empresa", "trabajador", "vehiculo"];

export default function PlantillasClient({
  initialPlantillas,
  mandantes,
}: {
  initialPlantillas: PlantillaItem[];
  mandantes: Array<{ id: string; nombre: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PlantillaItem | null>(null);

  const [createForm, setCreateForm] = useState({
    nombre: "",
    tipo: "mandante_general",
    descripcion: "",
    mandanteId: "",
    requisitos: [{ nombreDocumento: "", categoria: "empresa", aplicaA: "empresa", obligatorio: true }] as FormRequisito[],
  });

  const [editForm, setEditForm] = useState({
    nombre: "",
    tipo: "mandante_general",
    descripcion: "",
    mandanteId: "",
    requisitos: [] as FormRequisito[],
  });

  const search = searchParams.get("q") ?? "";
  const tipo = searchParams.get("tipo") ?? "todos";
  const estado = searchParams.get("estado") ?? "todos";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialPlantillas.filter((p) => {
      const requisitosTexto = p.requisitos
        .map((r) => `${r.nombreDocumento} ${r.codigoDocumento ?? ""}`)
        .join(" ")
        .toLowerCase();
      const passSearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.mandante.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        requisitosTexto.includes(q);
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

  function addReq(target: "create" | "edit") {
    const next = { nombreDocumento: "", categoria: "empresa", aplicaA: "empresa", obligatorio: true };
    if (target === "create") {
      setCreateForm((s) => ({ ...s, requisitos: [...s.requisitos, next] }));
      return;
    }
    setEditForm((s) => ({ ...s, requisitos: [...s.requisitos, next] }));
  }

  function removeReq(target: "create" | "edit", index: number) {
    if (target === "create") {
      setCreateForm((s) => ({ ...s, requisitos: s.requisitos.filter((_, i) => i !== index) }));
      return;
    }
    setEditForm((s) => ({ ...s, requisitos: s.requisitos.filter((_, i) => i !== index) }));
  }

  function updateReq(target: "create" | "edit", index: number, patch: Partial<FormRequisito>) {
    if (target === "create") {
      setCreateForm((s) => ({
        ...s,
        requisitos: s.requisitos.map((r, i) => (i === index ? { ...r, ...patch } : r)),
      }));
      return;
    }
    setEditForm((s) => ({
      ...s,
      requisitos: s.requisitos.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }

  function openEdit(plantilla: PlantillaItem) {
    setEditing(plantilla);
    setEditForm({
      nombre: plantilla.nombre,
      tipo: plantilla.tipo,
      descripcion: plantilla.descripcion,
      mandanteId: plantilla.mandanteId ?? "",
      requisitos: plantilla.requisitos.map((r) => ({
        id: r.id,
        nombreDocumento: r.nombreDocumento,
        categoria: r.categoria,
        aplicaA: r.aplicaA,
        obligatorio: r.obligatorio,
      })),
    });
  }

  function handleCreate() {
    startTransition(async () => {
      await crearPlantillaAcreditacion({
        nombre: createForm.nombre,
        tipo: createForm.tipo,
        descripcion: createForm.descripcion,
        mandanteId: createForm.mandanteId || undefined,
        requisitos: createForm.requisitos
          .map((r) => ({ ...r, nombreDocumento: r.nombreDocumento.trim() }))
          .filter((r) => r.nombreDocumento.length > 0),
      });
      setShowCreate(false);
      setCreateForm({
        nombre: "",
        tipo: "mandante_general",
        descripcion: "",
        mandanteId: "",
        requisitos: [{ nombreDocumento: "", categoria: "empresa", aplicaA: "empresa", obligatorio: true }],
      });
      router.refresh();
    });
  }

  function handleSaveEdit() {
    if (!editing) return;
    startTransition(async () => {
      await actualizarPlantillaAcreditacion({
        id: editing.id,
        nombre: editForm.nombre,
        tipo: editForm.tipo,
        descripcion: editForm.descripcion,
        mandanteId: editForm.mandanteId || undefined,
        requisitos: editForm.requisitos
          .map((r) => ({ ...r, nombreDocumento: r.nombreDocumento.trim() }))
          .filter((r) => r.nombreDocumento.length > 0),
      });
      setEditing(null);
      router.refresh();
    });
  }

  function getVinculoRequisito(req: PlantillaItem["requisitos"][number]) {
    if (req.documentoRequeridoEmpresaId) {
      return {
        label: "Catálogo empresa",
        cls: "border-sky-200 bg-sky-50 text-sky-700",
        key: "empresa" as const,
      };
    }
    if (req.documentoTipoTrabajadorId) {
      return {
        label: "Catálogo trabajador",
        cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
        key: "trabajador" as const,
      };
    }
    return {
      label: "Requisito libre",
      cls: "border-slate-200 bg-slate-100 text-slate-600",
      key: "libre" as const,
    };
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-6">
      <div className="mx-auto max-w-[1300px] space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Plantillas de acreditación</h1>
              <p className="mt-1 text-sm text-slate-500">Catálogo operativo por mandante con filtros y control de vigencia.</p>
            </div>
            <button
              disabled={pending}
              onClick={() => setShowCreate(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Nueva plantilla personalizada
            </button>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              defaultValue={search}
              onChange={(e) => updateParam("q", e.target.value)}
              placeholder="Buscar plantilla, mandante, tipo, descripcion o requisito"
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
                    {(() => {
                      const counts = p.requisitos.reduce(
                        (acc, req) => {
                          const k = getVinculoRequisito(req).key;
                          acc[k] += 1;
                          return acc;
                        },
                        { empresa: 0, trabajador: 0, libre: 0 }
                      );

                      return (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                            Empresa: {counts.empresa}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                            Trabajador: {counts.trabajador}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                            Libres: {counts.libre}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="mt-3 grid gap-1.5">
                      {p.requisitos.map((req) => {
                        const vinculo = getVinculoRequisito(req);
                        return (
                          <div key={req.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-medium text-slate-700">{req.nombreDocumento}</span>
                            {req.codigoDocumento && <span className="text-slate-400">({req.codigoDocumento})</span>}
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${vinculo.cls}`}>
                              {vinculo.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
                      onClick={() => openEdit(p)}
                      className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Editar requisitos
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

      {showCreate && (
        <PlantillaModal
          title="Nueva plantilla personalizada"
          pending={pending}
          mandantes={mandantes}
          form={createForm}
          setForm={setCreateForm}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          onAddReq={() => addReq("create")}
          onRemoveReq={(index) => removeReq("create", index)}
          onUpdateReq={(index, patch) => updateReq("create", index, patch)}
        />
      )}

      {editing && (
        <PlantillaModal
          title={`Editar plantilla: ${editing.nombre}`}
          pending={pending}
          mandantes={mandantes}
          form={editForm}
          setForm={setEditForm}
          onClose={() => setEditing(null)}
          onSubmit={handleSaveEdit}
          onAddReq={() => addReq("edit")}
          onRemoveReq={(index) => removeReq("edit", index)}
          onUpdateReq={(index, patch) => updateReq("edit", index, patch)}
        />
      )}
    </div>
  );
}

function PlantillaModal({
  title,
  pending,
  mandantes,
  form,
  setForm,
  onClose,
  onSubmit,
  onAddReq,
  onRemoveReq,
  onUpdateReq,
}: {
  title: string;
  pending: boolean;
  mandantes: Array<{ id: string; nombre: string }>;
  form: {
    nombre: string;
    tipo: string;
    descripcion: string;
    mandanteId: string;
    requisitos: FormRequisito[];
  };
  setForm: React.Dispatch<React.SetStateAction<{
    nombre: string;
    tipo: string;
    descripcion: string;
    mandanteId: string;
    requisitos: FormRequisito[];
  }>>;
  onClose: () => void;
  onSubmit: () => void;
  onAddReq: () => void;
  onRemoveReq: (index: number) => void;
  onUpdateReq: (index: number, patch: Partial<FormRequisito>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              placeholder="Nombre de plantilla"
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
            <select
              value={form.tipo}
              onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="mandante_general">mandante_general</option>
              <option value="contrato_obra">contrato_obra</option>
              <option value="contrato_servicio">contrato_servicio</option>
              <option value="ingreso_faena">ingreso_faena</option>
              <option value="municipal">municipal</option>
              <option value="enel">enel</option>
              <option value="cge">cge</option>
              <option value="mineria">mineria</option>
              <option value="sanitaria">sanitaria</option>
              <option value="contratista">contratista</option>
            </select>
            <select
              value={form.mandanteId}
              onChange={(e) => setForm((s) => ({ ...s, mandanteId: e.target.value }))}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Plantilla transversal (sin mandante)</option>
              {mandantes.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <input
              value={form.descripcion}
              onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
              placeholder="Descripción"
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800">Requisitos</h3>
              <button
                onClick={onAddReq}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar requisito
              </button>
            </div>
            <div className="space-y-2">
              {form.requisitos.map((r, index) => (
                <div key={r.id ?? `new-${index}`} className="grid gap-2 rounded-lg border border-slate-100 p-2 md:grid-cols-12">
                  <input
                    value={r.nombreDocumento}
                    onChange={(e) => onUpdateReq(index, { nombreDocumento: e.target.value })}
                    placeholder="Nombre del requisito"
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs md:col-span-5"
                  />
                  <select
                    value={r.categoria}
                    onChange={(e) => onUpdateReq(index, { categoria: e.target.value })}
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs md:col-span-2"
                  >
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={r.aplicaA}
                    onChange={(e) => onUpdateReq(index, { aplicaA: e.target.value })}
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs md:col-span-2"
                  >
                    {APLICA_A.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <label className="flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 px-2 text-xs md:col-span-2">
                    <input
                      type="checkbox"
                      checked={r.obligatorio}
                      onChange={(e) => onUpdateReq(index, { obligatorio: e.target.checked })}
                    />
                    Obligatorio
                  </label>
                  <button
                    onClick={() => onRemoveReq(index)}
                    className="h-8 rounded-md border border-rose-200 px-2 text-xs text-rose-700 hover:bg-rose-50 md:col-span-1"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-4 text-sm text-slate-700">Cancelar</button>
          <button
            disabled={pending || !form.nombre.trim()}
            onClick={onSubmit}
            className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Guardar plantilla
          </button>
        </div>
      </div>
    </div>
  );
}
