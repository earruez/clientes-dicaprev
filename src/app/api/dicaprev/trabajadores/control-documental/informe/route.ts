import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getControlDocumentalTrabajadores, getEmpresaDocumentoMeta } from "@/actions/trabajadores/documentos";
import { getRequiredDocIds } from "@/components/trabajadores-v2/documental/types";
import { generarInformeControlTrabajadoresPdf } from "@/lib/documentacion/generar-informe-control-trabajadores-pdf";
import { calcularInformeTrabajadores, type TrabajadorInformeInput } from "@/lib/documentacion/informe-control-trabajadores";
import { requirePermission } from "@/server/auth/permissions";

export const runtime = "nodejs";

type Filtros = { centro?: string; area?: string; cargo?: string; trabajadorId?: string; estado?: string };
const value = (input: unknown) => typeof input === "string" ? input.trim().slice(0, 160) : "";

async function logoDataUrl(logoUrl: string | null, empresaId: string) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("data:image/")) return logoUrl;
  const logoPrivado = /^\/api\/dicaprev\/empresa\/logo\/([a-f0-9-]{36}\.(png|jpg|webp))$/.exec(logoUrl);
  if (logoPrivado) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    const storeId = token?.split("_")[3];
    if (!token || !storeId) return null;
    const url = `https://${storeId}.private.blob.vercel-storage.com/empresas/${empresaId}/logos/${logoPrivado[1]}`;
    try {
      const result = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!result.ok) return null;
      const bytes = Buffer.from(await result.arrayBuffer());
      const mime = logoPrivado[2] === "jpg" ? "image/jpeg" : logoPrivado[2] === "webp" ? "image/webp" : "image/png";
      return `data:${mime};base64,${bytes.toString("base64")}`;
    } catch { return null; }
  }
  // Compatibilidad con logos legados, si el archivo local todavía existe.
  if (!/^\/uploads\/empresa-logos\/[a-zA-Z0-9._-]+$/.test(logoUrl)) return null;
  try {
    const file = await readFile(path.join(process.cwd(), "public", logoUrl));
    const ext = path.extname(logoUrl).toLowerCase();
    const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
    return `data:${mime};base64,${file.toString("base64")}`;
  } catch { return null; }
}

export async function POST(request: Request) {
  try {
    const context = await requirePermission("canReadTrabajadores");
    const raw = await request.json().catch(() => ({})) as Filtros;
    const filtros = { centro: value(raw.centro), area: value(raw.area), cargo: value(raw.cargo), trabajadorId: value(raw.trabajadorId), estado: value(raw.estado) };
    const [payload, empresa] = await Promise.all([getControlDocumentalTrabajadores(false), getEmpresaDocumentoMeta()]);
    const workers = payload.workers.filter((worker) => {
      if (["inactivo", "finiquitado"].includes(worker.estado.toLowerCase())) return false;
      return (!filtros.centro || worker.centroTrabajo === filtros.centro)
        && (!filtros.area || worker.area === filtros.area)
        && (!filtros.cargo || worker.cargo === filtros.cargo)
        && (!filtros.trabajadorId || worker.id === filtros.trabajadorId)
        && (!filtros.estado || worker.estado.toLowerCase() === filtros.estado.toLowerCase());
    });
    const inputs: TrabajadorInformeInput[] = workers.map((worker) => {
      const required = getRequiredDocIds(worker, payload.reglas);
      return {
        id: worker.id, nombre: `${worker.nombre} ${worker.apellido}`.trim(), rut: worker.rut || "-", cargo: worker.cargo || "Sin cargo", area: worker.area || "Sin area", centro: worker.centroTrabajo || "Sin centro",
        requisitos: [...required].flatMap((id) => { const tipo = payload.tipos.find((item) => item.id === id); return tipo ? [{ id, categoria: tipo.categoria, nombre: tipo.nombre, condicion: payload.reglas.filter((r) => r.activa && r.tiposDocumentoIds.includes(id)).map((r) => r.nombre).join("; ") || "Asignacion configurada" }] : []; }),
        documentos: payload.documentos.filter((doc) => doc.workerId === worker.id).map((doc) => ({ id: doc.id, requisitoId: doc.tipoDocumentoId, estado: doc.estado, fechaEmision: doc.fechaCarga ?? null, fechaVencimiento: doc.fechaVencimiento ?? null, observacion: doc.observacion ?? null, versionNumero: doc.versionNumero, creadoEn: doc.fechaCarga })),
      };
    });
    const generadoEn = new Date();
    const informe = calcularInformeTrabajadores(inputs, generadoEn);
    const alcance = filtros.centro || "Todos los centros";
    const filtrosTexto = Object.entries(filtros).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(", ") || "Sin filtros";
    const baseId = `${context.empresaId}|${generadoEn.toISOString()}|${filtrosTexto}|${randomUUID()}`;
    const id = `ICDT-${createHash("sha256").update(baseId).digest("hex").slice(0, 16).toUpperCase()}`;
    const pdf = generarInformeControlTrabajadoresPdf({ id, version: "1.0", generadoEn: generadoEn.toISOString(), generadoPor: context.email, empresa: { nombre: empresa.razonSocial || empresa.nombre, rut: empresa.rut || "Sin RUT", logoDataUrl: await logoDataUrl(empresa.logoUrl, context.empresaId) }, alcance, filtros: filtrosTexto, filas: informe.filas, resumen: informe.resumen });
    const slug = (empresa.razonSocial || empresa.nombre).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "empresa";
    const filename = `informe-control-documental-${slug}-${generadoEn.toISOString().slice(0,10)}.pdf`;
    return new Response(Buffer.from(pdf), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error && /No autorizado|sesion/.test(error.message) ? error.message : "No fue posible generar el informe documental.";
    return NextResponse.json({ error: message }, { status: /No autorizado|sesion/.test(message) ? 403 : 500 });
  }
}
