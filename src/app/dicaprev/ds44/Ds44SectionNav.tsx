"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dicaprev/ds44", label: "Resumen" },
  { href: "/dicaprev/ds44/diagnostico", label: "Diagnóstico" },
  { href: "/dicaprev/ds44/plan-implementacion", label: "Plan de implementación" },
  { href: "/dicaprev/ds44/documentos", label: "Documentos DS44" },
  { href: "/dicaprev/ds44/evidencias", label: "Evidencias fiscalizables" },
] as const;

export default function Ds44SectionNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación DS44" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      <div className="flex min-w-max gap-1">
        {ITEMS.map((item) => {
          const active = item.href === "/dicaprev/ds44" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                active ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
