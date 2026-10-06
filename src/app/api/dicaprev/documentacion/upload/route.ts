import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getDocumentoExtension, validarArchivoDocumento } from "@/lib/documentacion/archivo-documento";
import { construirArchivoSeguroUrl } from "@/lib/documentacion/archivo-seguro";
import { requireAuth } from "@/server/auth/permissions";

function getBlobConfig() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN no configurado");
  }

  const [, , , storeId = ""] = token.split("_");
  if (!storeId) {
    throw new Error("No fue posible resolver el Blob Store");
  }

  return { token, storeId };
}

export async function POST(request: Request) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

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
  const archivoUrl = construirArchivoSeguroUrl(archivoNombre);
  const contenido = await file.arrayBuffer();

  try {
    const { token, storeId } = getBlobConfig();
    const pathname = `empresas/${context.empresaId}/documentos/${archivoNombre}`;
    const blobResponse = await fetch(
      `https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "x-vercel-blob-store-id": storeId,
          "x-api-version": "12",
          "x-vercel-blob-access": "private",
          "x-add-random-suffix": "0",
          ...(validacion.mimeType ? { "x-content-type": validacion.mimeType } : {}),
        },
        body: contenido,
      },
    );

    if (!blobResponse.ok) {
      const detail = await blobResponse.text().catch(() => "");
      console.error("Vercel Blob upload failed", blobResponse.status, detail);
      return NextResponse.json(
        { error: "No se pudo guardar el archivo en el almacenamiento seguro." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Document upload failed", error);
    return NextResponse.json(
      { error: "No se pudo guardar el archivo en el almacenamiento seguro." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    archivoNombre,
    archivoNombreOriginal: file.name,
    archivoUrl,
    archivoTipo: validacion.mimeType,
    archivoPeso: file.size,
  });
}
