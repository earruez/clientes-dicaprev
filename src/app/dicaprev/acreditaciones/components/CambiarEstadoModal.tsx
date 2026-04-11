"use client";

import { useState } from "react";
import { ArrowRight, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EstadoAcreditacion } from "../types";

// ── Config visual de estados ─────────────────────────────────────────────────

export const ESTADO_CFG: Record<
  EstadoAcreditacion,
  { label: string; badgeCls: string; dotCls: string }
> = {
  en_preparacion: {
    label: "En preparación",
    badgeCls: "bg-slate-100 text-slate-700 border-slate-200",
    dotCls: "bg-slate-400",
  },
  listo_para_enviar: {
    label: "Lista para enviar",
    badgeCls: "bg-violet-50 text-violet-700 border-violet-200",
    dotCls: "bg-violet-500",
  },
  enviado: {
    label: "Enviada",
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
    dotCls: "bg-blue-500",
  },
  observada: {
    label: "Observada",
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
    dotCls: "bg-amber-500",
  },
  aprobado: {
    label: "Aprobada",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotCls: "bg-emerald-500",
  },
  rechazado: {
    label: "Rechazada",
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200",
    dotCls: "bg-rose-500",
  },
  cerrada: {
    label: "Cerrada",
    badgeCls: "bg-slate-100 text-slate-500 border-slate-200",
    dotCls: "bg-slate-400",
  },
  vencido: {
    label: "Vencida",
    badgeCls: "bg-orange-50 text-orange-700 border-orange-200",
    dotCls: "bg-orange-500",
  },
};

// ── Transiciones válidas por estado ─────────────────────────────────────────

export const TRANSICIONES: Record<EstadoAcreditacion, EstadoAcreditacion[]> = {
  en_preparacion: ["listo_para_enviar", "cerrada"],
  listo_para_enviar: ["enviado", "en_preparacion", "cerrada"],
  enviado: ["observada", "aprobado", "rechazado", "vencido", "cerrada"],
  observada: ["en_preparacion", "enviado", "cerrada"],
  aprobado: ["vencido", "cerrada"],
  rechazado: ["en_preparacion", "cerrada"],
  cerrada: [],
  vencido: ["en_preparacion", "cerrada"],
};

// Cuáles transiciones requieren un comentario
const REQUIERE_COMENTARIO: EstadoAcreditacion[] = ["observada", "rechazado"];

// ── Props ────────────────────────────────────────────────────────────────────

interface CambiarEstadoModalProps {
  open: boolean;
  estadoActual: EstadoAcreditacion;
  estadoNuevo: EstadoAcreditacion;
  empresaNombre: string;
  mandante: string;
  onConfirmar: (comentario: string) => void;
  onCerrar: () => void;
}

// ── Componente ───────────────────────────────────────────────────────────────

export function CambiarEstadoModal({
  open,
  estadoActual,
  estadoNuevo,
  empresaNombre,
  mandante,
  onConfirmar,
  onCerrar,
}: CambiarEstadoModalProps) {
  const [comentario, setComentario] = useState("");

  const cfgActual = ESTADO_CFG[estadoActual];
  const cfgNuevo = ESTADO_CFG[estadoNuevo];
  const necesitaComentario = REQUIERE_COMENTARIO.includes(estadoNuevo);

  function handleConfirmar() {
    onConfirmar(comentario.trim());
    setComentario("");
  }

  function handleCerrar() {
    setComentario("");
    onCerrar();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            Cambiar estado de acreditación
          </DialogTitle>
        </DialogHeader>

        {/* Info de la acreditación */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm space-y-0.5">
          <p className="font-medium text-slate-900">{empresaNombre}</p>
          <p className="text-slate-500 text-xs">{mandante}</p>
        </div>

        {/* Transición de estados */}
        <div className="flex items-center gap-3 py-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              cfgActual.badgeCls
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfgActual.dotCls)} />
            {cfgActual.label}
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              cfgNuevo.badgeCls
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfgNuevo.dotCls)} />
            {cfgNuevo.label}
          </span>
        </div>

        {/* Advertencia para estados negativos */}
        {(estadoNuevo === "rechazado" || estadoNuevo === "cerrada") && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {estadoNuevo === "rechazado"
                ? "Se recomienda agregar un comentario con el motivo del rechazo."
                : "Esta acción cerrará la acreditación de forma permanente."}
            </span>
          </div>
        )}

        {/* Comentario */}
        <div className="space-y-1.5">
          <Label htmlFor="comentario-estado" className="text-xs font-medium text-slate-700">
            Comentario
            {necesitaComentario ? (
              <span className="text-rose-500 ml-0.5">*</span>
            ) : (
              <span className="text-slate-400 ml-1">(opcional)</span>
            )}
          </Label>
          <Textarea
            id="comentario-estado"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={
              necesitaComentario
                ? "Describe el motivo del cambio de estado…"
                : "Agrega notas sobre este cambio (opcional)…"
            }
            className="resize-none text-sm rounded-xl min-h-[80px]"
          />
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleCerrar} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={necesitaComentario && comentario.trim() === ""}
            className={cn(
              "rounded-xl",
              estadoNuevo === "aprobado"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : estadoNuevo === "rechazado"
                ? "bg-rose-600 hover:bg-rose-700"
                : estadoNuevo === "observada"
                ? "bg-amber-500 hover:bg-amber-600"
                : estadoNuevo === "cerrada"
                ? "bg-slate-700 hover:bg-slate-800"
                : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
