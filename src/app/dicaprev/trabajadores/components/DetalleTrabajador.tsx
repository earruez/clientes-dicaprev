"use client";

import React, { useMemo } from "react";
import type { Trabajador } from "../types";
import { cn } from "@/lib/utils"; // si te da problema, cambia a "src/lib/utils"
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "src/components/ui/tabs";
import { ScrollArea } from "src/components/ui/scroll-area";

type DocumentoEstado = "no_cargado" | "pendiente" | "aprobado";
type DocumentoGrupo = "empresa" | "contrato";
type DocumentoCategoria = "HSE" | "RHGC";

type Documento = {
  id: string;
  nombre: string;
  grupo: DocumentoGrupo;
  categoria: DocumentoCategoria;
  estado: DocumentoEstado;
  contrato?: string;
  instalacion?: string;
  periodicidad?: string;
  actualizadoEl?: string;
};

type DetalleTrabajadorProps = {
  trabajador: Trabajador | null;
};

export default function DetalleTrabajador({
  trabajador,
}: DetalleTrabajadorProps) {
  const docsEmpresa: Documento[] = useMemo(() => {
    if (!trabajador) return [];
    return [
      {
        id: "emp-1",
        nombre: "Póliza Seguro Obligatorio",
        grupo: "empresa",
        categoria: "HSE",
        estado: "aprobado",
        actualizadoEl: "2025-11-01",
      },
      {
        id: "emp-2",
        nombre:
          "Registro charla inducción / entrega reglamento interno y RIOHS",
        grupo: "empresa",
        categoria: "HSE",
        estado: "pendiente",
      },
      {
        id: "emp-3",
        nombre: "Examen médico ocupacional administrativo / no expuesto",
        grupo: "empresa",
        categoria: "HSE",
        estado: "aprobado",
        actualizadoEl: "2025-10-18",
      },
    ];
  }, [trabajador]);

  const docsContrato: Documento[] = useMemo(() => {
    if (!trabajador) return [];
    return [
      {
        id: "ctr-1",
        nombre: "Charla específica de obra",
        grupo: "contrato",
        categoria: "HSE",
        estado: "no_cargado",
        contrato: "Condominio Los Álamos",
        instalacion: "Obra Los Álamos",
        periodicidad: "Única",
      },
      {
        id: "ctr-2",
        nombre: "Inducción empresa mandante",
        grupo: "contrato",
        categoria: "HSE",
        estado: "pendiente",
        contrato: "Condominio Los Álamos",
        instalacion: "Planta Santiago",
        periodicidad: "Anual",
      },
    ];
  }, [trabajador]);

  const totalDocs = docsEmpresa.length + docsContrato.length;
  const totalAprobados =
    docsEmpresa.filter((d) => d.estado === "aprobado").length +
    docsContrato.filter((d) => d.estado === "aprobado").length;

  const porcentajeAprobado =
    totalDocs === 0 ? 0 : Math.round((totalAprobados / totalDocs) * 100);

  if (!trabajador) {
    return (
      <Card className="border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
        No encontramos esta ficha de trabajador. Verifica el enlace o vuelve al
        listado.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100/80 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Datos básicos */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-slate-50">
              {trabajador.nombres?.[0]}
              {trabajador.apellidos?.[0]}
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {trabajador.nombres} {trabajador.apellidos}
              </h1>
              <p className="text-sm text-slate-500">
                RUT{" "}
                <span className="font-mono text-slate-700">
                  {trabajador.rut}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                {trabajador.cargoNombre && (
                  <span>
                    Cargo:{" "}
                    <span className="font-medium text-slate-700">
                      {trabajador.cargoNombre}
                    </span>
                  </span>
                )}
                {trabajador.puestoNombre && (
                  <span>
                    · Puesto:{" "}
                    <span className="font-medium text-slate-700">
                      {trabajador.puestoNombre}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Resumen estado */}
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border px-2.5 py-1 text-xs capitalize",
                  trabajador.estado === "vigente" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
                  trabajador.estado === "suspendido" &&
                    "border-amber-200 bg-amber-50 text-amber-700",
                  trabajador.estado === "baja" &&
                    "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                Estado: {trabajador.estado || "sin estado"}
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  "border px-2.5 py-1 text-xs",
                  trabajador.ds44Pendiente
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                )}
              >
                DS44 {trabajador.ds44Pendiente ? "pendiente" : "cumplido"}
              </Badge>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">
                Cumplimiento documental global
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {porcentajeAprobado}%
              </p>
              <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    porcentajeAprobado >= 90
                      ? "bg-emerald-500"
                      : porcentajeAprobado >= 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${porcentajeAprobado}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {totalAprobados} de {totalDocs} documentos aprobados
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Ver ficha DS44
              </Button>
              <Button size="sm">Editar ficha</Button>
            </div>
          </div>
        </div>

        {/* Línea secundaria con ubicación */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          {trabajador.centroNombre && (
            <span>
              Centro:{" "}
              <span className="font-medium text-slate-700">
                {trabajador.centroNombre}
              </span>
            </span>
          )}
          {trabajador.areaNombre && (
            <span>
              · Área:{" "}
              <span className="font-medium text-slate-700">
                {trabajador.areaNombre}
              </span>
            </span>
          )}
          {trabajador.fechaIngreso && (
            <span>
              · Ingreso:{" "}
              <span className="font-medium text-slate-700">
                {trabajador.fechaIngreso}
              </span>
            </span>
          )}
        </div>
      </Card>

      {/* TABS DOCUMENTOS */}
      <Card className="border-slate-200 bg-white/95 p-0 shadow-sm">
        <Tabs defaultValue="empresa" className="w-full">
          <div className="border-b border-slate-100 px-4 pt-3">
            <TabsList className="h-9 bg-slate-50/80">
              <TabsTrigger value="empresa" className="text-xs">
                Documentos en empresa
              </TabsTrigger>
              <TabsTrigger value="contratos" className="text-xs">
                Documentos en contratos / centros
              </TabsTrigger>
            </TabsList>
          </div>

          {/* EMPRESA */}
          <TabsContent value="empresa" className="p-4 pt-3">
            <DocumentosTable
              documentos={docsEmpresa}
              emptyLabel="No hay documentos configurados a nivel de empresa para este trabajador."
            />
          </TabsContent>

          {/* CONTRATOS */}
          <TabsContent value="contratos" className="p-4 pt-3">
            <DocumentosTable
              documentos={docsContrato}
              emptyLabel="No hay documentos asociados a contratos o centros de trabajo para este trabajador."
              mostrarContrato
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

// ===========================
// Tabla de documentos
// ===========================

type DocumentosTableProps = {
  documentos: Documento[];
  emptyLabel: string;
  mostrarContrato?: boolean;
};

function DocumentosTable({
  documentos,
  emptyLabel,
  mostrarContrato = false,
}: DocumentosTableProps) {
  if (documentos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[360px] pr-3">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[60px,1.8fr,1.2fr,1fr,1fr,120px] gap-2 border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          <div>ID</div>
          <div>Documento</div>
          {mostrarContrato && <div>Contrato/Obra</div>}
          {!mostrarContrato && <div>Categoría</div>}
          <div>Estado</div>
          <div>Actualización</div>
          <div className="text-right">Acciones</div>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          {documentos.map((doc: Documento) => (
            <div
              key={doc.id}
              className="grid grid-cols-[60px,1.8fr,1.2fr,1fr,1fr,120px] items-center gap-2 py-2.5 text-xs text-slate-700"
            >
              <div className="font-mono text-[11px] text-slate-400">
                {doc.id}
              </div>

              <div className="text-[13px] text-slate-800">{doc.nombre}</div>

              {/* Columna intermedia cambia según modo */}
              {mostrarContrato ? (
                <div className="text-[11px] text-slate-500">
                  {doc.contrato ?? "—"}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  {doc.categoria === "HSE" ? "HSE" : "RRHH / GC"}
                </div>
              )}

              <div>
                <EstadoBadge estado={doc.estado} />
              </div>

              <div className="text-[11px] text-slate-500">
                {doc.actualizadoEl ? doc.actualizadoEl : "Sin registro"}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                >
                  Ver / subir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                >
                  Historial
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

type EstadoBadgeProps = {
  estado: DocumentoEstado;
};

function EstadoBadge({ estado }: EstadoBadgeProps) {
  let label = "";
  let classes = "";

  if (estado === "aprobado") {
    label = "Aprobado";
    classes = "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (estado === "pendiente") {
    label = "Pendiente";
    classes = "border-amber-200 bg-amber-50 text-amber-700";
  } else {
    label = "No cargado";
    classes = "border-slate-200 bg-slate-50 text-slate-500";
  }

  return (
    <Badge
      variant="outline"
      className={cn("border px-2 py-0.5 text-[11px]", classes)}
    >
      {label}
    </Badge>
  );
}
