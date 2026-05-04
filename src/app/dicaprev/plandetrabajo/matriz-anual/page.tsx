"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { PlanNav } from "../components/plan-nav";
import { MonthlyMatrix } from "../components/plan-ui";
import { MESES_SHORT } from "../mock-data";
import { getPlanSnapshot, hydratePlanStore, subscribePlan } from "../store";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

export default function MatrizAnualPage() {
  const [snapshot, setSnapshot] = useState(getPlanSnapshot());

  useEffect(() => {
    hydratePlanStore();
    setSnapshot(getPlanSnapshot());
    return subscribePlan(() => setSnapshot(getPlanSnapshot()));
  }, []);

  return (
    <div className="p-6 space-y-5">
      <StandardPageHeader
        moduleLabel="Planificación"
        title="Matriz Anual"
        description="Excel inteligente del plan anual, con seguimiento mes a mes por actividad y norma."
        icon={CalendarDays}
      />

      <PlanNav />
      <MonthlyMatrix data={snapshot.actividades} meses={MESES_SHORT} />
    </div>
  );
}
