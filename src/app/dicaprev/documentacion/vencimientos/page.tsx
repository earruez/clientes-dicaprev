"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  FileText,
  Filter,
  Search,
  Building2,
  HardHat,
  Users,
  ShieldCheck,
} from "lucide-react";

// Fix TS para TabsTrigger + className
const AnyTabsTrigger = TabsTrigger as any;

/* ===================== Tipos & Mock data ===================== */

type EstadoVencimiento = "Vigente" | "Por vencer" | "Vencido";
type OrigenDocumento = "Centro de trabajo" | "Contratista" | "Trabajador";
type NivelRiesgo = "Alto" | "Medio" | "Bajo";
type CategoriaDocumento =
  | "Documentación legal"
  | "Laboral y previsional"
  | "Seguridad y salud"
  | "Equipos y seguros";

type DocumentoVencimiento = {
  id: string;
  nombre: string;
  tipoDocumento: string;
  origen: OrigenDocumento;
  relacionadoCon: string;
  categoria: CategoriaDocumento;
  fechaVencimiento: string; // dd-mm-aaaa
  diasRestantes: number; // negativo = vencido
  estado: EstadoVencimiento;
  riesgo: NivelRiesgo;
};

const DOCUMENTOS_MOCK: DocumentoVencimiento[] = [
  {
    id: "1",
    nombre: "Contrato de prestación de servicios 2025",
    tipoDocumento: "Contrato marco",
    origen: "Contratista",
    relacionadoCon: "MVP CHILE SPA",
    categoria: "Documentación legal",
    fechaVencimiento: "20-11-2025",
    diasRestantes: 5,
    estado: "Por vencer",
    riesgo: "Alto",
  },
  {
    id: "2",
    nombre: "Certificado pago cotizaciones octubre",
    tipoDocumento: "Certificado previsional",
    origen: "Contratista",
    relacionadoCon: "Montajes del Sur Ltda.",
    categoria: "Laboral y previsional",
    fechaVencimiento: "18-11-2025",
    diasRestantes: 3,
    estado: "Por vencer",
    riesgo: "Alto",
  },
  {
    id: "3",
    nombre: "Protocolo de trabajo en altura",
    tipoDocumento: "Procedimiento de seguridad",
    origen: "Centro de trabajo",
    relacionadoCon: "Obra · Condominio Los Álamos",
    categoria: "Seguridad y salud",
    fechaVencimiento: "10-11-2025",
    diasRestantes: -5,
    estado: "Vencido",
    riesgo: "Medio",
  },
  {
    id: "4",
    nombre: "Capacitación uso de arnés · Juan Pérez",
    tipoDocumento: "Capacitación",
    origen: "Trabajador",
    relacionadoCon: "Juan Pérez · Andamiero",
    categoria: "Seguridad y salud",
    fechaVencimiento: "28-11-2025",
    diasRestantes: 13,
    estado: "Por vencer",
    riesgo: "Medio",
  },
  {
    id: "5",
    nombre: "Mantención compresor neumático",
    tipoDocumento: "Mantención equipos",
    origen: "Centro de trabajo",
    relacionadoCon: "Obra · Mall Costanera Sur",
    categoria: "Equipos y seguros",
    fechaVencimiento: "02-12-2025",
    diasRestantes: 17,
    estado: "Vigente",
    riesgo: "Bajo",
  },
  {
    id: "6",
    nombre: "Póliza de responsabilidad civil contratista",
    tipoDocumento: "Seguro",
    origen: "Contratista",
    relacionadoCon: "Ingeniería Norte SpA",
    categoria: "Equipos y seguros",
    fechaVencimiento: "01-12-2025",
    diasRestantes: 16,
    estado: "Por vencer",
    riesgo: "Alto",
  },
];

/* ===================== Helpers UI ===================== */

function getEstadoBadgeColor(estado: EstadoVencimiento) {
  switch (estado) {
    case "Vigente":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "Por vencer":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "Vencido":
      return "bg-red-50 text-red-700 border border-red-100";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRiesgoBadgeColor(riesgo: NivelRiesgo) {
  switch (riesgo) {
    case "Alto":
      return "bg-red-50 text-red-700 border border-red-100";
    case "Medio":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "Bajo":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getOrigenIcon(origen: OrigenDocumento) {
  switch (origen) {
    case "Centro de trabajo":
      return <Building2 className="w-4 h-4" />;
    case "Contratista":
      return <HardHat className="w-4 h-4" />;
    case "Trabajador":
      return <Users className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

/* ===================== Componente principal ===================== */

export default function VencimientosPage() {
  const [busqueda, setBusqueda] = useState("");
  const [ventanaDias, setVentanaDias] = useState<string>("30");
  const [soloCriticos, setSoloCriticos] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "porVencer" | "vencidos">("todos");
  const [tabActiva, setTabActiva] = useState("general");
  const [documentoSeleccionado, setDocumentoSeleccionado] =
    useState<DocumentoVencimiento | null>(null);

  /* KPIs */
  const { total, vencidos, porVencer7, porVencer30 } = useMemo(() => {
    const totalDocs = DOCUMENTOS_MOCK.length;
    const vencidosDocs = DOCUMENTOS_MOCK.filter((d) => d.estado === "Vencido").length;
    const porVencer7Docs = DOCUMENTOS_MOCK.filter(
      (d) => d.diasRestantes >= 0 && d.diasRestantes <= 7
    ).length;
    const porVencer30Docs = DOCUMENTOS_MOCK.filter(
      (d) => d.diasRestantes >= 0 && d.diasRestantes <= 30
    ).length;

    return {
      total: totalDocs,
      vencidos: vencidosDocs,
      porVencer7: porVencer7Docs,
      porVencer30: porVencer30Docs,
    };
  }, []);

  /* Filtros */
  const documentosFiltrados = useMemo(() => {
    return DOCUMENTOS_MOCK.filter((doc) => {
      if (busqueda.trim()) {
        const term = busqueda.toLowerCase();
        const texto = `${doc.nombre} ${doc.tipoDocumento} ${doc.relacionadoCon} ${doc.origen} ${doc.categoria}`.toLowerCase();
        if (!texto.includes(term)) return false;
      }

      if (ventanaDias !== "all") {
        const limite = parseInt(ventanaDias, 10);
        if (doc.diasRestantes > limite) return false;
      }

      if (soloCriticos && doc.riesgo !== "Alto") return false;

      if (filtroEstado === "porVencer" && doc.estado !== "Por vencer") return false;
      if (filtroEstado === "vencidos" && doc.estado !== "Vencido") return false;

      return true;
    });
  }, [busqueda, ventanaDias, soloCriticos, filtroEstado]);

  /* Agrupaciones */
  const documentosPorOrigen = useMemo(() => {
    const base: Record<OrigenDocumento, DocumentoVencimiento[]> = {
      "Centro de trabajo": [],
      Contratista: [],
      Trabajador: [],
    };

    documentosFiltrados.forEach((d) => {
      base[d.origen].push(d);
    });

    return base;
  }, [documentosFiltrados]);

  const categorias: CategoriaDocumento[] = [
    "Documentación legal",
    "Laboral y previsional",
    "Seguridad y salud",
    "Equipos y seguros",
  ];

  const documentosPorCategoria = useMemo(() => {
    const result: Record<CategoriaDocumento, DocumentoVencimiento[]> = {
      "Documentación legal": [],
      "Laboral y previsional": [],
      "Seguridad y salud": [],
      "Equipos y seguros": [],
    };

    documentosFiltrados.forEach((doc) => {
      result[doc.categoria].push(doc);
    });

    return result;
  }, [documentosFiltrados]);

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Vencimientos &amp; alertas
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Vista consolidada de todos los documentos críticos que vencen en tus centros de trabajo,
              contratistas y trabajadores.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Modo Pro · Vencimientos activos
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-slate-200 text-xs h-8"
            >
              Exportar resumen
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Total documentos monitoreados
              </p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{total}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-2">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500">
            Incluye centros de trabajo, contratistas y trabajadores.
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Próx. 7 días
              </p>
              <p className="text-2xl font-semibold text-amber-600 mt-1">{porVencer7}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-2">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500">
            Revisa estos documentos hoy mismo.
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Próx. 30 días
              </p>
              <p className="text-2xl font-semibold text-emerald-700 mt-1">{porVencer30}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-2">
              <CalendarDays className="w-5 h-5 text-emerald-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500">
            Ideal para planificar renovaciones.
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Vencidos
              </p>
              <p className="text-2xl font-semibold text-red-600 mt-1">{vencidos}</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500">
            Prioriza estos documentos para evitar riesgos.
          </CardContent>
        </Card>
      </div>

      {/* FILTROS + TABS */}
      <Card className="border-none shadow-sm rounded-2xl bg-white">
        <CardHeader className="pb-3 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="w-4 h-4" />
              <span>Filtra vencimientos según horizonte, estado y criticidad.</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Button
                variant={filtroEstado === "todos" ? "default" : "outline"}
                size="sm"
                className={`rounded-full h-8 px-3 text-xs ${
                  filtroEstado === "todos"
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-200"
                }`}
                onClick={() => setFiltroEstado("todos")}
              >
                Todos
              </Button>
              <Button
                variant={filtroEstado === "porVencer" ? "default" : "outline"}
                size="sm"
                className={`rounded-full h-8 px-3 text-xs ${
                  filtroEstado === "porVencer"
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "border-amber-100 text-amber-700"
                }`}
                onClick={() => setFiltroEstado("porVencer")}
              >
                Solo por vencer
              </Button>
              <Button
                variant={filtroEstado === "vencidos" ? "default" : "outline"}
                size="sm"
                className={`rounded-full h-8 px-3 text-xs ${
                  filtroEstado === "vencidos"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "border-red-100 text-red-700"
                }`}
                onClick={() => setFiltroEstado("vencidos")}
              >
                Solo vencidos
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nombre, contratista, centro de trabajo..."
                  className="pl-9 rounded-full text-sm bg-slate-50 border-slate-200"
                  value={busqueda}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBusqueda(e.target.value)
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={ventanaDias}
                  onValueChange={(value: string) => setVentanaDias(value)}
                >
                  <SelectTrigger className="w-[150px] rounded-full text-xs h-9 border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Horizonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Próx. 7 días</SelectItem>
                    <SelectItem value="30">Próx. 30 días</SelectItem>
                    <SelectItem value="60">Próx. 60 días</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between lg:justify-end">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <Checkbox
                  checked={soloCriticos}
                  onCheckedChange={(value: boolean | "indeterminate") =>
                    setSoloCriticos(value === true)
                  }
                  className="rounded-full"
                />
                <span>Solo críticos (riesgo alto)</span>
              </label>
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Rojo: vencido</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-3" />
                <span>Ámbar: por vencer</span>
              </div>
            </div>
          </div>

          <Tabs
            value={tabActiva}
            onValueChange={(value: string) => setTabActiva(value)}
            className="w-full mt-2"
          >
            <TabsList className="bg-slate-100/80 rounded-full p-1 h-10 flex flex-wrap">
              <AnyTabsTrigger
                value="general"
                className="rounded-full px-4 py-1 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Vista general
              </AnyTabsTrigger>
              <AnyTabsTrigger
                value="origen"
                className="rounded-full px-4 py-1 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Por origen
              </AnyTabsTrigger>
              <AnyTabsTrigger
                value="categoria"
                className="rounded-full px-4 py-1 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
              >
                Por categoría
              </AnyTabsTrigger>
            </TabsList>

            {/* TAB GENERAL */}
            <TabsContent value="general" className="mt-4">
              <Card className="border border-slate-100 shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="px-4 py-3 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Lista consolidada</p>
                    <p className="text-xs text-slate-500">
                      Ordena por prioridad y entra al detalle para renovar o adjuntar
                      documentación.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 text-xs border-slate-200"
                  >
                    Revisión rápida
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[520px] overflow-y-auto">
                    <div className="min-w-full">
                      {/* Header tabla desktop */}
                      <div className="hidden md:grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-3 px-4 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide bg-slate-50/80">
                        <span>Documento</span>
                        <span>Origen</span>
                        <span>Relacionado</span>
                        <span>Vence</span>
                        <span>Estado</span>
                        <span className="text-right">Acciones</span>
                      </div>

                      {documentosFiltrados.length === 0 && (
                        <div className="px-4 py-10 text-center text-sm text-slate-500">
                          No hay documentos con vencimiento en el rango y filtros seleccionados.
                        </div>
                      )}

                      <div className="flex flex-col divide-y divide-slate-100">
                        {documentosFiltrados.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setDocumentoSeleccionado(doc)}
                            className="w-full text-left hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Desktop */}
                            <div className="hidden md:grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-3 px-4 py-3 items-center text-xs text-slate-700">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600">
                                    {doc.tipoDocumento.split(" ")[0].slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="font-medium text-slate-900 truncate">
                                    {doc.nombre}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className="border-slate-100 bg-slate-50 text-[10px] font-normal rounded-full"
                                  >
                                    {doc.tipoDocumento}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="border-slate-100 bg-slate-50 text-[10px] font-normal rounded-full"
                                  >
                                    {doc.categoria}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-700">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-600">
                                  {getOrigenIcon(doc.origen)}
                                </span>
                                <span>{doc.origen}</span>
                              </div>

                              <div className="text-xs text-slate-700 truncate">
                                {doc.relacionadoCon}
                              </div>

                              <div className="flex flex-col gap-0.5 text-xs text-slate-700">
                                <span className="font-medium text-slate-900">
                                  {doc.fechaVencimiento}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {doc.diasRestantes < 0
                                    ? `${Math.abs(doc.diasRestantes)} días vencido`
                                    : doc.diasRestantes === 0
                                    ? "Vence hoy"
                                    : `En ${doc.diasRestantes} días`}
                                </span>
                              </div>

                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getEstadoBadgeColor(
                                    doc.estado
                                  )}`}
                                >
                                  {doc.estado === "Vencido" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  )}
                                  {doc.estado === "Por vencer" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  )}
                                  {doc.estado === "Vigente" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  )}
                                  <span>{doc.estado}</span>
                                </span>
                                <span
                                  className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getRiesgoBadgeColor(
                                    doc.riesgo
                                  )}`}
                                >
                                  <span>{`Riesgo ${doc.riesgo.toLowerCase()}`}</span>
                                </span>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full h-7 px-3 text-[11px] border-slate-200"
                                >
                                  Ver detalle
                                </Button>
                              </div>
                            </div>

                            {/* Mobile */}
                            <div className="md:hidden px-4 py-3 flex flex-col gap-2 text-xs text-slate-700">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600">
                                    {doc.tipoDocumento.split(" ")[0].slice(0, 2).toUpperCase()}
                                  </span>
                                  <div>
                                    <p className="font-medium text-slate-900 line-clamp-2">
                                      {doc.nombre}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {doc.relacionadoCon}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getEstadoBadgeColor(
                                    doc.estado
                                  )}`}
                                >
                                  <span>{doc.estado}</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className="border-slate-100 bg-slate-50 text-[10px] font-normal rounded-full"
                                >
                                  {doc.tipoDocumento}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="border-slate-100 bg-slate-50 text-[10px] font-normal rounded-full"
                                >
                                  {doc.categoria}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[11px] text-slate-500">Vence el</span>
                                  <span className="text-xs font-medium text-slate-900">
                                    {doc.fechaVencimiento}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {doc.diasRestantes < 0
                                      ? `${Math.abs(doc.diasRestantes)} días vencido`
                                      : doc.diasRestantes === 0
                                      ? "Vence hoy"
                                      : `En ${doc.diasRestantes} días`}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getRiesgoBadgeColor(
                                      doc.riesgo
                                    )}`}
                                  >
                                    <span>{`Riesgo ${doc.riesgo.toLowerCase()}`}</span>
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full h-7 px-3 text-[11px] border-slate-200"
                                  >
                                    Ver detalle
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB ORIGEN */}
            <TabsContent value="origen" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(["Centro de trabajo", "Contratista", "Trabajador"] as OrigenDocumento[]).map(
                  (origen) => {
                    const docs = documentosPorOrigen[origen] || [];
                    return (
                      <Card
                        key={origen}
                        className="border-none shadow-sm rounded-2xl bg-white flex flex-col"
                      >
                        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-2xl bg-slate-50 text-slate-600">
                              {getOrigenIcon(origen)}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{origen}</p>
                              <p className="text-[11px] text-slate-500">
                                {docs.length} documento(s) en el rango.
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 flex-1 flex flex-col">
                          {docs.length === 0 ? (
                            <p className="text-xs text-slate-500 mt-3">
                              No hay documentos con vencimiento para este origen en el rango
                              seleccionado.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2 mt-2">
                              {docs.map((doc) => (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => setDocumentoSeleccionado(doc)}
                                  className="w-full text-left px-3 py-2 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-colors flex flex-col gap-1 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-slate-900 truncate">
                                      {doc.nombre}
                                    </p>
                                    <span
                                      className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getEstadoBadgeColor(
                                        doc.estado
                                      )}`}
                                    >
                                      <span>{doc.estado}</span>
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {doc.relacionadoCon}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[11px] text-slate-500">
                                      Vence: {doc.fechaVencimiento}
                                    </span>
                                    <span
                                      className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getRiesgoBadgeColor(
                                        doc.riesgo
                                      )}`}
                                    >
                                      <span>{`Riesgo ${doc.riesgo.toLowerCase()}`}</span>
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }
                )}
              </div>
            </TabsContent>

            {/* TAB CATEGORÍA */}
            <TabsContent value="categoria" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {categorias.map((cat) => {
                  const docs = documentosPorCategoria[cat];
                  return (
                    <Card
                      key={cat}
                      className="border-none shadow-sm rounded-2xl bg-white flex flex-col"
                    >
                      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{cat}</p>
                          <p className="text-[11px] text-slate-500">
                            {docs.length} documento(s) en el rango.
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 flex flex-col">
                        {docs.length === 0 ? (
                          <p className="text-xs text-slate-500 mt-3">
                            No hay documentos con vencimiento en esta categoría para el rango
                            seleccionado.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2 mt-2">
                            {docs.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => setDocumentoSeleccionado(doc)}
                                className="w-full text-left px-3 py-2 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-colors flex flex-col gap-1 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-slate-900 truncate">
                                    {doc.nombre}
                                  </p>
                                  <span
                                    className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getEstadoBadgeColor(
                                      doc.estado
                                    )}`}
                                  >
                                    <span>{doc.estado}</span>
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {doc.relacionadoCon}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[11px] text-slate-500">
                                    Vence: {doc.fechaVencimiento}
                                  </span>
                                  <span
                                    className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getRiesgoBadgeColor(
                                      doc.riesgo
                                    )}`}
                                  >
                                    <span>{`Riesgo ${doc.riesgo.toLowerCase()}`}</span>
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      {/* MODAL DETALLE DOCUMENTO */}
      <Dialog
        open={!!documentoSeleccionado}
        onOpenChange={(open) => {
          if (!open) setDocumentoSeleccionado(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          {documentoSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600">
                    {documentoSeleccionado.tipoDocumento
                      .split(" ")[0]
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="line-clamp-2">{documentoSeleccionado.nombre}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Revisa el detalle del vencimiento y define la acción a tomar (renovar, adjuntar
                  respaldo o marcar como no aplica).
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 flex flex-col gap-3 text-xs text-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-slate-500">Origen</Label>
                    <div className="inline-flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-600">
                        {getOrigenIcon(documentoSeleccionado.origen)}
                      </span>
                      <span>{documentoSeleccionado.origen}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-slate-500">Relacionado con</Label>
                    <span className="text-xs text-slate-800">
                      {documentoSeleccionado.relacionadoCon}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-slate-500">Categoría</Label>
                    <span className="text-xs text-slate-800">
                      {documentoSeleccionado.categoria}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-slate-500">Estado &amp; riesgo</Label>
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getEstadoBadgeColor(
                          documentoSeleccionado.estado
                        )}`}
                      >
                        <span>{documentoSeleccionado.estado}</span>
                      </span>
                      <span
                        className={`inline-flex items-center justify-start gap-1 text-[10px] px-2 py-1 rounded-full ${getRiesgoBadgeColor(
                          documentoSeleccionado.riesgo
                        )}`}
                      >
                        <span>{`Riesgo ${documentoSeleccionado.riesgo.toLowerCase()}`}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-slate-500">Fecha de vencimiento</Label>
                    <span className="text-xs font-medium text-slate-900">
                      {documentoSeleccionado.fechaVencimiento}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {documentoSeleccionado.diasRestantes < 0
                        ? `${Math.abs(documentoSeleccionado.diasRestantes)} días vencido`
                        : documentoSeleccionado.diasRestantes === 0
                        ? "Vence hoy"
                        : `En ${documentoSeleccionado.diasRestantes} días`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-slate-500">Próximo paso sugerido</Label>
                    <p className="text-xs text-slate-700">
                      Coordina la renovación con el responsable y adjunta el nuevo respaldo
                      directamente desde esta vista.
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  <Label className="text-[11px] text-slate-500">
                    Comentario interno (opcional)
                  </Label>
                  <Input
                    placeholder="Ej: Enviar recordatorio al contratista, pendiente póliza actualizada..."
                    className="h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full"
                  onClick={() => setDocumentoSeleccionado(null)}
                >
                  Cerrar
                </Button>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 px-3 text-xs border-slate-200"
                  >
                    Marcar como no aplica
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full h-8 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Adjuntar renovación
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
