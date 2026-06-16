"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { evaluarDocumentosPendientesPorEvento } from "@/actions/trabajadores/documentos";
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
  logoUrl: string | null;
  representanteLegal: string | null;
  rutRepresentanteLegal: string | null;
  mutualidad: string | null;
  cotizacionAdicional: string | null;
  cantidadTrabajadores: number;
};

export type EmpresaKpisData = {
  totalTrabajadores: number;
  totalCentros: number;
  totalAreas: number;
  totalCargos: number;
};

export async function getEmpresaActual(): Promise<EmpresaGeneralData> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const [empresa, totalTrabajadoresActivos] = await Promise.all([
    prisma.empresa.findUnique({
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
        logoUrl: true,
        representanteLegal: true,
        rutRepresentanteLegal: true,
        mutualidad: true,
        cotizacionAdicional: true,
      },
    }),
    prisma.trabajador.count({
      where: {
        empresaId,
        estado: { not: "inactivo" },
      },
    }),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  return {
    ...empresa,
    cantidadTrabajadores: totalTrabajadoresActivos,
  };
}

export async function getEmpresaKpisActual(): Promise<EmpresaKpisData> {
  const { empresaId } = await requirePermission("canReadEmpresa");

  const [totalTrabajadores, totalCentros, totalAreas, totalCargos] = await Promise.all([
    prisma.trabajador.count({
      where: {
        empresaId,
        estado: { not: "inactivo" },
      },
    }),
    prisma.centroTrabajo.count({ where: { empresaId } }),
    prisma.area.count({ where: { empresaId } }),
    prisma.cargo.count({ where: { empresaId } }),
  ]);

  return {
    totalTrabajadores,
    totalCentros,
    totalAreas,
    totalCargos,
  };
}

export async function actualizarEmpresaActual(data: EmpresaGeneralData): Promise<void> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageEmpresa");

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
      logoUrl: data.logoUrl,
      representanteLegal: data.representanteLegal,
      rutRepresentanteLegal: data.rutRepresentanteLegal,
      mutualidad: data.mutualidad,
      cotizacionAdicional: data.cotizacionAdicional,
    },
  });

  await evaluarDocumentosPendientesPorEvento({
    empresaId,
    evento: "empresa_actualizada",
    usuarioId,
    email,
  });
}

const LOGO_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function subirLogoEmpresa(formData: FormData): Promise<string> {
  const { empresaId } = await requirePermission("canManageEmpresa");

  const logo = formData.get("logo");
  if (!(logo instanceof File)) {
    throw new Error("No se recibió archivo de logo");
  }

  if (logo.size <= 0) {
    throw new Error("El archivo de logo está vacío");
  }

  if (logo.size > 4 * 1024 * 1024) {
    throw new Error("El logo no debe superar 4MB");
  }

  const ext = LOGO_MIME_TO_EXT[logo.type];
  if (!ext) {
    throw new Error("Formato inválido. Usa PNG, JPG o WEBP");
  }

  const current = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { logoUrl: true },
  });

  const targetDir = path.join(process.cwd(), "public", "uploads", "empresa-logos");
  await mkdir(targetDir, { recursive: true });

  const fileName = `${empresaId}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const absolutePath = path.join(targetDir, fileName);
  const logoUrl = `/uploads/empresa-logos/${fileName}`;

  const bytes = new Uint8Array(await logo.arrayBuffer());
  await writeFile(absolutePath, bytes);

  await prisma.empresa.update({
    where: { id: empresaId },
    data: { logoUrl },
  });

  if (current?.logoUrl?.startsWith("/uploads/empresa-logos/")) {
    const oldAbsolute = path.join(process.cwd(), "public", current.logoUrl.replace(/^\//, ""));
    await unlink(oldAbsolute).catch(() => undefined);
  }

  return logoUrl;
}
