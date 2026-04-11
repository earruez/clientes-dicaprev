import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className = "" }: ProgressBarProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Cumplimiento</span>
        <span className="text-sm font-semibold text-slate-900">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
      {label && (
        <p className="text-xs text-slate-500">{label}</p>
      )}
    </div>
  );
}