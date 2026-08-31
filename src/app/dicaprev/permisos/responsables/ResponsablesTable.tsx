"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { PermisoResponsable } from "@prisma/client";

interface ResponsablesTableProps {
  responsables: PermisoResponsable[];
}

export function ResponsablesTable({ responsables }: ResponsablesTableProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return responsables.filter((r) => {
      const coincideTexto =
        !texto ||
        r.nombre.toLowerCase().includes(texto) ||
        r.cargo.toLowerCase().includes(texto) ||
        r.email.toLowerCase().includes(texto);

      const coincideEstado = !filtroEstado || (filtroEstado === "activo" ? r.activo : !r.activo);

      return coincideTexto && coincideEstado;
    });
  }, [responsables, busqueda, filtroEstado]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, cargo o email..."
          className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      <p className="text-sm text-slate-500">
        Mostrando {filtrados.length} de {responsables.length} responsables
      </p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Cargo</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Teléfono</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {responsables.length === 0
                      ? "No hay responsables registrados"
                      : "Ningún responsable coincide con la búsqueda/filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{r.nombre}</td>
                    <td className="px-6 py-3 text-slate-600">{r.cargo}</td>
                    <td className="px-6 py-3 text-slate-600">{r.email}</td>
                    <td className="px-6 py-3 text-slate-600">{r.telefono || "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${r.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {r.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <Link href={`/dicaprev/permisos/responsables/${r.id}`}>
                        <Button variant="outline" size="sm">Editar</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
