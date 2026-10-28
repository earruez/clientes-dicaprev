"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, X, Search, Users, Building2 } from "lucide-react";
import { crearMandanteAcreditacionRapido, crearPlantillaAcreditacionBase } from "@/actions/acreditaciones/flujo";

const PASOS = ["Mandante y obra", "Personal a acreditar", "Confirmar solicitud"];
type Mandante = { id: string; nombre: string; rut: string; tipo: string };
type Plantilla = { id: string; nombre: string; descripcion: string; mandanteId: string | null; requisitosCount: number };
type Persona = { id: string; nombre: string; rut: string; cargo: string };
type Vehiculo = { id: string; etiqueta: string; patente: string };
interface Props {
  onClose: () => void;
  onCrear: (data: {
    mandanteId: string; plantillaId: string; contratistaId?: string;
    nombreProyecto?: string; obraFaena?: string; trabajadorIds: string[]; vehiculoIds: string[];
  }) => void;
  mandantes: Mandante[];
  contratistas: Array<{ id: string; nombre: string; rut: string }>;
  plantillas: Plantilla[];
  trabajadores: Persona[];
  vehiculos: Vehiculo[];
}

export default function NuevaAcreditacionWizard(props: Props) {
  const [paso, setPaso] = useState(0);
  const [mandantes, setMandantes] = useState(props.mandantes);
  const [plantillas, setPlantillas] = useState(props.plantillas);
  const [mandanteId, setMandanteId] = useState("");
  const [plantillaId, setPlantillaId] = useState("");
  const [obra, setObra] = useState("");
  const [empresaMandante, setEmpresaMandante] = useState("");
  const [rutMandante, setRutMandante] = useState("");
  const [crearMandante, setCrearMandante] = useState(false);
  const [trabajadorIds, setTrabajadorIds] = useState<string[]>([]);
  const [vehiculoIds, setVehiculoIds] = useState<string[]>([]);
  const [contratistaId, setContratistaId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mostrarVehiculos, setMostrarVehiculos] = useState(false);
  const opcionesPlantilla = useMemo(
    () => plantillas.filter((p) => p.mandanteId === mandanteId || p.mandanteId === null),
    [plantillas, mandanteId],
  );
  const mandante = mandantes.find((m) => m.id === mandanteId);
  const plantilla = plantillas.find((p) => p.id === plantillaId);
  const avanzar = paso === 0 ? Boolean(mandanteId && plantillaId && obra.trim()) : trabajadorIds.length > 0;
  const toggle = (id: string, selected: string[], setSelected: (v: string[]) => void) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  async function registrarMandante() {
    if (ocupado) return;
    setError(""); setOcupado(true);
    try {
      const nuevo = await crearMandanteAcreditacionRapido(empresaMandante, rutMandante);
      setMandantes((prev) => prev.some((m) => m.id === nuevo.id) ? prev : [...prev, { id: nuevo.id, nombre: nuevo.nombre, rut: rutMandante, tipo: "privado" }]);
      setMandanteId(nuevo.id); setPlantillaId(""); setCrearMandante(false); setEmpresaMandante(""); setRutMandante("");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar el mandante"); }
    finally { setOcupado(false); }
  }

  async function nuevaPauta() {
    if (!mandanteId || ocupado) return;
    setError(""); setOcupado(true);
    try {
      const p = await crearPlantillaAcreditacionBase(mandanteId);
      setPlantillas((prev) => prev.some((x) => x.id === p.id) ? prev : [...prev, {
        id: p.id, nombre: p.nombre, mandanteId, descripcion: "Pauta de partida editable", requisitosCount: 9,
      }]);
      setPlantillaId(p.id);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo preparar la pauta"); }
    finally { setOcupado(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-2 sm:p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-nueva-acreditacion" className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 id="titulo-nueva-acreditacion" className="text-xl font-bold text-slate-900">Acreditar trabajadores ante un mandante</h2>
            <p className="mt-1 text-sm text-slate-500">Crearemos la carpeta y buscaremos los documentos ya disponibles en NextPrev.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={props.onClose} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <nav aria-label="Progreso de la nueva acreditación" className="grid shrink-0 grid-cols-3 gap-2 px-5 py-4">
          {PASOS.map((nombre, i) => (
            <div key={nombre} aria-current={paso === i ? "step" : undefined} className={`rounded-xl p-2 text-center text-xs font-semibold ${i === paso ? "bg-blue-700 text-white" : i < paso ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-500"}`}>
              {i + 1}. {nombre}
            </div>
          ))}
        </nav>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {paso === 0 && (
            <>
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">1. ¿A quién debemos acreditar?</h3>
                  <button type="button" onClick={() => setCrearMandante((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><Plus className="h-4 w-4" />Nuevo mandante</button>
                </div>
                <select aria-label="Empresa mandante" value={mandanteId} onChange={(e) => { setMandanteId(e.target.value); setPlantillaId(""); }} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm">
                  <option value="">Selecciona una empresa mandante</option>
                  {mandantes.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                {mandantes.length === 0 && <p className="text-sm text-amber-800">Aún no hay mandantes registrados. Usa «Nuevo mandante» para comenzar.</p>}
                {crearMandante && (
                  <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <label className="block text-sm text-slate-700">Nombre del mandante
                      <input value={empresaMandante} onChange={(e) => setEmpresaMandante(e.target.value)} placeholder="Ej. Banco de Chile" className="mt-1 w-full rounded-lg border p-2.5" />
                    </label>
                    <label className="block text-sm text-slate-700">RUT (opcional)
                      <input value={rutMandante} onChange={(e) => setRutMandante(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5" />
                    </label>
                    <button type="button" disabled={ocupado || empresaMandante.trim().length < 3} onClick={() => void registrarMandante()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Guardar mandante</button>
                  </div>
                )}
                <label className="block text-sm font-medium text-slate-700">Obra, faena o proyecto <span className="text-rose-600">*</span>
                  <input value={obra} onChange={(e) => setObra(e.target.value)} placeholder="Ej. BCI – Vitacura / Mantención eléctrica" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" />
                </label>
              </section>
              <section className="space-y-2 border-t border-slate-100 pt-4">
                <h3 className="font-semibold text-slate-900">2. Documentos que pide el mandante</h3>
                <p className="text-sm text-slate-500">Selecciona su pauta documental. Si es la primera vez, crea una pauta de partida y ajústala a lo exigido por ese mandante.</p>
                <select aria-label="Plantilla documental" value={plantillaId} disabled={!mandanteId} onChange={(e) => setPlantillaId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm disabled:opacity-50">
                  <option value="">Selecciona una pauta documental</option>
                  {opcionesPlantilla.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.requisitosCount} requisitos)</option>)}
                </select>
                {mandanteId && opcionesPlantilla.length === 0 && <p className="text-sm text-amber-800">No existe una pauta para este mandante.</p>}
                {mandanteId && <button type="button" disabled={ocupado} onClick={() => void nuevaPauta()} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"><Plus className="mr-1 inline h-4 w-4" />Usar pauta inicial editable de 9 documentos</button>}
                {plantilla && <p className="text-xs text-slate-500">Pauta seleccionada: {plantilla.nombre}. Puedes editarla en «Plantillas» antes de crear la acreditación.</p>}
              </section>
            </>
          )}
          {paso === 1 && (
            <>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Selecciona los trabajadores que deben acreditarse</h3>
                <p className="text-sm text-slate-500">Puedes agregar más trabajadores después sin perder documentos existentes.</p>
              </div>
              <label className="relative block">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input aria-label="Buscar trabajadores" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o RUT" className="w-full rounded-xl border p-3 pl-9 text-sm" />
              </label>
              <p className="text-sm font-semibold text-blue-800">{trabajadorIds.length} trabajadores seleccionados</p>
              {props.trabajadores.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No hay trabajadores en esta empresa. Agrégalos primero desde el módulo Trabajadores.</p> : (
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border p-2">
                  {props.trabajadores.filter((t) => `${t.nombre} ${t.rut}`.toLowerCase().includes(busqueda.toLowerCase())).map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50">
                      <input type="checkbox" checked={trabajadorIds.includes(t.id)} onChange={() => toggle(t.id, trabajadorIds, setTrabajadorIds)} className="h-4 w-4 accent-blue-700" />
                      <span className="text-sm"><strong className="block text-slate-900">{t.nombre}</strong><span className="text-xs text-slate-500">{t.rut} · {t.cargo}</span></span>
                    </label>
                  ))}
                </div>
              )}
              <details className="rounded-xl border p-4">
                <summary onClick={() => setMostrarVehiculos((x) => !x)} className="cursor-pointer text-sm font-semibold text-slate-900">Agregar vehículos o equipos (opcional) · {vehiculoIds.length} seleccionados</summary>
                <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                  {props.vehiculos.map((v) => <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={vehiculoIds.includes(v.id)} onChange={() => toggle(v.id, vehiculoIds, setVehiculoIds)} />
                    {v.patente} · {v.etiqueta}
                  </label>)}
                  {props.vehiculos.length === 0 && <p className="text-xs text-slate-500">No hay vehículos registrados.</p>}
                </div>
              </details>
            </>
          )}
          {paso === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">Revisar y crear carpeta de acreditación</h3>
              <div className="rounded-xl border bg-slate-50 p-4 text-sm">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-600" /><strong>{mandante?.nombre}</strong></div>
                <p className="mt-2">Obra/faena: <strong>{obra}</strong></p>
                <p className="mt-2">Documentos: <strong>{plantilla?.nombre}</strong></p>
                <p className="mt-2"><Users className="mr-1 inline h-4 w-4 text-blue-600" />{trabajadorIds.length} trabajadores y {vehiculoIds.length} vehículos</p>
              </div>
              <label className="block text-sm font-medium text-slate-700">Empresa contratista vinculada (opcional)
                <select value={contratistaId} onChange={(e) => setContratistaId(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-sm">
                  <option value="">Acreditar a mi empresa, sin contratista adicional</option>
                  {props.contratistas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Al continuar, NextPrev preparará el listado de documentos para cada trabajador. Podrás adjuntar archivos faltantes, generar el expediente y registrar la respuesta del mandante.</p>
            </div>
          )}
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t bg-white p-5">
          <button type="button" onClick={() => paso === 0 ? props.onClose() : (setError(""), setPaso(paso - 1))} className="inline-flex items-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-700">
            <ArrowLeft className="h-4 w-4" />{paso === 0 ? "Cancelar" : "Atrás"}
          </button>
          {paso < 2
            ? <button type="button" disabled={!avanzar || ocupado} onClick={() => { setError(""); setBusqueda(""); setPaso((p) => p + 1); }} className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Continuar <ArrowRight className="h-4 w-4" /></button>
            : <button type="button" onClick={() => props.onCrear({ mandanteId, plantillaId, contratistaId: contratistaId || undefined, nombreProyecto: obra, obraFaena: obra, trabajadorIds, vehiculoIds })} className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white"><Check className="h-4 w-4" />Crear carpeta</button>}
        </footer>
      </div>
    </div>
  );
}
