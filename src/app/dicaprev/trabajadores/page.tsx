"use client";

import React, { useMemo, useState } from "react";

import { Trabajador } from "./types";
import { useTrabajadores } from "./hooks_useTrabajadores";

import TableView from "./components/TableView";
import CardView from "./components/CardView";
import Filtros from "./components/Filtros";
import Exportar from "./components/Exportar";

import NuevoTrabajador from "./modals/NuevoTrabajador";
import EditTrabajadorModal from "./modals/EditarTrabajador";

import { Button } from "src/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "src/components/ui/tabs";

// Alias para relajar los tipos de los componentes existentes
const TableViewAny = TableView as React.ComponentType<any>;
const CardViewAny = CardView as React.ComponentType<any>;
const FiltrosAny = Filtros as React.ComponentType<any>;

type Vista = "tabla" | "fichas";

export default function TrabajadoresPage() {
  // ⬇️ usamos los nombres reales del hook existente
  const {
    trabajadores,
    agregarTrabajador,
    actualizarTrabajador,
    eliminarTrabajador,
  } = useTrabajadores();

  const [vista, setVista] = useState<Vista>("tabla");

  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [trabajadorEdit, setTrabajadorEdit] = useState<Trabajador | null>(null);

  // Estado básico de filtros (lo afinamos después, por ahora solo para que Filtros funcione)
  const [filtros, setFiltros] = useState<any>({
    busqueda: "",
    estado: "todos",
    centro: "todos",
  });

  // Por ahora no aplicamos filtros; solo devolvemos la lista completa.
  const listaFiltrada = useMemo(() => {
    return trabajadores;
  }, [trabajadores]);

  const stats = useMemo(() => {
    const total = trabajadores.length;
    const vigentes = trabajadores.filter((t) => t.estado === "vigente").length;
    const ds44Pendientes = trabajadores.filter((t) => t.ds44Pendiente).length;

    return { total, vigentes, ds44Pendientes };
  }, [trabajadores]);

  // ===========================
  // Handlers
  // ===========================
  const handleNuevoSave = (t: Trabajador) => {
    agregarTrabajador(t);
    setNuevoOpen(false);
  };

  const handleEditarClick = (id: string) => {
    const found = trabajadores.find((t) => t.id === id) ?? null;
    setTrabajadorEdit(found);
    setEditOpen(true);
  };

  const handleEditarSave = async ({
    id,
    data,
  }: {
    id: string;
    data: Partial<Trabajador>;
  }) => {
    actualizarTrabajador(id, data);
  };

  const handleDelete = (id: string) => {
    eliminarTrabajador(id);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Título y descripción corta */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Trabajadores
        </h1>
        <p className="text-sm text-slate-500">
          Administra las fichas de trabajadores, su ubicación en la organización
          y el estado DS44.
        </p>
      </div>

      {/* Filtros superiores */}
      <FiltrosAny
        filtros={filtros}
        setFiltros={setFiltros}
        total={stats.total}
        filtrados={listaFiltrada.length}
        onCrear={() => setNuevoOpen(true)}
      />

      {/* Barra de acciones: exportar + botón nuevo + resumen rápido */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <Exportar data={listaFiltrada} />
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <Button
            type="button"
            onClick={() => setNuevoOpen(true)}
            className="h-9 px-4 rounded-xl shadow-sm"
          >
            + Nuevo trabajador
          </Button>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{stats.total} totales</span>
            <span>• {stats.vigentes} vigentes</span>
            <span>• {stats.ds44Pendientes} con DS44 pendiente</span>
          </div>
        </div>
      </div>

      {/* Toggle Tabla / Fichas + stats compactos */}
      <div className="flex items-center justify-between gap-3">
        <Tabs
          value={vista}
          onValueChange={(value) => setVista(value as Vista)}
        >
          <TabsList className="bg-slate-100/80 rounded-xl p-1">
            <TabsTrigger
              value="tabla"
              className="px-4 py-1 text-xs font-medium"
            >
              Tabla
            </TabsTrigger>
            <TabsTrigger
              value="fichas"
              className="px-4 py-1 text-xs font-medium"
            >
              Fichas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
          <span>{stats.total} trabajadores</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {stats.vigentes} vigentes
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {stats.ds44Pendientes} DS44 pendiente
          </span>
        </div>
      </div>

      {/* Vista principal: tabla o tarjetas */}
      {vista === "tabla" ? (
        <TableViewAny
          data={listaFiltrada}
          onEdit={handleEditarClick}
          onDelete={handleDelete}
        />
      ) : (
        <CardViewAny
          data={listaFiltrada}
          onEdit={handleEditarClick}
          onDelete={handleDelete}
        />
      )}

      {/* Modal NUEVO TRABAJADOR */}
      <NuevoTrabajador
        open={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        onSave={handleNuevoSave}
      />

      {/* Modal EDITAR TRABAJADOR */}
      <EditTrabajadorModal
        open={editOpen}
        onOpenChange={setEditOpen}
        trabajador={trabajadorEdit}
        onSave={handleEditarSave}
      />
    </div>
  );
}
