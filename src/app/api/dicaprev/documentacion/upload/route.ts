import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getDocumentoExtension, validarArchivoDocumento } from "@/lib/documentacion/archivo-documento";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "documentos");
const PUBLIC_UPLOADS_PATH = "/uploads/documentos";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Debes adjuntar un archivo válido." }, { status: 400 });
  }

  const validacion = validarArchivoDocumento(file);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  const extension = getDocumentoExtension(file.name);
  const archivoNombre = `${randomUUID()}${extension}`;
  const archivoUrl = `${PUBLIC_UPLOADS_PATH}/${archivoNombre}`;
  const destino = path.join(UPLOADS_DIR, archivoNombre);
  const contenido = new Uint8Array(await file.arrayBuffer());

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(destino, contenido);

  return NextResponse.json({
    archivoNombre,
    archivoNombreOriginal: file.name,
    archivoUrl,
    archivoTipo: validacion.mimeType,
    archivoPeso: file.size,
  });
}