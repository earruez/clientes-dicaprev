import { NextResponse } from "next/server";
import { getContextoFijoDocumentacion, getDocumentosEmpresa } from "@/app/dicaprev/documentacion/actions";

export async function GET() {
  const contexto = await getContextoFijoDocumentacion();
  const documentos = await getDocumentosEmpresa();

  return NextResponse.json({
    usuario: contexto.usuario,
    dotacion: contexto.dotacion,
    documentos,
  });
}
