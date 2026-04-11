"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useResumenEmpresa from "@/app/dicaprev/empresa/resumen/hooks/useResumenEmpresa";
import HeaderResumenEmpresa from "@/app/dicaprev/empresa/resumen/components/HeaderResumenEmpresa";
import TabsResumenEmpresa from "@/app/dicaprev/empresa/resumen/components/TabsResumenEmpresa";
import GeneralTab from "@/app/dicaprev/empresa/resumen/components/general/GeneralTab";
import GobiernoSSTTab from "@/app/dicaprev/empresa/resumen/components/gobierno/GobiernoSSTTab";
import EstructuraTab from "@/app/dicaprev/empresa/resumen/components/estructura/EstructuraTab";
import DS44Tab from "@/app/dicaprev/empresa/resumen/components/ds44/DS44Tab";

function ResumenPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "general";
  const { resumenData, updateResumenData } = useResumenEmpresa();
  const [activeTab, setActiveTab] = useState(initialTab);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralTab
            data={resumenData.general}
            onSave={(updatedData) =>
              updateResumenData({
                general: {
                  ...resumenData.general,
                  ...updatedData,
                },
              })
            }
          />
        );
      case "gobierno":
        return <GobiernoSSTTab data={resumenData.gobierno} />;
      case "estructura":
        return <EstructuraTab data={resumenData.estructura} />;
      case "ds44":
        return <DS44Tab />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <HeaderResumenEmpresa />
      <TabsResumenEmpresa activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-6">{renderActiveTab()}</div>
    </div>
  );
}

export default function ResumenPage() {
  return (
    <Suspense>
      <ResumenPageContent />
    </Suspense>
  );
}