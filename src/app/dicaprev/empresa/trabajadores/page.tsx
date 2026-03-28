
"use client";

import React, {
  useState,
  useMemo,
  ChangeEvent,
  FormEvent,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
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

type TrabajadorEstado = "activo" | "inactivo" | "baja";
type TipoContrato = "Indefinido" | "Plazo fijo" | "Honorarios";
type Jornada = "Completa" | "Parcial" | "Turnos";

type Trabajador = {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  centro: string;
  area: string;
  cargo: string;
  puesto: string;
  tipoContrato: TipoContrato;
  jornada: Jornada;
  fechaIngreso: string;
  estado: TrabajadorEstado;
  ds44Critico: boolean;
  riesgosClave: string;
};

type TrabajadorForm = Omit<Trabajador, "id">;

/* ======================================================================= */
/*                              MOCK DATA                                  */
/* ======================================================================= */

const TRABAJADORES_MOCK: Trabajador[] = [
  {
    id: "t-1",
    rut: "11.111.111-1",
    nombres: "Juan",
    apellidos: "Pérez González",
    email: "juan.perez@empresa.cl",
    telefono: "+56 9 1234 5678",
    centro: "Obra 1 - Condominio Los Álamos",
    area: "Prevención",
    cargo: "Prevencionista de Riesgos",
    puesto: "Prevencionista Obra 1",
    tipoContrato: "Indefinido",
    jornada: "Completa",
    fechaIngreso: "2023-03-01",
    estado: "activo",
    ds44Critico: true,
    riesgosClave:
      "Riesgos críticos DS44, trabajo en altura, coordinación de medidas.",
  },
  {
    id: "t-2",
    rut: "22.222.222-2",
    nombres: "María",
    apellidos: "López Soto",
    email: "maria.lopez@empresa.cl",
    telefono: "+56 9 8765 4321",
    centro: "Obra 1 - Condominio Los Álamos",
    area: "Operaciones",
    cargo: "Supervisor de Obra",
    puesto: "Supervisor Obra 1",
    tipoContrato: "Plazo fijo",
    jornada: "Turnos",
    fechaIngreso: "2024-01-15",
    estado: "activo",
    ds44Critico: true,
    riesgosClave:
      "Supervisión de maniobras, grúas, excavaciones y contratistas.",
  },
  {
    id: "t-3",
    rut: "33.333.333-3",
    nombres: "Pedro",
    apellidos: "Ramírez Vega",
    email: "pedro.ramirez@empresa.cl",
    telefono: "+56 9 9988 7766",
    centro: "Casa Matriz",
    area: "Administración",
    cargo: "Administrativo",
    puesto: "Administrativo Casa Matriz",
    tipoContrato: "Indefinido",
    jornada: "Completa",
    fechaIngreso: "2020-08-10",
    estado: "inactivo",
    ds44Critico: false,
    riesgosClave: "Ergonomía, pantallas, carga mental.",
  },
];

/* ======================================================================= */
/*                             PAGE COMPONENT                               */
/* ======================================================================= */

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] =
    useState<Trabajador[]>(TRABAJADORES_MOCK);

  const [search, setSearch] = useState<string>("");
  const [estadoFilter, setEstadoFilter] =
    useState<TrabajadorEstado | "todos">("todos");
  const [centroFilter, setCentroFilter] = useState<string>("todos");
  const [areaFilter, setAreaFilter] = useState<string>("todos");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const uniqueCentros = Array.from(new Set(trabajadores.map((t) => t.centro)));
  const uniqueAreas = Array.from(new Set(trabajadores.map((t) => t.area)));
  const uniqueCargos = Array.from(new Set(trabajadores.map((t) => t.cargo)));

  const [form, setForm] = useState<TrabajadorForm>({
    rut: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    centro: uniqueCentros[0] ?? "",
    area: uniqueAreas[0] ?? "",
    cargo: uniqueCargos[0] ?? "",
    puesto: "",
    tipoContrato: "Indefinido",
    jornada: "Completa",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    estado: "activo",
    ds44Critico: false,
    riesgosClave: "",
  });

  const isEdit = editingId !== null;

  /* ------------------------------------------------------------------- */
  /*                              MÉTRICAS                               */
  /* ------------------------------------------------------------------- */

  const totalTrabajadores = trabajadores.length;
  const activos = trabajadores.filter((t) => t.estado === "activo").length;
  const ds44 = trabajadores.filter((t) => t.ds44Critico).length;
  const centrosConTrabajadores = new Set(trabajadores.map((t) => t.centro)).size;

  /* ------------------------------------------------------------------- */
  /*                            FILTROS                                  */
  /* ------------------------------------------------------------------- */

  const filtrados = useMemo(() => {
    return trabajadores.filter((t) => {
      const base = `${t.rut} ${t.nombres} ${t.apellidos} ${t.centro} ${t.area} ${t.cargo} ${t.puesto}`;
      const matchSearch =
        search.trim().length === 0 ||
        base.toLowerCase().includes(search.toLowerCase());

      const matchEstado =
        estadoFilter === "todos" ? true : t.estado === estadoFilter;

      const matchCentro =
        centroFilter === "todos" ? true : t.centro === centroFilter;

      const matchArea =
        areaFilter === "todos" ? true : t.area === areaFilter;

      const matchCargo =
        cargoFilter === "todos" ? true : t.cargo === cargoFilter;

      return (
        matchSearch &&
        matchEstado &&
        matchCentro &&
        matchArea &&
        matchCargo
      );
    });
  }, [
    trabajadores,
    search,
    estadoFilter,
    centroFilter,
    areaFilter,
    cargoFilter,
  ]);

  /* ------------------------------------------------------------------- */
  /*                          HANDLERS FORM                              */
  /* ------------------------------------------------------------------- */

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      rut: "",
      nombres: "",
      apellidos: "",
      email: "",
      telefono: "",
      centro: uniqueCentros[0] ?? "",
      area: uniqueAreas[0] ?? "",
      cargo: uniqueCargos[0] ?? "",
      puesto: "",
      tipoContrato: "Indefinido",
      jornada: "Completa",
      fechaIngreso: new Date().toISOString().slice(0, 10),
      estado: "activo",
      ds44Critico: false,
      riesgosClave: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (t: Trabajador) => {
    setEditingId(t.id);
    setForm({
      rut: t.rut,
      nombres: t.nombres,
      apellidos: t.apellidos,
      email: t.email,
      telefono: t.telefono,
      centro: t.centro,
      area: t.area,
      cargo: t.cargo,
      puesto: t.puesto,
      tipoContrato: t.tipoContrato,
      jornada: t.jornada,
      fechaIngreso: t.fechaIngreso,
      estado: t.estado,
      ds44Critico: t.ds44Critico,
      riesgosClave: t.riesgosClave,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEdit && editingId) {
      setTrabajadores((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                ...form,
              }
            : t
        )
      );
      // Firestore update...
    } else {
      const nuevo: Trabajador = {
        id: `t-${Date.now()}`,
        ...form,
      };
      setTrabajadores((prev) => [nuevo, ...prev]);
      // Firestore create...
    }

    setModalOpen(false);
  };

  const toggleEstado = (id: string) => {
    setTrabajadores((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              estado:
                t.estado === "activo"
                  ? "baja"
                  : t.estado === "baja"
                  ? "activo"
                  : "activo",
            }
          : t
      )
    );
  };

  const toggleDs44 = (id: string) => {
    setTrabajadores((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ds44Critico: !t.ds44Critico } : t
      )
    );
  };

  const deleteTrabajador = (id: string) => {
    setTrabajadores((prev) => prev.filter((t) => t.id !== id));
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
            Trabajadores
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maestro de trabajadores de la empresa. Desde aquí podrás vincularlos
            a centros, puestos, DS44 y planes de capacitación.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 shadow-sm"
        >
          + Nuevo trabajador
        </Button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard
          label="Trabajadores totales"
          value={totalTrabajadores.toString()}
        />
        <MetricCard label="Activos" value={activos.toString()} />
        <MetricCard label="Vinculados a DS44" value={ds44.toString()} />
        <MetricCard
          label="Centros con dotación"
          value={centrosConTrabajadores.toString()}
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
                placeholder="Buscar por nombre, RUT, centro, área o cargo…"
                className="mt-1 rounded-xl"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Estado */}
            <div className="w-32">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Estado
              </Label>
              <Select
                value={estadoFilter}
                onValueChange={(v: string) =>
                  setEstadoFilter(v as TrabajadorEstado | "todos")
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Centro */}
            <div className="w-48">
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
                  {uniqueCentros.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Área */}
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
                  <SelectItem value="todos">Todas</SelectItem>
                  {uniqueAreas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cargo */}
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
                  {uniqueCargos.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LISTADO */}
      <div className="space-y-4">
        {filtrados.map((t) => (
          <Card
            key={t.id}
            className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all bg-white"
          >
            <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* IZQUIERDA: identidad */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t.nombres} {t.apellidos}
                  </h2>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 text-xs"
                  >
                    {t.rut}
                  </Badge>
                  <Badge
                    className={`rounded-full text-xs ${
                      t.estado === "activo"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : t.estado === "baja"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {t.estado === "activo"
                      ? "Activo"
                      : t.estado === "baja"
                      ? "Baja"
                      : "Inactivo"}
                  </Badge>
                  {t.ds44Critico && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-200 bg-amber-50 text-[11px] text-amber-700"
                    >
                      DS44 crítico
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-slate-500">
                  {t.cargo} · {t.puesto || "Sin puesto asignado"}
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 text-[11px]"
                  >
                    Centro: {t.centro}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-indigo-100 bg-indigo-50 text-[11px] text-indigo-700"
                  >
                    Área: {t.area}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-sky-100 bg-sky-50 text-[11px] text-sky-700"
                  >
                    Jornada: {t.jornada}
                  </Badge>
                  <span className="text-[11px]">Ingreso: {t.fechaIngreso}</span>
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap gap-3 mt-1">
                  <span>📧 {t.email}</span>
                  <span>📱 {t.telefono}</span>
                </div>
              </div>

              {/* CENTRO: riesgos */}
              <div className="flex flex-col gap-2 min-w-[260px] text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 text-lg">⚠️</span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      Riesgos clave
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.riesgosClave || "Sin descripción registrada."}
                    </p>
                  </div>
                </div>
              </div>

              {/* DERECHA: acciones */}
              <div className="flex flex-col gap-2 min-w-[190px]">
                <Button
                  variant="outline"
                  className="rounded-xl w-full"
                  onClick={() => handleOpenEdit(t)}
                >
                  Editar trabajador
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl w-full text-xs"
                  onClick={() => toggleEstado(t.id)}
                >
                  {t.estado === "activo" ? "Marcar baja" : "Reactivar"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl w-full text-xs"
                  onClick={() => toggleDs44(t.id)}
                >
                  {t.ds44Critico
                    ? "Quitar de DS44 crítico"
                    : "Marcar DS44 crítico"}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => deleteTrabajador(t.id)}
                >
                  Eliminar (mock)
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtrados.length === 0 && (
          <Card className="border border-dashed border-slate-300 rounded-2xl bg-slate-50/60">
            <CardContent className="p-8 text-center text-slate-500 text-sm">
              No se encontraron trabajadores con los filtros aplicados.
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL CREAR / EDITAR */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Editar trabajador" : "Nuevo trabajador"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Completa los datos básicos del trabajador para vincularlo con
              centros, puestos de trabajo y la gestión de DS44 / capacitación.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* IDENTIDAD */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Identidad y contacto
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    name="rut"
                    value={form.rut}
                    onChange={handleInputChange}
                    placeholder="11.111.111-1"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="nombres">Nombres</Label>
                  <Input
                    id="nombres"
                    name="nombres"
                    value={form.nombres}
                    onChange={handleInputChange}
                    placeholder="Nombres"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    name="apellidos"
                    value={form.apellidos}
                    onChange={handleInputChange}
                    placeholder="Apellidos"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="correo@empresa.cl"
                    className="rounded-xl bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleInputChange}
                    placeholder="+56 9 ..."
                    className="rounded-xl bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="fechaIngreso">Fecha de ingreso</Label>
                  <Input
                    id="fechaIngreso"
                    name="fechaIngreso"
                    type="date"
                    value={form.fechaIngreso}
                    onChange={handleInputChange}
                    className="rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>

            {/* VINCULACIÓN ORGANIZATIVA */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Vinculación organizativa
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Centro</Label>
                  <Select
                    value={form.centro}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({ ...prev, centro: v }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona centro" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCentros.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Área</Label>
                  <Select
                    value={form.area}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({ ...prev, area: v }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona área" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueAreas.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Cargo</Label>
                  <Select
                    value={form.cargo}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({ ...prev, cargo: v }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCargos.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="puesto">Puesto</Label>
                  <Input
                    id="puesto"
                    name="puesto"
                    value={form.puesto}
                    onChange={handleInputChange}
                    placeholder="Ej: Prevencionista Obra 1"
                    className="rounded-xl bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Tipo de contrato</Label>
                  <Select
                    value={form.tipoContrato}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        tipoContrato: v as TipoContrato,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indefinido">Indefinido</SelectItem>
                      <SelectItem value="Plazo fijo">Plazo fijo</SelectItem>
                      <SelectItem value="Honorarios">Honorarios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Jornada</Label>
                  <Select
                    value={form.jornada}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        jornada: v as Jornada,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completa">Completa</SelectItem>
                      <SelectItem value="Parcial">Parcial</SelectItem>
                      <SelectItem value="Turnos">Turnos</SelectItem>
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
                        estado: v as TrabajadorEstado,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* RIESGOS / DS44 */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Riesgos y DS44
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="riesgosClave">
                    Riesgos clave del puesto
                  </Label>
                  <textarea
                    id="riesgosClave"
                    name="riesgosClave"
                    value={form.riesgosClave}
                    onChange={handleInputChange}
                    placeholder="Ej: Trabajo en altura, excavaciones, montajes, etc."
                    className="rounded-xl bg-white min-h-[80px] border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner resize-y"
                  />
                </div>

                <div className="flex flex-col gap-3 justify-center">
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="ds44Critico"
                      checked={form.ds44Critico}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setForm((prev) => ({
                          ...prev,
                          ds44Critico: e.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    <span>
                      Este trabajador se considera clave en la gestión de
                      riesgos críticos DS44 (por rol o exposición).
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
                {isEdit ? "Guardar cambios" : "Crear trabajador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ======================================================================= */
/*                         COMPONENTE MÉTRICA                              */
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
