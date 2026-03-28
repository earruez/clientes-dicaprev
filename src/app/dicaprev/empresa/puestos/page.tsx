// src/app/dicaprev/empresa/puestos/page.tsx
"use client";

import React, {
  useState,
  useMemo,
  ChangeEvent,
  FormEvent,
  useEffect,
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

type PuestoEstado = "activo" | "inactivo";
type Turno = "Diurno" | "Nocturno" | "Mixto" | "Especial";
type Modalidad = "Presencial" | "Híbrido" | "Remoto";

type CentroOption = {
  id: string;
  nombre: string;
};

type CargoOption = {
  id: string;
  nombre: string;
  riesgosClaveTexto?: string;
  requiereDS44?: boolean;
};

type Puesto = {
  id: string;
  nombre: string;
  codigo: string;
  centroId: string;
  centroNombre: string;
  cargoId: string;
  cargoNombre: string;
  turno: Turno;
  modalidad: Modalidad;
  ubicacion: string;
  riesgosClave: string;
  dotacionPlanificada: number;
  trabajadoresAsignados: number;
  requiereDS44: boolean;
  estado: PuestoEstado;
  creadoEl: string;
};

type PuestoForm = Omit<Puesto, "id" | "creadoEl">;

/* ======================================================================= */
/*                      DATOS LOCALES INICIALES                            */
/* ======================================================================= */

const INITIAL_CENTROS: CentroOption[] = [
  { id: "centro_principal", nombre: "Centro principal" },
  { id: "centro_obra_1", nombre: "Obra 1" },
];

const INITIAL_CARGOS: CargoOption[] = [
  {
    id: "prevencionista_obra",
    nombre: "Prevencionista de Riesgos Obra",
    riesgosClaveTexto: "Trabajo en terreno, coordinación SST, gestión DS44.",
    requiereDS44: true,
  },
  {
    id: "maestro_obra",
    nombre: "Maestro de Obra",
    riesgosClaveTexto: "Trabajo en altura, manejo de herramientas y equipos.",
    requiereDS44: true,
  },
];

const INITIAL_PUESTOS: Puesto[] = [
  {
    id: "puesto_001",
    nombre: "Prevencionista Obra 1",
    codigo: "PST-001",
    centroId: "centro_obra_1",
    centroNombre: "Obra 1",
    cargoId: "prevencionista_obra",
    cargoNombre: "Prevencionista de Riesgos Obra",
    turno: "Diurno",
    modalidad: "Presencial",
    ubicacion: "Obra 1, sector faena principal",
    riesgosClave:
      "Trabajo en terreno, inspecciones, coordinación de actividades críticas y liderazgo en SST.",
    dotacionPlanificada: 1,
    trabajadoresAsignados: 1,
    requiereDS44: true,
    estado: "activo",
    creadoEl: new Date().toISOString().slice(0, 10),
  },
];

/* ======================================================================= */
/*                    HELPERS PARA CÓDIGO INTERNO                          */
/* ======================================================================= */

function getNextPuestoCodigo(puestos: Puesto[]): string {
  const prefix = "PST";
  const regex = new RegExp(`^${prefix}-(\\d+)$`);

  const numeros = puestos
    .map((p) => {
      const match = p.codigo?.match(regex);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const next = (numeros.length ? Math.max(...numeros) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

/* ======================================================================= */
/*                             PAGE COMPONENT                               */
/* ======================================================================= */

export default function PuestosPage() {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [centrosOptions, setCentrosOptions] =
    useState<CentroOption[]>(INITIAL_CENTROS);
  const [cargosOptions, setCargosOptions] =
    useState<CargoOption[]>(INITIAL_CARGOS);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<PuestoEstado | "todos">(
    "todos"
  );
  const [centroFilter, setCentroFilter] = useState<string>("todos");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");
  const [turnoFilter, setTurnoFilter] = useState<Turno | "todos">("todos");

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<PuestoForm>({
    nombre: "",
    codigo: "",
    centroId: "",
    centroNombre: "",
    cargoId: "",
    cargoNombre: "",
    turno: "Diurno",
    modalidad: "Presencial",
    ubicacion: "",
    riesgosClave: "",
    dotacionPlanificada: 1,
    trabajadoresAsignados: 0,
    requiereDS44: true,
    estado: "activo",
  });

  const isEdit = editingId !== null;

  /* ------------------------------------------------------------------- */
  /*                       CARGA INICIAL LOCAL                           */
  /* ------------------------------------------------------------------- */

  useEffect(() => {
    // Simulamos carga de datos (en vez de Firestore)
    setLoading(true);
    setPuestos(INITIAL_PUESTOS);
    setLoading(false);
  }, []);

  /* ------------------------------------------------------------------- */
  /*                              MÉTRICAS                               */
  /* ------------------------------------------------------------------- */

  const totalPuestos = puestos.length;
  const activos = puestos.filter((p) => p.estado === "activo").length;
  const totalDotacion = puestos.reduce(
    (acc, p) => acc + p.dotacionPlanificada,
    0
  );
  const trabajadoresAsignadosTotal = puestos.reduce(
    (acc, p) => acc + p.trabajadoresAsignados,
    0
  );

  /* ------------------------------------------------------------------- */
  /*                            FILTROS                                  */
  /* ------------------------------------------------------------------- */

  const filtrados = useMemo(() => {
    return puestos.filter((p) => {
      const matchSearch =
        search.trim().length === 0 ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        p.centroNombre.toLowerCase().includes(search.toLowerCase()) ||
        p.cargoNombre.toLowerCase().includes(search.toLowerCase());

      const matchEstado =
        estadoFilter === "todos" ? true : p.estado === estadoFilter;

      const matchCentro =
        centroFilter === "todos" ? true : p.centroId === centroFilter;

      const matchCargo =
        cargoFilter === "todos" ? true : p.cargoId === cargoFilter;

      const matchTurno =
        turnoFilter === "todos" ? true : p.turno === turnoFilter;

      return (
        matchSearch && matchEstado && matchCentro && matchCargo && matchTurno
      );
    });
  }, [puestos, search, estadoFilter, centroFilter, cargoFilter, turnoFilter]);

  /* ------------------------------------------------------------------- */
  /*                            HANDLERS                                 */
  /* ------------------------------------------------------------------- */

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    if (type === "number") {
      const num = Number(value);
      setForm((prev) => ({
        ...prev,
        [name]: Number.isNaN(num) ? 0 : num,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenCreate = () => {
    const centroDefault = centrosOptions[0];
    const cargoDefault = cargosOptions[0];
    const nextCodigo = getNextPuestoCodigo(puestos);

    setEditingId(null);
    setForm({
      nombre: "",
      codigo: nextCodigo, // código automático, editable
      centroId: centroDefault?.id ?? "",
      centroNombre: centroDefault?.nombre ?? "",
      cargoId: cargoDefault?.id ?? "",
      cargoNombre: cargoDefault?.nombre ?? "",
      turno: "Diurno",
      modalidad: "Presencial",
      ubicacion: "",
      riesgosClave: cargoDefault?.riesgosClaveTexto ?? "",
      dotacionPlanificada: 1,
      trabajadoresAsignados: 0,
      requiereDS44: cargoDefault?.requiereDS44 ?? true,
      estado: "activo",
    });

    setModalOpen(true);
  };

  const handleOpenEdit = (puesto: Puesto) => {
    setEditingId(puesto.id);
    setForm({
      nombre: puesto.nombre,
      codigo: puesto.codigo,
      centroId: puesto.centroId,
      centroNombre: puesto.centroNombre,
      cargoId: puesto.cargoId,
      cargoNombre: puesto.cargoNombre,
      turno: puesto.turno,
      modalidad: puesto.modalidad,
      ubicacion: puesto.ubicacion,
      riesgosClave: puesto.riesgosClave,
      dotacionPlanificada: puesto.dotacionPlanificada,
      trabajadoresAsignados: puesto.trabajadoresAsignados,
      requiereDS44: puesto.requiereDS44,
      estado: puesto.estado,
    });

    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const centroSel = centrosOptions.find((c) => c.id === form.centroId);
    const cargoSel = cargosOptions.find((c) => c.id === form.cargoId);

    const centroNombre = centroSel?.nombre ?? form.centroNombre;
    const cargoNombre = cargoSel?.nombre ?? form.cargoNombre;

    if (isEdit && editingId) {
      setPuestos((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                ...form,
                centroNombre,
                cargoNombre,
              }
            : p
        )
      );
    } else {
      const codigoFinal =
        form.codigo && form.codigo.trim().length > 0
          ? form.codigo
          : getNextPuestoCodigo(puestos);

      const nuevo: Puesto = {
        id: crypto.randomUUID ? crypto.randomUUID() : `puesto_${Date.now()}`,
        ...form,
        codigo: codigoFinal,
        centroNombre,
        cargoNombre,
        creadoEl: new Date().toISOString().slice(0, 10),
      };

      setPuestos((prev) => [...prev, nuevo]);
    }

    setModalOpen(false);
  };

  const toggleEstado = (id: string) => {
    setPuestos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              estado: p.estado === "activo" ? "inactivo" : "activo",
            }
          : p
      )
    );
  };

  const deletePuesto = (id: string) => {
    if (!confirm("¿Eliminar este puesto?")) return;
    setPuestos((prev) => prev.filter((p) => p.id !== id));
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
            Puestos de trabajo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define puestos concretos por centro de trabajo y cargo asociado.
            Aquí controlas dotación, turnos y modalidad para conectar con
            trabajadores y DS44.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 shadow-sm"
        >
          + Nuevo puesto
        </Button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard label="Puestos totales" value={totalPuestos.toString()} />
        <MetricCard label="Puestos activos" value={activos.toString()} />
        <MetricCard
          label="Dotación planificada"
          value={totalDotacion.toString()}
        />
        <MetricCard
          label="Trabajadores asignados"
          value={trabajadoresAsignadosTotal.toString()}
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
                placeholder="Buscar por nombre, código, centro o cargo…"
                className="mt-1 rounded-xl"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="w-36">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Estado
              </Label>
              <Select
                value={estadoFilter}
                onValueChange={(v: string) =>
                  setEstadoFilter(v as PuestoEstado | "todos")
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

            <div className="w-44">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Centro
              </Label>
              <Select
                value={centroFilter}
                onValueChange={(v: string) => setCentroFilter(v)}
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {centrosOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-44">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Cargo
              </Label>
              <Select
                value={cargoFilter}
                onValueChange={(v: string) => setCargoFilter(v)}
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {cargosOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Turno
              </Label>
              <Select
                value={turnoFilter}
                onValueChange={(v: string) =>
                  setTurnoFilter(v as Turno | "todos")
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Diurno">Diurno</SelectItem>
                  <SelectItem value="Nocturno">Nocturno</SelectItem>
                  <SelectItem value="Mixto">Mixto</SelectItem>
                  <SelectItem value="Especial">Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LISTADO DE PUESTOS */}
      {loading ? (
        <Card className="border border-slate-200 rounded-2xl">
          <CardContent className="p-8 text-center text-slate-500 text-sm">
            Cargando puestos…
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtrados.map((p) => (
            <Card
              key={p.id}
              className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all bg-white"
            >
              <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* IZQUIERDA: info principal */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {p.nombre}
                    </h2>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 text-xs"
                    >
                      {p.codigo}
                    </Badge>
                    <Badge
                      className={`rounded-full text-xs ${
                        p.estado === "activo"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {p.estado === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                    {p.requiereDS44 && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-emerald-100 bg-emerald-50 text-[11px] text-emerald-700"
                      >
                        Vinculado DS44
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2">
                    {p.ubicacion}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 text-[11px]"
                    >
                      Centro: {p.centroNombre}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-indigo-100 bg-indigo-50 text-[11px] text-indigo-700"
                    >
                      Cargo: {p.cargoNombre}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-100 bg-amber-50 text-[11px] text-amber-700"
                    >
                      Turno: {p.turno}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-sky-100 bg-sky-50 text-[11px] text-sky-700"
                    >
                      Modalidad: {p.modalidad}
                    </Badge>
                    <span className="text-[11px]">
                      Creado el {p.creadoEl}
                    </span>
                  </div>
                </div>

                {/* CENTRO: riesgos clave */}
                <div className="flex flex-col gap-2 min-w-[260px] text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 text-lg">⚠️</span>
                    <div>
                      <p className="font-semibold text-slate-800">
                        Riesgos clave
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.riesgosClave}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DERECHA: dotación + acciones */}
                <div className="flex flex-col gap-3 min-w-[190px]">
                  <div className="flex flex-row md:flex-col gap-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-lg">👥</span>
                      <span>
                        Dotación{" "}
                        <span className="font-semibold">
                          {p.dotacionPlanificada}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-lg">👷</span>
                      <span>
                        Asignados{" "}
                        <span className="font-semibold">
                          {p.trabajadoresAsignados}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl w-full"
                      onClick={() => handleOpenEdit(p)}
                    >
                      Editar puesto
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl w-full text-xs"
                      onClick={() => toggleEstado(p.id)}
                    >
                      {p.estado === "activo"
                        ? "Marcar como inactivo"
                        : "Reactivar puesto"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-xl w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => deletePuesto(p.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtrados.length === 0 && (
            <Card className="border border-dashed border-slate-300 rounded-2xl bg-slate-50/60">
              <CardContent className="p-8 text-center text-slate-500 text-sm">
                No se encontraron puestos con los filtros aplicados.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* MODAL CREAR / EDITAR PUESTO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Editar puesto" : "Nuevo puesto"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define el puesto en un centro específico, el cargo asociado, la
              dotación y su vínculo con la gestión DS44.
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
                  <Label htmlFor="nombre">Nombre del puesto</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej: Prevencionista Obra 1"
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
                    placeholder="Ej: PST-001"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Centro de trabajo</Label>
                  <Select
                    value={form.centroId}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        centroId: v,
                        centroNombre:
                          centrosOptions.find((c) => c.id === v)?.nombre ??
                          prev.centroNombre,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona un centro" />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Cargo asociado</Label>
                  <Select
                    value={form.cargoId}
                    onValueChange={(v: string) => {
                      const cargoSel = cargosOptions.find((c) => c.id === v);
                      setForm((prev) => ({
                        ...prev,
                        cargoId: v,
                        cargoNombre: cargoSel?.nombre ?? prev.cargoNombre,
                        riesgosClave:
                          cargoSel?.riesgosClaveTexto ?? prev.riesgosClave,
                        requiereDS44:
                          cargoSel?.requiereDS44 ?? prev.requiereDS44,
                      }));
                    }}
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona un cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargosOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Turno</Label>
                  <Select
                    value={form.turno}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        turno: v as Turno,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diurno">Diurno</SelectItem>
                      <SelectItem value="Nocturno">Nocturno</SelectItem>
                      <SelectItem value="Mixto">Mixto</SelectItem>
                      <SelectItem value="Especial">Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Modalidad</Label>
                  <Select
                    value={form.modalidad}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        modalidad: v as Modalidad,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Presencial">Presencial</SelectItem>
                      <SelectItem value="Híbrido">Híbrido</SelectItem>
                      <SelectItem value="Remoto">Remoto</SelectItem>
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
                        estado: v as PuestoEstado,
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

                <div className="flex flex-col gap-1">
                  <Label htmlFor="dotacionPlanificada">
                    Dotación planificada
                  </Label>
                  <Input
                    id="dotacionPlanificada"
                    name="dotacionPlanificada"
                    type="number"
                    min={0}
                    value={form.dotacionPlanificada}
                    onChange={handleInputChange}
                    className="rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="ubicacion">Ubicación / referencia</Label>
                <textarea
                  id="ubicacion"
                  name="ubicacion"
                  value={form.ubicacion}
                  onChange={handleInputChange}
                  placeholder="Ej: Sector torre A, piso 10, zona de estructura metálica…"
                  className="rounded-xl bg-white min-h-[70px] border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner resize-y"
                />
              </div>
            </div>

            {/* BLOQUE 2: RIESGOS / DS44 */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Riesgos y vínculo DS44
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="riesgosClave">Riesgos clave</Label>
                  <textarea
                    id="riesgosClave"
                    name="riesgosClave"
                    value={form.riesgosClave}
                    onChange={handleInputChange}
                    placeholder="Ej: Trabajo en altura, montajes, izaje de cargas, excavaciones…"
                    className="rounded-xl bg-white min-h-[80px] border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner resize-y"
                  />
                </div>

                <div className="flex flex-col gap-3 justify-center">
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="requiereDS44"
                      checked={form.requiereDS44}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setForm((prev) => ({
                          ...prev,
                          requiereDS44: e.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    <span>
                      Este puesto estará incluido en la matriz DS44 del centro
                      de trabajo para control de riesgos críticos.
                    </span>
                  </label>
                </div>
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
                {isEdit ? "Guardar cambios" : "Crear puesto"}
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
