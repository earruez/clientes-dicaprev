"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dicaprev/plandetrabajo/resumen", label: "Resumen" },
  { href: "/dicaprev/plandetrabajo/matriz-anual", label: "Matriz anual" },
  { href: "/dicaprev/plandetrabajo/actividades", label: "Actividades" },
  { href: "/dicaprev/plandetrabajo/evidencias", label: "Evidencias" },
  { href: "/dicaprev/plandetrabajo/indicadores", label: "Indicadores" },
];

export function PlanNav() {
  const pathname = usePathname();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <nav className="flex flex-wrap gap-2">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
