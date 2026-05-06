import React from "react";
import { getCurrentAppContext } from "@/server/context";
import { getEmpresaActual } from "./actions";
import InformacionGeneralClient from "./InformacionGeneralClient";

export default async function InformacionGeneralPage() {
  const [empresa, context] = await Promise.all([
    getEmpresaActual(),
    getCurrentAppContext(),
  ]);

  const canManageEmpresa =
    context.rol === "SUPERADMIN" ||
    context.rol === "ADMIN_EMPRESA";

  return (
    <InformacionGeneralClient
      initialEmpresa={empresa}
      canManageEmpresa={canManageEmpresa}
    />
  );
}
