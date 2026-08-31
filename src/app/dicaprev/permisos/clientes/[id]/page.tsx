import { obtenerCliente } from "../../actions/permisos";
import { ClienteForm } from "../ClienteForm";
import { notFound } from "next/navigation";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);

  if (!cliente) {
    notFound();
  }

  return <ClienteForm cliente={cliente} />;
}
