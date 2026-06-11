"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanNav } from "../components/plan-nav";
import {
  getPlanTrabajo,
  getActividadesPlan,
  getEvidencias,
  getHistorialPlan,
  uploadEvidencia,
  type ActividadPlanRow,
  type EvidenciaRow,
  type HistorialRow,
  type PlanTrabajoRow,
} from "@/actions/plandetrabajo";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

export default function EvidenciasPlanPage() {
  const [plan, setPlan] = useState<PlanTrabajoRow | null>(null);
  const [actividades, setActividades] = useState<ActividadPlanRow[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaRow[]>([]);
  const [historial, setHistorial] = useState<HistorialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [selectedActividad, setSelectedActividad] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const p = await getPlanTrabajo();
      const acts = await getActividadesPlan(p.id);
      const hist = await getHistorialPlan(p.id);
      const allEvidencias: EvidenciaRow[] = [];
      for (const act of acts) {
        const evs = await getEvidencias(act.id);
        allEvidencias.push(...evs);
      }
      setPlan(p);
      setActividades(acts);
      setHistorial(hist);
      setEvidencias(allEvidencias);
    } catch (err) {
      setInfoMessage(err instanceof Error ? err.message : "Error al cargar el plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canUploadEvidence = plan?.estadoPlan !== "aprobado";

  const stats = useMemo(() => {
    const cargadas = evidencias.filter((e) => e.estado === "cargada").length;
    const rechazadas = evidencias.filter((e) => e.estado === "rechazada").length;
    const pendientes = actividades.filter((a) => a.requiereEvidencia && !evidencias.some((e) => e.actividadId === a.id && e.estado === "cargada")).length;
    return { cargadas, rechazadas, pendientes };
  }, [actividades, evidencias]);

  function onPickFile() {
    if (!canUploadEvidence) {
      setInfoMessage("El plan está aprobado y no admite nuevas cargas de evidencia.");
      return;
    }
    uploadRef.current?.click();
  }

  function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
  }

  function onUpload() {
    if (!canUploadEvidence) {
      setInfoMessage("El plan está aprobado y no admite nuevas cargas de evidencia.");
      return;
    }

    if (!selectedActividad || !selectedFileName) {
      setInfoMessage("Selecciona una actividad y un archivo para cargar la evidencia.");
      return;
    }

    startTransition(async () => {
      try {
        await uploadEvidencia(selectedActividad, selectedFileName);
        // Refresh evidencias
        const acts = await getActividadesPlan(plan!.id);
        const hist = await getHistorialPlan(plan!.id);
        const allEvidencias: EvidenciaRow[] = [];
        for (const act of acts) {
          const evs = await getEvidencias(act.id);
          allEvidencias.push(...evs);
        }
        setActividades(acts);
        setHistorial(hist);
        setEvidencias(allEvidencias);
        setInfoMessage("Evidencia cargada correctamente.");
        setSelectedFileName("");
        if (uploadRef.current) uploadRef.current.value = "";
      } catch (err) {
        setInfoMessage(err instanceof Error ? err.message : "No se pudo cargar evidencia en el estado actual del plan.");
      }
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-slate-500">Cargando evidencias...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Evidencias"
        description="Gestión documental del plan anual, con historial por actividad."
        icon={FolderOpen}
      />

      <PlanNav />

      {infoMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </div>
      ) : null}

      {!canUploadEvidence ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El plan está bloqueado porque se encuentra en revisión/aprobado.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select value={selectedActividad} onValueChange={setSelectedActividad}>
            <SelectTrigger>
              <SelectValue placeholder="Actividad" />
            </SelectTrigger>
            <SelectContent>
              {actividades.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.actividad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input ref={uploadRef} type="file" className="hidden" onChange={onFileSelected} />

          <Button variant="outline" onClick={onPickFile} disabled={!canUploadEvidence || isPending}>Seleccionar archivo</Button>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {selectedFileName || "Sin archivo"}
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onUpload} disabled={!canUploadEvidence || isPending}>Subir evidencia</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Cargadas</p>
          <p className="text-3xl font-semibold text-emerald-700">{stats.cargadas}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pendientes</p>
          <p className="text-3xl font-semibold text-amber-700">{stats.pendientes}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Rechazadas</p>
          <p className="text-3xl font-semibold text-rose-700">{stats.rechazadas}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Actividad</th>
              <th className="px-4 py-3 text-left">Archivo</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Observacion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {evidencias.map((e) => {
              const actividad = actividades.find((a) => a.id === e.actividadId);
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{actividad?.actividad ?? "Actividad"}</td>
                  <td className="px-4 py-3 text-slate-600">{e.archivo}</td>
                  <td className="px-4 py-3 text-slate-600">{e.fecha}</td>
                  <td className="px-4 py-3">
                    <Badge variant={e.estado === "cargada" ? "default" : "destructive"}>{e.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.observacion ?? "-"}</td>
                </tr>
              );
            })}

            {actividades.filter((a) => a.requiereEvidencia && !evidencias.some((e) => e.actividadId === a.id && e.estado === "cargada")).map((a) => (
              <tr key={`pend-${a.id}`} className="bg-amber-50/40">
                <td className="px-4 py-3 font-medium text-slate-800">{a.actividad}</td>
                <td className="px-4 py-3 text-slate-500">Sin archivo</td>
                <td className="px-4 py-3 text-slate-500">-</td>
                <td className="px-4 py-3"><Badge variant="secondary">pendiente</Badge></td>
                <td className="px-4 py-3 text-slate-500">Esperando carga inicial</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Accion</th>
              <th className="px-4 py-3 text-left">Archivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historial.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{h.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-3 text-slate-600">{h.usuario}</td>
                <td className="px-4 py-3 text-slate-800">{h.accion}</td>
                <td className="px-4 py-3 text-slate-600">{h.archivo ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
