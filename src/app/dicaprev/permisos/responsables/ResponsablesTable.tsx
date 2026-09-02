"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { PermisoResponsable } from "@prisma/client";
import { desactivarResponsable } from "../actions/permisos";
import { ConfirmarEliminacionDialog } from "../ConfirmarEliminacionDialog";

interface ResponsablesTableProps {
  responsables: PermisoResponsable[];
}

type OrdenClave = "nombre" | "cargo" | "email" | "telefono" | "estado";
type OrdenDireccion = "asc" | "desc";

export function ResponsablesTable({ responsables }: ResponsablesTableProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [ordenClave, setOrdenClave] = useState<OrdenClave>("nombre");
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>("asc");
  const [coordinadorAEliminar, setCoordinadorAEliminar] = useState<PermisoResponsable | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const handleDelete = async () => {
    if (!coordinadorAEliminar) return;

    setEliminando(true);
    try {
      await desactivarResponsable(coordinadorAEliminar.id);
      setCoordinadorAEliminar(null);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No fue posible eliminar el coordinador");
    } finally {
      setEliminando(false);
    }
  };

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const responsablesFiltrados = responsables.filter((r) => {
      const coincideTexto =
        !texto ||
        r.nombre.toLowerCase().includes(texto) ||
        r.cargo.toLowerCase().includes(texto) ||
        r.email.toLowerCase().includes(texto);

      const coincideEstado = !filtroEstado || (filtroEstado === "activo" ? r.activo : !r.activo);

      return coincideTexto && coincideEstado;
    });

    return responsablesFiltrados.sort((a, b) => {
      const compararTexto = (valor: string | null, otroValor: string | null) => (valor || "").localeCompare(otroValor || "", "es");
      const resultado = ordenClave === "estado"
        ? Number(a.activo) - Number(b.activo)
        : compararTexto(
            ordenClave === "nombre" ? a.nombre : ordenClave === "cargo" ? a.cargo : ordenClave === "email" ? a.email : a.telefono,
            ordenClave === "nombre" ? b.nombre : ordenClave === "cargo" ? b.cargo : ordenClave === "email" ? b.email : b.telefono,
          );
      return ordenDireccion === "asc" ? resultado : -resultado;
    });
  }, [responsables, busqueda, filtroEstado, ordenClave, ordenDireccion]);

  const cambiarOrden = (clave: OrdenClave) => {
    if (ordenClave === clave) {
      setOrdenDireccion((direccion) => (direccion === "asc" ? "desc" : "asc"));
      return;
    }
    setOrdenClave(clave);
    setOrdenDireccion("asc");
  };

  const encabezadoOrdenable = (etiqueta: string, clave: OrdenClave) => (
    <button type="button" onClick={() => cambiarOrden(clave)} className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-700" aria-label={`Ordenar por ${etiqueta}`}>
      {etiqueta}
      {ordenClave !== clave && <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />}
      {ordenClave === clave && ordenDireccion === "asc" && <ArrowUp className="h-3.5 w-3.5 text-blue-700" />}
      {ordenClave === clave && ordenDireccion === "desc" && <ArrowDown className="h-3.5 w-3.5 text-blue-700" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.7fr_1fr]">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, cargo o email..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        Mostrando {filtrados.length} de {responsables.length} coordinadores
      </p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Nombre", "nombre")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Cargo", "cargo")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Email", "email")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Teléfono", "telefono")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Estado", "estado")}</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {responsables.length === 0
                      ? "No hay coordinadores registrados"
                      : "Ningún coordinador coincide con la búsqueda/filtros."}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dicaprev/permisos/responsables/${r.id}`}>
                          <Button variant="outline" size="sm">Editar</Button>
                        </Link>
                        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setCoordinadorAEliminar(r)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmarEliminacionDialog
        open={Boolean(coordinadorAEliminar)}
        entidad="Coordinador"
        nombre={coordinadorAEliminar?.nombre || ""}
        loading={eliminando}
        onOpenChange={(open) => !open && setCoordinadorAEliminar(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
