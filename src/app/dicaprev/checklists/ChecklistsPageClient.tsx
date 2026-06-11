"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  crearChecklistTemplate,
  ejecutarChecklist,
  getChecklistEjecuciones,
  getChecklistTemplates,
  getOpcionesChecklist,
  getTemplateParaEjecucion,
  type ChecklistEjecucionListItem,
  type ChecklistTemplateListItem,
} from "@/actions/checklists";

type PreguntaForm = {
  id?: string;
  texto: string;
  obligatorio: boolean;
  respuesta?: "cumple" | "no_cumple" | "no_aplica";
  comentario?: string;
};

type OpcionesChecklist = {
  centros: { id: string; nombre: string }[];
  trabajadores: { id: string; nombre: string; rut: string | null }[];
};

const ESTADO_EJECUCION: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  completada: {
    label: "Completada",
    color: "text-emerald-600",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  },
  borrador: {
    label: "Borrador",
    color: "text-slate-500",
    icon: <Clock className="h-3.5 w-3.5 text-slate-400" />,
  },
};

export default function ChecklistsPageClient() {
  const [templates, setTemplates] = useState<ChecklistTemplateListItem[]>([]);
  const [ejecuciones, setEjecuciones] = useState<ChecklistEjecucionListItem[]>([]);
  const [opciones, setOpciones] = useState<OpcionesChecklist>({ centros: [], trabajadores: [] });

  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateNombre, setTemplateNombre] = useState("");
  const [templateDescripcion, setTemplateDescripcion] = useState("");
  const [preguntasTemplate, setPreguntasTemplate] = useState<PreguntaForm[]>([
    { texto: "", obligatorio: true },
  ]);

  const [showEjecucionForm, setShowEjecucionForm] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [centroTrabajoId, setCentroTrabajoId] = useState("");
  const [trabajadorId, setTrabajadorId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [preguntasEjecucion, setPreguntasEjecucion] = useState<PreguntaForm[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function loadAll() {
    startTransition(async () => {
      try {
        const [t, e, o] = await Promise.all([
          getChecklistTemplates(),
          getChecklistEjecuciones(),
          getOpcionesChecklist(),
        ]);
        setTemplates(t);
        setEjecuciones(e);
        setOpciones(o);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Error al cargar checklists");
      }
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  const templateSeleccionado = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templates, templateId],
  );

  function addPreguntaTemplate() {
    setPreguntasTemplate((prev) => [...prev, { texto: "", obligatorio: true }]);
  }

  function removePreguntaTemplate(idx: number) {
    setPreguntasTemplate((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePreguntaTemplate(idx: number, field: keyof PreguntaForm, value: string | boolean) {
    setPreguntasTemplate((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  async function onSeleccionTemplateEjecucion(id: string) {
    setTemplateId(id);
    setPreguntasEjecucion([]);
    if (!id) return;

    startTransition(async () => {
      try {
        const tpl = await getTemplateParaEjecucion(id);
        setPreguntasEjecucion(
          tpl.preguntas.map((p) => ({
            id: p.id,
            texto: p.texto,
            obligatorio: p.obligatorio,
            respuesta: undefined,
            comentario: "",
          })),
        );
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Error al cargar plantilla");
      }
    });
  }

  function updatePreguntaEjecucion(
    idx: number,
    field: keyof PreguntaForm,
    value: string,
  ) {
    setPreguntasEjecucion((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function resetTemplateForm() {
    setTemplateNombre("");
    setTemplateDescripcion("");
    setPreguntasTemplate([{ texto: "", obligatorio: true }]);
    setFormError(null);
  }

  function resetEjecucionForm() {
    setTemplateId("");
    setCentroTrabajoId("");
    setTrabajadorId("");
    setObservaciones("");
    setPreguntasEjecucion([]);
    setFormError(null);
  }

  function submitTemplate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const preguntasValidas = preguntasTemplate
      .map((p) => ({ texto: p.texto.trim(), obligatorio: p.obligatorio }))
      .filter((p) => Boolean(p.texto));

    if (!templateNombre.trim()) {
      setFormError("Debe ingresar nombre de la plantilla");
      return;
    }

    if (!preguntasValidas.length) {
      setFormError("Debe ingresar al menos una pregunta");
      return;
    }

    startTransition(async () => {
      try {
        await crearChecklistTemplate({
          nombre: templateNombre.trim(),
          descripcion: templateDescripcion.trim() || undefined,
          preguntas: preguntasValidas,
        });

        setSuccessMsg("Plantilla creada correctamente");
        setShowTemplateForm(false);
        resetTemplateForm();
        loadAll();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Error al crear plantilla");
      }
    });
  }

  function submitEjecucion(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!templateId) {
      setFormError("Debe seleccionar una plantilla");
      return;
    }

    const respuestas = preguntasEjecucion.map((p) => ({
      preguntaId: p.id || "",
      respuesta: p.respuesta,
      comentario: p.comentario,
      obligatorio: p.obligatorio,
      texto: p.texto,
    }));

    for (const r of respuestas) {
      if (!r.preguntaId) {
        setFormError("Error interno: pregunta sin identificador");
        return;
      }
      if (r.obligatorio && !r.respuesta) {
        setFormError(`Falta respuesta para: ${r.texto}`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload = respuestas
          .filter((r) => Boolean(r.respuesta))
          .map((r) => ({
            preguntaId: r.preguntaId,
            respuesta: r.respuesta as "cumple" | "no_cumple" | "no_aplica",
            comentario: r.comentario?.trim() || undefined,
          }));

        const res = await ejecutarChecklist({
          templateId,
          centroTrabajoId: centroTrabajoId || undefined,
          trabajadorId: trabajadorId || undefined,
          observaciones: observaciones.trim() || undefined,
          respuestas: payload,
        });

        setSuccessMsg(
          res.hallazgosGenerados > 0
            ? `Checklist ejecutado. Se generaron ${res.hallazgosGenerados} hallazgos.`
            : "Checklist ejecutado correctamente.",
        );

        setShowEjecucionForm(false);
        resetEjecucionForm();
        loadAll();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Error al ejecutar checklist");
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <StandardPageHeader
          moduleLabel="Módulo Cumplimiento"
          title="Checklists e Inspecciones"
          description="Plantillas, ejecuciones y generación automática de hallazgos"
          icon={<ClipboardCheck className="h-6 w-6" />}
          iconWrapClassName="bg-sky-700"
          actions={
            <>
              <Button
                onClick={() => {
                  setShowTemplateForm((v) => !v);
                  setShowEjecucionForm(false);
                  setFormError(null);
                  setSuccessMsg(null);
                }}
                className="rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva plantilla
              </Button>
              <Button
                onClick={() => {
                  setShowEjecucionForm((v) => !v);
                  setShowTemplateForm(false);
                  setFormError(null);
                  setSuccessMsg(null);
                }}
                className="rounded-2xl bg-sky-700 text-white hover:bg-sky-800"
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Ejecutar checklist
              </Button>
            </>
          }
        />

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {successMsg}
          </div>
        )}

        {formError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {formError}
          </div>
        )}

        {showTemplateForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Crear plantilla de checklist</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitTemplate} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-nombre">Nombre *</Label>
                    <Input
                      id="tpl-nombre"
                      value={templateNombre}
                      onChange={(e) => setTemplateNombre(e.target.value)}
                      placeholder="Checklist de orden y seguridad"
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-desc">Descripción</Label>
                    <Input
                      id="tpl-desc"
                      value={templateDescripcion}
                      onChange={(e) => setTemplateDescripcion(e.target.value)}
                      placeholder="Opcional"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preguntas *</Label>
                  {preguntasTemplate.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={p.texto}
                        onChange={(e) => updatePreguntaTemplate(idx, "texto", e.target.value)}
                        placeholder={`Pregunta ${idx + 1}`}
                        disabled={isPending}
                      />
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={p.obligatorio}
                          onChange={(e) => updatePreguntaTemplate(idx, "obligatorio", e.target.checked)}
                          disabled={isPending}
                        />
                        Obligatoria
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removePreguntaTemplate(idx)}
                        disabled={isPending || preguntasTemplate.length === 1}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addPreguntaTemplate} disabled={isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar pregunta
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Guardar plantilla
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTemplateForm(false);
                      resetTemplateForm();
                    }}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {showEjecucionForm && (
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Ejecutar checklist</h2>
            </CardHeader>
            <CardContent className="px-6 py-5">
              <form onSubmit={submitEjecucion} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Plantilla *</Label>
                    <div className="relative">
                      <select
                        value={templateId}
                        onChange={(e) => {
                          void onSeleccionTemplateEjecucion(e.target.value);
                        }}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-900"
                        disabled={isPending}
                      >
                        <option value="">Seleccionar plantilla…</option>
                        {templates.filter((t) => t.activo).map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.nombre}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Centro de trabajo</Label>
                    <div className="relative">
                      <select
                        value={centroTrabajoId}
                        onChange={(e) => setCentroTrabajoId(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-900"
                        disabled={isPending}
                      >
                        <option value="">No asignar</option>
                        {opciones.centros.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Trabajador</Label>
                    <div className="relative">
                      <select
                        value={trabajadorId}
                        onChange={(e) => setTrabajadorId(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-900"
                        disabled={isPending}
                      >
                        <option value="">No asignar</option>
                        {opciones.trabajadores.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre}{t.rut ? ` — ${t.rut}` : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {templateSeleccionado && (
                  <p className="text-xs text-slate-500">Plantilla seleccionada: {templateSeleccionado.nombre}</p>
                )}

                {preguntasEjecucion.length > 0 && (
                  <div className="space-y-3">
                    {preguntasEjecucion.map((p, idx) => (
                      <div key={p.id || idx} className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm font-medium text-slate-800">
                          {idx + 1}. {p.texto}
                          {p.obligatorio && <span className="ml-1 text-red-500">*</span>}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {([
                            ["cumple", "Cumple"],
                            ["no_cumple", "No cumple"],
                            ["no_aplica", "No aplica"],
                          ] as const).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updatePreguntaEjecucion(idx, "respuesta", val)}
                              disabled={isPending}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                                p.respuesta === val
                                  ? "border-sky-400 bg-sky-50 text-sky-700"
                                  : "border-slate-200 bg-white text-slate-600"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <Input
                          className="mt-2"
                          placeholder="Comentario (opcional)"
                          value={p.comentario || ""}
                          onChange={(e) => updatePreguntaEjecucion(idx, "comentario", e.target.value)}
                          disabled={isPending}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Observaciones generales</Label>
                  <Input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    disabled={isPending}
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-800" disabled={isPending}>
                    Ejecutar checklist
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEjecucionForm(false);
                      resetEjecucionForm();
                    }}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Plantillas</h2>
            </CardHeader>
            <CardContent className="p-0">
              {templates.length === 0 ? (
                <p className="px-6 py-6 text-sm text-slate-500">No hay plantillas registradas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Preguntas</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-800">{t.nombre}</p>
                          {t.descripcion && <p className="text-xs text-slate-500">{t.descripcion}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{t.preguntasCount}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium ${t.activo ? "text-emerald-600" : "text-slate-500"}`}>
                            {t.activo ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-800">Ejecuciones</h2>
            </CardHeader>
            <CardContent className="p-0">
              {ejecuciones.length === 0 ? (
                <p className="px-6 py-6 text-sm text-slate-500">No hay ejecuciones registradas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ejecuciones.map((e) => {
                      const cfg = ESTADO_EJECUCION[e.estado] || ESTADO_EJECUCION.borrador;
                      return (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-800">{e.templateNombre}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(e.fechaEjecucion).toLocaleDateString("es-CL")} · {e.ejecutadoPor}
                            </p>
                            {(e.centroTrabajo || e.trabajador) && (
                              <p className="text-xs text-slate-400">
                                {[e.centroTrabajo, e.trabajador].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-xs text-slate-600">
                              Respuestas: {e.totalRespuestas}
                            </p>
                            <p className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              No cumple: {e.noCumpleCount}
                            </p>
                            <p className="inline-flex items-center gap-1 text-xs text-red-600">
                              <XCircle className="h-3 w-3" />
                              Hallazgos: {e.hallazgosGenerados}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
