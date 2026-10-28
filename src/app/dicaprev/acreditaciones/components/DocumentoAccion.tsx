"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, MessageSquareWarning, XCircle } from "lucide-react";
import { adjuntarDocumentoAcreditacion, revisarDocumentoAcreditacion } from "@/actions/acreditaciones/flujo";
import { normalizarArchivoSeguroUrl } from "@/lib/documentacion/archivo-seguro";

type Documento = {
  id: string; estado: string; obligatorio: boolean; archivoUrl?: string;
  archivoNombre?: string; observaciones?: string; nombreDocumento: string;
  fechaEmision?: string; fechaVencimiento?: string;
};

export default function DocumentoAccion({ documento, puedeEditar }: { documento: Documento; puedeEditar: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [emision, setEmision] = useState(documento.fechaEmision?.slice(0, 10) || "");
  const [vencimiento, setVencimiento] = useState(documento.fechaVencimiento?.slice(0, 10) || "");
  const [nota, setNota] = useState(documento.observaciones || "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const demo = Boolean(documento.archivoUrl?.startsWith("/demo/"));
  const url = demo ? null : normalizarArchivoSeguroUrl(documento.archivoUrl);
  const valido = documento.estado === "completo" && !demo && Boolean(url || documento.archivoNombre)
    && (!documento.fechaVencimiento || new Date(documento.fechaVencimiento).getTime() >= Date.now());
  const clase = valido ? "bg-green-50 text-green-800 border-green-200" : demo
    ? "bg-orange-50 text-orange-800 border-orange-200"
    : documento.estado === "rechazado" ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-800 border-amber-200";
  const etiqueta = demo ? "Archivo demostrativo, reemplazar" : documento.estado === "en_revision" ? "En revisión"
    : documento.estado === "rechazado" ? "Observado" : documento.estado === "no_aplica" ? "No aplica"
    : valido ? "Completo" : documento.estado === "vencido" ? "Vencido" : "Pendiente";

  async function cargar() {
    if (!archivo || guardando) return;
    setGuardando(true); setError("");
    try {
      const form = new FormData(); form.set("file", archivo);
      const res = await fetch("/api/dicaprev/documentacion/upload", {
        method: "POST", body: form, credentials: "same-origin",
      });
      const metadata: { archivoNombre?: string; archivoNombreOriginal?: string; error?: string } = await res.json();
      if (!res.ok || !metadata.archivoNombre) throw new Error(metadata.error || "No se pudo almacenar el archivo");
      await adjuntarDocumentoAcreditacion({
        documentoId: documento.id,
        archivoNombre: metadata.archivoNombre,
        nombreOriginal: metadata.archivoNombreOriginal || archivo.name,
        fechaEmision: emision || undefined,
        fechaVencimiento: vencimiento || undefined,
      });
      setArchivo(null); setAbierto(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo adjuntar"); }
    finally { setGuardando(false); }
  }

  async function cambiarEstado(estado: "no_aplica" | "faltante" | "rechazado" | "en_revision") {
    setGuardando(true); setError("");
    try {
      await revisarDocumentoAcreditacion(documento.id, estado, nota.trim() || undefined);
      setAbierto(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar"); }
    finally { setGuardando(false); }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${clase}`}>{etiqueta}</span>
        <div className="min-w-[160px] flex-1">
          <p className="text-sm font-semibold text-slate-900">{documento.nombreDocumento}</p>
          {!documento.obligatorio && <span className="text-xs text-slate-500">Opcional según mandante</span>}
          {documento.observaciones && <p className="text-xs text-rose-700">{documento.observaciones}</p>}
        </div>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-blue-700">Ver archivo</a>}
        {puedeEditar && <button type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white">
          <FileUp className="mr-1 inline h-3.5 w-3.5" />{valido ? "Reemplazar" : "Resolver"}
        </button>}
      </div>
      {abierto && puedeEditar && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
          <label className="block text-sm font-semibold text-slate-700">Adjuntar archivo real
            <input aria-label={`Archivo de ${documento.nombreDocumento}`} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xlsx" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-700">Fecha de emisión
              <input type="date" value={emision} onChange={(e) => setEmision(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" />
            </label>
            <label className="text-xs text-slate-700">Fecha de vencimiento
              <input type="date" value={vencimiento} min={emision || undefined} onChange={(e) => setVencimiento(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" />
            </label>
          </div>
          <button type="button" disabled={!archivo || guardando} onClick={() => void cargar()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{guardando ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 inline h-4 w-4" />}Guardar documento</button>
          <div className="border-t pt-3">
            <label className="block text-xs text-slate-600">Observación del mandante
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm" placeholder="Ej. falta firma, documento ilegible" />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={guardando || !nota.trim()} onClick={() => void cambiarEstado("rechazado")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><MessageSquareWarning className="mr-1 inline h-3 w-3" />Marcar observado</button>
              {!documento.obligatorio && (documento.estado === "no_aplica"
                ? <button type="button" disabled={guardando} onClick={() => void cambiarEstado("faltante")} className="rounded-lg border px-3 py-2 text-xs">Volver a pendiente</button>
                : <button type="button" disabled={guardando} onClick={() => void cambiarEstado("no_aplica")} className="rounded-lg border px-3 py-2 text-xs"><XCircle className="mr-1 inline h-3 w-3" />No aplica</button>)}
            </div>
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
