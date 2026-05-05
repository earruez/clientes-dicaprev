import { NextResponse } from "next/server";
import { getContextoFijoDocumentacion, getDocumentosEmpresa } from "@/app/dicaprev/documentacion/actions";

export async function GET() {
  const [contexto, documentos] = await Promise.all([
    getContextoFijoDocumentacion(),
    getDocumentosEmpresa(),
  ]);

  return NextResponse.json({
    usuario: contexto.usuario,
    documentos,
  });
}
