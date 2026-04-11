import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  progress?: number;
  statusLabel?: string;
  statusColor?: string;
}

export function StatCard({ title, value, icon, description, progress, statusLabel, statusColor }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-700">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>

      {statusLabel ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium" >
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor ?? "bg-emerald-500"}`} />
          <span className="text-slate-500">{statusLabel}</span>
        </div>
      ) : null}

      {progress !== undefined ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
            <span>Cumplimiento</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : description ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
