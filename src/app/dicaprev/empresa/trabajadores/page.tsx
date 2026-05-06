"use client";

import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
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
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Users } from "lucide-react";
import { getCentrosTrabajo } from "@/app/dicaprev/empresa/centros/actions";
import { getAreas } from "@/app/dicaprev/empresa/areas/actions";
import { getCargos } from "@/app/dicaprev/empresa/cargos/actions";
import { getDotacion } from "@/app/dicaprev/empresa/puestos/actions";
import {
  getTrabajadores,
  crearTrabajador,
  actualizarTrabajador,
  desactivarTrabajador,
} from "./actions";

type TrabajadorEstado = "activo" | "inactivo" | "baja";
type TipoContrato = "Indefinido" | "Plazo fijo" | "Honorarios";
type Jornada = "Completa" | "Parcial" | "Turnos";

type RefEntity = {
  id: string;
  nombre: string;
};

type RefPosicion = {
  id: string;
  label: string;
};

type Trabajador = {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  centroTrabajoId: string;
  areaId: string;
  cargoId: string;
  posicionDotacionId: string;
  centro: string;
  area: string;
  cargo: string;
  posicion: string;
  puesto: string;
  tipoContrato: TipoContrato;
  jornada: Jornada;
  fechaIngreso: string;
  estado: TrabajadorEstado;
  ds44Critico: boolean;
  riesgosClave: string;
};

type TrabajadorForm = Omit<Trabajador, "id" | "centro" | "area" | "cargo" | "posicion">;

type DbTrabajador = {
  id: string;
  rut: string | null;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  estado: string;
  fechaIngreso: Date | null;
  tipoContrato: string | null;
  jornada: string | null;
  centroTrabajo: RefEntity | null;
  area: RefEntity | null;
  cargo: (RefEntity & {
    esCritico: boolean;
    perfilSST: string | null;
    descripcion: string | null;
  }) | null;
  posicionDotacion: {
    id: string;
    centroTrabajo: {
      nombre: string;
    };
    cargo: {
      nombre: string;
    };
  } | null;
};

function emptyForm(centros: RefEntity[], areas: RefEntity[], cargos: RefEntity[]): TrabajadorForm {
  return {
    rut: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    centroTrabajoId: centros[0]?.id ?? "",
    areaId: areas[0]?.id ?? "",
    cargoId: cargos[0]?.id ?? "",
    posicionDotacionId: "",
    puesto: "",
    tipoContrato: "Indefinido",
    jornada: "Completa",
    fechaIngreso: new Date().toISOString().slice(0, 10),
    estado: "activo",
    ds44Critico: false,
    riesgosClave: "",
  };
}

function mapEstado(estado: string): TrabajadorEstado {
  if (estado === "activo") return "activo";
  if (estado === "baja") return "baja";
  return "inactivo";
}

function mapContrato(value?: string | null): TipoContrato {
  if (value === "Plazo fijo" || value === "Honorarios") return value;
  return "Indefinido";
}

function mapJornada(value?: string | null): Jornada {
  if (value === "Parcial" || value === "Turnos") return value;
  return "Completa";
}

function mapDbTrabajadorToUi(row: DbTrabajador): Trabajador {
  return {
    id: row.id,
    rut: row.rut ?? "",
    nombres: row.nombres,
    apellidos: row.apellidos,
    email: row.email ?? "",
    telefono: row.telefono ?? "",
    centroTrabajoId: row.centroTrabajo?.id ?? "",
    areaId: row.area?.id ?? "",
    cargoId: row.cargo?.id ?? "",
    posicionDotacionId: row.posicionDotacion?.id ?? "",
    centro: row.centroTrabajo?.nombre ?? "Sin centro",
    area: row.area?.nombre ?? "Sin area",
    cargo: row.cargo?.nombre ?? "Sin cargo",
    posicion: row.posicionDotacion ? `${row.posicionDotacion.centroTrabajo.nombre} · ${row.posicionDotacion.cargo.nombre}` : "Sin posición",
    puesto: row.cargo?.nombre ?? "",
    tipoContrato: mapContrato(row.tipoContrato),
    jornada: mapJornada(row.jornada),
    fechaIngreso: row.fechaIngreso ? row.fechaIngreso.toISOString().slice(0, 10) : "",
    estado: mapEstado(row.estado),
    ds44Critico: row.cargo?.esCritico ?? false,
    riesgosClave: row.cargo?.perfilSST ?? row.cargo?.descripcion ?? "",
  };
}

function toActionPayload(form: TrabajadorForm) {
  return {
    centroTrabajoId: form.centroTrabajoId || undefined,
    areaId: form.areaId || undefined,
    cargoId: form.cargoId || undefined,
    posicionDotacionId: form.posicionDotacionId || undefined,
    nombres: form.nombres,
    apellidos: form.apellidos,
    rut: form.rut,
    email: form.email,
    telefono: form.telefono,
    estado: form.estado,
    fechaIngreso: form.fechaIngreso,
    tipoContrato: form.tipoContrato,
    jornada: form.jornada,
  };
}

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [centrosRef, setCentrosRef] = useState<RefEntity[]>([]);
  const [areasRef, setAreasRef] = useState<RefEntity[]>([]);
  const [cargosRef, setCargosRef] = useState<RefEntity[]>([]);
  const [posicionesRef, setPosicionesRef] = useState<RefPosicion[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<TrabajadorEstado | "todos">("todos");
  const [centroFilter, setCentroFilter] = useState<string>("todos");
  const [areaFilter, setAreaFilter] = useState<string>("todos");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrabajadorForm>(emptyForm([], [], []));

  const isEdit = editingId !== null;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([getTrabajadores(), getCentrosTrabajo(), getAreas(), getCargos(), getDotacion()])
      .then(([trabajadoresRows, centrosRows, areasRows, cargosRows, posicionesRows]) => {
        if (!mounted) return;

        const mappedTrabajadores = trabajadoresRows.map((row) => mapDbTrabajadorToUi(row as DbTrabajador));
        const mappedCentros = centrosRows.map((row) => ({ id: row.id, nombre: row.nombre }));
        const mappedAreas = areasRows.map((row) => ({ id: row.id, nombre: row.nombre }));
        const mappedCargos = cargosRows.map((row) => ({ id: row.id, nombre: row.nombre }));
        const mappedPosiciones = posicionesRows
          .filter((row) => row.estado === "activa")
          .map((row) => ({
            id: row.id,
            label: `${row.centroTrabajo.nombre} · ${row.cargo.nombre}`,
          }));

        setTrabajadores(mappedTrabajadores);
        setCentrosRef(mappedCentros);
        setAreasRef(mappedAreas);
        setCargosRef(mappedCargos);
        setPosicionesRef(mappedPosiciones);
        setForm(emptyForm(mappedCentros, mappedAreas, mappedCargos));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const uniqueCentros = useMemo(() => {
    return Array.from(new Set([...centrosRef.map((item) => item.nombre), ...trabajadores.map((item) => item.centro)]));
  }, [centrosRef, trabajadores]);

  const uniqueAreas = useMemo(() => {
    return Array.from(new Set([...areasRef.map((item) => item.nombre), ...trabajadores.map((item) => item.area)]));
  }, [areasRef, trabajadores]);

  const uniqueCargos = useMemo(() => {
    return Array.from(new Set([...cargosRef.map((item) => item.nombre), ...trabajadores.map((item) => item.cargo)]));
  }, [cargosRef, trabajadores]);

  const totalTrabajadores = trabajadores.length;
  const activos = trabajadores.filter((t) => t.estado === "activo").length;
  const ds44 = trabajadores.filter((t) => t.ds44Critico).length;
  const centrosConTrabajadores = new Set(trabajadores.map((t) => t.centro)).size;

  const filtrados = useMemo(() => {
    return trabajadores.filter((t) => {
      const base = `${t.rut} ${t.nombres} ${t.apellidos} ${t.centro} ${t.area} ${t.cargo} ${t.puesto}`;
      const matchSearch = search.trim().length === 0 || base.toLowerCase().includes(search.toLowerCase());
      const matchEstado = estadoFilter === "todos" ? true : t.estado === estadoFilter;
      const matchCentro = centroFilter === "todos" ? true : t.centro === centroFilter;
      const matchArea = areaFilter === "todos" ? true : t.area === areaFilter;
      const matchCargo = cargoFilter === "todos" ? true : t.cargo === cargoFilter;

      return matchSearch && matchEstado && matchCentro && matchArea && matchCargo;
    });
  }, [trabajadores, search, estadoFilter, centroFilter, areaFilter, cargoFilter]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm(centrosRef, areasRef, cargosRef));
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
      centroTrabajoId: t.centroTrabajoId,
      areaId: t.areaId,
      cargoId: t.cargoId,
      posicionDotacionId: t.posicionDotacionId,
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEdit && editingId) {
      const updated = await actualizarTrabajador(editingId, toActionPayload(form));
      const mapped = mapDbTrabajadorToUi(updated as DbTrabajador);
      const withLocalFields: Trabajador = {
        ...mapped,
        puesto: form.puesto,
        ds44Critico: form.ds44Critico,
        riesgosClave: form.riesgosClave,
      };
      setTrabajadores((prev) => prev.map((t) => (t.id === editingId ? withLocalFields : t)));
    } else {
      const created = await crearTrabajador(toActionPayload(form));
      const mapped = mapDbTrabajadorToUi(created as DbTrabajador);
      const withLocalFields: Trabajador = {
        ...mapped,
        puesto: form.puesto,
        ds44Critico: form.ds44Critico,
        riesgosClave: form.riesgosClave,
      };
      setTrabajadores((prev) => [withLocalFields, ...prev]);
    }

    setModalOpen(false);
  };

  const toggleEstado = async (id: string) => {
    const current = trabajadores.find((t) => t.id === id);
    if (!current) return;

    if (current.estado === "activo") {
      const updated = await desactivarTrabajador(id);
      const mapped = mapDbTrabajadorToUi(updated as DbTrabajador);
      setTrabajadores((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...mapped,
                puesto: t.puesto,
                ds44Critico: t.ds44Critico,
                riesgosClave: t.riesgosClave,
              }
            : t
        )
      );
      return;
    }

    const updated = await actualizarTrabajador(id, {
      ...toActionPayload({
        rut: current.rut,
        nombres: current.nombres,
        apellidos: current.apellidos,
        email: current.email,
        telefono: current.telefono,
        centroTrabajoId: current.centroTrabajoId,
        areaId: current.areaId,
        cargoId: current.cargoId,
        posicionDotacionId: current.posicionDotacionId,
        puesto: current.puesto,
        tipoContrato: current.tipoContrato,
        jornada: current.jornada,
        fechaIngreso: current.fechaIngreso,
        estado: "activo",
        ds44Critico: current.ds44Critico,
        riesgosClave: current.riesgosClave,
      }),
      estado: "activo",
    });

    const mapped = mapDbTrabajadorToUi(updated as DbTrabajador);
    setTrabajadores((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...mapped,
              puesto: t.puesto,
              ds44Critico: t.ds44Critico,
              riesgosClave: t.riesgosClave,
            }
          : t
      )
    );
  };

  const toggleDs44 = (id: string) => {
    setTrabajadores((prev) => prev.map((t) => (t.id === id ? { ...t, ds44Critico: !t.ds44Critico } : t)));
  };

  const deleteTrabajador = async (id: string) => {
    const current = trabajadores.find((t) => t.id === id);
    if (!current) return;

    const updated = await desactivarTrabajador(id);
    const mapped = mapDbTrabajadorToUi(updated as DbTrabajador);

    setTrabajadores((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...mapped,
              puesto: current.puesto,
              ds44Critico: current.ds44Critico,
              riesgosClave: current.riesgosClave,
            }
          : t
      )
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 flex flex-col gap-8">
      <StandardPageHeader
        moduleLabel="Empresa"
        title="Trabajadores"
        description="Maestro de trabajadores de la empresa. Desde aqui podras vincularlos a centros, puestos, DS44 y planes de capacitacion."
        icon={Users}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 shadow-sm"
          >
            + Nuevo trabajador
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard label="Trabajadores totales" value={totalTrabajadores.toString()} />
        <MetricCard label="Activos" value={activos.toString()} />
        <MetricCard label="Vinculados a DS44" value={ds44.toString()} />
        <MetricCard label="Centros con dotacion" value={centrosConTrabajadores.toString()} />
      </div>

      <Card className="border border-slate-200 rounded-2xl shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            <div className="w-full md:max-w-md">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Buscar</Label>
              <Input
                placeholder="Buscar por nombre, RUT, centro, area o cargo..."
                className="mt-1 rounded-xl"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="w-32">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</Label>
              <Select value={estadoFilter} onValueChange={(v: string) => setEstadoFilter(v as TrabajadorEstado | "todos")}>
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

            <div className="w-48">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Centro</Label>
              <Select value={centroFilter} onValueChange={(v: string) => setCentroFilter(v)}>
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

            <div className="w-40">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Area</Label>
              <Select value={areaFilter} onValueChange={(v: string) => setAreaFilter(v)}>
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

            <div className="w-44">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargo</Label>
              <Select value={cargoFilter} onValueChange={(v: string) => setCargoFilter(v)}>
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

      <div className="space-y-4">
        {filtrados.map((t) => (
          <Card
            key={t.id}
            className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all bg-white"
          >
            <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t.nombres} {t.apellidos}
                  </h2>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-xs">
                    {t.rut || "Sin RUT"}
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
                    {t.estado === "activo" ? "Activo" : t.estado === "baja" ? "Baja" : "Inactivo"}
                  </Badge>
                  {t.ds44Critico && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-200 bg-amber-50 text-[11px] text-amber-700"
                    >
                      DS44 critico
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-slate-500">
                  {t.cargo} · {t.puesto || "Sin puesto asignado"}
                </p>
                <p className="text-xs text-slate-500">Posición: {t.posicion}</p>

                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-[11px]">
                    Centro: {t.centro}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-indigo-100 bg-indigo-50 text-[11px] text-indigo-700"
                  >
                    Area: {t.area}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-sky-100 bg-sky-50 text-[11px] text-sky-700"
                  >
                    Jornada: {t.jornada}
                  </Badge>
                  <span className="text-[11px]">Ingreso: {t.fechaIngreso || "-"}</span>
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap gap-3 mt-1">
                  <span>📧 {t.email || "Sin correo"}</span>
                  <span>📱 {t.telefono || "Sin telefono"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[260px] text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 text-lg">⚠️</span>
                  <div>
                    <p className="font-semibold text-slate-800">Riesgos clave</p>
                    <p className="text-xs text-slate-500">{t.riesgosClave || "Sin descripcion registrada."}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[190px]">
                <Button variant="outline" className="rounded-xl w-full" onClick={() => handleOpenEdit(t)}>
                  Editar trabajador
                </Button>
                <Button variant="outline" className="rounded-xl w-full text-xs" onClick={() => toggleEstado(t.id)}>
                  {t.estado === "activo" ? "Marcar baja" : "Reactivar"}
                </Button>
                <Button variant="outline" className="rounded-xl w-full text-xs" onClick={() => toggleDs44(t.id)}>
                  {t.ds44Critico ? "Quitar de DS44 critico" : "Marcar DS44 critico"}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => deleteTrabajador(t.id)}
                >
                  Desactivar (Prisma)
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtrados.length === 0 && (
          <Card className="border border-dashed border-slate-300 rounded-2xl bg-slate-50/60">
            <CardContent className="p-8 text-center text-slate-500 text-sm">
              {loading ? "Cargando trabajadores..." : "No se encontraron trabajadores con los filtros aplicados."}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Editar trabajador" : "Nuevo trabajador"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Completa los datos basicos del trabajador para vincularlo con centros, puestos de trabajo y la gestion de DS44 / capacitacion.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">Identidad y contacto</p>

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
                  <Label htmlFor="email">Correo electronico</Label>
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
                  <Label htmlFor="telefono">Telefono</Label>
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

            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">Vinculacion organizativa</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label>Centro</Label>
                  <Select
                    value={form.centroTrabajoId || "sin-centro"}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({ ...prev, centroTrabajoId: v === "sin-centro" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona centro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-centro">Sin centro</SelectItem>
                      {centrosRef.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Area</Label>
                  <Select
                    value={form.areaId || "sin-area"}
                    onValueChange={(v: string) => setForm((prev) => ({ ...prev, areaId: v === "sin-area" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-area">Sin area</SelectItem>
                      {areasRef.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Cargo</Label>
                  <Select
                    value={form.cargoId || "sin-cargo"}
                    onValueChange={(v: string) => setForm((prev) => ({ ...prev, cargoId: v === "sin-cargo" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-cargo">Sin cargo</SelectItem>
                      {cargosRef.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Posición de dotación</Label>
                  <Select
                    value={form.posicionDotacionId || "sin-posicion"}
                    onValueChange={(v: string) => setForm((prev) => ({ ...prev, posicionDotacionId: v === "sin-posicion" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona posicion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-posicion">Sin posición</SelectItem>
                      {posicionesRef.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
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
                    onValueChange={(v: string) => setForm((prev) => ({ ...prev, tipoContrato: v as TipoContrato }))}
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
                    onValueChange={(v: string) => setForm((prev) => ({ ...prev, jornada: v as Jornada }))}
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
                    onValueChange={(v: string) => setForm((prev) => ({ ...prev, estado: v as TrabajadorEstado }))}
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

            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">Riesgos y DS44</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="riesgosClave">Riesgos clave del puesto</Label>
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
                      Este trabajador se considera clave en la gestion de riesgos criticos DS44 (por rol o exposicion).
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

function MetricCard(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white/90">
      <CardContent className="p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
