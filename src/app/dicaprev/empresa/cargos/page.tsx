// src/app/dicaprev/empresa/cargos/page.tsx
"use client";

import React, { useState, useMemo, useCallback, ChangeEvent, FormEvent, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Users, Shield, FileText, GraduationCap,
  AlertTriangle, Search, Plus, X, ChevronRight,
  MapPin, Layers, Tag, SlidersHorizontal, CheckCircle2,
} from "lucide-react";
import {
  empresaStore,
  type EmpresaCargo,
  type CargoEstado,
  type CargoTipoUI,
} from "@/lib/empresa/empresa-store";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { getAreas } from "@/app/dicaprev/empresa/areas/actions";
import {
  getCargos,
  crearCargo,
  actualizarCargo,
  desactivarCargo,
  evaluarEliminacionCargo,
  eliminarCargoDefinitivo,
  getCargoCatalogosFormData,
  crearDocumentoEspecificoCargo,
  crearCapacitacionEspecificaCargo,
} from "./actions";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Estado = CargoEstado;
type Tipo   = CargoTipoUI;
type Cargo  = EmpresaCargo;

type CargoForm = Omit<Cargo, "id" | "creadoEl" | "trabajadores" | "centros">;

type DeleteResolution = {
  targetId: string;
  targetName: string;
  puedeEliminarDefinitivo: boolean;
  bloqueos: string[];
};

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */

// Mock data centralised in empresa-store.ts. Initial state comes from the store.

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function tipoColor(tipo: Tipo): string {
  const map: Record<Tipo, string> = {
    "Prevención":    "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Supervisión":   "bg-indigo-50 text-indigo-700 border-indigo-100",
    "Operativo":     "bg-sky-50 text-sky-700 border-sky-100",
    "Técnico":       "bg-violet-50 text-violet-700 border-violet-100",
    "Administración":"bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[tipo] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

function nextCodigo(cargos: Cargo[]): string {
  const maxCorrelativo = cargos.reduce((max, cargo) => {
    const match = cargo.codigo.trim().match(/^CAR-(\d+)$/i);
    if (!match) return max;
    const correlativo = Number.parseInt(match[1], 10);
    return Number.isNaN(correlativo) ? max : Math.max(max, correlativo);
  }, 0);

  const siguiente = maxCorrelativo > 0 ? maxCorrelativo + 1 : cargos.length + 1;
  return `CAR-${String(siguiente).padStart(3, "0")}`;
}

type DbArea = {
  id: string;
  nombre: string;
};

type DbCargo = {
  id: string;
  nombre: string;
  tipo?: unknown;
  descripcion: string | null;
  perfilSST: string | null;
  perfilSstRequerido?: string | null;
  riesgosClave?: unknown;
  documentosBase?: unknown;
  capacitacionesBase?: unknown;
  estado: string;
  esCritico: boolean;
  createdAt: Date | string;
  area: DbArea | null;
};

type DocumentoCatalogoItem = {
  id: string;
  nombre: string;
  codigo: string;
  origen: "base" | "especifica";
};

type CapacitacionCatalogoItem = {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  origen: "base" | "especifica";
};

type SugerenciaCatalogoItem = {
  id: string;
  nombre: string;
  motivo: string;
  confianza: number;
  fuente: "reglas" | "ia";
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toCargoTipo(value: unknown): Tipo {
  const allowed: Tipo[] = ["Operativo", "Supervisión", "Administración", "Prevención", "Técnico"];
  if (typeof value !== "string") return "Operativo";
  return allowed.includes(value as Tipo) ? (value as Tipo) : "Operativo";
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function riesgosToText(value: unknown): string {
  const riesgos = toStringArray(value);
  return riesgos.join("\n");
}

function riesgosToList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toDateYmd(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function mapDbCargoToUi(cargo: DbCargo): Cargo {
  return {
    id: cargo.id,
    nombre: cargo.nombre,
    codigo: `CAR-${cargo.id.slice(0, 4).toUpperCase()}`,
    areaId: cargo.area?.id ?? "",
    areaNombre: cargo.area?.nombre ?? "Sin área",
    tipo: toCargoTipo(cargo.tipo),
    descripcion: cargo.descripcion ?? "",
    perfilSST: cargo.perfilSstRequerido ?? cargo.perfilSST ?? "",
    riesgosClave: riesgosToText(cargo.riesgosClave),
    requiereDS44: cargo.esCritico,
    documentosBase: toStringArray(cargo.documentosBase),
    capacitacionesBase: toStringArray(cargo.capacitacionesBase),
    estado: cargo.estado === "inactivo" ? "inactivo" : "activo",
    trabajadores: 0,
    centros: [],
    creadoEl: toDateYmd(cargo.createdAt),
  };
}

function emptyForm(): CargoForm {
  return {
    nombre: "", codigo: "",
    areaId: "", areaNombre: "Sin área",
    tipo: "Operativo", descripcion: "", perfilSST: "",
    riesgosClave: "", requiereDS44: false,
    documentosBase: [], capacitacionesBase: [],
    estado: "activo",
  };
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function CargosPage() {
  const [cargos, setCargos]       = useState<Cargo[]>([]);
  const [areas, setAreas]         = useState<DbArea[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* filters */
  const [search, setSearch]       = useState("");
  const [fArea, setFArea]         = useState("todas");
  const [fEstado, setFEstado]     = useState<"todos" | Estado>("todos");
  const [fTipo, setFTipo]         = useState<"todos" | Tipo>("todos");
  const [fDs44, setFDs44]         = useState(false);

  /* drawer */
  const [drawerCargo, setDrawerCargo] = useState<Cargo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null);
  const [deleteResolution, setDeleteResolution] = useState<DeleteResolution | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [plantillaActiva, setPlantillaActiva] = useState<string | null>(null);

  // Initialise store on client mount and sync state
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(null);

    async function loadData() {
      try {
        await empresaStore.init();
        if (mounted) {
          setPlantillaActiva(empresaStore.getActiveStructure().tipoPlantilla);
        }

        const [cargoRows, areaRows] = await Promise.allSettled([getCargos(), getAreas()]);
        if (!mounted) return;

        if (areaRows.status === "fulfilled") {
          const mappedAreas = areaRows.value.map((area) => ({ id: area.id, nombre: area.nombre }));
          setAreas(mappedAreas);
        } else {
          setAreas([]);
        }

        if (cargoRows.status === "fulfilled") {
          const mappedCargos = cargoRows.value.map((cargo) => mapDbCargoToUi(cargo as DbCargo));
          setCargos(mappedCargos);
        } else {
          setCargos([]);
          setLoadError("No se pudieron cargar los cargos de la empresa. Recarga la página para reintentar.");
        }
      } catch {
        if (mounted) {
          setAreas([]);
          setCargos([]);
          setLoadError("No se pudieron cargar los cargos de la empresa. Recarga la página para reintentar.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // Wrapper: update local state AND sync to store
  function updateCargos(updater: (prev: Cargo[]) => Cargo[]) {
    setCargos((prev) => {
      const next = updater(prev);
      return next;
    });
  }

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<CargoForm>(emptyForm());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* docs/caps input helpers */
  const [docInput, setDocInput] = useState("");
  const [capInput, setCapInput] = useState("");
  const [documentosCatalogo, setDocumentosCatalogo] = useState<DocumentoCatalogoItem[]>([]);
  const [capacitacionesCatalogo, setCapacitacionesCatalogo] = useState<CapacitacionCatalogoItem[]>([]);
  const [documentosSeleccionadosIds, setDocumentosSeleccionadosIds] = useState<string[]>([]);
  const [capacitacionesSeleccionadasIds, setCapacitacionesSeleccionadasIds] = useState<string[]>([]);
  const [documentosSugeridos, setDocumentosSugeridos] = useState<SugerenciaCatalogoItem[]>([]);
  const [capacitacionesSugeridas, setCapacitacionesSugeridas] = useState<SugerenciaCatalogoItem[]>([]);

  const isEdit = editingId !== null;

  /* ── KPIs ── */
  const activos       = cargos.filter((c) => c.estado === "activo");
  const kpiActivos    = activos.length;
  const kpiTrabaj     = activos.reduce((s, c) => s + c.trabajadores, 0);
  const kpiDs44       = activos.filter((c) => c.requiereDS44).length;
  const kpiDocs       = activos.reduce((s, c) => s + c.documentosBase.length, 0);
  const kpiCaps       = activos.reduce((s, c) => s + c.capacitacionesBase.length, 0);

  /* ── Filtered ── */
  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cargos.filter((c) => {
      if (q && !`${c.nombre} ${c.codigo} ${c.areaNombre} ${c.tipo}`.toLowerCase().includes(q)) return false;
      if (fArea !== "todas" && c.areaId !== fArea) return false;
      if (fEstado !== "todos" && c.estado !== fEstado) return false;
      if (fTipo !== "todos" && c.tipo !== fTipo) return false;
      if (fDs44 && !c.requiereDS44) return false;
      return true;
    });
  }, [cargos, search, fArea, fEstado, fTipo, fDs44]);

  /* ── Handlers ── */
  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...emptyForm(), codigo: nextCodigo(cargos) });
    setSubmitError(null);
    setDocInput("");
    setCapInput("");
    setDocumentosSeleccionadosIds([]);
    setCapacitacionesSeleccionadasIds([]);
    setDocumentosSugeridos([]);
    setCapacitacionesSugeridas([]);
    setModalOpen(true);
  }, [cargos]);

  const openEdit = useCallback((c: Cargo) => {
    setEditingId(c.id);
    setForm({ nombre: c.nombre, codigo: c.codigo, areaId: c.areaId, areaNombre: c.areaNombre, tipo: c.tipo, descripcion: c.descripcion, perfilSST: c.perfilSST, riesgosClave: c.riesgosClave, requiereDS44: c.requiereDS44, documentosBase: [...c.documentosBase], capacitacionesBase: [...c.capacitacionesBase], estado: c.estado });
    setSubmitError(null);
    setDocInput("");
    setCapInput("");
    setDocumentosSeleccionadosIds([]);
    setCapacitacionesSeleccionadasIds([]);
    setDocumentosSugeridos([]);
    setCapacitacionesSugeridas([]);
    setModalOpen(true);
    setDrawerCargo(null);
  }, []);

  const toggleEstado = async (id: string) => {
    const current = cargos.find((cargo) => cargo.id === id);
    if (!current) return;

    if (current.estado === "activo") {
      const updated = await desactivarCargo(id);
      const mapped = mapDbCargoToUi(updated as DbCargo);
      updateCargos((prev) => prev.map((c) => (c.id === id ? { ...c, ...mapped } : c)));
      setDrawerCargo((prev) => (prev?.id === id ? { ...prev, ...mapped } : prev));
      return;
    }

    const updated = await actualizarCargo(id, {
      nombre: current.nombre,
      areaId: current.areaId || undefined,
      tipo: current.tipo,
      descripcion: current.descripcion,
      perfilSST: current.perfilSST,
        riesgosClave: riesgosToList(current.riesgosClave),
        documentosBase: current.documentosBase,
        capacitacionesBase: current.capacitacionesBase,
      estado: "activo",
      esCritico: current.requiereDS44,
    });
    const mapped = mapDbCargoToUi(updated as DbCargo);
    updateCargos((prev) => prev.map((c) => (c.id === id ? { ...c, ...mapped } : c)));
    setDrawerCargo((prev) => (prev?.id === id ? { ...prev, ...mapped } : prev));
  };

  const tryDeleteCargo = async (cargo: Cargo) => {
    setDeleteTarget(cargo);
    setDeleteLoadingId(cargo.id);
    try {
      const evaluacion = await evaluarEliminacionCargo(cargo.id);
      setDeleteResolution({
        targetId: cargo.id,
        targetName: cargo.nombre,
        puedeEliminarDefinitivo: evaluacion.puedeEliminarDefinitivo,
        bloqueos: evaluacion.bloqueos,
      });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const confirmDeleteCargo = async () => {
    if (!deleteTarget || !deleteResolution) return;

    if (deleteResolution.puedeEliminarDefinitivo) {
      await eliminarCargoDefinitivo(deleteTarget.id);
      updateCargos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (drawerCargo?.id === deleteTarget.id) setDrawerCargo(null);
      setDeleteTarget(null);
      setDeleteResolution(null);
      return;
    }

    const updated = await desactivarCargo(deleteTarget.id);
    const mapped = mapDbCargoToUi(updated as DbCargo);
    updateCargos((prev) => prev.map((c) => (c.id === deleteTarget.id ? { ...c, ...mapped } : c)));
    if (drawerCargo?.id === deleteTarget.id) setDrawerCargo(mapped);
    setDeleteTarget(null);
    setDeleteResolution(null);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const filteredDocumentos = useMemo(() => {
    const q = normalizeKey(docInput);
    if (!q) return documentosCatalogo.slice(0, 8);
    return documentosCatalogo
      .filter((item) => {
        const key = `${normalizeKey(item.nombre)} ${normalizeKey(item.codigo)}`;
        return key.includes(q);
      })
      .slice(0, 8);
  }, [docInput, documentosCatalogo]);

  const filteredCapacitaciones = useMemo(() => {
    const q = normalizeKey(capInput);
    if (!q) return capacitacionesCatalogo.slice(0, 8);
    return capacitacionesCatalogo
      .filter((item) => {
        const key = `${normalizeKey(item.nombre)} ${normalizeKey(item.codigo)} ${normalizeKey(item.categoria)}`;
        return key.includes(q);
      })
      .slice(0, 8);
  }, [capInput, capacitacionesCatalogo]);

  const selectedDocumentos = useMemo(
    () => documentosCatalogo.filter((item) => documentosSeleccionadosIds.includes(item.id)),
    [documentosCatalogo, documentosSeleccionadosIds],
  );

  const selectedCapacitaciones = useMemo(
    () => capacitacionesCatalogo.filter((item) => capacitacionesSeleccionadasIds.includes(item.id)),
    [capacitacionesCatalogo, capacitacionesSeleccionadasIds],
  );

  const addDocumentoId = (id: string) => {
    setDocumentosSeleccionadosIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDocInput("");
  };

  const removeDocumentoId = (id: string) => {
    setDocumentosSeleccionadosIds((prev) => prev.filter((item) => item !== id));
  };

  const addCapacitacionId = (id: string) => {
    setCapacitacionesSeleccionadasIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCapInput("");
  };

  const removeCapacitacionId = (id: string) => {
    setCapacitacionesSeleccionadasIds((prev) => prev.filter((item) => item !== id));
  };

  const createDocumentoEspecifico = async () => {
    const nombre = docInput.trim();
    if (!nombre) return;

    const duplicate = documentosCatalogo.find((item) => normalizeKey(item.nombre) === normalizeKey(nombre));
    if (duplicate) {
      setSubmitError(`Ya existe un documento similar (${duplicate.nombre}). Usa el existente.`);
      return;
    }

    try {
      const created = await crearDocumentoEspecificoCargo({ nombre });
      setDocumentosCatalogo((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      addDocumentoId(created.id);
      setSubmitError(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo crear el documento específico.");
    }
  };

  const createCapacitacionEspecifica = async () => {
    const nombre = capInput.trim();
    if (!nombre) return;

    const duplicate = capacitacionesCatalogo.find((item) => normalizeKey(item.nombre) === normalizeKey(nombre));
    if (duplicate) {
      setSubmitError(`Ya existe una capacitación similar (${duplicate.nombre}). Usa la existente.`);
      return;
    }

    try {
      const created = await crearCapacitacionEspecificaCargo({ nombre });
      setCapacitacionesCatalogo((prev) => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      addCapacitacionId(created.id);
      setSubmitError(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo crear la capacitación específica.");
    }
  };

  useEffect(() => {
    if (!modalOpen) return;

    let active = true;
    (async () => {
      try {
        const data = await getCargoCatalogosFormData(editingId ?? undefined);
        if (!active) return;

        setDocumentosCatalogo(data.documentosCatalogo);
        setCapacitacionesCatalogo(data.capacitacionesCatalogo);

        if (editingId) {
          const legacyDocIds = form.documentosBase
            .map((legacy) => {
              const key = normalizeKey(legacy);
              const match = data.documentosCatalogo.find(
                (item) => normalizeKey(item.nombre) === key || normalizeKey(item.codigo) === key,
              );
              return match?.id;
            })
            .filter((item): item is string => Boolean(item));

          const legacyCapIds = form.capacitacionesBase
            .map((legacy) => {
              const key = normalizeKey(legacy);
              const match = data.capacitacionesCatalogo.find(
                (item) => normalizeKey(item.nombre) === key || normalizeKey(item.codigo) === key,
              );
              return match?.id;
            })
            .filter((item): item is string => Boolean(item));

          const mergedDocIds = Array.from(new Set([...data.documentosSeleccionadosIds, ...legacyDocIds]));
          const mergedCapIds = Array.from(new Set([...data.capacitacionesSeleccionadasIds, ...legacyCapIds]));

          setDocumentosSeleccionadosIds(mergedDocIds);
          setCapacitacionesSeleccionadasIds(mergedCapIds);
        }

        setDocumentosSugeridos(data.documentosSugeridos);
        setCapacitacionesSugeridas(data.capacitacionesSugeridas);
      } catch {
        if (!active) return;
        setDocumentosCatalogo([]);
        setCapacitacionesCatalogo([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [modalOpen, editingId, form.documentosBase, form.capacitacionesBase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const area = areas.find((a) => a.id === form.areaId);
    const merged = { ...form, areaNombre: area?.nombre ?? "Sin área" };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        nombre: merged.nombre,
        areaId: merged.areaId || undefined,
        tipo: merged.tipo,
        descripcion: merged.descripcion,
        perfilSST: merged.perfilSST,
        perfilSstRequerido: merged.perfilSST,
        riesgosClave: riesgosToList(merged.riesgosClave),
        documentosBase: selectedDocumentos.map((item) => item.nombre),
        capacitacionesBase: selectedCapacitaciones.map((item) => item.nombre),
        documentoTipoIds: documentosSeleccionadosIds,
        capacitacionIds: capacitacionesSeleccionadasIds,
        estado: merged.estado,
        esCritico: merged.requiereDS44,
      };

      if (isEdit && editingId) {
        await actualizarCargo(editingId, payload);
      } else {
        await crearCargo(payload);
      }

      const refreshed = await getCargos();
      const mappedCargos = refreshed.map((cargo) => mapDbCargoToUi(cargo as DbCargo));
      updateCargos(() => mappedCargos);
      if (editingId) {
        const refreshedCargo = mappedCargos.find((cargo) => cargo.id === editingId) ?? null;
        setDrawerCargo(refreshedCargo);
      }

      setModalOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo guardar el cargo.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => { setSearch(""); setFArea("todas"); setFEstado("todos"); setFTipo("todos"); setFDs44(false); };
  const hasFilters = search || fArea !== "todas" || fEstado !== "todos" || fTipo !== "todos" || fDs44;

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="py-10 space-y-8">

        <StandardPageHeader
          moduleLabel="Módulo Empresa"
          title="Cargos"
          description="Catálogo maestro de roles del sistema. Define qué exige cada cargo en términos de perfil, riesgos, documentación obligatoria y capacitaciones base."
          icon={<BookOpen className="h-6 w-6" />}
          iconWrapClassName="bg-violet-700"
          actions={
            <button
              onClick={openCreate}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Nuevo cargo
            </button>
          }
        />

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard icon={<BookOpen className="h-5 w-5 text-violet-600" />}      label="Cargos activos"          value={kpiActivos} bg="bg-violet-50" />
          <KpiCard icon={<Users className="h-5 w-5 text-sky-600" />}            label="Trabajadores asociados"  value={kpiTrabaj}  bg="bg-sky-50" />
          <KpiCard icon={<Shield className="h-5 w-5 text-rose-600" />}          label="Cargos críticos DS44"    value={kpiDs44}    bg="bg-rose-50" highlight={kpiDs44 > 0} />
          <KpiCard icon={<FileText className="h-5 w-5 text-amber-600" />}       label="Documentos base"         value={kpiDocs}    bg="bg-amber-50" />
          <KpiCard icon={<GraduationCap className="h-5 w-5 text-emerald-600" />} label="Capacitaciones base"   value={kpiCaps}    bg="bg-emerald-50" />
        </div>

        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {/* ── PLANTILLA BANNER ── */}
        {plantillaActiva && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" />
            <span className="flex-1">
              Estructura cargada desde plantilla: <strong>{plantillaActiva}</strong>. Edita libremente desde aquí.
            </span>
            <a
              href="/dicaprev/empresa"
              className="text-xs font-semibold underline underline-offset-2 hover:text-violet-600 transition"
            >
              Cambiar plantilla
            </a>
          </div>
        )}

        {/* ── FILTROS ── */}
        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[220px]">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, código, área…" className="pl-9 rounded-xl" />
                </div>
              </div>

              <FilterSelect label="Área"   value={fArea}   onChange={setFArea}   options={[{ value: "todas", label: "Todas" }, ...areas.map((a) => ({ value: a.id, label: a.nombre }))]} />
              <FilterSelect label="Estado" value={fEstado} onChange={(v) => setFEstado(v as "todos" | Estado)} options={[{ value: "todos", label: "Todos" }, { value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }]} />
              <FilterSelect label="Tipo"   value={fTipo}   onChange={(v) => setFTipo(v as "todos" | Tipo)}     options={[{ value: "todos", label: "Todos" }, ...["Operativo","Supervisión","Administración","Prevención","Técnico"].map((t) => ({ value: t, label: t }))]} />

              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">DS44</Label>
                <button
                  type="button"
                  onClick={() => setFDs44((v) => !v)}
                  className={`mt-1 h-10 px-4 rounded-xl border text-sm font-medium transition ${fDs44 ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <Shield className={`inline h-4 w-4 mr-1.5 ${fDs44 ? "text-white" : "text-rose-500"}`} />
                  {fDs44 ? "Solo DS44" : "Todos"}
                </button>
              </div>

              {hasFilters && (
                <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mt-6 transition">
                  <X className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">{filtrados.length} de {cargos.length} cargos</p>
          </CardContent>
        </Card>

        {/* ── TABLA ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Cargo</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 max-w-[180px]">Perfil SST</th>
                  <th className="px-4 py-3 text-center">DS44</th>
                  <th className="px-4 py-3 text-center">Docs base</th>
                  <th className="px-4 py-3 text-center">Caps base</th>
                  <th className="px-4 py-3 text-center">Trabaj.</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setDrawerCargo((prev) => prev?.id === c.id ? null : c)}
                    className={`group cursor-pointer hover:bg-slate-50/60 transition-colors ${drawerCargo?.id === c.id ? "bg-violet-50/40" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{c.nombre}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.codigo}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{c.areaNombre}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${tipoColor(c.tipo)}`}>
                        {c.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <p className="text-xs text-slate-500 line-clamp-2">{c.perfilSST}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.requiereDS44 ? (
                        <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold border bg-rose-50 text-rose-600 border-rose-100">
                          <Shield className="h-3 w-3 mr-1" />Sí
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-amber-700">
                        <FileText className="h-3.5 w-3.5 text-amber-400" />{c.documentosBase.length}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-emerald-700">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />{c.capacitacionesBase.length}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
                        <Users className="h-3.5 w-3.5 text-sky-400" />{c.trabajadores}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${c.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        {c.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDrawerCargo((prev) => prev?.id === c.id ? null : c)} className="rounded-lg px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 transition font-medium">Ver</button>
                        <button onClick={() => openEdit(c)} className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition">Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtrados.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">
                <SlidersHorizontal className="mx-auto h-8 w-8 mb-3 text-slate-300" />
                {loading ? "Cargando cargos..." : "No se encontraron cargos con los filtros aplicados."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          DRAWER LATERAL
      ═══════════════════════════════════════════ */}
      <div className={`fixed inset-y-0 right-0 z-40 flex flex-col w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300 ${drawerCargo ? "translate-x-0" : "translate-x-full"}`}>
        {drawerCargo && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{drawerCargo.codigo}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${tipoColor(drawerCargo.tipo)}`}>{drawerCargo.tipo}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${drawerCargo.estado === "activo" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                    {drawerCargo.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                  {drawerCargo.requiereDS44 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                      <Shield className="h-3 w-3" /> DS44
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{drawerCargo.nombre}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <Tag className="h-3.5 w-3.5 shrink-0" />{drawerCargo.areaNombre}
                </p>
              </div>
              <button onClick={() => setDrawerCargo(null)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Stats rápidos */}
              <div className="grid grid-cols-3 gap-3">
                <DrawerStat icon={<Users className="h-4 w-4 text-sky-500" />}            label="Trabajadores" value={drawerCargo.trabajadores} />
                <DrawerStat icon={<FileText className="h-4 w-4 text-amber-500" />}       label="Docs base"    value={drawerCargo.documentosBase.length} />
                <DrawerStat icon={<GraduationCap className="h-4 w-4 text-emerald-500" />} label="Caps base"  value={drawerCargo.capacitacionesBase.length} />
              </div>

              {/* Descripción */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Descripción del rol</p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.descripcion}</p>
              </div>

              {/* Perfil SST */}
              <div className="rounded-2xl border border-violet-100 bg-violet-50/40 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Perfil SST requerido
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.perfilSST}</p>
              </div>

              {/* Riesgos */}
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Riesgos clave
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{drawerCargo.riesgosClave}</p>
              </div>

              {/* Documentos base */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Documentos base ({drawerCargo.documentosBase.length})
                </p>
                {drawerCargo.documentosBase.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin documentos base definidos</p>
                ) : (
                  <ul className="space-y-1.5">
                    {drawerCargo.documentosBase.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />{d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Capacitaciones base */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Capacitaciones base ({drawerCargo.capacitacionesBase.length})
                </p>
                {drawerCargo.capacitacionesBase.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Sin capacitaciones base definidas</p>
                ) : (
                  <ul className="space-y-1.5">
                    {drawerCargo.capacitacionesBase.map((cap) => (
                      <li key={cap} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />{cap}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Centros donde se usa */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Centros / posiciones activas ({drawerCargo.centros.length})
                </p>
                {drawerCargo.centros.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">
                    Sin posiciones de dotación activas
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {drawerCargo.centros.map((centro) => (
                      <div key={centro} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm">
                        <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        {centro}
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex gap-2">
              <button onClick={() => openEdit(drawerCargo)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Editar
              </button>
              <button
                onClick={() => toggleEstado(drawerCargo.id)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${drawerCargo.estado === "activo" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {drawerCargo.estado === "activo" ? "Desactivar" : "Reactivar"}
              </button>
              <button onClick={() => tryDeleteCargo(drawerCargo)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition border border-rose-100">
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Overlay mobile */}
      {drawerCargo && (
        <div className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden" onClick={() => setDrawerCargo(null)} />
      )}

      {/* ═══════════════════════════════════════════
          MODAL CREAR / EDITAR
      ═══════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {isEdit ? "Editar cargo" : "Nuevo cargo"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define el rol base: perfil SST, riesgos, documentos y capacitaciones obligatorias.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-1">

            {/* BLOQUE: Info básica */}
            <FormSection label="Información básica">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="m-nombre">Nombre del cargo</Label>
                  <Input id="m-nombre" name="nombre" value={form.nombre} onChange={handleInput} className="mt-1 rounded-xl" required placeholder="Ej: Prevencionista de Riesgos" />
                </div>
                <div>
                  <Label htmlFor="m-codigo">Código</Label>
                  <Input id="m-codigo" name="codigo" value={form.codigo} onChange={handleInput} className="mt-1 rounded-xl" required placeholder="Ej: PRV-001" />
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={form.areaId || "sin-area"} onValueChange={(v) => {
                    const nextAreaId = v === "sin-area" ? "" : v;
                    setForm((p) => ({
                      ...p,
                      areaId: nextAreaId,
                      areaNombre: areas.find((a) => a.id === nextAreaId)?.nombre ?? "Sin área",
                    }));
                  }}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-area">Sin área</SelectItem>
                      {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as Tipo }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Operativo","Supervisión","Administración","Prevención","Técnico"] as Tipo[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v as Estado }))}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 self-end pb-1">
                  <input type="checkbox" id="m-ds44" name="requiereDS44" checked={form.requiereDS44} onChange={handleInput} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
                  <Label htmlFor="m-ds44" className="cursor-pointer">Requiere DS44</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="m-desc">Descripción del rol</Label>
                <textarea id="m-desc" name="descripcion" value={form.descripcion} onChange={handleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[72px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Describe las responsabilidades principales del rol…" />
              </div>
            </FormSection>

            {/* BLOQUE: Perfil SST y riesgos */}
            <FormSection label="Perfil SST y riesgos">
              <div>
                <Label htmlFor="m-sst">Perfil SST requerido</Label>
                <textarea id="m-sst" name="perfilSST" value={form.perfilSST} onChange={handleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[60px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Ej: Experto en Prevención de Riesgos. Registro SEREMI vigente…" />
              </div>
              <div>
                <Label htmlFor="m-riesgos">Riesgos clave</Label>
                <textarea id="m-riesgos" name="riesgosClave" value={form.riesgosClave} onChange={handleInput}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 min-h-[60px] resize-y shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  placeholder="Ej: Trabajo en altura, riesgo eléctrico, izaje de cargas…" />
              </div>
            </FormSection>

            {/* BLOQUE: Documentos base */}
            <FormSection label="Documentos base obligatorios">
              <div className="flex gap-2">
                <Input
                  value={docInput}
                  onChange={(e) => setDocInput(e.target.value)}
                  placeholder="Buscar documento en catálogo..."
                  className="rounded-xl flex-1"
                />
                <Button type="button" variant="outline" onClick={createDocumentoEspecifico} className="rounded-xl px-4 shrink-0">
                  Crear específico
                </Button>
              </div>

              {filteredDocumentos.length > 0 && (
                <div className="mt-2 grid gap-1.5">
                  {filteredDocumentos.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => addDocumentoId(doc.id)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span className="flex-1">{doc.nombre}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{doc.codigo}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedDocumentos.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {selectedDocumentos.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-sm text-slate-700">
                      <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="flex-1">{d.nombre}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{d.codigo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${d.origen === "base" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-amber-200 bg-amber-100 text-amber-700"}`}>
                        {d.origen === "base" ? "Catálogo" : "Específico"}
                      </span>
                      <button type="button" onClick={() => removeDocumentoId(d.id)} className="text-slate-400 hover:text-rose-500 transition"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}

              {documentosSugeridos.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Sugerencias</p>
                  <div className="flex flex-wrap gap-2">
                    {documentosSugeridos.map((sugerida) => (
                      <button
                        key={sugerida.id}
                        type="button"
                        onClick={() => addDocumentoId(sugerida.id)}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100"
                        title={`${sugerida.motivo} (confianza ${Math.round(sugerida.confianza * 100)}%)`}
                      >
                        + {sugerida.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </FormSection>

            {/* BLOQUE: Capacitaciones base */}
            <FormSection label="Capacitaciones base obligatorias">
              <div className="flex gap-2">
                <Input
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  placeholder="Buscar capacitación en catálogo..."
                  className="rounded-xl flex-1"
                />
                <Button type="button" variant="outline" onClick={createCapacitacionEspecifica} className="rounded-xl px-4 shrink-0">
                  Crear específica
                </Button>
              </div>

              {filteredCapacitaciones.length > 0 && (
                <div className="mt-2 grid gap-1.5">
                  {filteredCapacitaciones.map((cap) => (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => addCapacitacionId(cap.id)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="flex-1">{cap.nombre}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{cap.codigo}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedCapacitaciones.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {selectedCapacitaciones.map((cap) => (
                    <li key={cap.id} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm text-slate-700">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="flex-1">{cap.nombre}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{cap.codigo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${cap.origen === "base" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-emerald-200 bg-emerald-100 text-emerald-700"}`}>
                        {cap.origen === "base" ? "Catálogo" : "Específica"}
                      </span>
                      <button type="button" onClick={() => removeCapacitacionId(cap.id)} className="text-slate-400 hover:text-rose-500 transition"><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}

              {capacitacionesSugeridas.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Sugerencias</p>
                  <div className="flex flex-wrap gap-2">
                    {capacitacionesSugeridas.map((sugerida) => (
                      <button
                        key={sugerida.id}
                        type="button"
                        onClick={() => addCapacitacionId(sugerida.id)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 hover:bg-emerald-100"
                        title={`${sugerida.motivo} (confianza ${Math.round(sugerida.confianza * 100)}%)`}
                      >
                        + {sugerida.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </FormSection>

            <DialogFooter className="pt-2">
              {submitError && (
                <p className="w-full text-sm text-rose-600">{submitError}</p>
              )}
              <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="rounded-full px-6 bg-violet-600 hover:bg-violet-700 text-white shadow-sm disabled:opacity-60">
                {isEdit ? "Guardar cambios" : "Crear cargo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE DIALOG ── */}
      {deleteTarget !== null && (
        <Dialog open onOpenChange={() => { setDeleteTarget(null); setDeleteResolution(null); }}>
          <DialogContent className="max-w-md rounded-3xl border border-slate-200 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  {deleteResolution?.puedeEliminarDefinitivo ? "¿Eliminar cargo definitivamente?" : "No se puede eliminar definitivamente"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-slate-600 ml-[3rem] leading-relaxed">
                {deleteLoadingId === deleteTarget.id
                  ? "Validando relaciones del cargo..."
                  : deleteResolution?.puedeEliminarDefinitivo
                    ? <>Se eliminará <strong>{deleteTarget.nombre}</strong> de forma permanente. Esta acción no se puede deshacer.</>
                    : <><strong>{deleteTarget.nombre}</strong> tiene relaciones activas y solo se puede inactivar.</>}
              </DialogDescription>
            </DialogHeader>
            {deleteResolution && !deleteResolution.puedeEliminarDefinitivo && deleteResolution.bloqueos.length > 0 && (
              <ul className="mt-2 space-y-1.5 ml-1 list-disc text-sm text-slate-700">
                {deleteResolution.bloqueos.map((bloqueo) => (
                  <li key={bloqueo}>{bloqueo}</li>
                ))}
              </ul>
            )}
            <DialogFooter className="mt-4 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setDeleteTarget(null); setDeleteResolution(null); }}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={deleteLoadingId === deleteTarget.id}
                className={deleteResolution?.puedeEliminarDefinitivo ? "rounded-xl bg-rose-600 hover:bg-rose-700 text-white" : "rounded-xl bg-slate-700 hover:bg-slate-800 text-white"}
                onClick={confirmDeleteCargo}
              >
                {deleteResolution?.puedeEliminarDefinitivo ? "Eliminar definitivamente" : "Inactivar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function KpiCard({ icon, label, value, bg, highlight }: {
  icon: React.ReactNode; label: string; value: number; bg: string; highlight?: boolean;
}) {
  return (
    <Card className={`border border-slate-200 shadow-sm rounded-2xl ${highlight ? "ring-1 ring-rose-200" : ""}`}>
      <CardContent className="p-5">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg} mb-3`}>{icon}</div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${highlight ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-[140px]">
      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function DrawerStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {children}
    </div>
  );
}
