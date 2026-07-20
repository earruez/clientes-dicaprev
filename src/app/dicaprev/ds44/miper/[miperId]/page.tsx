import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import Ds44SectionNav from "../../Ds44SectionNav";
import { getDs44MiperDetalleData } from "../actions";
import MiperDetalleClient from "../MiperDetalleClient";

export default async function Ds44MiperDetallePage({ params }: { params: Promise<{ miperId: string }> }) {
  const { miperId } = await params;
  try {
    const data = await getDs44MiperDetalleData(miperId);
    return (
      <main className="min-h-screen bg-slate-50/80">
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <StandardPageHeader
            moduleLabel="DS44"
            title={`${data.miper.codigo} · ${data.miper.nombre}`}
            description={`Matriz MIPER versión ${data.miper.version}. Evaluación y controles trazables por alcance organizacional.`}
            icon={ShieldAlert}
            iconWrapClassName="bg-slate-900"
            actions={<Button asChild variant="outline" className="rounded-2xl font-semibold"><Link href="/dicaprev/ds44/miper">Volver a matrices</Link></Button>}
          />
          <Ds44SectionNav />
          <MiperDetalleClient data={data} />
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("no existe")) notFound();
    throw error;
  }
}
