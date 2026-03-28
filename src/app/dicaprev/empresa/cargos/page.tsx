"use client";

import React, {
  useState,
  useMemo,
  ChangeEvent,
  FormEvent,
} from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/* ======================================================================= */
/*                                TYPES                                    */
/* ======================================================================= */

type CargoEstado = "activo" | "inactivo";
type CargoTipo =
  | "Operativo"
  | "Supervisión"
  | "Administración"
  | "Prevención"
  | "Otro";

type AreaOption = {
  id: string;
  nombre: string;
};

type Cargo = {
  id: string;
  nombre: string;
  codigo: string;
  areaId: string;
  areaNombre: string;
  tipo: CargoTipo;
  descripcion: string;
  perfilSST: string;
  riesgosClave: string;
  requiereDS44: boolean;
  requiereComite: boolean;
  trabajadores: number;
  cursosAsociados: number;
  estado: CargoEstado;
  creadoEl: string;
};

type CargoForm = Omit<
  Cargo,
  "id" | "creadoEl" | "trabajadores" | "cursosAsociados"
>;

/* ======================================================================= */
/*                              MOCK DATA                                  */
/* ======================================================================= */

// Estas áreas deberían venir de Firestore (colección: empresa/{id}/areas)
const AREAS_MOCK: AreaOption[] = [
  { id: "area-prev", nombre: "Prevención de Riesgos" },
  { id: "area-op", nombre: "Operaciones Terreno" },
  { id: "area-adm", nombre: "Administración Central" },
];

// Cargos mock (colección: empresa/{id}/cargos)
const CARGOS_MOCK: Cargo[] = [
  {
    id: "cargo-1",
    nombre: "Prevencionista de Riesgos",
    codigo: "PRV-001",
    areaId: "area-prev",
    areaNombre: "Prevención de Riesgos",
    tipo: "Prevención",
    descripcion:
      "Responsable de la gestión de seguridad y salud en el trabajo según DS44.",
    perfilSST: "Profesional con credencial de Experto en Prevención.",
    riesgosClave: "Riesgos críticos, cumplimiento DS44, comités paritarios.",
    requiereDS44: true,
    requiereComite: true,
    trabajadores: 3,
    cursosAsociados: 8,
    estado: "activo",
    creadoEl: "2024-10-01",
  },
  {
    id: "cargo-2",
    nombre: "Supervisor de Obra",
    codigo: "SUP-010",
    areaId: "area-op",
    areaNombre: "Operaciones Terreno",
    tipo: "Supervisión",
    descripcion:
      "Supervisa la ejecución de las actividades en obra y el cumplimiento de medidas de seguridad.",
    perfilSST: "Conocimiento de procedimientos de trabajo seguro.",
    riesgosClave: "Trabajo en altura, manejo de contratistas, orden y limpieza.",
    requiereDS44: true,
    requiereComite: false,
    trabajadores: 12,
    cursosAsociados: 6,
    estado: "activo",
    creadoEl: "2024-09-20",
  },
  {
    id: "cargo-3",
    nombre: "Administrativo Contable",
    codigo: "ADM-002",
    areaId: "area-adm",
    areaNombre: "Administración Central",
    tipo: "Administración",
    descripcion: "Apoyo administrativo y contable desde casa matriz.",
    perfilSST: "Ergonomía y pausas activas.",
    riesgosClave: "Trabajo repetitivo, pantalla, postura.",
    requiereDS44: false,
    requiereComite: false,
    trabajadores: 5,
    cursosAsociados: 2,
    estado: "inactivo",
    creadoEl: "2024-08-10",
  },
];

/* ======================================================================= */
/*                             PAGE COMPONENT                               */
/* ======================================================================= */

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>(CARGOS_MOCK);
  const [search, setSearch] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<CargoEstado | "todos">(
    "todos"
  );
  const [areaFilter, setAreaFilter] = useState<string>("todas");
  const [tipoFilter, setTipoFilter] = useState<CargoTipo | "todos">("todos");

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<CargoForm>({
    nombre: "",
    codigo: "",
    areaId: AREAS_MOCK[0]?.id ?? "",
    areaNombre: AREAS_MOCK[0]?.nombre ?? "",
    tipo: "Operativo",
    descripcion: "",
    perfilSST: "",
    riesgosClave: "",
    requiereDS44: true,
    requiereComite: false,
    estado: "activo",
  });

  const isEdit = editingId !== null;

  /* ------------------------------------------------------------------- */
  /*                              MÉTRICAS                               */
  /* ------------------------------------------------------------------- */

  const totalCargos = cargos.length;
  const activos = cargos.filter((c) => c.estado === "activo").length;
  const totalTrabajadores = cargos.reduce(
    (acc, c) => acc + c.trabajadores,
    0
  );
  const totalCursos = cargos.reduce(
    (acc, c) => acc + c.cursosAsociados,
    0
  );

  /* ------------------------------------------------------------------- */
  /*                            FILTROS                                  */
  /* ------------------------------------------------------------------- */

  const filtrados = useMemo(() => {
    return cargos.filter((c) => {
      const matchSearch =
        search.trim().length === 0 ||
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        c.codigo.toLowerCase().includes(search.toLowerCase()) ||
        c.areaNombre.toLowerCase().includes(search.toLowerCase());

      const matchEstado =
        estadoFilter === "todos" ? true : c.estado === estadoFilter;

      const matchArea =
        areaFilter === "todas" ? true : c.areaId === areaFilter;

      const matchTipo = tipoFilter === "todos" ? true : c.tipo === tipoFilter;

      return matchSearch && matchEstado && matchArea && matchTipo;
    });
  }, [cargos, search, estadoFilter, areaFilter, tipoFilter]);

  /* ------------------------------------------------------------------- */
  /*                            HANDLERS                                 */
  /* ------------------------------------------------------------------- */

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenCreate = () => {
    const defaultArea = AREAS_MOCK[0];
    setEditingId(null);
    setForm({
      nombre: "",
      codigo: "",
      areaId: defaultArea?.id ?? "",
      areaNombre: defaultArea?.nombre ?? "",
      tipo: "Operativo",
      descripcion: "",
      perfilSST: "",
      riesgosClave: "",
      requiereDS44: true,
      requiereComite: false,
      estado: "activo",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cargo: Cargo) => {
    setEditingId(cargo.id);
    setForm({
      nombre: cargo.nombre,
      codigo: cargo.codigo,
      areaId: cargo.areaId,
      areaNombre: cargo.areaNombre,
      tipo: cargo.tipo,
      descripcion: cargo.descripcion,
      perfilSST: cargo.perfilSST,
      riesgosClave: cargo.riesgosClave,
      requiereDS44: cargo.requiereDS44,
      requiereComite: cargo.requiereComite,
      estado: cargo.estado,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // sincronizar areaNombre según areaId
    const areaSeleccionada = AREAS_MOCK.find(
      (a) => a.id === form.areaId
    );
    const areaNombre = areaSeleccionada?.nombre ?? form.areaNombre;

    if (isEdit && editingId) {
      setCargos((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                ...form,
                areaNombre,
              }
            : c
        )
      );

      // Firestore update:
      // await updateDoc(doc(db, "empresas/{id}/cargos", editingId), { ...form, areaNombre });

    } else {
      const nuevo: Cargo = {
        id: `cargo-${Date.now()}`,
        creadoEl: new Date().toISOString().slice(0, 10),
        trabajadores: 0,
        cursosAsociados: 0,
        ...form,
        areaNombre,
      };

      setCargos((prev) => [nuevo, ...prev]);

      // Firestore create:
      // await addDoc(collection(db, "empresas/{id}/cargos"), nuevo);
    }

    setModalOpen(false);
  };

  const toggleEstado = (id: string) => {
    setCargos((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, estado: c.estado === "activo" ? "inactivo" : "activo" }
          : c
      )
    );
    // Firestore:
    // await updateDoc(doc(db, "empresas/{id}/cargos", id), { estado: nuevoEstado });
  };

  const deleteCargo = (id: string) => {
    setCargos((prev) => prev.filter((c) => c.id !== id));
    // Firestore:
    // await deleteDoc(doc(db, "empresas/{id}/cargos", id));
  };

  /* ======================================================================= */
  /*                               RENDER                                    */
  /* ======================================================================= */

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 flex flex-col gap-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Cargos / Ocupaciones
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define cargos, responsabilidades y perfiles de SST. Estos cargos se
            usarán para asociar trabajadores, planes de capacitación y
            estructura organizativa.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 shadow-sm"
        >
          + Nuevo cargo
        </Button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard label="Cargos totales" value={totalCargos.toString()} />
        <MetricCard label="Cargos activos" value={activos.toString()} />
        <MetricCard
          label="Trabajadores asociados"
          value={totalTrabajadores.toString()}
        />
        <MetricCard
          label="Cursos asociados"
          value={totalCursos.toString()}
        />
      </div>

      {/* FILTROS */}
      <Card className="border border-slate-200 rounded-2xl shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            <div className="w-full md:max-w-md">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Buscar
              </Label>
              <Input
                placeholder="Buscar por nombre, código o área…"
                className="mt-1 rounded-xl"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="w-40">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Estado
              </Label>
              <Select
                value={estadoFilter}
                onValueChange={(v: string) =>
                  setEstadoFilter(v as CargoEstado | "todos")
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Área
              </Label>
              <Select
                value={areaFilter}
                onValueChange={(v: string) => setAreaFilter(v)}
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {AREAS_MOCK.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-44">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Tipo
              </Label>
              <Select
                value={tipoFilter}
                onValueChange={(v: string) =>
                  setTipoFilter(v as CargoTipo | "todos")
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Operativo">Operativo</SelectItem>
                  <SelectItem value="Supervisión">Supervisión</SelectItem>
                  <SelectItem value="Administración">
                    Administración
                  </SelectItem>
                  <SelectItem value="Prevención">Prevención</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LISTADO DE CARGOS */}
      <div className="space-y-4">
        {filtrados.map((cargo) => (
          <Card
            key={cargo.id}
            className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all bg-white"
          >
            <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* IZQUIERDA: info principal */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {cargo.nombre}
                  </h2>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 text-xs"
                  >
                    {cargo.codigo}
                  </Badge>
                  <Badge
                    className={`rounded-full text-xs ${
                      cargo.estado === "activo"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {cargo.estado === "activo" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2">
                  {cargo.descripcion}
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 text-[11px]"
                  >
                    Área: {cargo.areaNombre}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-indigo-100 bg-indigo-50 text-[11px] text-indigo-700"
                  >
                    Tipo: {cargo.tipo}
                  </Badge>
                  {cargo.requiereDS44 && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-emerald-100 bg-emerald-50 text-[11px] text-emerald-700"
                    >
                      Requiere DS44
                    </Badge>
                  )}
                  {cargo.requiereComite && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-100 bg-amber-50 text-[11px] text-amber-700"
                    >
                      Requiere Comité Paritario
                    </Badge>
                  )}
                  <span className="text-[11px]">
                    Creado el {cargo.creadoEl}
                  </span>
                </div>
              </div>

              {/* CENTRO: perfil SST */}
              <div className="flex flex-col gap-2 min-w-[260px] text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 text-lg">🛡️</span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      Perfil SST
                    </p>
                    <p className="text-xs text-slate-500">
                      {cargo.perfilSST}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 text-lg">⚠️</span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      Riesgos clave
                    </p>
                    <p className="text-xs text-slate-500">
                      {cargo.riesgosClave}
                    </p>
                  </div>
                </div>
              </div>

              {/* DERECHA: cifras + acciones */}
              <div className="flex flex-col gap-3 min-w-[190px]">
                <div className="flex flex-row md:flex-col gap-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-lg">👷</span>
                    <span>
                      <span className="font-semibold">
                        {cargo.trabajadores}
                      </span>{" "}
                      trabajadores
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-lg">🎓</span>
                    <span>
                      <span className="font-semibold">
                        {cargo.cursosAsociados}
                      </span>{" "}
                      cursos SST
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl w-full"
                    onClick={() => handleOpenEdit(cargo)}
                  >
                    Editar cargo
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl w-full text-xs"
                    onClick={() => toggleEstado(cargo.id)}
                  >
                    {cargo.estado === "activo"
                      ? "Marcar como inactivo"
                      : "Reactivar cargo"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-xl w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => deleteCargo(cargo.id)}
                  >
                    Eliminar (mock)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtrados.length === 0 && (
          <Card className="border border-dashed border-slate-300 rounded-2xl bg-slate-50/60">
            <CardContent className="p-8 text-center text-slate-500 text-sm">
              No se encontraron cargos con los filtros aplicados.
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL CREAR / EDITAR CARGO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Editar cargo" : "Nuevo cargo"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define la información del cargo y su perfil de seguridad y salud
              en el trabajo. Luego podrás asociarlo a trabajadores y planes de
              capacitación.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* BLOQUE 1: INFO BÁSICA */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Información básica
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="nombre">Nombre del cargo</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej: Supervisor de Obra"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="codigo">Código interno</Label>
                  <Input
                    id="codigo"
                    name="codigo"
                    value={form.codigo}
                    onChange={handleInputChange}
                    placeholder="Ej: SUP-010"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Área</Label>
                  <Select
                    value={form.areaId}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        areaId: v,
                        areaNombre:
                          AREAS_MOCK.find((a) => a.id === v)?.nombre ??
                          prev.areaNombre,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS_MOCK.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Tipo de cargo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        tipo: v as CargoTipo,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operativo">Operativo</SelectItem>
                      <SelectItem value="Supervisión">
                        Supervisión
                      </SelectItem>
                      <SelectItem value="Administración">
                        Administración
                      </SelectItem>
                      <SelectItem value="Prevención">Prevención</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Estado</Label>
                  <Select
                    value={form.estado}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        estado: v as CargoEstado,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleInputChange}
                  placeholder="Describe brevemente las responsabilidades principales del cargo…"
                  className="rounded-xl bg-white min-h-[80px] border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner resize-y"
                />
              </div>
            </div>

            {/* BLOQUE 2: PERFIL SST */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Perfil de Seguridad y Salud en el Trabajo
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="perfilSST">Perfil SST</Label>
                  <textarea
                    id="perfilSST"
                    name="perfilSST"
                    value={form.perfilSST}
                    onChange={handleInputChange}
                    placeholder="Requisitos de formación, certificaciones y competencias SST…"
                    className="rounded-xl bg-white min-h-[80px] border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner resize-y"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="riesgosClave">Riesgos clave asociados</Label>
                  <textarea
                    id="riesgosClave"
                    name="riesgosClave"
                    value={form.riesgosClave}
                    onChange={handleInputChange}
                    placeholder="Ej: Trabajo en altura, manipulación de cargas, espacios confinados…"
                    className="rounded-xl bg-white min-h-[80px] border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner resize-y"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="requiereDS44"
                    checked={form.requiereDS44}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    Este cargo requiere gestión específica bajo DS44
                    (matriz de riesgos, protocolos, etc.).
                  </span>
                </label>

                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="requiereComite"
                    checked={form.requiereComite}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    Este cargo tiene participación obligatoria en Comité
                    Paritario u otro órgano de SST.
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {isEdit ? "Guardar cambios" : "Crear cargo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ======================================================================= */
/*                       COMPONENTE MÉTRICA                                */
/* ======================================================================= */

function MetricCard(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white/90">
      <CardContent className="p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
