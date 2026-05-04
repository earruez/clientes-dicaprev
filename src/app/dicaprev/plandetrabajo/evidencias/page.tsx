"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  canUploadPlanEvidence,
  getPlanSnapshot,
  hydratePlanStore,
  subscribePlan,
  uploadEvidencia,
} from "../store";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

export default function EvidenciasPlanPage() {
  const [snapshot, setSnapshot] = useState(getPlanSnapshot());
  const [selectedActividad, setSelectedActividad] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hydratePlanStore();
    setSnapshot(getPlanSnapshot());
    return subscribePlan(() => setSnapshot(getPlanSnapshot()));
  }, []);

  const actividades = snapshot.actividades;
  const evidencias = snapshot.evidencias;
  const historial = snapshot.historial;
  const canUploadEvidence = canUploadPlanEvidence();

  const stats = useMemo(() => {
    const cargadas = evidencias.filter((e) => e.estado === "cargada").length;
    const rechazadas = evidencias.filter((e) => e.estado === "rechazada").length;
    const pendientes = actividades.filter((a) => a.requiereEvidencia && a.evidencia === "pendiente").length;
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

    const ok = uploadEvidencia(Number(selectedActividad), selectedFileName);
    setInfoMessage(ok ? "Evidencia cargada correctamente." : "No se pudo cargar evidencia en el estado actual del plan.");
    setSelectedFileName("");
    if (uploadRef.current) uploadRef.current.value = "";
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
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.actividad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input ref={uploadRef} type="file" className="hidden" onChange={onFileSelected} />

          <Button variant="outline" onClick={onPickFile} disabled={!canUploadEvidence}>Seleccionar archivo</Button>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {selectedFileName || "Sin archivo"}
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onUpload} disabled={!canUploadEvidence}>Subir evidencia</Button>
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
                  <td className="px-4 py-3 text-slate-600">{e.observacion}</td>
                </tr>
              );
            })}

            {actividades.filter((a) => a.requiereEvidencia && a.evidencia === "pendiente").map((a) => (
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
                <td className="px-4 py-3 text-slate-600">{h.fecha}</td>
                <td className="px-4 py-3 text-slate-600">{h.usuario}</td>
                <td className="px-4 py-3 text-slate-800">{h.accion}</td>
                <td className="px-4 py-3 text-slate-600">{h.archivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
