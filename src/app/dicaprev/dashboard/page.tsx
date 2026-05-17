import React, { Suspense } from "react";
import { Card } from "@/components/ui/card";
import DashboardClient from "./_client";
import { getResumenEmpresa } from "@/actions/empresa/resumen";

export const metadata = {
  title: "Dashboard - DICAPREV",
  description: "Panel de control de DICAPREV",
};

// Loading skeleton while fetching data
function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-12 bg-slate-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 gap-4">
        <Card className="h-40 bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  // Server-side fetching of initial resume
  const resumen = await getResumenEmpresa();

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient resumenInicial={resumen} />
    </Suspense>
  );
}
