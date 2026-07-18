import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import DiagnosticoDs44Client from "./DiagnosticoDs44Client";
import { getDs44DiagnosticoData } from "./actions";

export default async function DiagnosticoDs44Page() {
  const data = await getDs44DiagnosticoData();

  return (
    <div className="space-y-6 px-4 pb-8 pt-5 sm:px-6">
      <StandardPageHeader
        moduleLabel="DS44"
        title="Diagnostico inicial DS44"
        description="Evalua el estado actual de implementacion, detecta brechas y prioriza acciones."
        icon={ClipboardCheck}
        actions={
          <Button asChild variant="outline">
            <Link href="/dicaprev/ds44">Volver al dashboard DS44</Link>
          </Button>
        }
      />

      <DiagnosticoDs44Client initialData={data} />
    </div>
  );
}
