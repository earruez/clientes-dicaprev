import { obtenerResponsable } from "../../actions/permisos";
import { ResponsableForm } from "../ResponsableForm";
import { notFound } from "next/navigation";

export default async function EditarResponsablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const responsable = await obtenerResponsable(id);

  if (!responsable) {
    notFound();
  }

  return <ResponsableForm responsable={responsable} />;
}
