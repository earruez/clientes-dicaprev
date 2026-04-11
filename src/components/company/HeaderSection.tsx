import React from "react";
import { Pencil } from "lucide-react";

interface HeaderSectionProps {
  title: string;
  subtitle: string;
  onEdit: () => void;
}

export function HeaderSection({ title, subtitle, onEdit }: HeaderSectionProps) {
  return (
    <div className="flex flex-col gap-6 rounded-[32px] bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <Pencil className="h-4 w-4" />
        Editar empresa
      </button>
    </div>
  );
}
