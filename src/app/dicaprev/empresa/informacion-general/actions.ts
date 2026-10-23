"use server";

import { randomUUID } from "node:crypto";
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

function esImagenValida(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/png") return bytes.length > 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (mime === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/webp") return bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}

export async function subirLogoEmpresa(formData: FormData): Promise<string> {
  const { empresaId } = await requirePermission("canManageEmpresa");
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size <= 0) throw new Error("Selecciona un archivo de logo válido.");
  if (logo.size > 4 * 1024 * 1024) throw new Error("El logo no debe superar 4 MB.");
  const ext = LOGO_MIME_TO_EXT[logo.type];
  if (!ext) throw new Error("Formato inválido. Usa PNG, JPG o WEBP.");
  const bytes = new Uint8Array(await logo.arrayBuffer());
  if (!esImagenValida(bytes, logo.type)) throw new Error("El archivo no corresponde a una imagen válida.");

  // Vercel tiene sistema de archivos efímero: los logos viven en Blob privado.
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const storeId = token?.split("_")[3];
  if (!token || !storeId) throw new Error("El almacenamiento permanente de logos no está configurado.");
  const fileName = `${randomUUID()}.${ext}`;
  const pathname = `empresas/${empresaId}/logos/${fileName}`;
  const response = await fetch(`https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-vercel-blob-store-id": storeId,
      "x-api-version": "12",
      "x-vercel-blob-access": "private",
      "x-add-random-suffix": "0",
      "x-content-type": logo.type,
    },
    body: bytes,
  });
  if (!response.ok) throw new Error("No fue posible guardar el logo en el almacenamiento permanente.");

  // No exponer URL de Blob ni token; esta ruta valida empresa activa y sesión.
  const logoUrl = `/api/dicaprev/empresa/logo/${fileName}`;
  await prisma.empresa.update({ where: { id: empresaId }, data: { logoUrl } });
  return logoUrl;
}
