"use client";

import { AlertCircle, CalendarClock, Bell } from "lucide-react";
import type { DocumentoTrabajador, DocTrabajadorView } from "./types";
import type { Worker } from "../types";
import {  ESTADO_DOC_CONFIG } from "./types";
import { formatDate } from "../types";

interface AlertasVencimientosWidgetProps {
  workers: Worker[];
  documentos: DocumentoTrabajador[];
  tipos: Array<{ id: string; nombre: string; requiereVencimiento: boolean }>;
}

interface DocumentoConTrabajador extends DocTrabajadorView {
  trabajador: Worker;
}

export function AlertasVencimientosWidget({
  workers,
  documentos,
  tipos,
}: AlertasVencimientosWidgetProps) {
  // Calcular documentos próximos a vencer (1-30 días) y vencidos
  const alertas: { vencidos: DocumentoConTrabajador[]; proximosAVencer: DocumentoConTrabajador[] } = {
    vencidos: [],
    proximosAVencer: [],
  };

  documentos.forEach((doc) => {
    // Solo si requiere vencimiento
    const tipo = tipos.find((t) => t.id === doc.tipoDocumentoId);
    if (!tipo || !tipo.requiereVencimiento || !doc.fechaVencimiento) return;

    const worker = workers.find((w) => w.id === doc.workerId);
    if (!worker) return;

    const today = new Date();
    const vencimiento = new Date(doc.fechaVencimiento);
    const diasParaVencer = Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const docView: DocumentoConTrabajador = {
      documentoId: doc.id,
      tipo: tipo as any,
      estado: doc.estado,
      fechaVencimiento: doc.fechaVencimiento,
      diasParaVencer,
      cargadoPor: doc.cargadoPor,
      observacion: doc.observacion,
      archivoUrl: doc.archivoUrl,
      trabajador: worker,
    };

    // Solo incluir si está en estados finales (completo, firmado, etc) para mostrar alerta de vencimiento próximo
    if (diasParaVencer < 0) {
      alertas.vencidos.push(docView);
    } else if (diasParaVencer > 0 && diasParaVencer <= 30) {
      alertas.proximosAVencer.push(docView);
    }
  });

  // Ordenar por días para vencer
  alertas.vencidos.sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0));
  alertas.proximosAVencer.sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0));

  const totalAlertas = alertas.vencidos.length + alertas.proximosAVencer.length;

  if (totalAlertas === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
          <Bell className="h-6 w-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            Atención a documentos con vencimiento próximo
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {totalAlertas} documento{totalAlertas !== 1 ? "s" : ""} requiere{totalAlertas !== 1 ? "n" : ""} atención inmediata
          </p>

          {/* Vencidos */}
          {alertas.vencidos.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-semibold text-red-700">Vencidos ({alertas.vencidos.length})</p>
              </div>
              <div className="ml-6 space-y-1.5">
                {alertas.vencidos.slice(0, 3).map((doc) => (
                  <div key={`${doc.trabajador.id}-${doc.tipo.id}`} className="flex items-start justify-between gap-2 rounded-lg bg-white/60 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {doc.trabajador.apellido}, {doc.trabajador.nombre}
                      </p>
                      <p className="truncate text-slate-600">{doc.tipo.nombre}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-red-700">Vencido hace {Math.abs(doc.diasParaVencer ?? 0)}d</p>
                      <p className="text-xs text-slate-500">{formatDate(doc.fechaVencimiento!)}</p>
                    </div>
                  </div>
                ))}
                {alertas.vencidos.length > 3 && (
                  <p className="text-xs font-medium text-red-600">+{alertas.vencidos.length - 3} más...</p>
                )}
              </div>
            </div>
          )}

          {/* Próximos a vencer */}
          {alertas.proximosAVencer.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-700">Próximos a vencer ({alertas.proximosAVencer.length})</p>
              </div>
              <div className="ml-6 space-y-1.5">
                {alertas.proximosAVencer.slice(0, 3).map((doc) => (
                  <div key={`${doc.trabajador.id}-${doc.tipo.id}`} className="flex items-start justify-between gap-2 rounded-lg bg-white/60 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {doc.trabajador.apellido}, {doc.trabajador.nombre}
                      </p>
                      <p className="truncate text-slate-600">{doc.tipo.nombre}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-amber-700">Vence en {doc.diasParaVencer}d</p>
                      <p className="text-xs text-slate-500">{formatDate(doc.fechaVencimiento!)}</p>
                    </div>
                  </div>
                ))}
                {alertas.proximosAVencer.length > 3 && (
                  <p className="text-xs font-medium text-amber-600">+{alertas.proximosAVencer.length - 3} más...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
