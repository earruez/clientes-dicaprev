import React from "react";

interface FieldDisplayProps {
  label: string;
  value: string;
  className?: string;
}

export function FieldDisplay({ label, value, className = "" }: FieldDisplayProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-base font-medium text-slate-900 leading-relaxed">
        {value}
      </p>
    </div>
  );
}