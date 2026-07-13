"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  getCapacitaciones,
  createCapacitacion,
  updateCapacitacion,
  deleteCapacitacion,
} from "@/actions/capacitaciones";
import type { CapacitacionCatalogo } from "@/actions/capacitaciones/types";
import { registrarAccion } from "@/lib/auditoria/audit-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Pencil,
  BookOpen,
  Clock,
  Award,
  CalendarClock,
  ToggleLeft,
  ToggleRight,
  Link as LinkIcon,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIA_CFG: Record<string, { label: string; cls: string }> = {
  induccion:   { label: "Inducción", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  sst:         { label: "SST", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  normativa:   { label: "Normativa", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  evacuacion:  { label: "Evacuación", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  altura:      { label: "Altura", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  herramientas:{ label: "Herramientas", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  ergonomia:   { label: "Ergonomía", cls: "bg-teal-50 text-teal-700 border border-teal-200" },
  quimicos:    { label: "Químicos", cls: "bg-pink-50 text-pink-700 border border-pink-200" },
  otro:        { label: "Otro", cls: "bg-slate-50 text-slate-600 border border-slate-200" },
  emergencia:  { label: "Emergencia", cls: "bg-red-50 text-red-700 border border-red-200" },
  psicosocial: { label: "Psicosocial", cls: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200" },
  salud_ocupacional: { label: "Salud Ocupacional", cls: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
};

const MODALIDAD_CFG: Record<string, { label: string; cls: string }> = {
  presencial: { label: "Presencial", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  online:     { label: "Online", cls: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  mixta:      { label: "Mixta", cls: "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200" },
};

type FormCap = {
  nombre: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  modalidad: string;
  duracionHoras: string;
  vigenciaMeses: string;
  requiereEvaluacion: boolean;
  requiereFirma: boolean;
  generaCertificado: boolean;
  esObligatoria: boolean;
  materialUrl: string;
  videoUrl: string;
  documentoUrl: string;
};

const EMPTY_FORM: FormCap = {
  nombre: "",
  codigo: "",
  descripcion: "",
  categoria: "sst",
  modalidad: "presencial",
  duracionHoras: "8",
  vigenciaMeses: "12",
  requiereEvaluacion: true,
  requiereFirma: true,
  generaCertificado: true,
  esObligatoria: false,
  materialUrl: "",
  videoUrl: "",
  documentoUrl: "",
};

function capToForm(c: CapacitacionCatalogo): FormCap {
  return {
    nombre: c.nombre,
    codigo: c.codigo,
    descripcion: c.descripcion ?? "",
    categoria: c.categoria,
    modalidad: c.modalidad,
    duracionHoras: c.duracionHoras > 0 ? String(c.duracionHoras) : "",
    vigenciaMeses: c.vigenciaMeses > 0 ? String(c.vigenciaMeses) : "",
    requiereEvaluacion: c.requiereEvaluacion,
    requiereFirma: c.requiereFirma,
    generaCertificado: c.generaCertificado,
    esObligatoria: c.esObligatoria,
    materialUrl: c.materialUrl ?? "",
    videoUrl: c.videoUrl ?? "",
    documentoUrl: c.documentoUrl ?? "",
  };
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn("flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border transition-colors",
        value ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200")}
    >
      {value ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
      {value ? "Sí" : "No"}
    </button>
  );
}

export default function TabCatalogo() {
  const [catalogo, setCatalogo] = useState<CapacitacionCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | "todos">("todos");
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [editTarget, setEditTarget] = useState<CapacitacionCatalogo | null>(null);
  const [form, setForm] = useState<FormCap>(EMPTY_FORM);

  const reloadCatalogo = async () => {
    setLoading(true);
    try {
      setError(null);
      const rows = await getCapacitaciones();
      setCatalogo(rows);
    } catch {
      setCatalogo([]);
      setError("No se pudo cargar el catálogo de capacitaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadCatalogo();
  }, []);

  function field(key: keyof FormCap) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  const filtered = useMemo(() => {
    return catalogo.filter((c) => {
      if (filtroCategoria !== "todos" && c.categoria !== filtroCategoria) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.nombre.toLowerCase().includes(q) && !c.codigo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [catalogo, filtroCategoria, search]);

  function openCrear() {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setModal("crear");
  }

  function openEditar(c: CapacitacionCatalogo) {
    setEditTarget(c);
    setForm(capToForm(c));
    setModal("editar");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      activa: modal === "crear" ? true : (editTarget?.activa ?? true),
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim().toUpperCase(),
      descripcion: form.descripcion.trim() || "",
      categoria: form.categoria,
      modalidad: form.modalidad,
      duracionHoras: form.duracionHoras.trim() ? Number(form.duracionHoras) : null,
      vigenciaMeses: form.vigenciaMeses.trim() ? Number(form.vigenciaMeses) : null,
      requiereEvaluacion: form.requiereEvaluacion,
      requiereFirma: form.requiereFirma,
      generaCertificado: form.generaCertificado,
      esObligatoria: form.esObligatoria,
      // TODO(Fase 16.6): persistir recursos (material/video/documento) en modelo Prisma.
    };

    if (modal === "crear") {
      const nueva = await createCapacitacion(payload);
      registrarAccion({
        accion: "crear",
        modulo: "capacitacion",
        entidadTipo: "Capacitación",
        entidadId: nueva.id,
        descripcion: `Creó capacitación '${nueva.nombre}' (${nueva.codigo})`,
      });
    } else if (editTarget) {
      await updateCapacitacion(editTarget.id, payload);
      registrarAccion({
        accion: "editar",
        modulo: "capacitacion",
        entidadTipo: "Capacitación",
        entidadId: editTarget.id,
        descripcion: `Editó capacitación '${payload.nombre}'`,
      });
    }
    setModal(null);
    await reloadCatalogo();
  }

  async function handleToggleActiva(c: CapacitacionCatalogo) {
    if (c.activa) await deleteCapacitacion(c.id);
    else await updateCapacitacion(c.id, { activa: true });

    registrarAccion({
      accion: "cambiar_estado",
      modulo: "capacitacion",
      entidadTipo: "Capacitación",
      entidadId: c.id,
      descripcion: `${c.activa ? "Desactivó" : "Activó"} capacitación '${c.nombre}'`,
    });
    await reloadCatalogo();
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar capacitación o código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-slate-200 bg-slate-50 text-sm"
            />
          </div>
          <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(v as string | "todos")}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl border-slate-200 text-sm bg-white">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las categorías</SelectItem>
              {Object.entries(CATEGORIA_CFG).map(([k, cfg]) => (
                <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCrear} className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shrink-0" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva capacitación
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center shadow-sm">
          <BookOpen className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Cargando catálogo de capacitaciones…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center shadow-sm">
          <BookOpen className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {catalogo.length === 0
              ? "No se pudo inicializar el catálogo de capacitaciones. Reintenta o contacta soporte."
              : "No hay resultados para los filtros aplicados."}
          </p>
          {catalogo.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-400">Si el problema persiste, contacta soporte.</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Ajusta los filtros para ver otros resultados.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const catCfg = CATEGORIA_CFG[c.categoria] ?? CATEGORIA_CFG.otro;
            const modCfg = MODALIDAD_CFG[c.modalidad] ?? MODALIDAD_CFG.presencial;
            return (
              <div key={c.id} className={cn("bg-white border rounded-2xl shadow-sm flex flex-col overflow-hidden transition-all", c.activa ? "border-slate-200" : "border-slate-100 opacity-60")}>
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", catCfg.cls)}>
                        {catCfg.label}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border", modCfg.cls)}>
                        {modCfg.label}
                      </span>
                      {c.esObligatoria && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border bg-rose-50 text-rose-700 border-rose-200">
                          Obligatoria
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{c.nombre}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{c.codigo}</p>
                  </div>
                  <button
                    onClick={() => openEditar(c)}
                    className="flex-shrink-0 h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                {c.descripcion && (
                  <p className="px-4 text-xs text-slate-500 line-clamp-2 mb-3">{c.descripcion}</p>
                )}
                <div className="px-4 pb-3 flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.duracionHoras || 0}h</span>
                  <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Vigencia {c.vigenciaMeses || 0} meses</span>
                  {c.generaCertificado && <span className="flex items-center gap-1"><Award className="h-3 w-3 text-amber-500" /> Certificado</span>}
                  {c.requiereEvaluacion && <span className="flex items-center gap-1"><FileCheck2 className="h-3 w-3 text-blue-500" /> Evaluación</span>}
                </div>
                <div className="mt-auto border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActiva(c)}
                    className={cn("flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border transition-colors",
                      c.activa ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100")}
                  >
                    {c.activa ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {c.activa ? "Activa" : "Inactiva"}
                  </button>
                  {(c.materialUrl || c.videoUrl || c.documentoUrl) && (
                    <div className="flex items-center gap-1">
                      {c.materialUrl && <a href={c.materialUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-600"><LinkIcon className="h-3.5 w-3.5" /></a>}
                      {c.videoUrl && <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-600"><LinkIcon className="h-3.5 w-3.5" /></a>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal create/edit */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {modal === "crear" ? "Nueva capacitación" : "Editar capacitación"}
            </DialogTitle>
            <DialogDescription>
              Completa o actualiza la información base de la capacitación en el catálogo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600">Nombre</Label>
                <Input value={form.nombre} onChange={field("nombre")} placeholder="Ej: Manejo Manual de Cargas" className="rounded-xl border-slate-200 text-sm" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Código</Label>
                <Input value={form.codigo} onChange={field("codigo")} placeholder="CAP-001" className="rounded-xl border-slate-200 text-sm font-mono" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Categoría</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v as FormCap["categoria"] }))}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      {Object.entries(CATEGORIA_CFG).map(([k, cfg]) => (
                        <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Modalidad</Label>
                <Select value={form.modalidad} onValueChange={(v) => setForm((p) => ({ ...p, modalidad: v }))}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="mixta">Mixta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Duración (horas)</Label>
                <Input type="number" min={1} value={form.duracionHoras} onChange={field("duracionHoras")} className="rounded-xl border-slate-200 text-sm" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600">Vigencia (meses)</Label>
                <Input type="number" min={1} value={form.vigenciaMeses} onChange={field("vigenciaMeses")} className="rounded-xl border-slate-200 text-sm" required />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-600">Descripción (opcional)</Label>
                <Textarea value={form.descripcion} onChange={field("descripcion")} placeholder="Descripción breve de la capacitación…" className="rounded-xl border-slate-200 text-sm resize-none h-16" />
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-2 gap-2">
              {([
                ["requiereEvaluacion", "Requiere evaluación"],
                ["requiereFirma", "Requiere firma"],
                ["generaCertificado", "Genera certificado"],
                ["esObligatoria", "Es obligatoria"],
              ] as [keyof FormCap, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                  <span className="text-xs text-slate-600">{label}</span>
                  <Toggle value={form[key] as boolean} onChange={(v) => setForm((p) => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>

            {/* URLs */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Recursos (URLs opcionales)</Label>
              <Input value={form.materialUrl} onChange={field("materialUrl")} placeholder="URL material de estudio…" className="rounded-xl border-slate-200 text-sm" />
              <Input value={form.videoUrl} onChange={field("videoUrl")} placeholder="URL video capacitación…" className="rounded-xl border-slate-200 text-sm" />
              <Input value={form.documentoUrl} onChange={field("documentoUrl")} placeholder="URL documento/manual…" className="rounded-xl border-slate-200 text-sm" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white">
                {modal === "crear" ? "Crear capacitación" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
