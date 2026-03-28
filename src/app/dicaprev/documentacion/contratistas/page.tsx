"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  Building2,
  FileText,
  Filter,
  History,
  Plus,
  Upload,
  Users,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  Trash2,
} from "lucide-react";

/* =========================
   Tipos
   ========================= */

type CategoriaDoc = "Legales" | "Exámenes" | "Capacitaciones" | "EPP obligatorio";

type EstadoVigencia = "Vigente" | "No vigente";
type EstadoDocumento = "Vigente" | "Por vencer" | "Pendiente";

type RequisitoBase = {
  id: string;
  nombre: string;
  categoria: CategoriaDoc;
};

type RequisitoConfigurado = RequisitoBase & {
  obligatorio: boolean;
};

type DocumentoEmpresa = {
  id: string;
  requisitoId: string;
  estado: EstadoDocumento;
  actualizado: string;
};

type DocumentoTrabajador = {
  id: string;
  requisitoId: string;
  estado: EstadoDocumento;
  actualizado: string;
};

type Trabajador = {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  obra: string;
  vigentes: number;
  alertas: number;
  vencidos: number;
  ultimaActualizacion: string;
  cumplimiento: number;
  estadoEnObra: "Asignado" | "En acreditación" | "No vigente";
  documentos: DocumentoTrabajador[];
};

type Contratista = {
  id: string;
  nombre: string;
  rut: string;
  obrasAsociadas: number;
  obrasAsignadas?: string[];
  cumplimientoEmpresa: number;
  estado: EstadoVigencia;
  docsEmpresa: DocumentoEmpresa[];
  trabajadores: Trabajador[];
};

/* =========================
   Datos mock
   ========================= */

const CATEGORIAS: CategoriaDoc[] = [
  "Legales",
  "Exámenes",
  "Capacitaciones",
  "EPP obligatorio",
];

const OBRAS_DISPONIBLES = [
  "Obra 1 · Condominio Los Álamos",
  "Obra 2 · Condominio Los Álamos",
  "Obra 3 · Condominio Los Álamos",
];

const REQUISITOS_EMPRESA_BASE: RequisitoConfigurado[] = [
  {
    id: "emp-1",
    nombre: "Certificado de afiliación organismo administrador Ley 16.744",
    categoria: "Legales",
    obligatorio: true,
  },
  {
    id: "emp-2",
    nombre: "Última cotización pagada Seguro Accidentes del Trabajo",
    categoria: "Legales",
    obligatorio: true,
  },
  {
    id: "emp-3",
    nombre: "Historial de accidentes y tasa de siniestralidad últimos 12 meses",
    categoria: "Legales",
    obligatorio: true,
  },
  {
    id: "emp-4",
    nombre: "Reglamento Interno de Higiene y Seguridad (DS 40 / DS 594)",
    categoria: "Legales",
    obligatorio: true,
  },
  {
    id: "emp-5",
    nombre: "Programa anual de prevención de riesgos (DS 67)",
    categoria: "Capacitaciones",
    obligatorio: true,
  },
  {
    id: "emp-6",
    nombre: "Evaluación de riesgos de la obra / faena",
    categoria: "Legales",
    obligatorio: true,
  },
  {
    id: "emp-7",
    nombre: "Registro de entrega de EPP a trabajadores de la empresa",
    categoria: "EPP obligatorio",
    obligatorio: true,
  },
];

const REQUISITOS_TRABAJADOR_BASE: RequisitoConfigurado[] = [
  {
    id: "trab-1",
    nombre: "Contrato de trabajo",
    categoria: "Legales",
    obligatorio: true,
  },
  {
    id: "trab-2",
    nombre: "Anexo de funciones / descripción de cargo",
    categoria: "Legales",
    obligatorio: true,
  },
  {
    id: "trab-3",
    nombre: "Examen ocupacional compatible con el cargo",
    categoria: "Exámenes",
    obligatorio: true,
  },
  {
    id: "trab-4",
    nombre: "Examen para trabajo en altura física (si aplica)",
    categoria: "Exámenes",
    obligatorio: false,
  },
  {
    id: "trab-5",
    nombre: 'Capacitación "Derecho a Saber" (DS 40)',
    categoria: "Capacitaciones",
    obligatorio: true,
  },
  {
    id: "trab-6",
    nombre: "Capacitación uso correcto de EPP",
    categoria: "Capacitaciones",
    obligatorio: true,
  },
  {
    id: "trab-7",
    nombre: "Registro de entrega de EPP",
    categoria: "EPP obligatorio",
    obligatorio: true,
  },
];

const CONTRATISTAS_MOCK: Contratista[] = [
  {
    id: "c1",
    nombre: "Litoral SpA",
    rut: "76.123.456-7",
    obrasAsociadas: 3,
    obrasAsignadas: [
      "Obra 1 · Condominio Los Álamos",
      "Obra 2 · Condominio Los Álamos",
      "Obra 3 · Condominio Los Álamos",
    ],
    cumplimientoEmpresa: 82,
    estado: "Vigente",
    docsEmpresa: [
      { id: "de1", requisitoId: "emp-1", estado: "Vigente", actualizado: "01-11-2025" },
      { id: "de2", requisitoId: "emp-2", estado: "Por vencer", actualizado: "30-10-2025" },
      { id: "de3", requisitoId: "emp-3", estado: "Pendiente", actualizado: "—" },
      { id: "de4", requisitoId: "emp-4", estado: "Pendiente", actualizado: "—" },
      { id: "de5", requisitoId: "emp-5", estado: "Pendiente", actualizado: "—" },
    ],
    trabajadores: [
      {
        id: "t1",
        nombre: "Juan Pérez",
        rut: "11.111.111-1",
        cargo: "Maestro en Obra 1",
        obra: "Obra 1 · Condominio Los Álamos",
        vigentes: 14,
        alertas: 3,
        vencidos: 2,
        ultimaActualizacion: "10-11-2025",
        cumplimiento: 82,
        estadoEnObra: "Asignado",
        documentos: [
          {
            id: "dt1",
            requisitoId: "trab-1",
            estado: "Vigente",
            actualizado: "01-11-2025",
          },
          {
            id: "dt2",
            requisitoId: "trab-2",
            estado: "Por vencer",
            actualizado: "28-11-2025",
          },
        ],
      },
      {
        id: "t2",
        nombre: "María Gómez",
        rut: "12.222.222-2",
        cargo: "Ayudante de obras",
        obra: "Obra 1 · Condominio Los Álamos",
        vigentes: 10,
        alertas: 1,
        vencidos: 4,
        ultimaActualizacion: "10-11-2025",
        cumplimiento: 70,
        estadoEnObra: "Asignado",
        documentos: [],
      },
    ],
  },
  {
    id: "c2",
    nombre: "Montajes Andinos Ltda.",
    rut: "77.987.654-3",
    obrasAsociadas: 1,
    obrasAsignadas: ["Obra 2 · Condominio Los Álamos"],
    cumplimientoEmpresa: 65,
    estado: "No vigente",
    docsEmpresa: [
      { id: "de6", requisitoId: "emp-1", estado: "Pendiente", actualizado: "—" },
    ],
    trabajadores: [],
  },
];

/* =========================
   Helpers UI
   ========================= */

function estadoDocPill(estado: EstadoDocumento) {
  if (estado === "Vigente") {
    return {
      label: "Vigente",
      className:
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-700",
      dot: "h-1.5 w-1.5 rounded-full bg-emerald-500",
    };
  }
  if (estado === "Por vencer") {
    return {
      label: "Por vencer",
      className:
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] text-amber-700",
      dot: "h-1.5 w-1.5 rounded-full bg-amber-400",
    };
  }
  return {
    label: "Pendiente",
    className:
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-600",
    dot: "h-1.5 w-1.5 rounded-full bg-slate-400",
  };
}

/* =========================
   Página principal
   ========================= */

type ContratistaForm = {
  id?: string;
  nombre: string;
  rut: string;
  obrasSeleccionadas: string[];
  estado: EstadoVigencia;
};

export default function ContratistasPage() {
  const [contratistas, setContratistas] = useState<Contratista[]>(CONTRATISTAS_MOCK);
  const [empresaRequisitos, setEmpresaRequisitos] = useState<RequisitoConfigurado[]>(
    REQUISITOS_EMPRESA_BASE
  );
  const [trabajadorRequisitos, setTrabajadorRequisitos] = useState<RequisitoConfigurado[]>(
    REQUISITOS_TRABAJADOR_BASE
  );

  
  const [selectedContratistaId, setSelectedContratistaId] = useState<string>(
    CONTRATISTAS_MOCK[0]?.id ?? ""
  );
  const [contratistaFiltroId, setContratistaFiltroId] = useState<string>("todos");
  const [filtroVigencia, setFiltroVigencia] = useState<"todos" | EstadoVigencia>("todos");

  const [openTrabajadorIds, setOpenTrabajadorIds] = useState<string[]>(["t1"]);

  // === Modal nuevo trabajador (mock) ===
type TrabajadorForm = {
  nombre: string;
  rut: string;
  cargo: string;
  obra: string;
};

const [trabajadorModalOpen, setTrabajadorModalOpen] = useState(false);
const [trabajadorForm, setTrabajadorForm] = useState<TrabajadorForm | null>(null);

const abrirModalNuevoTrabajador = () => {
  setTrabajadorForm({
    nombre: "",
    rut: "",
    cargo: "",
    obra:
      selectedContratista.obrasAsignadas?.[0] ??
      "Obra 1 · Condominio Los Álamos",
  });
  setTrabajadorModalOpen(true);
};

const handleGuardarTrabajador = () => {
  if (!trabajadorForm) return;

  const newId = `t-${Date.now()}`;

  setContratistas((prev) =>
    prev.map((c) =>
      c.id !== selectedContratista.id
        ? c
        : {
            ...c,
            trabajadores: [
              ...c.trabajadores,
              {
                id: newId,
                nombre: trabajadorForm.nombre || "Nuevo trabajador",
                rut: trabajadorForm.rut || "11.111.111-1",
                cargo: trabajadorForm.cargo || "Cargo sin definir",
                obra: trabajadorForm.obra,
                vigentes: 0,
                alertas: 0,
                vencidos: 0,
                ultimaActualizacion: "—",
                cumplimiento: 0,
                estadoEnObra: "En acreditación",
                documentos: [],
              },
            ],
          }
    )
  );

  // Abrir de inmediato el acordeón del nuevo trabajador
  setOpenTrabajadorIds((prev) => [...prev, newId]);

  setTrabajadorModalOpen(false);
};


  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configScope, setConfigScope] = useState<"empresa" | "trabajador">("empresa");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadScope, setUploadScope] = useState<"empresa" | "trabajador">("empresa");
  const [uploadCategoria, setUploadCategoria] = useState<CategoriaDoc>("Legales");
  const [uploadRequisitoId, setUploadRequisitoId] = useState<string>("");

  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialTarget, setHistorialTarget] = useState<string | null>(null);

  const [contratistaModalOpen, setContratistaModalOpen] = useState(false);
  const [contratistaModalMode, setContratistaModalMode] =
    useState<"new" | "edit">("new");
  const [contratistaForm, setContratistaForm] = useState<ContratistaForm | null>(null);

  const selectedContratista = useMemo(() => {
    const base = contratistas.find((c) => c.id === selectedContratistaId) ?? contratistas[0];
    return base;
  }, [contratistas, selectedContratistaId]);

  const contratistasFiltrados = useMemo(() => {
    return contratistas.filter((c) => {
      if (contratistaFiltroId !== "todos" && c.id !== contratistaFiltroId) return false;
      if (filtroVigencia !== "todos" && c.estado !== filtroVigencia) return false;
      return true;
    });
  }, [contratistas, contratistaFiltroId, filtroVigencia]);

  const requisitosPorCategoria = (scope: "empresa" | "trabajador", categoria: CategoriaDoc) => {
    const base = scope === "empresa" ? empresaRequisitos : trabajadorRequisitos;
    return base.filter((r) => r.categoria === categoria);
  };

  const requisitosParaSelect =
    uploadScope === "empresa" ? empresaRequisitos : trabajadorRequisitos;

  const handleAgregarRequisitoPersonalizado = (
    scope: "empresa" | "trabajador",
    nombre: string,
    categoria: CategoriaDoc
  ) => {
    if (!nombre.trim()) return;
    const nuevo: RequisitoConfigurado = {
      id: `${scope}-${Date.now()}`,
      nombre: nombre.trim(),
      categoria,
      obligatorio: true,
    };
    if (scope === "empresa") {
      setEmpresaRequisitos((prev) => [...prev, nuevo]);
    } else {
      setTrabajadorRequisitos((prev) => [...prev, nuevo]);
    }
  };

  const toggleTrabajadorOpen = (id: string) => {
    setOpenTrabajadorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleEliminarTrabajador = (trabajadorId: string) => {
    setContratistas((prev) =>
      prev.map((c) =>
        c.id !== selectedContratista.id
          ? c
          : {
              ...c,
              trabajadores: c.trabajadores.filter((t) => t.id !== trabajadorId),
            }
      )
    );
  };

  const abrirModalNuevoContratista = () => {
    setContratistaModalMode("new");
    setContratistaForm({
      nombre: "",
      rut: "",
      obrasSeleccionadas: [],
      estado: "Vigente",
    });
    setContratistaModalOpen(true);
  };

  const abrirModalEditarContratista = (contratista: Contratista) => {
    setContratistaModalMode("edit");
    setContratistaForm({
      id: contratista.id,
      nombre: contratista.nombre,
      rut: contratista.rut,
      obrasSeleccionadas:
        contratista.obrasAsignadas ??
        OBRAS_DISPONIBLES.slice(0, contratista.obrasAsociadas),
      estado: contratista.estado,
    });
    setContratistaModalOpen(true);
  };

  const handleGuardarContratista = () => {
    if (!contratistaForm) return;
    const { id, nombre, rut, obrasSeleccionadas, estado } = contratistaForm;
    const obrasCount = obrasSeleccionadas.length || 1;

    if (contratistaModalMode === "new") {
      const newId = `c-${Date.now()}`;
      const nuevoContratista: Contratista = {
        id: newId,
        nombre: nombre || "Nuevo contratista",
        rut: rut || "00.000.000-0",
        obrasAsociadas: obrasCount,
        obrasAsignadas: obrasSeleccionadas,
        cumplimientoEmpresa: 0,
        estado,
        docsEmpresa: [],
        trabajadores: [],
      };
      setContratistas((prev) => [...prev, nuevoContratista]);
      setSelectedContratistaId(newId);
    } else if (id) {
      setContratistas((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                nombre,
                rut,
                estado,
                obrasAsociadas: obrasCount,
                obrasAsignadas: obrasSeleccionadas,
              }
            : c
        )
      );
    }

    setContratistaModalOpen(false);
  };

  const handleDuplicarContratista = (base: Contratista) => {
    const newId = `c-${Date.now()}`;
    const copia: Contratista = {
      ...base,
      id: newId,
      nombre: `${base.nombre} (copia)`,
      docsEmpresa: [],
      trabajadores: [],
      cumplimientoEmpresa: base.cumplimientoEmpresa,
    };
    setContratistas((prev) => [...prev, copia]);
  };

  const requisitosHistorialLabel = (scope: "empresa" | "trabajador", nombre: string) => {
    if (scope === "empresa") {
      return `Empresa · ${selectedContratista.nombre} · ${nombre}`;
    }
    return nombre;
  };

  const totalTrabajadores = useMemo(
    () => contratistas.reduce((acc, c) => acc + c.trabajadores.length, 0),
    [contratistas]
  );
  const totalDocsEmpresa = useMemo(
    () => contratistas.reduce((acc, c) => acc + c.docsEmpresa.length, 0),
    [contratistas]
  );

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 flex flex-col gap-6 text-slate-900">
      {/* HEADER */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Contratistas acreditados
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Gestiona la acreditación documental de empresas contratistas y la
            documentación de sus trabajadores, alineada a la normativa chilena
            (Ley 16.744, DS 76, DS 67, DS 594, DS 40, entre otras).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-1 min-w-[150px]">
            <span className="text-[11px] text-slate-500">Contratistas activos</span>
            <span className="text-lg font-semibold">
              {contratistas.filter((c) => c.estado === "Vigente").length}
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-1 min-w-[150px]">
            <span className="text-[11px] text-slate-500">Trabajadores vinculados</span>
            <span className="text-lg font-semibold">{totalTrabajadores}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-1 min-w-[150px]">
            <span className="text-[11px] text-slate-500">
              Documentos empresa (mock)
            </span>
            <span className="text-lg font-semibold">{totalDocsEmpresa}</span>
          </div>
        </div>
      </header>

      {/* FILTROS SUPERIORES */}
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 min-w-[220px] flex-1">
              <Input
                placeholder="Buscar contratista por nombre o RUT (mock)"
                className="h-9 text-sm bg-slate-50/60 border-slate-200"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Label className="text-slate-500 mr-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Contratista:
              </Label>
              <select
                value={contratistaFiltroId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setContratistaFiltroId(e.target.value)
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs"
              >
                <option value="todos">Todos</option>
                {contratistas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <div className="ml-4 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Vigencia:</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-[11px] border-slate-200 rounded-full",
                    filtroVigencia === "todos" && "bg-slate-900 text-slate-50"
                  )}
                  onClick={() => setFiltroVigencia("todos")}
                >
                  Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-[11px] border-slate-200 rounded-full",
                    filtroVigencia === "Vigente" &&
                      "bg-emerald-600 text-emerald-50 border-emerald-500"
                  )}
                  onClick={() => setFiltroVigencia("Vigente")}
                >
                  Vigentes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-[11px] border-slate-200 rounded-full",
                    filtroVigencia === "No vigente" &&
                      "bg-slate-600 text-slate-50 border-slate-700"
                  )}
                  onClick={() => setFiltroVigencia("No vigente")}
                >
                  No vigentes
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-9 text-xs px-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
              onClick={abrirModalNuevoContratista}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nuevo contratista
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TARJETAS CONTRATISTAS (CARRUSEL) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Contratistas acreditados en esta empresa
          </h2>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-4 min-w-full">
            {contratistasFiltrados.map((c) => {
              const vigente = c.estado === "Vigente";
              const seleccionado = selectedContratista.id === c.id;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "min-w-[300px] lg:min-w-[360px] rounded-3xl border px-5 py-4 text-left shadow-sm transition-all bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md",
                    seleccionado &&
                      "border-emerald-500 ring-1 ring-emerald-200 bg-emerald-50/60"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedContratistaId(c.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{c.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{c.rut}</p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[11px] px-3 py-0.5 rounded-full",
                          vigente
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}
                      >
                        {vigente ? "Vigente" : "No vigente"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                      <div>
                        <p className="text-[11px] text-slate-500">Obras asociadas</p>
                        <p className="text-sm font-semibold">{c.obrasAsociadas}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Cumpl. empresa</p>
                        <p className="text-sm font-semibold">
                          {c.cumplimientoEmpresa}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Trabajadores</p>
                        <p className="text-sm font-semibold">
                          {c.trabajadores.length}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${c.cumplimientoEmpresa}%` }}
                      />
                    </div>
                  </button>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          abrirModalEditarContratista(c);
                        }}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar datos
                      </button>
                      <button
                        type="button"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          handleDuplicarContratista(c);
                        }}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicar
                      </button>
                    </div>
                    {c.obrasAsignadas && c.obrasAsignadas.length > 0 && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[160px] text-right">
                        {c.obrasAsignadas.join(" · ")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SI EL CONTRATISTA NO ES VIGENTE, SOLO MENSAJE */}
      {selectedContratista.estado === "No vigente" ? (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-slate-800 text-xs">
            !
          </span>
          <p>
            Este contratista está marcado como <strong>No vigente</strong>. El sistema no
            solicitará actualización de documentación ni de trabajadores mientras mantenga
            este estado.
          </p>
        </div>
      ) : null}

      {/* DOCUMENTACIÓN EMPRESA + TRABAJADORES */}
      {selectedContratista.estado === "Vigente" && (
        <>
          {/* DOCUMENTACIÓN EMPRESA */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Documentación de la empresa contratista
                </h2>
                <p className="text-xs text-slate-500 max-w-xl">
                  Requisitos legales y de prevención exigidos al contratista según Ley
                  16.744, DS 76, DS 67 y reglamentos especiales. Esta sección es por
                  empresa, independiente de los trabajadores.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setConfigScope("empresa");
                    setConfigModalOpen(true);
                  }}
                  className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                >
                  Configurar requisitos empresa
                </button>
                <Button
                  size="sm"
                  className="h-8 px-4 text-xs rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
                  onClick={() => {
                    setUploadScope("empresa");
                    setUploadCategoria("Legales");
                    setUploadRequisitoId(empresaRequisitos[0]?.id ?? "");
                    setUploadModalOpen(true);
                  }}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  Subir documento
                </Button>
              </div>
            </div>

            <div className="px-5 py-3 flex flex-col gap-4">
              {CATEGORIAS.map((cat) => {
                const requisitosCat = requisitosPorCategoria("empresa", cat);
                if (requisitosCat.length === 0) return null;
                const docsEmpresa = selectedContratista.docsEmpresa;

                return (
                  <EmpresaCategoriaRow
                    key={cat}
                    categoria={cat}
                    requisitos={requisitosCat}
                    documentos={docsEmpresa}
                    onOpenHistorial={(nombreDoc: string) => {
                      setHistorialTarget(
                        requisitosHistorialLabel("empresa", nombreDoc)
                      );
                      setHistorialOpen(true);
                    }}
                  />
                );
              })}
            </div>
          </section>

          {/* TRABAJADORES DEL CONTRATISTA */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm mt-4">
            <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Trabajadores del contratista
                </h2>
                <p className="text-xs text-slate-500 max-w-xl">
                  La documentación se despliega bajo cada trabajador, agrupada en las 4
                  categorías principales: Legales, Exámenes, Capacitaciones y EPP
                  obligatorio.
                </p>
              </div>
              <div>
               <Button
  size="sm"
  className="h-8 px-4 text-xs rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
  onClick={abrirModalNuevoTrabajador}
>
  + Agregar trabajador
</Button>

              </div>
            </div>

            <div className="px-4 py-3 flex flex-col gap-3">
              {selectedContratista.trabajadores.map((t) => {
                const isOpen = openTrabajadorIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden"
                  >
                    {/* Fila principal trabajador */}
                    <button
                      type="button"
                      onClick={() => toggleTrabajadorOpen(t.id)}
                      className="w-full px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="mt-1">
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {t.nombre}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {t.rut} · {t.cargo}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {t.obra}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-[11px]">
                        <div className="flex flex-wrap gap-3 justify-end">
                          <span className="text-emerald-700">
                            Vigentes: <strong>{t.vigentes}</strong>
                          </span>
                          <span className="text-amber-600">
                            Alertas por vencer: <strong>{t.alertas}</strong>
                          </span>
                          <span className="text-rose-600">
                            Vencidos: <strong>{t.vencidos}</strong>
                          </span>
                          <span className="text-slate-500">
                            Últ. actualización: {t.ultimaActualizacion}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center justify-end mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px]">
                            Cumplimiento {t.cumplimiento}%
                          </span>
                          <select
                            value={t.estadoEnObra}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                              e.stopPropagation();
                              // Mock visual: no actual update
                            }}
                            className="h-7 rounded-full border border-slate-200 bg-white px-2 text-[11px]"
                          >
                            <option value="Asignado">Asignado</option>
                            <option value="En acreditación">En acreditación</option>
                            <option value="No vigente">No vigente</option>
                          </select>
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              toggleTrabajadorOpen(t.id);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 text-[11px] underline underline-offset-2"
                          >
                            Ver documentos
                          </button>
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              setConfigScope("trabajador");
                              setConfigModalOpen(true);
                            }}
                            className="text-slate-600 hover:text-slate-800 text-[11px] underline underline-offset-2"
                          >
                            Configurar requisitos trabajador
                          </button>
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              handleEliminarTrabajador(t.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </button>

                    {/* Plegable: categorías y documentos */}
                    {isOpen && (
                      <div className="border-t border-slate-200 bg-white px-4 pb-3 pt-2 space-y-2">
                        {CATEGORIAS.map((cat) => {
                          const requisitosCat = requisitosPorCategoria(
                            "trabajador",
                            cat
                          );
                          if (requisitosCat.length === 0) return null;

                          return (
                            <TrabajadorCategoriaRow
                              key={cat}
                              categoria={cat}
                              requisitos={requisitosCat}
                              documentos={t.documentos}
                              onOpenHistorial={(nombreDoc: string) => {
                                setHistorialTarget(`${t.nombre} · ${nombreDoc}`);
                                setHistorialOpen(true);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedContratista.trabajadores.length === 0 && (
                <p className="text-xs text-slate-500 px-2 pb-2">
                  Este contratista aún no tiene trabajadores registrados.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {/* MODAL CONFIGURAR REQUISITOS */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configurar requisitos de acreditación</DialogTitle>
            <DialogDescription>
              Marca los requisitos que se exigirán por defecto y agrega requisitos
              personalizados. Esta configuración alimenta los desplegables de subida de
              documentos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="font-medium text-slate-700">Ámbito:</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-emerald-700">
              {configScope === "empresa"
                ? "Empresa contratista"
                : "Trabajadores del contratista"}
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 space-y-4">
            {CATEGORIAS.map((cat) => {
              const base =
                configScope === "empresa" ? empresaRequisitos : trabajadorRequisitos;
              const requisitosCat = base.filter((r) => r.categoria === cat);
              if (requisitosCat.length === 0) return null;

              const handleToggleObligatorio = (id: string) => {
                if (configScope === "empresa") {
                  setEmpresaRequisitos((prev) =>
                    prev.map((r) =>
                      r.id === id ? { ...r, obligatorio: !r.obligatorio } : r
                    )
                  );
                } else {
                  setTrabajadorRequisitos((prev) =>
                    prev.map((r) =>
                      r.id === id ? { ...r, obligatorio: !r.obligatorio } : r
                    )
                  );
                }
              };

              const handleChangeCategoria = (id: string, categoria: CategoriaDoc) => {
                if (configScope === "empresa") {
                  setEmpresaRequisitos((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, categoria } : r))
                  );
                } else {
                  setTrabajadorRequisitos((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, categoria } : r))
                  );
                }
              };

              return (
                <div key={cat} className="bg-white rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-800">{cat}</h3>
                    <span className="text-xs text-slate-500">
                      {requisitosCat.length} requisitos
                    </span>
                  </div>
                  <div className="space-y-2">
                    {requisitosCat.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg bg-slate-50/70 px-2.5 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={req.obligatorio}
                            onCheckedChange={() => handleToggleObligatorio(req.id)}
                          />
                          <span className="text-xs text-slate-700">{req.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500">Categoría:</span>
                          <select
                            value={req.categoria}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              handleChangeCategoria(
                                req.id,
                                e.target.value as CategoriaDoc
                              )
                            }
                            className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px]"
                          >
                            {CATEGORIAS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Agregar requisito personalizado */}
            <AgregarRequisitoPersonalizado
              scope={configScope}
              onAdd={handleAgregarRequisitoPersonalizado}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              className="border-slate-200 text-slate-600 rounded-full"
              onClick={() => setConfigModalOpen(false)}
            >
              Cerrar
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
              Guardar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL SUBIR DOCUMENTO */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
            <DialogDescription>
              Selecciona el requisito y adjunta el archivo. En la versión productiva se
              guardará en el repositorio documental del contratista.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <select
                value={uploadCategoria}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setUploadCategoria(e.target.value as CategoriaDoc)
                }
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Requisito</Label>
              <select
                value={uploadRequisitoId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setUploadRequisitoId(e.target.value)
                }
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                {requisitosParaSelect
                  .filter((r) => r.categoria === uploadCategoria)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Archivo (mock)</Label>
              <div className="flex items-center gap-2">
                <Input type="file" className="text-xs" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fecha del documento</Label>
              <Input type="date" className="h-9 text-sm" />
            </div>

            <p className="text-[11px] text-slate-400 mt-1">
              Ámbito:{" "}
              {uploadScope === "empresa"
                ? "Documentación de empresa contratista."
                : "Documentación de trabajador."}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-200 text-slate-600 rounded-full"
              onClick={() => setUploadModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
              Guardar (mock)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL HISTORIAL */}
      <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Historial de cambios (mock)</DialogTitle>
            <DialogDescription>
              En la versión productiva aquí se mostrarán las acciones realizadas sobre
              este documento: quién subió, reemplazó o eliminó archivos, con fecha y
              hora.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-600 space-y-2">
            {historialTarget && (
              <p className="font-semibold text-slate-700 mb-1">
                Documento: <span className="font-normal">{historialTarget}</span>
              </p>
            )}
            <p>
              01-11-2025 · 10:24 · <strong>admin@dicaprev.cl</strong> subió documento
              inicial.
            </p>
            <p>
              30-10-2025 · 09:10 · <strong>prevencionista@cliente.cl</strong> actualizó
              archivo y fecha de vigencia.
            </p>
            <p>Registros adicionales se mostrarán aquí…</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-200 text-slate-600 rounded-full"
              onClick={() => setHistorialOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NUEVO / EDITAR CONTRATISTA */}
      <Dialog open={contratistaModalOpen} onOpenChange={setContratistaModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {contratistaModalMode === "new"
                ? "Nuevo contratista"
                : "Editar datos del contratista"}
            </DialogTitle>
            <DialogDescription>
              Asocia el contratista a la empresa y define los datos básicos. En la
              versión productiva se conectará con obras y contratos reales.
            </DialogDescription>
          </DialogHeader>

          {contratistaForm && (
            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5">
                <Label>Nombre de la empresa contratista</Label>
                <Input
                  value={contratistaForm.nombre}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setContratistaForm((prev) =>
                      prev ? { ...prev, nombre: e.target.value } : prev
                    )
                  }
                  placeholder="Ej. Montajes El Litoral SpA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>RUT</Label>
                <Input
                  value={contratistaForm.rut}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setContratistaForm((prev) =>
                      prev ? { ...prev, rut: e.target.value } : prev
                    )
                  }
                  placeholder="76.123.456-7"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Obras asociadas (mock)</Label>
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                    {OBRAS_DISPONIBLES.map((obra) => {
                      const checked =
                        contratistaForm.obrasSeleccionadas.includes(obra);
                      return (
                        <label
                          key={obra}
                          className="flex items-center gap-2 text-xs text-slate-700"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              setContratistaForm((prev) => {
                                if (!prev) return prev;
                                const exists =
                                  prev.obrasSeleccionadas.includes(obra);
                                return {
                                  ...prev,
                                  obrasSeleccionadas: exists
                                    ? prev.obrasSeleccionadas.filter(
                                        (o) => o !== obra
                                      )
                                    : [...prev.obrasSeleccionadas, obra],
                                };
                              })
                            }
                          />
                          <span>{obra}</span>
                        </label>
                      );
                    })}
                    <p className="text-[11px] text-slate-400 pt-1">
                      Se mostrarán obras reales configuradas en “Obras / Centros de
                      trabajo”.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <select
                    value={contratistaForm.estado}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setContratistaForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              estado: e.target.value as EstadoVigencia,
                            }
                          : prev
                      )
                    }
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                  >
                    <option value="Vigente">Vigente</option>
                    <option value="No vigente">No vigente</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Al duplicar un contratista se copiarán los requisitos configurados
                    pero no los archivos de documentación.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-slate-200 text-slate-600 rounded-full"
              onClick={() => setContratistaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
              onClick={handleGuardarContratista}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

{/* MODAL NUEVO TRABAJADOR (mock) */}
<Dialog open={trabajadorModalOpen} onOpenChange={setTrabajadorModalOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Nuevo trabajador del contratista</DialogTitle>
      <DialogDescription>
        Registra un trabajador asociado a este contratista. En la versión
        productiva se conectará con el maestro de trabajadores y la obra
        seleccionada.
      </DialogDescription>
    </DialogHeader>

    {trabajadorForm && (
      <div className="space-y-4 py-2 text-sm">
        <div className="space-y-1.5">
          <Label>Nombre completo</Label>
          <Input
            value={trabajadorForm.nombre}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
  setTrabajadorForm((prev) =>
    prev ? { ...prev, nombre: e.target.value } : prev
  )
}

            placeholder="Ej. Juan Pérez González"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>RUT</Label>
            <Input
              value={trabajadorForm.rut}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
  setTrabajadorForm((prev) =>
    prev ? { ...prev, rut: e.target.value } : prev
  )
}

              placeholder="11.111.111-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo / función</Label>
            <Input
              value={trabajadorForm.cargo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
  setTrabajadorForm((prev) =>
    prev ? { ...prev, cargo: e.target.value } : prev
  )
}

              placeholder="Ej. Maestro en Obra 1"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Obra / centro de trabajo</Label>
          <select
            value={trabajadorForm.obra}
            onChange={(e) =>
              setTrabajadorForm((prev) =>
                prev ? { ...prev, obra: e.target.value } : prev
              )
            }
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
          >
            {(selectedContratista.obrasAsignadas?.length
              ? selectedContratista.obrasAsignadas
              : OBRAS_DISPONIBLES
            ).map((obra) => (
              <option key={obra} value={obra}>
                {obra}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            En productivo se listarán solo las obras vigentes asociadas a este
            contratista.
          </p>
        </div>
      </div>
    )}

    <DialogFooter className="gap-2">
      <Button
        variant="outline"
        className="border-slate-200 text-slate-600 rounded-full"
        onClick={() => setTrabajadorModalOpen(false)}
      >
        Cancelar
      </Button>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
        onClick={handleGuardarTrabajador}
      >
        Guardar trabajador
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      
    </div>
  );
}



/* =========================
   Componentes auxiliares
   ========================= */

type EmpresaCategoriaRowProps = {
  categoria: CategoriaDoc;
  requisitos: RequisitoConfigurado[];
  documentos: DocumentoEmpresa[];
  onOpenHistorial: (nombreDoc: string) => void;
};

function EmpresaCategoriaRow({
  categoria,
  requisitos,
  documentos,
  onOpenHistorial,
}: EmpresaCategoriaRowProps) {
  const [open, setOpen] = useState<boolean>(categoria === "Legales");

  const vigentesConDoc = requisitos.filter((r) =>
    documentos.some((d) => d.requisitoId === r.id)
  ).length;

  return (
    <div className="border border-slate-100 rounded-xl bg-slate-50/70">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-sm font-semibold text-slate-800">{categoria}</span>
        </div>
        <span className="text-xs text-slate-500">
          {vigentesConDoc} requisitos con documento
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 py-2.5 space-y-2 bg-white rounded-b-xl">
          {requisitos.map((req) => {
            const doc = documentos.find((d) => d.requisitoId === req.id);
            const pill = doc && estadoDocPill(doc.estado);
            return (
              <div
                key={req.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-xl bg-slate-50/80 px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{req.nombre}</p>
                  <p className="text-[11px] text-slate-500">
                    {req.obligatorio
                      ? "Obligatorio para acreditar contratista."
                      : "Requisito opcional según evaluación de riesgo."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {pill ? (
                    <span className={pill.className}>
                      <span className={pill.dot} />
                      {pill.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                      Pendiente
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    Actualizado: {doc?.actualizado ?? "—"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[11px] border-slate-200 bg-white"
                    >
                      {doc ? "Reemplazar / editar" : "Adjuntar archivo"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[11px] border-slate-200 bg-white"
                    >
                      Ver documento
                    </Button>
                    <button
                      type="button"
                      onClick={() => onOpenHistorial(req.nombre)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
                    >
                      <History className="w-3.5 h-3.5" />
                      Historial
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type TrabajadorCategoriaRowProps = {
  categoria: CategoriaDoc;
  requisitos: RequisitoConfigurado[];
  documentos: DocumentoTrabajador[];
  onOpenHistorial: (nombreDoc: string) => void;
};

function TrabajadorCategoriaRow({
  categoria,
  requisitos,
  documentos,
  onOpenHistorial,
}: TrabajadorCategoriaRowProps) {
  const [open, setOpen] = useState<boolean>(categoria === "Legales");

  const conAlerta = requisitos.filter((r) =>
    documentos.some(
      (d) => d.requisitoId === r.id && d.estado !== "Vigente"
    )
  ).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-sm font-semibold text-slate-800">{categoria}</span>
        </div>
        <span className="text-xs text-slate-500">
          {requisitos.length} vigentes · {conAlerta} con alerta
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-3 py-2 space-y-1.5 bg-white">
          {requisitos.map((req) => {
            const doc = documentos.find((d) => d.requisitoId === req.id);
            const pill = doc && estadoDocPill(doc.estado);
            return (
              <div
                key={req.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800">{req.nombre}</p>
                  <p className="text-[11px] text-slate-500">
                    {req.obligatorio ? "Obligatorio" : "Opcional según riesgo."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {pill ? (
                    <span className={pill.className}>
                      <span className={pill.dot} />
                      {pill.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                      Pendiente
                    </span>
                  )}
                  <span className="text-slate-400">
                    Actualizado: {doc?.actualizado ?? "—"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[11px] border-slate-200 bg-white"
                    >
                      {doc ? "Reemplazar / editar" : "Adjuntar archivo"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[11px] border-slate-200 bg-white"
                    >
                      Ver documento
                    </Button>
                    <button
                      type="button"
                      onClick={() => onOpenHistorial(req.nombre)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
                    >
                      <History className="w-3.5 h-3.5" />
                      Historial
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type AgregarReqProps = {
  scope: "empresa" | "trabajador";
  onAdd: (scope: "empresa" | "trabajador", nombre: string, categoria: CategoriaDoc) => void;
};

function AgregarRequisitoPersonalizado({ scope, onAdd }: AgregarReqProps) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDoc>("Legales");

  const handleAdd = () => {
    onAdd(scope, nombre, categoria);
    setNombre("");
  };

  return (
    <div className="mt-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50 px-3 py-3 space-y-2">
      <p className="text-xs font-medium text-slate-600">
        Agregar requisito personalizado de{" "}
        {scope === "empresa" ? "empresa contratista" : "trabajador"}
      </p>
      <div className="flex flex-col md:flex-row gap-2 text-xs">
        <Input
          value={nombre}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setNombre(e.target.value)
          }
          placeholder="Nombre del requisito"
          className="flex-1 h-8 text-xs bg-white border-slate-200"
        />
        <select
          value={categoria}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setCategoria(e.target.value as CategoriaDoc)
          }
          className="h-8 rounded-md border border-slate-200 bg-white px-2 min-w-[130px]"
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-xs text-white rounded-full"
          onClick={handleAdd}
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}
