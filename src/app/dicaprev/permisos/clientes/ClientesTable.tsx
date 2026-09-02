"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { PermisoCliente } from "@prisma/client";
import { desactivarCliente } from "../actions/permisos";
import { ConfirmarEliminacionDialog } from "../ConfirmarEliminacionDialog";

interface ClientesTableProps {
  clientes: PermisoCliente[];
}

type OrdenClave = "nombre" | "email" | "telefono" | "estado";
type OrdenDireccion = "asc" | "desc";

export function ClientesTable({ clientes }: ClientesTableProps) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [ordenClave, setOrdenClave] = useState<OrdenClave>("nombre");
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>("asc");
  const [clienteAEliminar, setClienteAEliminar] = useState<PermisoCliente | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const handleDelete = async () => {
    if (!clienteAEliminar) return;

    setEliminando(true);
    try {
      await desactivarCliente(clienteAEliminar.id);
      setClienteAEliminar(null);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No fue posible eliminar el cliente");
    } finally {
      setEliminando(false);
    }
  };

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const clientesFiltrados = clientes.filter((c) => {
      const coincideTexto =
        !texto ||
        c.nombre.toLowerCase().includes(texto) ||
        (c.contactoEmail || "").toLowerCase().includes(texto) ||
        (c.contactoTelefono || "").toLowerCase().includes(texto);

      const coincideEstado = !filtroEstado || (filtroEstado === "activo" ? c.activo : !c.activo);

      return coincideTexto && coincideEstado;
    });

    return clientesFiltrados.sort((a, b) => {
      const compararTexto = (valor: string | null, otroValor: string | null) => (valor || "").localeCompare(otroValor || "", "es");
      const resultado = ordenClave === "estado"
        ? Number(a.activo) - Number(b.activo)
        : compararTexto(
            ordenClave === "nombre" ? a.nombre : ordenClave === "email" ? a.contactoEmail : a.contactoTelefono,
            ordenClave === "nombre" ? b.nombre : ordenClave === "email" ? b.contactoEmail : b.contactoTelefono,
          );
      return ordenDireccion === "asc" ? resultado : -resultado;
    });
  }, [clientes, busqueda, filtroEstado, ordenClave, ordenDireccion]);

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
          placeholder="Buscar por nombre, email o teléfono..."
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
        Mostrando {filtrados.length} de {clientes.length} clientes
      </p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Nombre", "nombre")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Email", "email")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Teléfono", "telefono")}</th>
                <th className="px-6 py-3 text-left">{encabezadoOrdenable("Estado", "estado")}</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {clientes.length === 0
                      ? "No hay clientes registrados"
                      : "Ningún cliente coincide con la búsqueda/filtros."}
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => (
                  <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{c.nombre}</td>
                    <td className="px-6 py-3 text-slate-600">{c.contactoEmail || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{c.contactoTelefono || "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${c.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dicaprev/permisos/clientes/${c.id}`}>
                          <Button variant="outline" size="sm">Editar</Button>
                        </Link>
                        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setClienteAEliminar(c)}>
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
        open={Boolean(clienteAEliminar)}
        entidad="Cliente"
        nombre={clienteAEliminar?.nombre || ""}
        loading={eliminando}
        onOpenChange={(open) => !open && setClienteAEliminar(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
