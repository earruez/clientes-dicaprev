import React from "react";

interface FieldItemProps {
  label: string;
  value: string;
}

export function FieldItem({ label, value }: FieldItemProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.24em] text-gray-400">{label}</p>
      <p className="text-base font-medium text-slate-900">{value}</p>
    </div>
  );
}
