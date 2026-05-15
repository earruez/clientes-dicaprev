import {
  getControlDocumentalTrabajadores,
  type ControlDocumentalTrabajadoresPayload,
} from "@/actions/trabajadores/documentos";
import ControlDocumentalClient from "./ControlDocumentalClient";

type PageProps = {
  searchParams?: Promise<{
    workerId?: string | string[];
    centro?: string | string[];
  }>;
};

function getSingleParam(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function ControlDocumentalPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let initialData: ControlDocumentalTrabajadoresPayload = {
    workers: [],
    tipos: [],
    reglas: [],
    documentos: [],
  };

  try {
    initialData = await getControlDocumentalTrabajadores();
  } catch {
    // Keep safe empty payload; the client can retry without crashing the route.
  }

  const workerId = getSingleParam(resolvedSearchParams?.workerId);
  const centro = getSingleParam(resolvedSearchParams?.centro);

  return (
    <ControlDocumentalClient
      initialData={initialData}
      workerId={workerId}
      centro={centro}
    />
  );
}
