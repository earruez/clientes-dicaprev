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
  DialogFooter,
  DialogDescription,
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

type AreaStatus = "activa" | "inactiva";

type Area = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  tipo: "Operaciones" | "Administración" | "Soporte" | "Seguridad" | "Otro";
  riesgoPrincipal: string;
  responsable: string;
  correoResponsable: string;
  telefonoResponsable?: string;
  trabajadores: number;
  centros: number;
  estado: AreaStatus;
  creadaEl: string; // ISO or formatted
};

type AreaForm = Omit<Area, "id" | "creadaEl" | "trabajadores" | "centros">;

/* ======================================================================= */
/*                               MOCK DATA                                 */
/* ======================================================================= */

// En producción esto vendrá de Firestore (colección: empresa/{id}/areas)
const MOCK_AREAS: Area[] = [
  {
    id: "area-1",
    nombre: "Prevención de Riesgos",
    codigo: "PRV-001",
    descripcion:
      "Área responsable de coordinar la gestión de seguridad y salud en todas las obras.",
    tipo: "Seguridad",
    riesgoPrincipal: "Riesgos críticos DS44",
    responsable: "Diana Marín",
    correoResponsable: "diana@dicaprev.cl",
    telefonoResponsable: "+56 9 1234 5678",
    trabajadores: 4,
    centros: 8,
    estado: "activa",
    creadaEl: "2024-11-01",
  },
  {
    id: "area-2",
    nombre: "Operaciones Terreno",
    codigo: "OPR-010",
    descripcion:
      "Supervisión directa de obras y coordinación con contratistas.",
    tipo: "Operaciones",
    riesgoPrincipal: "Trabajo en altura, manipulación de cargas",
    responsable: "Juan Pérez",
    correoResponsable: "jperez@empresa.cl",
    telefonoResponsable: "+56 9 8765 4321",
    trabajadores: 25,
    centros: 5,
    estado: "activa",
    creadaEl: "2024-10-15",
  },
  {
    id: "area-3",
    nombre: "Administración Central",
    codigo: "ADM-001",
    descripcion: "Gestión administrativa y soporte interno.",
    tipo: "Administración",
    riesgoPrincipal: "Ergonomía, trabajo en oficina",
    responsable: "Carolina Soto",
    correoResponsable: "csoto@empresa.cl",
    telefonoResponsable: "+56 2 2222 3333",
    trabajadores: 12,
    centros: 1,
    estado: "inactiva",
    creadaEl: "2024-09-01",
  },
];

/* ======================================================================= */
/*                          PAGE COMPONENT                                  */
/* ======================================================================= */

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>(MOCK_AREAS);
  const [search, setSearch] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<AreaStatus | "todas">(
    "todas"
  );

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);

  const [form, setForm] = useState<AreaForm>({
    nombre: "",
    codigo: "",
    descripcion: "",
    tipo: "Operaciones",
    riesgoPrincipal: "",
    responsable: "",
    correoResponsable: "",
    telefonoResponsable: "",
    estado: "activa",
  });

  /* ------------------------------------------------------------------- */
  /*                           HELPERS / MEMO                            */
  /* ------------------------------------------------------------------- */

  const totalAreas = areas.length;
  const activas = areas.filter((a) => a.estado === "activa").length;
  const totalTrabajadores = areas.reduce(
    (acc, area) => acc + area.trabajadores,
    0
  );
  const totalCentros = areas.reduce((acc, area) => acc + area.centros, 0);

  const filtradas = useMemo(() => {
    return areas.filter((a) => {
      const matchSearch =
        search.trim().length === 0 ||
        a.nombre.toLowerCase().includes(search.toLowerCase()) ||
        a.codigo.toLowerCase().includes(search.toLowerCase()) ||
        a.responsable.toLowerCase().includes(search.toLowerCase());

      const matchEstado =
        estadoFilter === "todas" ? true : a.estado === estadoFilter;

      return matchSearch && matchEstado;
    });
  }, [areas, search, estadoFilter]);

  const isEdit = editingAreaId !== null;

  /* ------------------------------------------------------------------- */
  /*                              HANDLERS                               */
  /* ------------------------------------------------------------------- */

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingAreaId(null);
    setForm({
      nombre: "",
      codigo: "",
      descripcion: "",
      tipo: "Operaciones",
      riesgoPrincipal: "",
      responsable: "",
      correoResponsable: "",
      telefonoResponsable: "",
      estado: "activa",
    });
    setModalOpen(true);
  };

  const openEditModal = (area: Area) => {
    setEditingAreaId(area.id);
    setForm({
      nombre: area.nombre,
      codigo: area.codigo,
      descripcion: area.descripcion,
      tipo: area.tipo,
      riesgoPrincipal: area.riesgoPrincipal,
      responsable: area.responsable,
      correoResponsable: area.correoResponsable,
      telefonoResponsable: area.telefonoResponsable ?? "",
      estado: area.estado,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEdit && editingAreaId) {
      // EDITAR
      setAreas((prev) =>
        prev.map((a) =>
          a.id === editingAreaId
            ? {
                ...a,
                ...form,
              }
            : a
        )
      );

      // Aquí iría update a Firestore:
      // await updateDoc(doc(db, "empresas/{id}/areas", editingAreaId), form)

    } else {
      // CREAR
      const newArea: Area = {
        id: `area-${Date.now()}`,
        creadaEl: new Date().toISOString().slice(0, 10),
        trabajadores: 0,
        centros: 0,
        ...form,
      };

      setAreas((prev) => [newArea, ...prev]);

      // Aquí iría create en Firestore:
      // await addDoc(collection(db, "empresas/{id}/areas"), newArea)
    }

    setModalOpen(false);
  };

  const toggleEstado = (areaId: string) => {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, estado: a.estado === "activa" ? "inactiva" : "activa" }
          : a
      )
    );

    // Firestore:
    // await updateDoc(doc(db, "empresas/{id}/areas", areaId), { estado: nuevoEstado });
  };

  const deleteArea = (areaId: string) => {
    // En producción esto probablemente será "archivar" y no borrar
    setAreas((prev) => prev.filter((a) => a.id !== areaId));

    // Firestore:
    // await deleteDoc(doc(db, "empresas/{id}/areas", areaId));
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
            Áreas de trabajo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define y administra las áreas internas de la empresa. Estas áreas se
            utilizarán para asociar trabajadores, centros de trabajo y
            responsabilidades SST.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 shadow-sm"
        >
          + Nueva área
        </Button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard label="Áreas Totales" value={totalAreas.toString()} />
        <MetricCard label="Áreas Activas" value={activas.toString()} />
        <MetricCard
          label="Trabajadores Asociados"
          value={totalTrabajadores.toString()}
        />
        <MetricCard
          label="Centros de Trabajo Asociados"
          value={totalCentros.toString()}
        />
      </div>

      {/* FILTROS */}
      <Card className="border border-slate-200 rounded-2xl shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex-1 flex gap-3">
            <div className="w-full md:max-w-md">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Buscar
              </Label>
              <Input
                placeholder="Buscar por nombre, código o responsable…"
                className="mt-1 rounded-xl"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-40">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Estado
              </Label>
              <Select
                value={estadoFilter}
                onValueChange={(v: string) =>
                  setEstadoFilter(v as AreaStatus | "todas")
                }
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="inactiva">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LISTADO DE ÁREAS */}
      <div className="space-y-4">
        {filtradas.map((area) => (
          <Card
            key={area.id}
            className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-[1px] bg-white"
          >
            <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* IZQUIERDA: nombre + descripción */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {area.nombre}
                  </h2>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 text-xs"
                  >
                    {area.codigo}
                  </Badge>
                  <Badge
                    className={`rounded-full text-xs ${
                      area.estado === "activa"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {area.estado === "activa" ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">
                  {area.descripcion}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 text-[11px]"
                  >
                    Tipo: {area.tipo}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-amber-100 bg-amber-50 text-[11px] text-amber-700"
                  >
                    Riesgo principal: {area.riesgoPrincipal}
                  </Badge>
                  <span className="text-[11px]">
                    Creada el {area.creadaEl}
                  </span>
                </div>
              </div>

              {/* CENTRO: cifras */}
              <div className="flex flex-row md:flex-col gap-3 text-sm text-slate-600 min-w-[210px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-lg">👷</span>
                  <span>
                    <span className="font-semibold">
                      {area.trabajadores}
                    </span>{" "}
                    trabajadores
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-lg">🏗️</span>
                  <span>
                    <span className="font-semibold">{area.centros}</span>{" "}
                    centros
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-lg">👤</span>
                  <span className="truncate max-w-[180px]">
                    Responsable:{" "}
                    <span className="font-semibold">
                      {area.responsable}
                    </span>
                  </span>
                </div>
              </div>

              {/* DERECHA: acciones */}
              <div className="flex flex-col gap-2 min-w-[180px]">
                <Button
                  variant="outline"
                  className="rounded-xl w-full"
                  onClick={() => openEditModal(area)}
                >
                  Editar área
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl w-full text-xs"
                  onClick={() => toggleEstado(area.id)}
                >
                  {area.estado === "activa"
                    ? "Marcar como inactiva"
                    : "Reactivar área"}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => deleteArea(area.id)}
                >
                  Eliminar (mock)
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtradas.length === 0 && (
          <Card className="border border-dashed border-slate-300 rounded-2xl bg-slate-50/60">
            <CardContent className="p-8 text-center text-slate-500 text-sm">
              No se encontraron áreas con los filtros aplicados.
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL CREAR / EDITAR ÁREA */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl rounded-3xl border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Editar área" : "Nueva área"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Define la información principal del área. Luego podrás asociar
              trabajadores, centros de trabajo y documentación específica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* BLOQUE 1: IDENTIFICACIÓN */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Identificación del área
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej: Prevención de Riesgos"
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
                    placeholder="Ej: PRV-001"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Tipo de área</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v: string) =>
                      setForm((prev) => ({
                        ...prev,
                        tipo: v as AreaForm["tipo"],
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operaciones">
                        Operaciones
                      </SelectItem>
                      <SelectItem value="Administración">
                        Administración
                      </SelectItem>
                      <SelectItem value="Soporte">Soporte</SelectItem>
                      <SelectItem value="Seguridad">Seguridad</SelectItem>
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
                        estado: v as AreaStatus,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa">Activa</SelectItem>
                      <SelectItem value="inactiva">Inactiva</SelectItem>
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
  placeholder="Describe el alcance y responsabilidades principales del área…"
  className="rounded-xl bg-white min-h-[80px] border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner resize-y"
/>

              </div>
            </div>

            {/* BLOQUE 2: RIESGO & RESPONSABLE */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4 space-y-4">
              <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Riesgo y responsable
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="riesgoPrincipal">
                    Riesgo principal / enfoque SST
                  </Label>
                  <Input
                    id="riesgoPrincipal"
                    name="riesgoPrincipal"
                    value={form.riesgoPrincipal}
                    onChange={handleInputChange}
                    placeholder="Ej: Trabajo en altura, riesgos críticos DS44…"
                    className="rounded-xl bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="responsable">
                    Responsable del área
                  </Label>
                  <Input
                    id="responsable"
                    name="responsable"
                    value={form.responsable}
                    onChange={handleInputChange}
                    placeholder="Nombre del responsable"
                    className="rounded-xl bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="correoResponsable">
                    Correo responsable
                  </Label>
                  <Input
                    id="correoResponsable"
                    name="correoResponsable"
                    type="email"
                    value={form.correoResponsable}
                    onChange={handleInputChange}
                    placeholder="correo@empresa.cl"
                    className="rounded-xl bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="telefonoResponsable">
                    Teléfono responsable
                  </Label>
                  <Input
                    id="telefonoResponsable"
                    name="telefonoResponsable"
                    value={form.telefonoResponsable}
                    onChange={handleInputChange}
                    placeholder="+56 9 ..."
                    className="rounded-xl bg-white"
                  />
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
                {isEdit ? "Guardar cambios" : "Crear área"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ======================================================================= */
/*                       SMALL PRESENTATIONAL PCS                          */
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

