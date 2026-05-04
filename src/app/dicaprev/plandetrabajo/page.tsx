import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, BarChart3, LayoutGrid, ClipboardList, FolderOpen } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

const SECCIONES = [
  {
    href: "/dicaprev/plandetrabajo/resumen",
    icon: LayoutGrid,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    title: "Resumen",
    description: "Vista ejecutiva con KPIs, actividades críticas y acciones rápidas.",
  },
  {
    href: "/dicaprev/plandetrabajo/matriz-anual",
    icon: CalendarDays,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    title: "Matriz anual",
    description: "Matriz mensual tipo Excel inteligente para seguimiento de actividades.",
  },
  {
    href: "/dicaprev/plandetrabajo/actividades",
    icon: ClipboardList,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    title: "Actividades",
    description: "Tabla filtrable por año, estado, norma, centro y responsable.",
  },
  {
    href: "/dicaprev/plandetrabajo/evidencias",
    icon: FolderOpen,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    title: "Evidencias",
    description: "Gestión documental por actividad con estado e historial.",
  },
  {
    href: "/dicaprev/plandetrabajo/indicadores",
    icon: BarChart3,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    title: "Indicadores",
    description: "Seguimiento de avance, cumplimiento y efectividad del programa de trabajo.",
  },
];

export default function PlanDeTrabajoPage() {
  return (
    <div className="p-6 space-y-6">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Plan de Trabajo"
        description="Módulo anual reorganizado en vistas ejecutivas y operativas."
        icon={CalendarDays}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECCIONES.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                    <Icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{s.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{s.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
