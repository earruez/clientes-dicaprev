"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Upload } from "lucide-react";

type EstadoHallazgo = "Abierto" | "En progreso" | "Cerrado";
type ModalMode = "create" | "edit";
type UserRole = "admin" | "supervisor" | "prevencionista";

interface HistorialItem {
  fecha: string;
  usuario: string;
  accion: string;
  detalle?: string;
}

interface Hallazgo {
  id: number;
  estado: EstadoHallazgo;
  categoria: string;
  descripcion: string;
  centroTrabajo: string;
  responsable: string;
  fecha: string; // ISO solo fecha (yyyy-mm-dd)
  criticidad: string;
  medidaDisciplinaria: boolean;
  historial: HistorialItem[];
}

interface HallazgoForm {
  descripcion: string;
  categoria: string;
  centroTrabajo: string;
  responsable: string;
  fecha: string;
  criticidad: string;
  estado: EstadoHallazgo;
  medidaDisciplinaria: boolean;
}

// Simulación de usuario actual y rol (luego se conectará a Firestore/Auth)
const currentUserName = "Prevencionista PREVANTIA";
const userRole: UserRole = "admin"; // "admin" | "supervisor" | "prevencionista"
const canReabrir = userRole === "admin" || userRole === "supervisor";

const hallazgosMock: Hallazgo[] = [
  {
    id: 1,
    estado: "Abierto",
    categoria: "Condiciones",
    descripcion: "Extintor vencido en bodega",
    centroTrabajo: "Centro de trabajo Los Maitenes",
    responsable: "Carlos Pérez",
    fecha: "2025-12-15",
    criticidad: "Alta",
    medidaDisciplinaria: false,
    historial: [
      {
        fecha: "2025-11-10T10:00:00Z",
        usuario: "Prevencionista PREVANTIA",
        accion: "Creación de hallazgo",
      },
    ],
  },
  {
    id: 2,
    estado: "En progreso",
    categoria: "Documentación",
    descripcion: "Carpeta DS44 incompleta",
    centroTrabajo: "Centro Modular Talagante",
    responsable: "Ana Ruiz",
    fecha: "2025-12-20",
    criticidad: "Media",
    medidaDisciplinaria: true,
    historial: [
      {
        fecha: "2025-11-09T09:30:00Z",
        usuario: "Prevencionista PREVANTIA",
        accion: "Creación de hallazgo",
      },
      {
        fecha: "2025-11-11T16:40:00Z",
        usuario: "Supervisor general",
        accion: "Actualización de plazo",
        detalle: "Se ajusta fecha compromiso a 20-12-2025",
      },
    ],
  },
];

const emptyForm: HallazgoForm = {
  descripcion: "",
  categoria: "",
  centroTrabajo: "",
  responsable: "",
  fecha: "",
  criticidad: "",
  estado: "Abierto",
  medidaDisciplinaria: false,
};

const claseEstado = (estado: EstadoHallazgo) => {
  switch (estado) {
    case "Abierto":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "En progreso":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Cerrado":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-200";
  }
};

const formateaFechaCorta = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
};

const formateaFechaHora = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export default function HallazgosDS44Page() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [hallazgoEditId, setHallazgoEditId] = useState<number | null>(null);

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [hallazgoCerrar, setHallazgoCerrar] = useState<Hallazgo | null>(null);
  const [comentarioCierre, setComentarioCierre] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");

  const [hallazgos, setHallazgos] = useState<Hallazgo[]>(hallazgosMock);
  const [form, setForm] = useState<HallazgoForm>(emptyForm);

  const abiertos = hallazgos.filter((h) => h.estado === "Abierto").length;
  const enProgreso = hallazgos.filter((h) => h.estado === "En progreso").length;
  const cerrados = hallazgos.filter((h) => h.estado === "Cerrado").length;

  const hallazgosFiltrados = hallazgos.filter((h) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      texto.length === 0 ||
      h.descripcion.toLowerCase().includes(texto) ||
      h.centroTrabajo.toLowerCase().includes(texto) ||
      h.responsable.toLowerCase().includes(texto);

    const coincideEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "abierto" && h.estado === "Abierto") ||
      (filtroEstado === "progreso" && h.estado === "En progreso") ||
      (filtroEstado === "cerrado" && h.estado === "Cerrado");

    const coincideCategoria =
      filtroCategoria === "todas" || h.categoria === filtroCategoria;

    return coincideTexto && coincideEstado && coincideCategoria;
  });

  const abrirNuevo = () => {
    setModalMode("create");
    setHallazgoEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const abrirEditar = (h: Hallazgo) => {
    setModalMode("edit");
    setHallazgoEditId(h.id);
    setForm({
      descripcion: h.descripcion,
      categoria: h.categoria,
      centroTrabajo: h.centroTrabajo,
      responsable: h.responsable,
      fecha: h.fecha,
      criticidad: h.criticidad,
      estado: h.estado,
      medidaDisciplinaria: h.medidaDisciplinaria,
    });
    setModalOpen(true);
  };

  const abrirCerrar = (h: Hallazgo) => {
    setHallazgoCerrar(h);
    setComentarioCierre("");
    setCloseDialogOpen(true);
  };

  const guardarHallazgo = () => {
    const ahora = new Date().toISOString();

    if (modalMode === "create") {
      const nuevo: Hallazgo = {
        id: Date.now(),
        estado: form.estado,
        categoria: form.categoria,
        descripcion: form.descripcion,
        centroTrabajo: form.centroTrabajo,
        responsable: form.responsable,
        fecha: form.fecha,
        criticidad: form.criticidad,
        medidaDisciplinaria: form.medidaDisciplinaria,
        historial: [
          {
            fecha: ahora,
            usuario: currentUserName,
            accion: "Creación de hallazgo",
          },
        ],
      };
      setHallazgos((prev) => [...prev, nuevo]);
    } else if (modalMode === "edit" && hallazgoEditId !== null) {
      setHallazgos((prev) =>
        prev.map((h) => {
          if (h.id !== hallazgoEditId) return h;
          const cambios: HistorialItem[] = [];

          if (h.estado !== form.estado) {
            cambios.push({
              fecha: ahora,
              usuario: currentUserName,
              accion: `Cambio de estado: ${h.estado} → ${form.estado}`,
            });
          } else {
            cambios.push({
              fecha: ahora,
              usuario: currentUserName,
              accion: "Edición de hallazgo",
            });
          }

          return {
            ...h,
            estado: form.estado,
            categoria: form.categoria,
            descripcion: form.descripcion,
            centroTrabajo: form.centroTrabajo,
            responsable: form.responsable,
            fecha: form.fecha,
            criticidad: form.criticidad,
            medidaDisciplinaria: form.medidaDisciplinaria,
            historial: [...h.historial, ...cambios],
          };
        })
      );
    }

    setModalOpen(false);
  };

  const confirmarCierre = () => {
    if (!hallazgoCerrar) return;
    const ahora = new Date().toISOString();

    setHallazgos((prev) =>
      prev.map((h) => {
        if (h.id !== hallazgoCerrar.id) return h;
        return {
          ...h,
          estado: "Cerrado",
          historial: [
            ...h.historial,
            {
              fecha: ahora,
              usuario: currentUserName,
              accion: "Cierre de hallazgo",
              detalle:
                comentarioCierre.trim().length > 0
                  ? comentarioCierre.trim()
                  : "Cierre sin comentario adicional.",
            },
          ],
        };
      })
    );

    setCloseDialogOpen(false);
    setHallazgoCerrar(null);
    setComentarioCierre("");
  };

  const hallazgoOriginal =
    modalMode === "edit" && hallazgoEditId !== null
      ? hallazgos.find((h) => h.id === hallazgoEditId)
      : undefined;

  const historialActual: HistorialItem[] =
    modalMode === "edit" && hallazgoOriginal
      ? [...hallazgoOriginal.historial].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )
      : [];

  return (
    <div className="min-h-screen bg-slate-50/80 py-10">
      <div className="max-w-6xl mx-auto space-y-8 px-4 lg:px-0">
        {/* ENCABEZADO */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Hallazgos DS44
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Control y seguimiento centralizado de los hallazgos detectados en
              tus centros de trabajo.
            </p>
          </div>

          <Button
            onClick={abrirNuevo}
            className="hidden sm:inline-flex bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2.5 text-sm font-medium shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo hallazgo
          </Button>
        </header>

        {/* FILTROS */}
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar hallazgo, centro de trabajo o responsable..."
                className="pl-9 text-sm"
                value={busqueda}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBusqueda(e.target.value)
                }
              />
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
              <Select
                value={filtroEstado}
                onValueChange={(value: string) => setFiltroEstado(value)}
              >
                <SelectTrigger className="w-full sm:w-40 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="abierto">Abierto</SelectItem>
                  <SelectItem value="progreso">En progreso</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filtroCategoria}
                onValueChange={(value: string) => setFiltroCategoria(value)}
              >
                <SelectTrigger className="w-full sm:w-48 text-sm">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Condiciones">Condiciones</SelectItem>
                  <SelectItem value="Documentación">Documentación</SelectItem>
                  <SelectItem value="Comportamientos">
                    Comportamientos
                  </SelectItem>
                  <SelectItem value="Emergencias">Emergencias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón móvil */}
            <Button
              onClick={abrirNuevo}
              className="sm:hidden bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-2 text-sm font-medium"
            >
              <Plus className="mr-1 h-4 w-4" />
              Nuevo
            </Button>
          </CardContent>
        </Card>

        {/* KPIS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium uppercase text-amber-700">
                Abiertos
              </p>
              <p className="text-3xl font-semibold text-amber-700">{abiertos}</p>
              <p className="text-[11px] text-amber-700/80">
                Hallazgos pendientes de acción.
              </p>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium uppercase text-blue-700">
                En progreso
              </p>
              <p className="text-3xl font-semibold text-blue-700">
                {enProgreso}
              </p>
              <p className="text-[11px] text-blue-700/80">
                Hallazgos con acciones en curso.
              </p>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardHeader className="space-y-1">
              <p className="text-xs font-medium uppercase text-emerald-700">
                Cerrados
              </p>
              <p className="text-3xl font-semibold text-emerald-700">
                {cerrados}
              </p>
              <p className="text-[11px] text-emerald-700/80">
                Hallazgos gestionados y cerrados.
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* TABLA DE HALLAZGOS */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-medium uppercase text-slate-500">
                    <th className="py-2 text-left">Estado</th>
                    <th className="py-2 text-left">Categoría</th>
                    <th className="py-2 text-left">Hallazgo</th>
                    <th className="py-2 text-left">Centro de trabajo</th>
                    <th className="py-2 text-left">Responsable</th>
                    <th className="py-2 text-left">Fecha límite</th>
                    <th className="py-2 text-left">Medida disc.</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {hallazgosFiltrados.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b last:border-0 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-2 align-middle">
                        <Badge
                          className={
                            "rounded-full px-3 py-1 text-xs font-medium " +
                            claseEstado(h.estado)
                          }
                        >
                          {h.estado}
                        </Badge>
                      </td>
                      <td className="text-slate-700">{h.categoria}</td>
                      <td className="font-medium text-slate-900">
                        {h.descripcion}
                      </td>
                      <td className="text-slate-700">{h.centroTrabajo}</td>
                      <td className="text-slate-700">{h.responsable}</td>
                      <td className="text-slate-700">
                        {formateaFechaCorta(h.fecha)}
                      </td>
                      <td className="text-slate-700 text-xs">
                        {h.medidaDisciplinaria ? "Sí" : "No"}
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-slate-600"
                            onClick={() => abrirEditar(h)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                            onClick={() => abrirCerrar(h)}
                          >
                            Cerrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {hallazgosFiltrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        No se encontraron hallazgos con los filtros
                        seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* MODAL NUEVO / EDITAR HALLAZGO */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {modalMode === "create"
                  ? "Nuevo hallazgo DS44"
                  : "Editar hallazgo DS44"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div>
                <Label className="text-xs text-slate-600">
                  Descripción del hallazgo
                </Label>
                <Input
                  className="mt-1 text-sm"
                  value={form.descripcion}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-600">Categoría</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v: string) =>
                      setForm({
                        ...form,
                        categoria: v,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Condiciones">Condiciones</SelectItem>
                      <SelectItem value="Documentación">
                        Documentación
                      </SelectItem>
                      <SelectItem value="Comportamientos">
                        Comportamientos
                      </SelectItem>
                      <SelectItem value="Emergencias">Emergencias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">
                    Centro de trabajo
                  </Label>
                  <Select
                    value={form.centroTrabajo}
                    onValueChange={(v: string) =>
                      setForm({
                        ...form,
                        centroTrabajo: v,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Seleccionar centro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Centro de trabajo Los Maitenes">
                        Centro de trabajo Los Maitenes
                      </SelectItem>
                      <SelectItem value="Centro Modular Talagante">
                        Centro Modular Talagante
                      </SelectItem>
                      <SelectItem value="Centro Logístico Pudahuel">
                        Centro Logístico Pudahuel
                      </SelectItem>
                      <SelectItem value="Centro Santiago Poniente">
                        Centro Santiago Poniente
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-600">Responsable</Label>
                  <Select
                    value={form.responsable}
                    onValueChange={(v: string) =>
                      setForm({
                        ...form,
                        responsable: v,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Carlos Pérez">
                        Carlos Pérez
                      </SelectItem>
                      <SelectItem value="Ana Ruiz">Ana Ruiz</SelectItem>
                      <SelectItem value="María González">
                        María González
                      </SelectItem>
                      <SelectItem value="Juan Morales">
                        Juan Morales
                      </SelectItem>
                      <SelectItem value="Supervisor general">
                        Supervisor general
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">
                    Fecha compromiso
                  </Label>
                  <Input
                    type="date"
                    className="mt-1 text-sm"
                    value={form.fecha}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm({ ...form, fecha: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-slate-600">
                    Nivel de criticidad
                  </Label>
                  <Select
                    value={form.criticidad}
                    onValueChange={(v: string) =>
                      setForm({
                        ...form,
                        criticidad: v,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 text-sm">
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baja">Baja</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Estado</Label>

                  {modalMode === "edit" &&
                  hallazgoOriginal?.estado === "Cerrado" &&
                  !canReabrir ? (
                    <div className="mt-1">
                      <Badge
                        className={
                          "rounded-full px-3 py-1 text-xs font-medium " +
                          claseEstado("Cerrado")
                        }
                      >
                        Cerrado
                      </Badge>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Solo usuarios con rol <strong>Supervisor</strong> o{" "}
                        <strong>Admin</strong> pueden reabrir un hallazgo
                        cerrado.
                      </p>
                    </div>
                  ) : (
                    <Select
                      value={form.estado}
                      onValueChange={(v: EstadoHallazgo) =>
                        setForm({
                          ...form,
                          estado: v,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Abierto">Abierto</SelectItem>
                        <SelectItem value="En progreso">
                          En progreso
                        </SelectItem>
                        <SelectItem value="Cerrado">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  className="w-full justify-center text-sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Adjuntar foto o archivo
                </Button>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="medidaDisc"
                  checked={form.medidaDisciplinaria}
                  onCheckedChange={(val: boolean | "indeterminate") =>
                    setForm({
                      ...form,
                      medidaDisciplinaria: val === true,
                    })
                  }
                />

                <div>
                  <Label
                    htmlFor="medidaDisc"
                    className="text-xs text-slate-700"
                  >
                    Genera medida disciplinaria
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Por ejemplo, amonestación según Reglamento Interno cuando el
                    trabajador reincide (no uso de EPP, etc.).
                  </p>
                </div>
              </div>

              {/* HISTORIAL */}
              {modalMode === "edit" && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4">
                  <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3">
                    Historial de cambios
                  </h4>
                  {historialActual.length === 0 ? (
                    <p className="text-[12px] text-slate-500">
                      Aún no hay registros de cambios para este hallazgo.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {historialActual.map((item, idx) => (
                        <li key={idx} className="flex gap-3">
                          <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
                          <div>
                            <p className="text-xs font-medium text-slate-800">
                              {item.accion}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formateaFechaHora(item.fecha)} · {item.usuario}
                            </p>
                            {item.detalle && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {item.detalle}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                className="text-sm"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                onClick={guardarHallazgo}
              >
                Guardar hallazgo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL ULTRA PREMIUM DE CIERRE */}
        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent className="max-w-lg border border-emerald-100/70 bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Cerrar hallazgo DS44</DialogTitle>
            </DialogHeader>

            {hallazgoCerrar && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-emerald-700 mb-1">
                    Resumen del hallazgo
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {hallazgoCerrar.descripcion}
                  </p>
                  <p className="mt-1 text-[12px] text-emerald-900/80">
                    {hallazgoCerrar.centroTrabajo} · Responsable:{" "}
                    {hallazgoCerrar.responsable}
                  </p>
                  <p className="text-[11px] text-emerald-900/70">
                    Fecha compromiso: {formateaFechaCorta(hallazgoCerrar.fecha)}{" "}
                    · Criticidad: {hallazgoCerrar.criticidad}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">
                    Comentario de cierre
                  </Label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows={3}
                    placeholder="Describe la acción correctiva implementada, responsable, fechas, evidencias, etc."
                    value={comentarioCierre}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setComentarioCierre(e.target.value)
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Este comentario quedará registrado en el historial del
                    hallazgo como evidencia de cierre.
                  </p>
                </div>

                <div>
                  <Button
                    variant="outline"
                    className="w-full justify-center text-sm border-dashed border-emerald-300"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Adjuntar evidencia (opcional)
                  </Button>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Fotografías, actas, registros de capacitación, etc. (por
                    ahora solo mock visual).
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                className="text-sm"
                onClick={() => setCloseDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                onClick={confirmarCierre}
              >
                Confirmar cierre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
