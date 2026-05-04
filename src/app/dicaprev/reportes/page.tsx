import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FileBarChart2, Clock, AlertTriangle, Building2, BarChart3 } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

const REPORTES = [
  {
    href: "/dicaprev/reportes/vencimientos",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: "Vencimientos",
    description: "Documentos y certificados próximos a vencer o ya vencidos.",
  },
  {
    href: "/dicaprev/reportes/pendientes",
    icon: AlertTriangle,
    color: "text-rose-600",
    bg: "bg-rose-50",
    title: "Pendientes",
    description: "Acciones, hallazgos y obligaciones sin resolver.",
  },
  {
    href: "/dicaprev/reportes/cumplimiento-centro",
    icon: Building2,
    color: "text-teal-600",
    bg: "bg-teal-50",
    title: "Cumplimiento por Centro",
    description: "Estado de cumplimiento DS44 desglosado por centro de trabajo.",
  },
  {
    href: "/dicaprev/reportes/cumplimiento-area",
    icon: BarChart3,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    title: "Cumplimiento por Área",
    description: "Estado de cumplimiento DS44 desglosado por área organizacional.",
  },
];

export default function ReportesPage() {
  return (
    <div className="p-6 space-y-6">
      <StandardPageHeader
        moduleLabel="Módulo Plan"
        title="Reportes"
        description="Vistas consolidadas de cumplimiento, vencimientos y pendientes."
        icon={<FileBarChart2 className="h-6 w-6" />}
        iconWrapClassName="bg-rose-700"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTES.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${r.bg}`}>
                    <Icon className={`h-5 w-5 ${r.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{r.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{r.description}</p>
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
