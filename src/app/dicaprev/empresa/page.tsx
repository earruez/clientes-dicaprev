"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Users, Building2, ShieldCheck, TriangleAlert, MapPin, UserCheck, Activity, Sparkles, CheckCircle2, Briefcase, ChevronRight } from "lucide-react";
import { calcularTamañoEmpresa, type TamanoEmpresa } from "@/lib/cumplimiento/cumplimiento-engine";
import { cn } from "@/lib/utils";
import {
  HeaderSection,
  InfoCard,
  EditCompanyModal,
  SSTIndicatorsTab,
  SSTConfigCard,
  EditSSTIndicatorsModal,
  EstructurasObligatoriasCard,
} from "@/components/company";
import type { SSTIndicatorValues } from "@/components/company";
import { DEFAULT_SST_VALUES } from "@/components/company/EditSSTIndicatorsModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  PrimaryAction,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PLANTILLAS,
  TIPOS_EMPRESA,
  type TipoEmpresa,
  type PlantillaModo,
} from "@/lib/empresa/plantillas";
import {
  empresaStore,
  applyEmpresaTemplate,
  clearEmpresaTemplate,
} from "@/lib/empresa/empresa-store";

interface CompanyData {
  razonSocial: string;
  rut: string;
  tipoEmpresa: string;
  representante: string;
  rutRepresentante: string;
  direccion: string;
  comuna: string;
  region: string;
  comiteParitario: boolean;
  expertoPrevencion: boolean;
  departamentoPrevencion: boolean;
  organismoAdministrador: string;
  rubroEmpresa: string;
  cantidadTrabajadores: number;
}

const INITIAL_COMPANY_DATA: CompanyData = {
  razonSocial: "MVP CHILE SPA",
  rut: "76.653.076-1",
  tipoEmpresa: "Privada",
  representante: "Jorge Mena Contreras",
  rutRepresentante: "11.234.567-8",
  direccion: "Avenida Irarrázabal 5185, oficina 503",
  comuna: "Ñuñoa",
  region: "Metropolitana de Santiago",
  comiteParitario: false,
  expertoPrevencion: false,
  departamentoPrevencion: false,
  organismoAdministrador: "ACHS",
  rubroEmpresa: "Fabricación e instalación de ventanas de PVC y aluminio",
  cantidadTrabajadores: 5,
};

const COMPANY_STATS = [
  {
    id: "trabajadores",
    title: "Trabajadores",
    value: 5,
    icon: <Users className="h-6 w-6 text-emerald-600" />,
    description: "Personal activo en la compañía",
  },
  {
    id: "centros",
    title: "Centros de trabajo",
    value: 1,
    icon: <Building2 className="h-6 w-6 text-slate-700" />,
    description: "Centros operativos actualmente",
  },
  {
    id: "cumplimiento",
    title: "Cumplimiento",
    value: "82%",
    icon: <ShieldCheck className="h-6 w-6 text-emerald-600" />,
    description: "Meta de seguridad en curso",
    progress: 82,
  },
  {
    id: "riesgo",
    title: "Nivel de riesgo",
    value: "Bajo",
    icon: <TriangleAlert className="h-6 w-6 text-amber-500" />,
    description: "Categoría asignada SST",
    statusLabel: "Bajo",
    statusColor: "bg-emerald-500",
  },
  {
    id: "accidentabilidad",
    title: "Tasa accidentabilidad",
    value: "0.82%",
    icon: <Activity className="h-6 w-6 text-blue-600" />,
    description: "Últimos 12 meses",
  },
  {
    id: "siniestralidad",
    title: "Tasa siniestralidad",
    value: "1.55%",
    icon: <Activity className="h-6 w-6 text-orange-600" />,
    description: "Incidentes por 100 trabajadores",
  },
];

const TAB_ITEMS = [
  { value: "general", label: "Información General" },
  { value: "sst", label: "Indicadores SST" },
  { value: "estructura", label: "Estructura" },
  { value: "plantilla", label: "Plantilla Inicial" },
];

const TAMANO_CFG: Record<TamanoEmpresa, { label: string; cls: string }> = {
  micro:   { label: "Micro",    cls: "bg-slate-100 text-slate-600" },
  pequena: { label: "Pequeña",  cls: "bg-amber-100 text-amber-700" },
  mediana: { label: "Mediana",  cls: "bg-blue-100 text-blue-700" },
  grande:  { label: "Grande",   cls: "bg-violet-100 text-violet-700" },
};

const GENERAL_EDIT_SECTIONS = [
  "Empresa",
  "Identificación Empresa",
  "Representante Legal",
  "Ubicación",
  "Configuración SST",
] as const;

export default function CompanyPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [companyData, setCompanyData] = useState<CompanyData>(INITIAL_COMPANY_DATA);
  const [sstValues, setSstValues] = useState<SSTIndicatorValues[]>(DEFAULT_SST_VALUES);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const isGeneralEditSection = editingSection ? GENERAL_EDIT_SECTIONS.includes(editingSection as typeof GENERAL_EDIT_SECTIONS[number]) : false;

  // ── Plantilla Inicial ──────────────────────────────────────────────── //
  const [selectedTipo, setSelectedTipo] = useState<TipoEmpresa | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [plantillaAplicada, setPlantillaAplicada] = useState<TipoEmpresa | null>(null);

  useEffect(() => {
    empresaStore.init();
    setPlantillaAplicada(empresaStore.getActivePlantillaTipo());
  }, []);

  const handleAplicarPlantilla = (modo: PlantillaModo) => {
    if (!selectedTipo) return;
    applyEmpresaTemplate(selectedTipo, modo);
    setPlantillaAplicada(selectedTipo);
    setConfirmOpen(false);
    setSelectedTipo(null);
  };

  const handleCambiarPlantilla = () => {
    clearEmpresaTemplate();
    setPlantillaAplicada(null);
    setSelectedTipo(null);
    setConfirmOpen(false);
  };

  const openEditModal = (section: string) => {
    setEditingSection(section);
    setOpenEdit(true);
  };

  const closeEditModal = () => {
    setOpenEdit(false);
    setEditingSection(null);
  };

  const handleSaveCompany = (data: CompanyData) => {
    setCompanyData(data);
    console.log("Guardando datos de empresa:", data);
  };

  const handleSaveSSTValues = (values: SSTIndicatorValues[]) => {
    setSstValues(values);
  };

  const handleSave = () => {
    setOpenEdit(false);
    setEditingSection(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <HeaderSection
          title="Empresa"
          subtitle="Gestión de información general y cumplimiento SST"
          onEdit={() => openEditModal("Empresa")}
        />

        {/* KPIs Superiores */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {COMPANY_STATS.map((stat) => (
            <div
              key={stat.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  {stat.icon}
                </div>
                {stat.statusLabel ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {stat.statusLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                {stat.title}
              </p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
              </div>
              {stat.progress !== undefined ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Avance</span>
                    <span>{stat.progress}%</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stat.progress}%` }} />
                  </div>
                </div>
              ) : (
                stat.description ? (
                  <p className="mt-5 text-sm text-slate-500">{stat.description}</p>
                ) : null
              )}
            </div>
          ))}
        </div>

        {/* Tabs de navegación */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center mb-6">
            {TAB_ITEMS.map((tab) => {
              const isActive = tab.value === activeTab;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`min-w-[170px] rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-200 pt-6">
            {activeTab === "general" && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <InfoCard
                  title="Identificación Empresa"
                  icon={<Building2 className="h-5 w-5 text-emerald-600" />}
                  onEdit={() => openEditModal("Identificación Empresa")}
                  className="xl:col-span-2"
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Razón social</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.razonSocial}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">RUT empresa</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.rut}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Tipo de empresa</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.tipoEmpresa}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Rubro</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.rubroEmpresa}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Dotación</p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">{companyData.cantidadTrabajadores}</p>
                        <span className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          TAMANO_CFG[calcularTamañoEmpresa(companyData.cantidadTrabajadores)].cls
                        )}>
                          {TAMANO_CFG[calcularTamañoEmpresa(companyData.cantidadTrabajadores)].label}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Región</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.region}</p>
                    </div>
                  </div>
                </InfoCard>

                <InfoCard
                  title="Representante Legal"
                  icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
                  onEdit={() => openEditModal("Representante Legal")}
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Nombre</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.representante}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">RUT</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.rutRepresentante}</p>
                    </div>
                  </div>
                </InfoCard>

                <InfoCard
                  title="Ubicación"
                  icon={<MapPin className="h-5 w-5 text-emerald-600" />}
                  onEdit={() => openEditModal("Ubicación")}
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Dirección completa</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {companyData.direccion}, {companyData.comuna}, {companyData.region}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Comuna</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.comuna}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Región</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.region}</p>
                    </div>
                  </div>
                </InfoCard>

                <SSTConfigCard
                  comiteParitario={companyData.comiteParitario}
                  expertoPrevencion={companyData.expertoPrevencion}
                  departamentoPrevencion={companyData.departamentoPrevencion}
                  organismoAdministrador={companyData.organismoAdministrador}
                  clasificacionRiesgo="Bajo"
                  cantidadTrabajadores={companyData.cantidadTrabajadores}
                  onEdit={() => openEditModal("Configuración SST")}
                  className="xl:col-span-3"
                />

                <EstructurasObligatoriasCard
                  cantidadTrabajadores={companyData.cantidadTrabajadores}
                  estadoActual={{
                    reglamentoInterno:       companyData.departamentoPrevencion || companyData.comiteParitario,
                    comiteParitario:         companyData.comiteParitario,
                    departamentoPrevencion:  companyData.departamentoPrevencion,
                    programaAnual:           companyData.expertoPrevencion,
                    expertoPrevencion:       companyData.expertoPrevencion,
                    investigacionAccidentes: true,
                    planCapacitacion:        companyData.expertoPrevencion,
                  }}
                  className="xl:col-span-3"
                />
              </div>
            )}

            {activeTab === "sst" && (
              <SSTIndicatorsTab onEdit={() => openEditModal("Indicadores SST")} values={sstValues} />
            )}

            {activeTab === "plantilla" && (
              <div className="space-y-6">
                {/* Section header */}
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-slate-500" />
                    <h3 className="text-base font-semibold text-slate-900">Tipo de empresa</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Selecciona el tipo de empresa para cargar la estructura organizacional sugerida (Áreas y Cargos).
                    Podrás ajustarla libremente después.
                  </p>
                </div>

                {/* Applied banner */}
                {plantillaAplicada && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-900">
                        Estructura aplicada: <span className="font-bold">{plantillaAplicada}</span>
                      </p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Los módulos de Áreas y Cargos reflejan esta plantilla. Puedes editar libremente desde allí.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href="/dicaprev/empresa/areas"
                        className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        Ver Áreas
                      </a>
                      <a
                        href="/dicaprev/empresa/cargos"
                        className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        Ver Cargos
                      </a>
                      <button
                        type="button"
                        onClick={handleCambiarPlantilla}
                        className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700 transition"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}

                {/* Type cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TIPOS_EMPRESA.map((tipo) => {
                    const p = PLANTILLAS[tipo];
                    const isSelected = selectedTipo === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => {
                          setSelectedTipo(tipo);
                          setConfirmOpen(false);
                        }}
                        className={`group flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all duration-150 ${
                          isSelected
                            ? `${p.colorBorder} ${p.colorBg} shadow-sm ring-2 ring-offset-1`
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <span className={`text-sm font-bold ${isSelected ? p.colorText : "text-slate-800"}`}>
                          {p.label}
                        </span>
                        <span className="text-xs leading-relaxed text-slate-500">{p.descripcion}</span>
                        <div className="mt-1 flex gap-3 text-xs text-slate-400">
                          <span>{p.areas.length} áreas</span>
                          <span>·</span>
                          <span>{p.cargos.length} cargos</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Preview panel */}
                {selectedTipo && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Estructura sugerida — {selectedTipo}
                      </h4>
                      <span className="text-xs text-slate-400">
                        {PLANTILLAS[selectedTipo].areas.length} áreas · {PLANTILLAS[selectedTipo].cargos.length} cargos
                      </span>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {/* Areas */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Áreas</p>
                        <ul className="space-y-1">
                          {PLANTILLAS[selectedTipo].areas.map((a) => (
                            <li key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                              {a.nombre}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cargos */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Cargos</p>
                        <ul className="space-y-1">
                          {PLANTILLAS[selectedTipo].cargos.map((c) => (
                            <li key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                              <span>{c.nombre}</span>
                              {c.requiereDS44 && (
                                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">DS44</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Open confirm dialog */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
                      >
                        Cargar estructura sugerida
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "estructura" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                  <div className="mb-4 flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Arquitectura</p>
                    <h3 className="text-lg font-semibold text-slate-900">Módulos de Estructura</h3>
                    <p className="text-sm text-slate-500">
                      Acceso directo a los módulos oficiales de estructura organizacional.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: "Áreas", href: "/dicaprev/empresa/areas", icon: <Building2 className="h-4 w-4" />, description: "Unidades organizacionales" },
                      { label: "Cargos", href: "/dicaprev/empresa/cargos", icon: <Users className="h-4 w-4" />, description: "Roles y perfiles" },
                      { label: "Dotación", href: "/dicaprev/empresa/puestos", icon: <Briefcase className="h-4 w-4" />, description: "Posiciones por centro" },
                      { label: "Trabajadores", href: "/dicaprev/trabajadores", icon: <Users className="h-4 w-4" />, description: "Personas y asignación" },
                      { label: "Centros de trabajo", href: "/dicaprev/empresa/centrotrabajo", icon: <MapPin className="h-4 w-4" />, description: "Vista ejecutiva por centro", featured: true },
                      { label: "Organigrama", href: "/dicaprev/empresa/organigrama", icon: <UserCheck className="h-4 w-4" />, description: "Estructura jerárquica" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                          item.featured
                            ? "border-emerald-200 bg-emerald-50/70"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.featured ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {item.icon}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <InfoCard
                  title="Centros de Trabajo"
                  icon={<Building2 className="h-5 w-5 text-emerald-600" />}
                  onEdit={() => openEditModal("Centros de Trabajo")}
                >
                  <div className="grid gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Centros activos</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">4 centros</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Región principal</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{companyData.region}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Última actualización</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">Q1 2026</p>
                    </div>
                  </div>
                </InfoCard>

                <InfoCard
                  title="Equipo SST"
                  icon={<Users className="h-5 w-5 text-emerald-600" />}
                  onEdit={() => openEditModal("Equipo SST")}
                >
                  <div className="grid gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Colaboradores SST</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">6 personas</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Estructura</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">Proceso definido</p>
                    </div>
                  </div>
                </InfoCard>

                <InfoCard
                  title="Organigrama"
                  icon={<UserCheck className="h-5 w-5 text-emerald-600" />}
                  onEdit={() => openEditModal("Organigrama")}
                >
                  <div className="grid gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Estado</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">Actualizado</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Última revisión</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">Marzo 2026</p>
                    </div>
                  </div>
                </InfoCard>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Confirm Plantilla Dialog ── */}
        {selectedTipo && (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent size="lg" withClose>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Sparkles className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      Cargar estructura — {selectedTipo}
                    </DialogTitle>
                    <DialogDescription>
                      {PLANTILLAS[selectedTipo].areas.length} áreas &middot;{" "}
                      {PLANTILLAS[selectedTipo].cargos.length} cargos se incorporarán a tu empresa.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Preview grid */}
              <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 max-h-[52vh] overflow-y-auto pr-1">
                {/* Áreas */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Áreas ({PLANTILLAS[selectedTipo].areas.length})
                  </p>
                  <ul className="space-y-2">
                    {PLANTILLAS[selectedTipo].areas.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{a.nombre}</p>
                          <p className="text-[11px] font-mono text-slate-400">{a.codigo}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cargos */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Cargos ({PLANTILLAS[selectedTipo].cargos.length})
                  </p>
                  <ul className="space-y-2">
                    {PLANTILLAS[selectedTipo].cargos.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-800 leading-snug">{c.nombre}</p>
                            {c.requiereDS44 && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">DS44</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{c.tipo}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Mode explanation */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-700">Reemplazar:</strong> elimina la estructura actual y carga solo la plantilla.{" "}
                <strong className="text-slate-700">Agregar:</strong> incorpora las áreas y cargos nuevos sin tocar los que ya existen.
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <button
                  type="button"
                  onClick={() => handleAplicarPlantilla("agregar")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Agregar a la actual
                </button>
                <button
                  type="button"
                  onClick={() => handleAplicarPlantilla("reemplazar")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Reemplazar estructura
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <EditCompanyModal
          open={openEdit && isGeneralEditSection}
          editingSection={editingSection ?? "Empresa"}
          onClose={closeEditModal}
          onSave={handleSaveCompany}
          initialData={companyData}
        />

        <EditSSTIndicatorsModal
          open={openEdit && editingSection === "Indicadores SST"}
          onClose={closeEditModal}
          onSave={handleSaveSSTValues}
          initialValues={sstValues}
        />

        <Dialog open={openEdit && !isGeneralEditSection && editingSection !== "Indicadores SST"} onOpenChange={setOpenEdit}>
          <DialogContent size="md" withClose>
            <DialogHeader>
              <DialogTitle>{editingSection ? `Editar ${editingSection}` : "Editar sección"}</DialogTitle>
              <DialogDescription>
                Funcionalidad adicional próximamente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <PrimaryAction type="button" onClick={handleSave}>
                Guardar cambios
              </PrimaryAction>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
