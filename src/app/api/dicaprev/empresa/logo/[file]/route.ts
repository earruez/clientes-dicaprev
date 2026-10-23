import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/server/auth/permissions";

export const runtime = "nodejs";

const LOGO_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  let empresaId: string;
  try {
    ({ empresaId } = await requireAuth());
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { file } = await params;
  const match = /^([a-f0-9-]{36})\.(png|jpg|webp)$/.exec(file);
  if (!match) return NextResponse.json({ error: "Logo inválido" }, { status: 400 });

  const logoUrl = `/api/dicaprev/empresa/logo/${file}`;
  const empresa = await prisma.empresa.findFirst({
    where: { id: empresaId, logoUrl }, select: { id: true },
  });
  if (!empresa) return NextResponse.json({ error: "Logo no disponible" }, { status: 404 });

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const storeId = token?.split("_")[3];
  if (!token || !storeId) return NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 503 });
  const pathname = `empresas/${empresaId}/logos/${file}`;
  const url = `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
  try {
    const image = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!image.ok || !image.body) return NextResponse.json({ error: "Logo no encontrado" }, { status: 404 });
    return new NextResponse(image.body, {
      headers: {
        "Content-Type": LOGO_EXT[match[2]],
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el logo" }, { status: 502 });
  }
}
