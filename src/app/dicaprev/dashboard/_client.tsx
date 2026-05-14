"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ActivacionFlow } from "./components/ActivacionFlow";
import type { ResumenEmpresaResponse } from "@/app/dicaprev/empresa/resumen/actions";

interface DashboardClientProps {
  resumenInicial: ResumenEmpresaResponse;
}

export default function DashboardClient({ resumenInicial }: DashboardClientProps) {
  const [resumen, setResumen] = useState<ResumenEmpresaResponse>(resumenInicial);
  const [isLoading, setIsLoading] = useState(false);

  const activacionPendiente = !resumen.activacion.completada;
  const tieneTrabajadoresActivos = resumen.kpis.totalTrabajadoresActivos > 0;
  const tieneDocumentosRelevantes =
    resumen.cumplimiento.totalAplicables > 0 &&
    (resumen.cumplimiento.totalFaltantes + resumen.cumplimiento.totalIncompletos > 0);
  const debeMostrarWizard =
    activacionPendiente &&
    resumen.cumplimiento.porcentaje < 30 &&
    tieneTrabajadoresActivos &&
    tieneDocumentosRelevantes;
  const mostrarEstadoSinTrabajadores = activacionPendiente && !tieneTrabajadoresActivos;

  // Cargar resumen actualizado después de acciones
  const recargarResumen = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dicaprev/empresa/resumen", {
        method: "GET",
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setResumen(data);
      }
    } catch (error) {
      console.error("Error recargando resumen:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado principal */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">
          Bienvenido a DICAPREV
        </h1>
        <p className="text-slate-600">
          {debeMostrarWizard
            ? "Comienza por generar los documentos obligatorios de tu empresa"
            : "Gestiona tu cumplimiento documentario y seguridad en SST"}
        </p>
      </header>

      {/* Si está en estado inicial, mostrar flujo de activación */}
      {debeMostrarWizard && (
        <ActivacionFlow
          resumen={resumen}
          onComplete={recargarResumen}
          isLoading={isLoading}
          estadoActivacion={resumen.activacion}
        />
      )}

      {mostrarEstadoSinTrabajadores && (
        <Card className="border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">
                Agrega tu primer trabajador para generar documentación obligatoria
              </h2>
              <p className="mt-1 text-sm text-blue-800">
                La activación se mostrará cuando existan trabajadores activos a quienes aplicar IRL y EPP.
              </p>
            </div>
            <Link
              href="/dicaprev/trabajadores"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Agregar trabajador
            </Link>
          </div>
        </Card>
      )}

      {/* Estado de cumplimiento */}
      <Card className="border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Estado de Cumplimiento
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {resumen.empresa.nombre}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-slate-900">
                {resumen.cumplimiento.porcentaje}%
              </div>
              <p className="text-xs text-slate-500 mt-1">cumplimiento total</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2">
            <Progress
              value={resumen.cumplimiento.porcentaje}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>{resumen.cumplimiento.totalCumple} cumplidas</span>
              <span>
                {resumen.cumplimiento.totalFaltantes} faltantes
              </span>
              <span>
                {resumen.cumplimiento.totalIncompletos} incompletas
              </span>
            </div>
          </div>

          {/* Resumen de estado */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {resumen.cumplimiento.totalCumple}
              </div>
              <p className="text-xs text-slate-600">Cumple</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {resumen.cumplimiento.totalIncompletos}
              </div>
              <p className="text-xs text-slate-600">Incompleta</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {resumen.cumplimiento.totalFaltantes}
              </div>
              <p className="text-xs text-slate-600">Faltante</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Alertas de cumplimiento bajo */}
      {resumen.cumplimiento.porcentaje < 50 && (
        <Card className="border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Atención requerida</h3>
              <p className="text-sm text-red-800 mt-1">
                La empresa tiene cumplimiento bajo. Acciones recomendadas:
              </p>
              <ul className="text-sm text-red-800 mt-2 space-y-1 list-disc list-inside">
                <li>Generar documentos obligatorios faltantes</li>
                <li>Completar documentos en revisión</li>
                <li>Revisar vencimientos próximos</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Acceso rápido a módulos principales */}
      {!debeMostrarWizard && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <QuickAccessCard
            title="Documentación"
            description="Gestionar documentos"
            href="/dicaprev/documentacion"
            icon="📄"
          />
          <QuickAccessCard
            title="Cumplimiento"
            description="Ver obligaciones"
            href="/dicaprev/cumplimiento/resumen"
            icon="✓"
          />
          <QuickAccessCard
            title="Trabajadores"
            description="Gestionar equipo"
            href="/dicaprev/trabajadores-v2"
            icon="👥"
          />
          <QuickAccessCard
            title="Empresa"
            description="Información general"
            href="/dicaprev/empresa/resumen"
            icon="🏢"
          />
        </div>
      )}
    </div>
  );
}

function QuickAccessCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <a href={href}>
      <Card className="border border-slate-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors shadow-sm">
        <div className="text-2xl mb-2">{icon}</div>
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        <p className="text-xs text-slate-600">{description}</p>
      </Card>
    </a>
  );
}
