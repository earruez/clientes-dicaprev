import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/permissions";

async function validarArchivoEmpresaAutorizada(empresaId: string, archivoNombre: string): Promise<boolean> {
  const [registroGenerado, documentoEmpresa, historialEmpresa, documentoTrabajador, historialTrabajador, documentoAcreditacion] =
    await Promise.all([
      prisma.documentoGeneradoRegistro.findFirst({
        where: { empresaId, archivoNombre },
        select: { id: true },
      }),
      prisma.documentoEmpresa.findFirst({
        where: { empresaId, archivoNombre },
        select: { id: true },
      }),
      prisma.documentoEmpresaHistorial.findFirst({
        where: { archivoNombre, documento: { empresaId } },
        select: { id: true },
      }),
      prisma.trabajadorDocumento.findFirst({
        where: { empresaId, archivoNombre },
        select: { id: true },
      }),
      prisma.trabajadorDocumentoHistorial.findFirst({
        where: { archivoNombre, documento: { empresaId } },
        select: { id: true },
      }),
      prisma.documentoAcreditacion.findFirst({
        where: { archivoNombre, acreditacion: { empresaId } },
        select: { id: true },
      }),
    ]);

  return Boolean(
    registroGenerado ||
      documentoEmpresa ||
      historialEmpresa ||
      documentoTrabajador ||
      historialTrabajador ||
      documentoAcreditacion,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { path: pathSegments } = await params;
  const filename = pathSegments.join("/");

  // Sanitizar el path para evitar directory traversal
  const safePath = filename.replace(/\.\./g, "").replace(/^\/+/, "");
  const archivoNombre = path.basename(safePath);

  if (!archivoNombre) {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  const autorizado = await validarArchivoEmpresaAutorizada(context.empresaId, archivoNombre);
  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado para este archivo" }, { status: 403 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", "documentos", safePath);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  const contentType = contentTypeMap[ext] ?? "application/octet-stream";

  const fileBuffer = await readFile(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-cache",
    },
  });
}
