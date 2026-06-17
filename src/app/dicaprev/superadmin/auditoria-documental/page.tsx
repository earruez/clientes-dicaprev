import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { ejecutarAuditoriaDocumental } from "./actions";
import { AuditoriaClient } from "./AuditoriaClient";
import { AlertCircle } from "lucide-react";

interface AuditoriaDoctumentalPageProps {
  searchParams: Promise<{
    empresaId?: string;
  }>;
}

export default async function AuditoriaDoctumentalPage({
  searchParams,
}: AuditoriaDoctumentalPageProps) {
  const params = await searchParams;
  try {
    await requireRole("SUPERADMIN");
  } catch {
    redirect("/dicaprev/dashboard");
  }

  // Obtener todas las empresas para el selector
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nombre: true,
      activa: true,
    },
    orderBy: { nombre: "asc" },
  });

  // Si no hay empresa seleccionada, seleccionar la primera activa
  const empresaIdSeleccionada =
    params.empresaId ||
    empresas.find((e) => e.activa)?.id ||
    empresas[0]?.id;

  if (!empresaIdSeleccionada) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-slate-800">
            No hay empresas disponibles para auditar.
          </p>
        </div>
      </div>
    );
  }

  // Ejecutar auditoría
  const auditoria = await ejecutarAuditoriaDocumental(empresaIdSeleccionada);
  const empresaSeleccionada = empresas.find((e) => e.id === empresaIdSeleccionada)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Admin interno
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Auditoría documental</h1>
            <p className="mt-2 text-sm text-slate-600">
              Verificación integral de biblioteca documental, documentación empresa, control de
              trabajadores, capacitaciones, plantillas y documentos generados.
            </p>
          </div>
        </div>
      </header>

      {/* Selector de empresa */}
      {empresas.length > 1 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Seleccionar empresa:
          </label>
          <select
            defaultValue={empresaIdSeleccionada}
            onChange={(e) => {
              window.location.href = `?empresaId=${e.target.value}`;
            }}
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
                {!empresa.activa && " (inactiva)"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Auditoría */}
      <AuditoriaClient
        empresaId={empresaIdSeleccionada}
        empresaNombre={empresaSeleccionada.nombre}
        auditoriaInicial={auditoria}
      />
    </div>
  );
}
