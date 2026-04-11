import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onEdit?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  className?: string;
}

export function InfoCard({
  title,
  icon,
  children,
  onEdit,
  actionLabel = "Editar",
  actionIcon,
  className = "",
}: InfoCardProps) {
  return (
    <Card className={`border border-slate-200/60 shadow-sm rounded-2xl bg-white/90 backdrop-blur-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <CardHeader className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {actionIcon && <span className="text-base">{actionIcon}</span>}
            <span>{actionLabel}</span>
          </button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}