import Link from "next/link";
import { WandSparkles } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/components/ui/button";
import Ds44SectionNav from "../../Ds44SectionNav";
import { getMiperAsistenteData } from "./actions";
import AsistenteMiperClient from "./AsistenteMiperClient";

export default async function Ds44MiperAsistentePage({ searchParams }: { searchParams: Promise<{ miperId?: string }> }) {
  const { miperId } = await searchParams;
  const data = await getMiperAsistenteData(miperId);
  return <main className="min-h-screen bg-slate-50/80"><div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
    <StandardPageHeader moduleLabel="DS44" title="Asistente MIPER ISP" description="Construye un borrador por cargo y tarea. Las sugerencias nunca reemplazan la validación técnica ni la aprobación humana." icon={WandSparkles} iconWrapClassName="bg-slate-900" actions={<Button asChild variant="outline" className="rounded-2xl"><Link href="/dicaprev/ds44/miper">Modo experto</Link></Button>} />
    <Ds44SectionNav />
    <AsistenteMiperClient data={data} />
  </div></main>;
}
