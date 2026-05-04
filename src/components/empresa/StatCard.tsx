import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  description?: string;
  color?: string;
}

export function StatCard({ title, value, icon, trend, description, color = "text-slate-900" }: StatCardProps) {
  return (
    <Card className="border border-slate-200/60 shadow-sm rounded-2xl bg-white/95 backdrop-blur-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 text-lg">
              {icon}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
              <p className={`mt-3 text-3xl font-semibold ${color} tracking-tight`}>{value}</p>
            </div>
          </div>
          {trend && (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {trend.value > 0 ? "+" : ""}{trend.value}%
              <span className="ml-1 text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="mt-4 text-sm text-slate-500">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}