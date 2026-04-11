import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}