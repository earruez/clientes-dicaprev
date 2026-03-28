
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type HeaderPlanProps = {
  anio: string;
  onChangeYear: (year: string) => void;
};

const years = ["2024", "2025", "2026"];

export default function HeaderPlan({ anio, onChangeYear }: HeaderPlanProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Plan de Capacitación
        </h1>
        <p className="text-slate-500 mt-1 max-w-2xl text-sm">
          Define el plan anual de capacitación por rol, curso y normativa. Esta matriz
          alimenta el calendario, participación y evaluaciones.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={anio} onValueChange={onChangeYear}>
          <SelectTrigger className="w-[120px] bg-white shadow-sm rounded-xl">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="rounded-xl shadow-sm text-sm">
          Exportar matriz
        </Button>
      </div>
    </div>
  );
}
