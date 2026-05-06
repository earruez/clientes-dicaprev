"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export type EmpresaGeneralData = {
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  giro: string | null;
  direccion: string | null;
  tipoEmpresa: string | null;
  tamanoEmpresa: string | null;
  codigoCiiu: string | null;
  inicioActividades: string | null;
  ciudad: string | null;
  region: string | null;
  telefono: string | null;
  correo: string | null;
  web: string | null;
  representanteLegal: string | null;
  rutRepresentanteLegal: string | null;
  mutualidad: string | null;
  cotizacionAdicional: string | null;
  cantidadTrabajadores: number;
};

export async function getEmpresaActual(): Promise<EmpresaGeneralData> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      nombre: true,
      razonSocial: true,
      rut: true,
      giro: true,
      direccion: true,
      tipoEmpresa: true,
      tamanoEmpresa: true,
      codigoCiiu: true,
      inicioActividades: true,
      ciudad: true,
      region: true,
      telefono: true,
      correo: true,
      web: true,
      representanteLegal: true,
      rutRepresentanteLegal: true,
      mutualidad: true,
      cotizacionAdicional: true,
      cantidadTrabajadores: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  return empresa;
}

export async function actualizarEmpresaActual(data: EmpresaGeneralData): Promise<void> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      nombre: data.nombre,
      razonSocial: data.razonSocial,
      rut: data.rut,
      giro: data.giro,
      direccion: data.direccion,
      tipoEmpresa: data.tipoEmpresa,
      tamanoEmpresa: data.tamanoEmpresa,
      codigoCiiu: data.codigoCiiu,
      inicioActividades: data.inicioActividades,
      ciudad: data.ciudad,
      region: data.region,
      telefono: data.telefono,
      correo: data.correo,
      web: data.web,
      representanteLegal: data.representanteLegal,
      rutRepresentanteLegal: data.rutRepresentanteLegal,
      mutualidad: data.mutualidad,
      cotizacionAdicional: data.cotizacionAdicional,
      cantidadTrabajadores: data.cantidadTrabajadores,
    },
  });
}
