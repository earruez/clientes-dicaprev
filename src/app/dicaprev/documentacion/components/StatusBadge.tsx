"use client";

import { EstadoDocumento } from "../types";
import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: EstadoDocumento;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    "vigente": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "por_vencer": "bg-amber-100 text-amber-800 border-amber-200",
    "vencido": "bg-rose-100 text-rose-800 border-rose-200",
    "pendiente_carga": "bg-slate-100 text-slate-700 border-slate-200",
    "en_revision": "bg-sky-100 text-sky-800 border-sky-200",
    "reemplazado": "bg-violet-100 text-violet-800 border-violet-200",
    "no_aplica": "bg-zinc-100 text-zinc-700 border-zinc-200",
    "Vigente": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Por vencer": "bg-amber-100 text-amber-800 border-amber-200",
    "Vencido": "bg-rose-100 text-rose-800 border-rose-200",
    "Pendiente de carga": "bg-slate-100 text-slate-700 border-slate-200",
    "En revisión": "bg-sky-100 text-sky-800 border-sky-200",
    "Reemplazado": "bg-violet-100 text-violet-800 border-violet-200",
    "No aplica": "bg-zinc-100 text-zinc-700 border-zinc-200",
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}