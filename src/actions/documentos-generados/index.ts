"use server";

import { prisma } from "@/lib/prisma";
import { requireEmpresaAccess } from "@/server/auth/permissions";
import {
  construirRegistroDocumentoGenerado,
  type DocumentoGeneradoInput,
} from "@/lib/documentacion/registro-documento-generado";

export async function registrarDocumentoGenerado(input: DocumentoGeneradoInput): Promise<{ id: string }> {
  const context = await requireEmpresaAccess(input.empresaId);
  const registro = construirRegistroDocumentoGenerado({
    ...input,
    empresaId: context.empresaId,
    usuarioId: context.usuarioId,
  });

  const created = await prisma.documentoGeneradoRegistro.create({
    data: registro,
    select: { id: true },
  });

  return created;
}
