"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { SidebarMobileNav } from "@/components/layout/Sidebar";
import NotificationBell from "@/components/layout/NotificationBell";
import ActiveCompanySelector from "@/components/layout/ActiveCompanySelector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";

/* =========================
   LAYOUT DICAPREV
   ========================= */

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Defensive cleanup: if a modal leaves body locked after route changes,
    // restore interactivity so buttons keep working across Empresa pages.
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7ff]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-5">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menú"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold text-slate-700 tracking-wide">NEXTPREV</span>
            <div className="hidden sm:block">
              <ActiveCompanySelector />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="hidden lg:block h-4 w-px bg-slate-200" />
            <span className="hidden xl:block text-xs text-slate-500">admin@dicaprev.cl</span>
            <Button type="button" variant="ghost" size="sm" className="hidden lg:inline-flex text-slate-600" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#f5f7ff] px-6 py-6 md:py-8 [&>div]:mx-0 [&>div]:max-w-none [&>div]:px-0 [&>section]:mx-0 [&>section]:max-w-none [&>section]:px-0 [&_[class*='mx-auto'][class*='max-w-']]:mx-0 [&_[class*='mx-auto'][class*='max-w-']]:max-w-none [&_[class*='mx-auto'][class*='max-w-']]:px-0">
          {children}
        </main>

        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent
            withClose={false}
            className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-[92vw] max-w-[360px] translate-x-0 translate-y-0 rounded-none border-r border-slate-200 p-0 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className="text-sm font-semibold tracking-wide text-slate-700">NEXTPREV</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                  Cerrar
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
                <SidebarMobileNav onNavigate={() => setMobileMenuOpen(false)} />
              </div>
              <div className="border-t border-slate-200 p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleSignOut();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
