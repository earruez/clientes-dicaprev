import { obtenerOrganismo } from "../../actions/permisos";
import { OrganismoForm } from "../OrganismoForm";
import { notFound } from "next/navigation";

export default async function EditarOrganismoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organismo = await obtenerOrganismo(id);

  if (!organismo) {
    notFound();
  }

  return <OrganismoForm organismo={organismo} />;
}
