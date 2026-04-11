import React from "react";
import { Pencil } from "lucide-react";

interface CardHeaderProps {
  title: string;
  icon: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}

export function CardHeader({
  title,
  icon,
  onEdit,
  editLabel = "Editar",
}: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-700">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
      </div>

      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4 text-slate-500" />
          <span>{editLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
