
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Course } from "./utils";

type Props = {
  courses: Course[];
};

export default function Normativa({ courses }: Props) {
  const tags = Array.from(
    new Set(
      courses.flatMap((c) => c.normativa || [])
    )
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr] gap-4">
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <div className="p-4">
          <p className="text-sm font-semibold text-slate-900 mb-1">
            Normativa vinculada a los cursos
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Resumen rápido de DS, leyes y protocolos asociados a tu plan de
            capacitación. En el futuro este panel se conectará con el módulo de
            documentación legal.
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-full border-slate-200 text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <div className="p-4 space-y-1.5 text-xs text-slate-600">
          <p className="font-medium text-slate-800 mb-1">
            Ejemplos de mapeo normativo
          </p>
          <p>• DS40 / DS44 → Inducción general, uso de EPP.</p>
          <p>• DS594 → Condiciones sanitarias y ambientales.</p>
          <p>• Ley 16.744 → Accidentes y enfermedades profesionales.</p>
          <p>• Protocolos MINSAL → Ergonomía y salud ocupacional.</p>
        </div>
      </Card>
    </div>
  );
}
