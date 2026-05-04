"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import NotificationBell from "@/components/layout/NotificationBell";

/* =========================
   LAYOUT DICAPREV
   ========================= */

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Defensive cleanup: if a modal leaves body locked after route changes,
    // restore interactivity so buttons keep working across Empresa pages.
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-slate-700 tracking-wide">MVP CHILE SPA</span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs text-slate-500">admin@dicaprev.cl</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#f5f7ff] px-6 py-6 md:py-8 [&>div]:mx-0 [&>div]:max-w-none [&>div]:px-0 [&>section]:mx-0 [&>section]:max-w-none [&>section]:px-0 [&_[class*='mx-auto'][class*='max-w-']]:mx-0 [&_[class*='mx-auto'][class*='max-w-']]:max-w-none [&_[class*='mx-auto'][class*='max-w-']]:px-0">
          {children}
        </main>
      </div>
    </div>
  );
}
