"use client";

import React from "react";
import { LayoutGrid, Rows3, Users, ShieldAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrabajadoresVista } from "../types";

type TabsTrabajadorProps = {
  vista: TrabajadoresVista;
  setVista: (v: TrabajadoresVista) => void;
  total: number;
  vigentes: number;
  conDs44Pendiente: number;
};

export default function TabsTrabajador({
  vista,
  setVista,
  total,
  vigentes,
  conDs44Pendiente,
}: TabsTrabajadorProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <Tabs
        value={vista}
        onValueChange={(v) => setVista(v as TrabajadoresVista)}
        className="w-full md:w-auto"
      >
        <TabsList className="grid w-full grid-cols-2 md:w-[260px]">
          <TabsTrigger value="tabla" className="flex items-center gap-1 text-xs">
            <Rows3 className="h-3 w-3" />
            Tabla
          </TabsTrigger>
          <TabsTrigger value="cards" className="flex items-center gap-1 text-xs">
            <LayoutGrid className="h-3 w-3" />
            Fichas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
          <Users className="h-3 w-3 text-slate-500" />
          {total} totales
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {vigentes} vigentes
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
          <ShieldAlert className="h-3 w-3" />
          {conDs44Pendiente} con DS44 pendiente
        </span>
      </div>
    </div>
  );
}
