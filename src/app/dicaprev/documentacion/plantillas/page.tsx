"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Download,
  FileText,
  Plus,
  Star,
  StarOff,
  Filter,
  Copy,
  ArrowRight,
  LayoutTemplate,
} from "lucide-react";

/* ======================================
   Tipos y datos mock
====================================== */

type TipoPlantilla = "DS44" | "DS67" | "Condominio" | "Formulario" | "General";

type OrigenPlantilla = "DICAPREV" | "Empresa";

type Plantilla = {
  id: string;
  nombre: string;
  tipo: TipoPlantilla;
  origen: OrigenPlantilla;
  descripcion: string;
  etiquetas: string[];
  ultimaActualizacion: string;
  usoUltimos30Dias: number;
  favorito: boolean;
};

const PLANTILLAS_MOCK: Plantilla[] = [
  {
    id: "1",
    nombre: "Matriz IPER DS44 Obra",
    tipo: "DS44",
    origen: "DICAPREV",
    descripcion:
      "Formato base para matriz de identificación de peligros y evaluación de riesgos para centros de trabajo en construcción.",
    etiquetas: ["IPER", "Obras", "Riesgos críticos"],
    ultimaActualizacion: "12-11-2025",
    usoUltimos30Dias: 18,
    favorito: true,
  },
  {
    id: "2",
    nombre: "Reglamento Interno Condominio · Administración",
    tipo: "Condominio",
    origen: "DICAPREV",
    descripcion:
      "Plantilla estructurada para reglamento interno de administración y convivencia en comunidad de edificios o condominios.",
    etiquetas: ["Reglamento", "Condominio"],
    ultimaActualizacion: "03-11-2025",
    usoUltimos30Dias: 7,
    favorito: false,
  },
  {
    id: "3",
    nombre: "Acta Comité Paritario · Sesión mensual",
    tipo: "Formulario",
    origen: "DICAPREV",
    descripcion:
      "Formato estándar para registrar acuerdos, asistentes y compromisos del comité paritario.",
    etiquetas: ["Comité paritario", "Acta"],
    ultimaActualizacion: "01-11-2025",
    usoUltimos30Dias: 25,
    favorito: true,
  },
  {
    id: "4",
    nombre: "Checklist Inspección en Obra",
    tipo: "General",
    origen: "Empresa",
    descripcion:
      "Checklist editable para inspecciones en terreno, orientado a rubro construcción.",
    etiquetas: ["Inspecciones", "Obras"],
    ultimaActualizacion: "29-10-2025",
    usoUltimos30Dias: 11,
    favorito: false,
  },
  {
    id: "5",
    nombre: "Plan de Emergencia Condominio · Básico",
    tipo: "Condominio",
    origen: "DICAPREV",
    descripcion: "Estructura base para desarrollo de planes de emergencia en comunidades.",
    etiquetas: ["Emergencias", "Condominio"],
    ultimaActualizacion: "20-10-2025",
    usoUltimos30Dias: 4,
    favorito: false,
  },
];

/* ======================================
   Componente principal
====================================== */

export default function PlantillasPage() {
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState<string>("todas");
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<TipoPlantilla | "todos">("todos");
  const [plantillas, setPlantillas] = useState<Plantilla[]>(PLANTILLAS_MOCK);
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState<string | null>(
    PLANTILLAS_MOCK[0]?.id ?? null
  );

  const [modalNueva, setModalNueva] = useState(false);
  const [modalUsar, setModalUsar] = useState(false);

  const plantillaSeleccionada = useMemo(
    () => plantillas.find((p) => p.id === plantillaSeleccionadaId) ?? plantillas[0],
    [plantillas, plantillaSeleccionadaId]
  );

  const plantillasFiltradas = useMemo(() => {
    return plantillas.filter((p) => {
      if (tab === "mis-plantillas" && p.origen !== "Empresa") return false;
      if (tab === "dicaprev" && p.origen !== "DICAPREV") return false;
      if (soloFavoritos && !p.favorito) return false;
      if (tipoFiltro !== "todos" && p.tipo !== tipoFiltro) return false;
      if (!busqueda.trim()) return true;

      const query = busqueda.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query) ||
        p.etiquetas.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [plantillas, tab, soloFavoritos, tipoFiltro, busqueda]);

  const toggleFavorito = (id: string) => {
    setPlantillas((prev) => prev.map((p) => (p.id === id ? { ...p, favorito: !p.favorito } : p)));
  };

  // Mock de firmantes para la vista de firmas y aprobación (solo demo UI)
  const firmantesMock = [
    {
      rol: "Prevencionista",
      estado: "Firmado",
      pillClass:
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-600",
      dotClass: "h-1.5 w-1.5 rounded-full bg-emerald-500",
    },
    {
      rol: "Jefatura",
      estado: "Pendiente",
      pillClass:
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[10px] text-amber-600",
      dotClass: "h-1.5 w-1.5 rounded-full bg-amber-400",
    },
    {
      rol: "Representante trabajadores",
      estado: "Enviado",
      pillClass:
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] text-slate-600",
      dotClass: "h-1.5 w-1.5 rounded-full bg-slate-400",
    },
  ] as const;


  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6 text-slate-900">
      {/* HEADER PREMIUM */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Plantillas</h1>
            </div>
            <p className="text-sm text-slate-500 max-w-xl mt-1">
              Centraliza tus formatos de prevención: matrices, reglamentos, actas y checklists listos para usar y
              adaptar a cada cliente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-emerald-100 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100"
              onClick={() => setModalNueva(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva plantilla
            </Button>
            <Button variant="outline" className="border-slate-200">
              <Download className="w-4 h-4 mr-2" />
              Importar desde archivo
            </Button>
          </div>
        </div>

        {/* BARRA DE CONTROL SUPERIOR */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 w-full md:max-w-md">
              <Input
                placeholder="Buscar por nombre, tipo o etiqueta..."
                value={busqueda}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
                className="h-9 text-sm bg-slate-50/60 border-slate-200 focus-visible:ring-emerald-500"
              />
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 text-xs font-medium border-slate-200",
                  soloFavoritos && "bg-amber-50/80 text-amber-700 border-amber-200"
                )}
                onClick={() => setSoloFavoritos((prev) => !prev)}
              >
                {soloFavoritos ? (
                  <>
                    <Star className="w-3.5 h-3.5 mr-1" /> Favoritas
                  </>
                ) : (
                  <>
                    <StarOff className="w-3.5 h-3.5 mr-1" /> Todas
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex text-xs text-slate-500 mr-1">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Filtro rápido:
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={tipoFiltro === "todos" ? "default" : "outline"}
                  className={cn(
                    "text-xs cursor-pointer border-slate-200",
                    tipoFiltro === "todos" && "bg-slate-900 text-slate-50"
                  )}
                  onClick={() => setTipoFiltro("todos")}
                >
                  Todos
                </Badge>
                <Badge
                  variant={tipoFiltro === "DS44" ? "default" : "outline"}
                  className={cn(
                    "text-xs cursor-pointer border-emerald-200",
                    tipoFiltro === "DS44" && "bg-emerald-600 text-emerald-50"
                  )}
                  onClick={() => setTipoFiltro("DS44")}
                >
                  DS44
                </Badge>
                <Badge
                  variant={tipoFiltro === "DS67" ? "default" : "outline"}
                  className={cn(
                    "text-xs cursor-pointer border-sky-200",
                    tipoFiltro === "DS67" && "bg-sky-600 text-sky-50"
                  )}
                  onClick={() => setTipoFiltro("DS67")}
                >
                  DS67
                </Badge>
                <Badge
                  variant={tipoFiltro === "Condominio" ? "default" : "outline"}
                  className={cn(
                    "text-xs cursor-pointer border-indigo-200",
                    tipoFiltro === "Condominio" && "bg-indigo-600 text-indigo-50"
                  )}
                  onClick={() => setTipoFiltro("Condominio")}
                >
                  Condominios
                </Badge>
                <Badge
                  variant={tipoFiltro === "Formulario" ? "default" : "outline"}
                  className={cn(
                    "text-xs cursor-pointer border-fuchsia-200",
                    tipoFiltro === "Formulario" && "bg-fuchsia-600 text-fuchsia-50"
                  )}
                  onClick={() => setTipoFiltro("Formulario")}
                >
                  Formularios
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CONTENIDO PRINCIPAL: LISTA + PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] gap-4 xl:gap-6 items-start">
        {/* LISTA DE PLANTILLAS */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Biblioteca de plantillas
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Filtra por origen, tipo o favoritos. Haz clic para ver el detalle y usar la plantilla.
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[11px] px-2 py-0.5 border-emerald-100 bg-emerald-50/60 text-emerald-700"
              >
                {plantillasFiltradas.length} plantillas
              </Badge>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="mt-3">
              <TabsList className="grid grid-cols-3 bg-slate-100/80 h-9">
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="dicaprev">Catálogo DICAPREV</TabsTrigger>
                <TabsTrigger value="mis-plantillas">Mis plantillas</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="h-[420px] pr-2 overflow-y-auto">
              <div className="flex flex-col divide-y divide-slate-100">
                {plantillasFiltradas.length === 0 && (
                  <div className="py-10 flex flex-col items-center justify-center text-center text-sm text-slate-500">
                    <FileText className="w-8 h-8 mb-2 text-slate-300" />
                    <p>No se encontraron plantillas con los filtros actuales.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs border-slate-200"
                      onClick={() => {
                        setBusqueda("");
                        setSoloFavoritos(false);
                        setTipoFiltro("todos");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}

                {plantillasFiltradas.map((plantilla) => {
                  const seleccionada = plantillaSeleccionada?.id === plantilla.id;
                  return (
                    <button
                      key={plantilla.id}
                      onClick={() => setPlantillaSeleccionadaId(plantilla.id)}
                      className={cn(
                        "w-full text-left px-3 py-3.5 flex flex-col gap-1.5 transition-all",
                        "hover:bg-slate-50",
                        seleccionada &&
                          "bg-emerald-50/60 hover:bg-emerald-50/80 border-l-2 border-emerald-500"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">{plantilla.nombre}</p>
                            {plantilla.origen === "DICAPREV" && (
                              <Badge className="text-[10px] px-1.5 py-0 h-5 bg-slate-900 text-slate-50">
                                DICAPREV
                              </Badge>
                            )}
                            {plantilla.origen === "Empresa" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 border-emerald-200 text-emerald-700 bg-emerald-50/60"
                              >
                                Empresa
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{plantilla.descripcion}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-5 border-slate-200",
                              plantilla.tipo === "DS44" &&
                                "border-emerald-200 text-emerald-700 bg-emerald-50/70",
                              plantilla.tipo === "DS67" && "border-sky-200 text-sky-700 bg-sky-50/70",
                              plantilla.tipo === "Condominio" &&
                                "border-indigo-200 text-indigo-700 bg-indigo-50/70",
                              plantilla.tipo === "Formulario" &&
                                "border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50/70"
                            )}
                          >
                            {plantilla.tipo}
                          </Badge>

                          <button
                            type="button"
                            className={cn(
                              "mt-1 inline-flex items-center justify-center rounded-full border px-1.5 py-0.5",
                              "border-transparent text-slate-400 hover:text-amber-500 hover:border-amber-200 transition-colors",
                              plantilla.favorito && "text-amber-500 border-amber-200 bg-amber-50/70"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorito(plantilla.id);
                            }}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {plantilla.etiquetas.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5 border-slate-200 text-slate-500"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] text-slate-400">
                            Actualizada: {plantilla.ultimaActualizacion}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {plantilla.usoUltimos30Dias} usos · 30 días
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PANEL DE PREVISUALIZACIÓN */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-white text-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-1">
                  Vista previa de plantilla
                </p>
                <h2 className="text-lg font-semibold truncate flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {plantillaSeleccionada?.nombre}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 border-emerald-300 text-emerald-100 bg-emerald-600/40"
                  >
                    {plantillaSeleccionada?.tipo}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 border-slate-500 text-slate-100 bg-slate-800/80"
                  >
                    {plantillaSeleccionada?.origen === "DICAPREV"
                      ? "Catálogo DICAPREV"
                      : "Plantilla de la empresa"}
                  </Badge>
                  <span className="text-[10px] text-slate-300">
                    {plantillaSeleccionada?.usoUltimos30Dias} usos en los últimos 30 días
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs px-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                  onClick={() => setModalUsar(true)}
                >
                  Usar plantilla
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-slate-600 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-slate-600 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col lg:flex-row h-[520px]">
            {/* Columna izquierda: resumen */}
            <div className="w-full lg:w-[42%] border-r border-slate-100 p-4 flex flex-col gap-4 bg-slate-50/60">
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-[0.16em] mb-2">
                  Resumen de la estructura
                </h3>
                <p className="text-xs text-slate-600 mb-3">{plantillaSeleccionada?.descripcion}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {plantillaSeleccionada?.etiquetas.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5 border-slate-200 text-slate-600"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Última actualización: {plantillaSeleccionada?.ultimaActualizacion}
                </p>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-[0.16em]">
                  Secciones principales
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Portada y datos generales del centro de trabajo / condominio.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Definiciones, alcance y responsabilidades clave.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Estructura de matrices, tablas o campos a completar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Firmas, responsables y registro de aprobación.</span>
                  </li>
                </ul>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-[0.16em]">Listo para</h4>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    Generar documento DS44
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    Asociar a obra / centro
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    Descargar Word / PDF
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    Compartir con cliente
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: preview tipo documento */}
            <div className="flex-1 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
                    Mock de documento
                  </span>
                  <span className="text-xs text-slate-500">
                    Vista rápida del formato. En producción aquí se renderiza el documento real.
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 border-slate-200 text-slate-500 bg-slate-50"
                >
                  DEMO · MOCK UI
                </Badge>
              </div>

              <div className="relative h-[430px] rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
                  {/* Barra tipo "documento" */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/80 rounded-t-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                      </div>
                      <span className="text-[11px] text-slate-500 truncate">
                        {plantillaSeleccionada?.nombre} · {plantillaSeleccionada?.tipo}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Solo lectura</span>
                  </div>

                  {/* Contenido simulado */}
                  <div className="flex-1 px-5 py-3 text-[11px] text-slate-600 overflow-hidden">
                    <div className="mb-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.16em] mb-1">
                        Cabecera del documento
                      </p>
                      <div className="grid grid-cols-[1.2fr_1fr] gap-3 mb-3">
                        <div className="space-y-1">
                          <div className="h-3 w-32 rounded bg-slate-100" />
                          <div className="h-2 w-40 rounded bg-slate-100" />
                          <div className="h-2 w-28 rounded bg-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-full rounded bg-slate-100" />
                          <div className="h-2 w-3/4 rounded bg-slate-100" />
                          <div className="h-2 w-2/3 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100 mb-3" />

                    <div className="mb-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.16em] mb-1">
                        Cuerpo principal / Tabla
                      </p>
                      <div className="w-full rounded-md border border-slate-200 overflow-hidden">
                        <div className="grid grid-cols-[1.6fr_1.2fr_1.2fr_0.9fr] bg-slate-50 border-b border-slate-200">
                          {["Peligro / actividad", "Riesgo", "Medidas de control", "Nivel"].map((col) => (
                            <div
                              key={col}
                              className="px-2 py-1.5 text-[10px] font-medium text-slate-600 border-r border-slate-200 last:border-r-0"
                            >
                              {col}
                            </div>
                          ))}
                        </div>
                        {[1, 2, 3, 4].map((row) => (
                          <div
                            key={row}
                            className="grid grid-cols-[1.6fr_1.2fr_1.2fr_0.9fr] border-b border-slate-100 last:border-b-0"
                          >
                            <div className="px-2 py-1.5 border-r border-slate-100">
                              <div className="h-2 w-full rounded bg-slate-100 mb-1" />
                              <div className="h-2 w-2/3 rounded bg-slate-100" />
                            </div>
                            <div className="px-2 py-1.5 border-r border-slate-100">
                              <div className="h-2 w-full rounded bg-slate-100 mb-1" />
                              <div className="h-2 w-1/2 rounded bg-slate-100" />
                            </div>
                            <div className="px-2 py-1.5 border-r border-slate-100">
                              <div className="h-2 w-full rounded bg-slate-100 mb-1" />
                              <div className="h-2 w-5/6 rounded bg-slate-100" />
                            </div>
                            <div className="px-2 py-1.5 flex items-center justify-center">
                              <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700">
                                M
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.16em] mb-1">
                        Firmas y aprobación
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {firmantesMock.map((f) => (
                          <div
                            key={f.rol}
                            className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2 flex flex-col"
                          >
                            <div className="h-8 border-b border-dashed border-slate-300" />
                            <p className="text-[10px] text-slate-600 text-center leading-snug">{f.rol}</p>
                            <span className={f.pillClass}>
                              <span className={f.dotClass} />
                              <span>{f.estado}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span>
                Cuando uses esta plantilla podrás editar todo el contenido y asociarlo a una obra, centro de trabajo o
                condominio.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-slate-200"
                onClick={() => setModalUsar(true)}
              >
                Configurar antes de usar
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs px-3 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => setModalUsar(true)}
              >
                Usar ahora
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* MODAL NUEVA PLANTILLA */}
      <Dialog open={modalNueva} onOpenChange={setModalNueva}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear nueva plantilla</DialogTitle>
            <DialogDescription>
              Define una estructura base para reutilizar en diferentes clientes, obras o condominios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre de la plantilla</Label>
              <Input id="nombre" placeholder="Ej. Matriz IPER DS44 · Obra estándar" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {["DS44", "DS67", "Condominio", "Formulario"].map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-left hover:bg-slate-100"
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Origen</Label>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <Checkbox id="origen-empresa" defaultChecked />
                    <Label htmlFor="origen-empresa" className="text-xs font-normal">
                      Plantilla propia de la empresa
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="origen-base" />
                    <Label htmlFor="origen-base" className="text-xs font-normal">
                      Duplicar una del catálogo DICAPREV
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción interna</Label>
              <textarea
                className="w-full min-h-[72px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                placeholder="Describe brevemente en qué casos se debe usar esta plantilla."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-600">
              Cancelar
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Guardar plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL USAR PLANTILLA */}
      <Dialog open={modalUsar} onOpenChange={setModalUsar}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>¿Qué quieres hacer con esta plantilla?</DialogTitle>
            <DialogDescription>
              Define rápidamente cómo la vas a usar. Después podrás editar el documento completo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm text-slate-700">
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Acción rápida</Label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left hover:bg-emerald-100">
                  Generar documento ahora
                  <p className="mt-1 text-[10px] text-emerald-800">
                    Se crea un documento editable con esta estructura.
                  </p>
                </button>
                <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
                  Asociar a obra / centro
                  <p className="mt-1 text-[10px] text-slate-600">
                    Elige una obra o condominio y vincula el documento.
                  </p>
                </button>
                <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
                  Descargar Word / PDF
                  <p className="mt-1 text-[10px] text-slate-600">
                    Genera el archivo para trabajar offline o compartir.
                  </p>
                </button>
                <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
                  Duplicar y editar campos
                  <p className="mt-1 text-[10px] text-slate-600">
                    Crea una variante de esta plantilla para otro cliente.
                  </p>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-600">
              Cerrar
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
