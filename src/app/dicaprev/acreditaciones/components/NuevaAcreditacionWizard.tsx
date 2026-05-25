"use client";

import React, { useState } from "react";
import { Building2, Car, CheckCircle2, ChevronLeft, ChevronRight, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PASOS = ["Mandante", "Plantilla", "Trabajadores", "Vehículos", "Confirmación"];

interface Props {
  onClose: () => void;
  onCrear: (data: {
    mandanteId: string;
    plantillaId: string;
    nombreProyecto?: string;
    obraFaena?: string;
    trabajadorIds: string[];
    vehiculoIds: string[];
  }) => void;
  mandantes: Array<{ id: string; nombre: string; rut: string; tipo: string }>;
  plantillas: Array<{ id: string; nombre: string; descripcion: string; mandanteId: string | null; requisitosCount: number }>;
  trabajadores: Array<{ id: string; nombre: string; rut: string; cargo: string }>;
  vehiculos: Array<{ id: string; etiqueta: string; patente: string }>;
}

export default function NuevaAcreditacionWizard({ onClose, onCrear, mandantes, plantillas, trabajadores, vehiculos }: Props) {
  const [paso, setPaso] = useState(0);
  const [search, setSearch] = useState("");
  const [data, setData] = useState({
    mandanteId: "",
    plantillaId: "",
    nombreProyecto: "",
    obraFaena: "",
    trabajadorIds: [] as string[],
    vehiculoIds: [] as string[],
  });

  const plantillasFiltradas = plantillas.filter((p) => !data.mandanteId || p.mandanteId === data.mandanteId || p.mandanteId === null);
  const reqTotal = plantillas.find((p) => p.id === data.plantillaId)?.requisitosCount ?? 0;

  const canContinue =
    (paso === 0 && Boolean(data.mandanteId)) ||
    (paso === 1 && Boolean(data.plantillaId)) ||
    paso === 2 ||
    paso >= 3;
  const canCreate = Boolean(data.mandanteId && data.plantillaId);

  function toggleWorker(id: string) {
    setData((prev) => ({
      ...prev,
      trabajadorIds: prev.trabajadorIds.includes(id)
        ? prev.trabajadorIds.filter((x) => x !== id)
        : [...prev.trabajadorIds, id],
    }));
  }

  function toggleVehiculo(id: string) {
    setData((prev) => ({
      ...prev,
      vehiculoIds: prev.vehiculoIds.includes(id)
        ? prev.vehiculoIds.filter((x) => x !== id)
        : [...prev.vehiculoIds, id],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nueva acreditación</h2>
            <p className="text-xs text-slate-400">Paso {paso + 1} de {PASOS.length}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-7 pt-4">
          <div className="grid grid-cols-5 gap-2 text-[11px]">
            {PASOS.map((nombre, i) => (
              <div key={nombre} className={cn("rounded-full px-2 py-1 text-center", i === paso ? "bg-slate-900 text-white" : i < paso ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                {nombre}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[260px] flex-1 overflow-y-auto px-7 py-4">
          {paso === 0 && (
            <section>
              <p className="mb-3 text-sm font-semibold text-slate-700">Selecciona mandante</p>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar mandante" />
              <div className="mt-3 grid gap-2">
                {mandantes
                  .filter((m) => !search || m.nombre.toLowerCase().includes(search.toLowerCase()))
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setData((prev) => ({ ...prev, mandanteId: m.id, plantillaId: "" }))}
                      className={cn("rounded-xl border p-3 text-left", data.mandanteId === m.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:bg-slate-50")}
                    >
                      <p className="text-sm font-semibold">{m.nombre}</p>
                      <p className={cn("text-xs", data.mandanteId === m.id ? "text-white/70" : "text-slate-500")}>{m.rut} · {m.tipo}</p>
                    </button>
                  ))}
              </div>
            </section>
          )}

          {paso === 1 && (
            <section>
              <p className="mb-3 text-sm font-semibold text-slate-700">Selecciona plantilla</p>
              <div className="grid gap-2">
                {plantillasFiltradas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setData((prev) => ({ ...prev, plantillaId: p.id }))}
                    className={cn("rounded-xl border p-3 text-left", data.plantillaId === p.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:bg-slate-50")}
                  >
                    <p className="text-sm font-semibold">{p.nombre}</p>
                    <p className={cn("text-xs", data.plantillaId === p.id ? "text-white/70" : "text-slate-500")}>{p.descripcion || "Sin descripción"}</p>
                    <p className={cn("mt-1 text-[11px]", data.plantillaId === p.id ? "text-white/80" : "text-slate-500")}>{p.requisitosCount} requisitos</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {paso === 2 && (
            <section>
              <p className="mb-3 text-sm font-semibold text-slate-700">Selecciona trabajadores</p>
              <p className="mb-3 text-xs text-slate-500">Puedes crear la acreditación ahora y agregar trabajadores más adelante.</p>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar trabajador" />
              {trabajadores.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  No hay trabajadores cargados. Puedes continuar y agregarlos después.
                </div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {trabajadores
                    .filter((t) => !search || t.nombre.toLowerCase().includes(search.toLowerCase()))
                    .map((t) => {
                      const selected = data.trabajadorIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleWorker(t.id)}
                          className={cn("rounded-xl border p-3 text-left", selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:bg-slate-50")}
                        >
                          <p className="text-sm font-semibold text-slate-900">{t.nombre}</p>
                          <p className="text-xs text-slate-500">{t.rut} · {t.cargo}</p>
                        </button>
                      );
                    })}
                </div>
              )}
            </section>
          )}

          {paso === 3 && (
            <section>
              <p className="mb-3 text-sm font-semibold text-slate-700">Selecciona vehículos (opcional)</p>
              <p className="mb-3 text-xs text-slate-500">Puedes crear la acreditación ahora y agregar vehículos más adelante.</p>
              {vehiculos.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  No hay vehículos cargados. Puedes continuar sin vehículos.
                </div>
              ) : (
                <div className="grid gap-2">
                  {vehiculos.map((v) => {
                    const selected = data.vehiculoIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        onClick={() => toggleVehiculo(v.id)}
                        className={cn("rounded-xl border p-3 text-left", selected ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50")}
                      >
                        <p className="text-sm font-semibold text-slate-900">{v.etiqueta}</p>
                        <p className="text-xs text-slate-500">{v.patente}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {paso === 4 && (
            <section>
              <p className="mb-3 text-sm font-semibold text-slate-700">Confirmación</p>
              <MiniRow label="Mandante" value={mandantes.find((m) => m.id === data.mandanteId)?.nombre ?? "-"} icon={<Building2 className="h-3.5 w-3.5" />} />
              <MiniRow label="Plantilla" value={plantillas.find((p) => p.id === data.plantillaId)?.nombre ?? "-"} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
              <MiniRow label="Trabajadores" value={String(data.trabajadorIds.length)} icon={<Users className="h-3.5 w-3.5" />} />
              <MiniRow label="Vehículos" value={String(data.vehiculoIds.length)} icon={<Car className="h-3.5 w-3.5" />} />
              <MiniRow label="Requisitos" value={String(reqTotal)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
              <div className="mt-3 grid gap-2">
                <input
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  value={data.nombreProyecto}
                  onChange={(e) => setData((prev) => ({ ...prev, nombreProyecto: e.target.value }))}
                  placeholder="Nombre de proyecto (opcional)"
                />
                <input
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                  value={data.obraFaena}
                  onChange={(e) => setData((prev) => ({ ...prev, obraFaena: e.target.value }))}
                  placeholder="Obra/Faena (opcional)"
                />
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-7 py-5">
          <button
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-700 disabled:opacity-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Atrás
          </button>

          {paso < PASOS.length - 1 ? (
            <button
              onClick={() => setPaso((p) => Math.min(PASOS.length - 1, p + 1))}
              disabled={!canContinue}
              className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              Continuar
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() =>
                onCrear({
                  mandanteId: data.mandanteId,
                  plantillaId: data.plantillaId,
                  nombreProyecto: data.nombreProyecto || undefined,
                  obraFaena: data.obraFaena || undefined,
                  trabajadorIds: data.trabajadorIds,
                  vehiculoIds: data.vehiculoIds,
                })
              }
              disabled={!canCreate}
              className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Crear acreditación
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
      />
    </label>
  );
}

function MiniRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">{icon}{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
