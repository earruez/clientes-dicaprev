import React, { Suspense } from "react";
import { Card } from "@/components/ui/card";
import DashboardClient from "./_client";
import { getDashboardEjecutivo } from "./actions";

export const metadata = {
  title: "Dashboard - NextPrev",
  description: "Panel de control de NextPrev",
};

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
  const resumen = await getDashboardEjecutivo();

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient resumenInicial={resumen} />
    </Suspense>
  );
}
