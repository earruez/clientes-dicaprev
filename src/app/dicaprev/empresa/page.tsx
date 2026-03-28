"use client";

import React, { useState, ChangeEvent } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

/* ======================================================================= */
/*                              MOCK DATA                                  */
/* ======================================================================= */

const MOCK_EMPRESA = {
  razonSocial: "DICAPREV SpA",
  rut: "77.777.777-7",
  representante: "DIANA MARÍN LOBOS",
  rutRep: "12.345.678-9",
  tipo: "Privada",
  direccion: "Av. Ejemplo 1234",
  comuna: "Ñuñoa",
  region: "Metropolitana de Santiago",

  totalTrabajadores: 48,
  centrosActivos: 4,
  cumplimientoGlobal: 82,
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
    <p className="mt-1 px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-900 border border-slate-100">
      {value}
    </p>
  </div>
);

/* ======================================================================= */
/*                        COMPONENTE PRINCIPAL                              */
/* ======================================================================= */

export default function Page() {
  const [editOpen, setEditOpen] = useState(false);

  // FORM STATE
  const [form, setForm] = useState({
    razonSocial: MOCK_EMPRESA.razonSocial,
    rut: MOCK_EMPRESA.rut,
    representante: MOCK_EMPRESA.representante,
    rutRep: MOCK_EMPRESA.rutRep,
    tipo: MOCK_EMPRESA.tipo,
    direccion: MOCK_EMPRESA.direccion,
    comuna: MOCK_EMPRESA.comuna,
    region: MOCK_EMPRESA.region,
  });

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  /* ======================================================================= */
  /*                                 UI                                      */
  /* ======================================================================= */

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 flex flex-col gap-8">

      {/* Header principal */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Información de la Empresa
          </h1>
          <p className="text-slate-500 mt-1">
            Configura los datos generales y estructura de tu empresa.
          </p>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl shadow-sm"
          onClick={() => setEditOpen(true)}
        >
          Editar empresa
        </Button>
      </div>

      {/* Cards métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Trabajadores */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Trabajadores Totales</p>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              {MOCK_EMPRESA.totalTrabajadores}
            </h2>
          </CardContent>
        </Card>

        {/* Centros activos */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Centros de Trabajo</p>
            <h2 className="text-3xl font-bold text-slate-900 mt-1">
              {MOCK_EMPRESA.centrosActivos}
            </h2>
          </CardContent>
        </Card>

        {/* Cumplimiento SST */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Cumplimiento Global</p>
            <h2 className="text-3xl font-bold text-emerald-600 mt-1">
              {MOCK_EMPRESA.cumplimientoGlobal}%
            </h2>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white border rounded-xl shadow-sm p-2 w-fit">
          <TabsTrigger
            value="general"
            className="rounded-lg px-5 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            General
          </TabsTrigger>
          <TabsTrigger
            value="sst"
            className="rounded-lg px-5 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            Gobierno SST
          </TabsTrigger>
          <TabsTrigger
            value="estructura"
            className="rounded-lg px-5 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            Estructura
          </TabsTrigger>
        </TabsList>

        {/* TAB GENERAL */}
       <TabsContent value="general" className="mt-8">
  <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white">
    <CardHeader className="border-b border-slate-100 pb-4">
      <h2 className="text-xl font-semibold text-slate-900">
        Información General
      </h2>
      <p className="text-sm text-slate-500">
        Datos maestros de la empresa que se usan en reportes, contratos y paneles.
      </p>
    </CardHeader>

    <CardContent className="pt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Razón Social
            </p>
            <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100 text-sm text-slate-900">
              {form.razonSocial}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Representante Legal
            </p>
            <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100 text-sm text-slate-900">
              {form.representante}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Dirección
            </p>
            <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100 text-sm text-slate-900">
              {form.direccion}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              RUT Empresa
            </p>
            <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100 text-sm text-slate-900">
              {form.rut}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              RUT Representante
            </p>
            <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100 text-sm text-slate-900">
              {form.rutRep}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Ubicación
            </p>
            <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100 text-sm text-slate-900">
              {form.comuna}, {form.region}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>


        {/* TAB GOBIERNO SST */}
    <TabsContent value="sst" className="mt-8">
  <div className="space-y-8">

    {/* KPIs SUPERIORES – ESTILO PREMIUM */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        {
          label: "Comité Paritario",
          value: "Vigente",
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          icon: "👥",
        },
        {
          label: "Delegado SST",
          value: "No Aplica",
          color: "text-slate-600",
          bg: "bg-slate-50",
          icon: "🧑‍💼",
        },
        {
          label: "Tasa DS67",
          value: "1,70%",
          color: "text-blue-600",
          bg: "bg-blue-50",
          icon: "📊",
        },
        {
          label: "Accidentabilidad",
          value: "1,2%",
          color: "text-amber-600",
          bg: "bg-amber-50",
          icon: "⚠️",
        },
      ].map((kpi) => (
        <Card
          key={kpi.label}
          className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-200"
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div
              className={`h-10 w-10 flex items-center justify-center rounded-xl ${kpi.bg}`}
            >
              <span className="text-xl">{kpi.icon}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {kpi.label}
              </span>
              <span className={`text-xl font-semibold ${kpi.color}`}>
                {kpi.value}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* BLOQUE DS44 */}
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              DS44 — Comité Paritario
            </h3>
            <p className="text-sm text-slate-500">
              Información clave del Comité Paritario, su vigencia y requisitos
              legales.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
            👥 Comité vigente
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="¿Requiere Comité Paritario?" value="Sí, más de 25 trabajadores" />
          <Info label="Estado" value="Constituido" />
          <Info label="Última elección" value="12-11-2024" />
          <Info label="Vigencia hasta" value="12-11-2026" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            La información detallada se obtiene de la matriz DS44 asociada a los centros
            de trabajo.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5">
            Ver matriz DS44 completa
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* BLOQUE DS67 */}
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              DS67 — Evaluación de Riesgos
            </h3>
            <p className="text-sm text-slate-500">
              Resumen de la tasa de cotización adicional y su estado actual.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-100">
            📊 Tasa vigente
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="Tasa actual" value="1,70%" />
          <Info label="Tramo" value="Sin variación" />
          <Info label="Última reevaluación" value="03-2025" />
          <Info label="Observaciones" value="Ninguna anotación" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Esta información se actualiza según los resultados del organismo administrador.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5">
            Ver historial DS67
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</TabsContent>



        {/* TAB ESTRUCTURA */}
        <TabsContent value="estructura" className="mt-8">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

    {/* CARD GENERICA PREMIUM */}
    {[
      {
        title: "Áreas",
        desc: "Gestiona áreas internas de la empresa.",
        href: "/dicaprev/empresa/areas",
        icon: "🏢",
      },
      {
        title: "Cargos",
        desc: "Define cargos y perfiles SST.",
        href: "/dicaprev/empresa/cargos",
        icon: "🧩",
      },
      {
        title: "Puestos",
        desc: "Define posiciones por centro.",
        href: "/dicaprev/empresa/puestos",
        icon: "📌",
      },
      {
        title: "Trabajadores",
        desc: "Listado maestro de trabajadores.",
        href: "/dicaprev/empresa/trabajadores",
        icon: "👷",
      },
      {
        title: "Organigrama",
        desc: "Estructura jerárquica.",
        href: "/dicaprev/empresa/organigrama",
        icon: "🌿",
      }
    ].map((item) => (
      <Link key={item.title} href={item.href}>
        <Card
          className="
            p-6 rounded-2xl cursor-pointer border border-slate-200 bg-white
            shadow-sm hover:shadow-md transition-all duration-200
            hover:-translate-y-[2px]
          "
        >
          <div className="flex flex-col gap-3">
            <div className="text-3xl">{item.icon}</div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {item.desc}
              </p>
            </div>
          </div>
        </Card>
      </Link>
    ))}
  </div>
</TabsContent>

      </Tabs>

   {/* MODAL EDITAR EMPRESA – VERSIÓN PREMIUM */}
<Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent className="max-w-3xl rounded-3xl border border-slate-200 shadow-2xl px-8 py-6">
    <DialogHeader className="pb-4">
      <DialogTitle className="text-2xl font-semibold text-slate-900">
        Editar información de la empresa
      </DialogTitle>
      <p className="text-sm text-slate-500">
        Actualiza los datos maestros. Estos campos se utilizarán en reportes,
        contratos y paneles de cumplimiento.
      </p>
    </DialogHeader>

    <div className="mt-2 space-y-6">
      {/* BLOQUE: IDENTIFICACIÓN */}
      <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-3">
          Identificación
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="razonSocial">Razón Social</Label>
            <Input
              id="razonSocial"
              name="razonSocial"
              value={form.razonSocial}
              onChange={onChange}
              className="rounded-xl bg-white"
              placeholder="Ej: DICAPREV SpA"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="rut">RUT empresa</Label>
            <Input
              id="rut"
              name="rut"
              value={form.rut}
              onChange={onChange}
              className="rounded-xl bg-white"
              placeholder="77.777.777-7"
            />
          </div>
        </div>
      </div>

      {/* BLOQUE: REPRESENTANTE LEGAL */}
      <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-3">
          Representante legal
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="representante">Nombre</Label>
            <Input
              id="representante"
              name="representante"
              value={form.representante}
              onChange={onChange}
              className="rounded-xl bg-white"
              placeholder="Nombre completo"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="rutRep">RUT representante</Label>
            <Input
              id="rutRep"
              name="rutRep"
              value={form.rutRep}
              onChange={onChange}
              className="rounded-xl bg-white"
              placeholder="12.345.678-9"
            />
          </div>
        </div>
      </div>

      {/* BLOQUE: DIRECCIÓN */}
      <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-4">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase mb-3">
          Dirección y ubicación
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 md:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              value={form.direccion}
              onChange={onChange}
              className="rounded-xl bg-white"
              placeholder="Ej: Av. Ejemplo 1234"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="comuna">Comuna</Label>
            <Input
              id="comuna"
              name="comuna"
              value={form.comuna}
              onChange={onChange}
              className="rounded-xl bg-white"
              placeholder="Ñuñoa"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="region">Región</Label>
            <Input
              id="region"
              name="region"
              value={form.region}
              onChange={onChange}
              className="rounded-xl bg-white"
              placeholder="Metropolitana de Santiago"
            />
          </div>
        </div>
      </div>
    </div>

    <DialogFooter className="mt-4 flex justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        className="rounded-full px-5"
        onClick={() => setEditOpen(false)}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
      >
        Guardar cambios
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


    </div>
  );
}
