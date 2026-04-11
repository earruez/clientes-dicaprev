"use client";

import { DocumentStatus } from "../types";
import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: DocumentStatus;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    vigente: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pendiente: "bg-amber-100 text-amber-800 border-amber-200",
    vencido: "bg-red-100 text-red-800 border-red-200",
  };

  const labels = {
    vigente: "Vigente",
    pendiente: "Pendiente",
    vencido: "Vencido",
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {labels[status]}
    </Badge>
  );
}